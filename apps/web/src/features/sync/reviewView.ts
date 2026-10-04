import {
  can,
  currentVersionOf,
  isEditEvent,
  type Capability,
  type Discount,
  type Gender,
  type Label,
  type Poisha,
  type ReviewItem,
  type Role,
  type ShopState,
} from '@darzikhata/domain';
import type { EditBody } from '../../data/store';

export type ReviewField =
  | 'name'
  | 'nameAlt'
  | 'phone'
  | 'householdId'
  | 'gender'
  | 'notes'
  | 'price'
  | 'designNotes'
  | 'fabricNote'
  | 'trialDate'
  | 'deliveryDate'
  | 'wearer'
  | 'assignee'
  | 'discount';

/** A value as stored, tagged with how to show it. */
export type ReviewValue =
  | { kind: 'text'; value: string | null }
  | { kind: 'date'; value: string | null }
  | { kind: 'money'; value: Poisha }
  | { kind: 'staff'; value: string | null }
  | { kind: 'gender'; value: Gender | null }
  | { kind: 'household'; value: string | null }
  | { kind: 'discount'; value: Discount | null };

/** One field the waiting change touches: what the record holds now, and what the change wanted. */
export interface ReviewRow {
  field: ReviewField;
  current: ReviewValue;
  waiting: ReviewValue;
}

export type ReviewSubject =
  | { kind: 'customer'; customerId: string; name: string }
  | { kind: 'order'; orderId: string; number: string; garment: Label | null };

export interface ReviewEntry {
  eventId: string;
  outcome: ReviewItem['outcome'];
  /** 'stale-edit' for conflicts, otherwise why the server refused the change. */
  reason: string;
  /** The record the change is about, or null when it no longer exists. */
  subject: ReviewSubject | null;
  staffId: string;
  at: string;
  /** Only the fields whose waiting value differs from the current one. */
  rows: ReviewRow[];
  /** A stale edit whose record still exists can be applied on top of the current version. */
  canApplyMine: boolean;
  /** Parts can be chosen one by one when the change touches two or more differing fields. */
  canMerge: boolean;
}

const CUSTOMER_FIELDS = ['name', 'nameAlt', 'phone', 'householdId', 'gender', 'notes'] as const;
const ITEM_FIELDS = ['price', 'designNotes', 'fabricNote', 'trialDate', 'deliveryDate', 'wearer'] as const;

function customerValue(field: (typeof CUSTOMER_FIELDS)[number], value: unknown): ReviewValue {
  if (field === 'gender') return { kind: 'gender', value: (value as Gender | null) ?? null };
  if (field === 'householdId') return { kind: 'household', value: (value as string | null) ?? null };
  return { kind: 'text', value: (value as string | null) ?? null };
}

function itemValue(field: (typeof ITEM_FIELDS)[number], value: unknown): ReviewValue {
  if (field === 'price') return { kind: 'money', value: value as Poisha };
  if (field === 'trialDate' || field === 'deliveryDate') return { kind: 'date', value: (value as string | null) ?? null };
  return { kind: 'text', value: (value as string | null) ?? null };
}

const differs = (row: ReviewRow) => JSON.stringify(row.current.value) !== JSON.stringify(row.waiting.value);

function rowsFor(item: ReviewItem, state: ShopState): ReviewRow[] {
  const { event } = item;
  switch (event.type) {
    case 'customer.updated': {
      const customer = state.customers[event.customerId];
      if (!customer) return [];
      return CUSTOMER_FIELDS.filter((f) => event.changes[f] !== undefined)
        .map((f) => ({ field: f, current: customerValue(f, customer[f]), waiting: customerValue(f, event.changes[f]) }))
        .filter(differs);
    }
    case 'item.updated': {
      const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
      if (!garment) return [];
      return ITEM_FIELDS.filter((f) => event.changes[f] !== undefined)
        .map((f) => ({ field: f, current: itemValue(f, garment[f]), waiting: itemValue(f, event.changes[f]) }))
        .filter(differs);
    }
    case 'item.assigned': {
      const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
      if (!garment) return [];
      const row: ReviewRow = {
        field: 'assignee',
        current: { kind: 'staff', value: garment.assignedTo },
        waiting: { kind: 'staff', value: event.assigneeId },
      };
      return [row].filter(differs);
    }
    case 'order.discountSet': {
      const order = state.orders[event.orderId];
      if (!order) return [];
      const row: ReviewRow = {
        field: 'discount',
        current: { kind: 'discount', value: order.discount },
        waiting: { kind: 'discount', value: event.discount },
      };
      return [row].filter(differs);
    }
    default:
      return [];
  }
}

function subjectFor(item: ReviewItem, state: ShopState): ReviewSubject | null {
  const { event } = item;
  if ('customerId' in event && event.type !== 'measurement.recorded') {
    const customer = state.customers[event.customerId];
    return customer ? { kind: 'customer', customerId: customer.id, name: customer.name } : null;
  }
  if ('orderId' in event) {
    const order = state.orders[event.orderId];
    if (!order) return null;
    const garment = 'itemId' in event ? (order.items.find((i) => i.id === event.itemId)?.garmentName ?? null) : null;
    return { kind: 'order', orderId: order.id, number: order.number, garment };
  }
  return null;
}

/** Describes a review item against the device's current state. */
export function reviewEntry(item: ReviewItem, state: ShopState): ReviewEntry {
  const rows = rowsFor(item, state);
  const canApplyMine = item.outcome === 'conflict' && isEditEvent(item.event) && currentVersionOf(state, item.event) !== null;
  return {
    eventId: item.event.id,
    outcome: item.outcome,
    reason: item.reason,
    subject: subjectFor(item, state),
    staffId: item.event.staffId,
    at: item.event.at,
    rows,
    canApplyMine,
    canMerge: canApplyMine && (item.event.type === 'customer.updated' || item.event.type === 'item.updated') && rows.length >= 2,
  };
}

/** Anyone with one of these may open the review queue. */
export const REVIEW_CAPABILITIES: Capability[] = ['customers.edit', 'measurements.edit', 'orders.edit', 'work.assign'];

/** What a person needs to settle a review item about this kind of change. */
function capabilityFor(item: ReviewItem): Capability {
  switch (item.event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
      return 'customers.edit';
    case 'measurement.recorded':
      return 'measurements.edit';
    case 'item.assigned':
      return 'work.assign';
    default:
      return 'orders.edit';
  }
}

/**
 * Whether this person sees a review item. `state` is the branch-scoped state, so changes to
 * orders outside the chosen branches stay hidden. Customers belong to the whole shop.
 */
export function canReview(item: ReviewItem, state: ShopState, role: Role): boolean {
  if (!can(role, capabilityFor(item))) return false;
  const { event } = item;
  return 'orderId' in event ? Boolean(state.orders[event.orderId]) : true;
}

/**
 * The edit to send when merging: only the fields the person chose to take from the waiting
 * change, based on the record's current version. Null when nothing was chosen.
 */
export function mergeBody(item: ReviewItem, state: ShopState, take: ReviewField[]): EditBody | null {
  const { event } = item;
  if (take.length === 0) return null;
  if (event.type === 'customer.updated') {
    const customer = state.customers[event.customerId];
    if (!customer) return null;
    const changes = Object.fromEntries(CUSTOMER_FIELDS.filter((f) => take.includes(f)).map((f) => [f, event.changes[f]]));
    return { type: 'customer.updated', customerId: event.customerId, baseVersion: customer.version, changes };
  }
  if (event.type === 'item.updated') {
    const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
    if (!garment) return null;
    const changes = Object.fromEntries(ITEM_FIELDS.filter((f) => take.includes(f)).map((f) => [f, event.changes[f]]));
    return { type: 'item.updated', orderId: event.orderId, itemId: event.itemId, baseVersion: garment.version, changes };
  }
  return null;
}
