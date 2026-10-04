import {
  currentVersion,
  normalizePhone,
  profileKey,
  snapshotOf,
  templateById,
  type Customer,
  type EventBody,
  type GarmentTemplate,
  type Gender,
  type MeasurementSnapshot,
  type MeasurementSource,
  type MeasurementValue,
  type MeasurementVersion,
  type NewOrderItem,
  type Order,
  type PaymentMethod,
  type Poisha,
  type ShopConfig,
  type ShopState,
} from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { isValidPhone } from '../customers/customerInput';
import { assignees } from '../work/workList';

export type DraftCustomer =
  | { kind: 'existing'; customerId: string }
  | { kind: 'new'; name: string; nameAlt: string; phone: string; gender: Gender | null };

/**
 * Where an item's measurements come from:
 * - 'none': the garment has no measurement fields (alterations), or the person entering the
 *   order may not see this customer's measurements and none are saved yet.
 * - 'saved': a saved version, which someone must confirm is still right before it is used.
 * - 'new': values typed now; saved to the customer's profile as a new version.
 */
export type DraftMeasurements =
  | { kind: 'none' }
  | { kind: 'saved'; versionId: string; confirmed: boolean }
  | { kind: 'new'; values: Record<string, number>; source: MeasurementSource; notes: string };

export interface DraftItem {
  /** Local key for lists and error paths. Not saved. */
  key: string;
  templateId: string;
  /** How many identical garments; each becomes its own order item. */
  quantity: number;
  /** Price of one garment. */
  price: Poisha | null;
  wearer: string;
  measurements: DraftMeasurements;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  /** YYYY-MM-DD, or '' for none. */
  trialDate: string;
  deliveryDate: string;
  /** Staff id of the worker the garment goes to; absent or null means nobody yet. */
  assignedTo?: string | null;
}

export interface OrderDraft {
  customer: DraftCustomer | null;
  items: DraftItem[];
  /** `unreadable`: the discount field holds text that is not an amount, so there is no value to trust. */
  discount: { amount: Poisha | null; reason: string; unreadable?: boolean };
  advance: { amount: Poisha | null; method: PaymentMethod; reference: string; unreadable?: boolean };
  notes: string;
}

export type DraftErrorCode = 'required' | 'invalid' | 'past' | 'after-delivery' | 'exceeds' | 'confirm' | 'unknown';

/**
 * Problems keyed by path: 'customer', 'customer.name', 'customer.phone', 'items',
 * 'items.<key>.quantity|price|measurements|deliveryDate|trialDate', 'items.<key>.measure.<field>',
 * 'discount.amount', 'advance.amount'.
 */
export type DraftErrors = Record<string, DraftErrorCode>;

export interface DraftContext {
  config: ShopConfig;
  state: ShopState;
  /** Today in Dhaka, YYYY-MM-DD. */
  today: string;
  /** Whether the person entering the order may see measurements of a customer with this gender. */
  canSeeMeasurements(gender: Gender | null): boolean;
  /** The branch the order is taken in; when given, a chosen worker must work there. */
  branchId?: string;
  /** Whether the person entering the order may assign work. When false, a chosen worker is ignored. */
  canAssign?: boolean;
}

export function emptyDraft(): OrderDraft {
  return {
    customer: null,
    items: [],
    discount: { amount: null, reason: '' },
    advance: { amount: null, method: 'cash', reference: '' },
    notes: '',
  };
}

export function latestVersion(state: ShopState, customerId: string, templateId: string): MeasurementVersion | null {
  const profile = state.profiles[profileKey(customerId, templateId)];
  return profile ? currentVersion(profile) : null;
}

function customerGender(draft: OrderDraft, state: ShopState): Gender | null {
  if (!draft.customer) return null;
  if (draft.customer.kind === 'new') return draft.customer.gender;
  return state.customers[draft.customer.customerId]?.gender ?? null;
}

/** The measurement source a new item starts with for this customer. */
export function initialMeasurements(
  template: GarmentTemplate,
  customerId: string | null,
  state: ShopState,
  canSee: boolean,
): DraftMeasurements {
  if (template.fields.length === 0) return { kind: 'none' };
  const saved = customerId ? latestVersion(state, customerId, template.id) : null;
  if (saved) return { kind: 'saved', versionId: saved.id, confirmed: false };
  if (!canSee) return { kind: 'none' };
  return { kind: 'new', values: {}, source: 'body', notes: '' };
}

export function newDraftItem(
  template: GarmentTemplate,
  key: string,
  options: { customerId: string | null; state: ShopState; canSee: boolean; deliveryDate: string },
): DraftItem {
  return {
    key,
    templateId: template.id,
    quantity: 1,
    price: template.defaultPrice,
    wearer: '',
    measurements: initialMeasurements(template, options.customerId, options.state, options.canSee),
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    trialDate: '',
    deliveryDate: options.deliveryDate,
  };
}

export interface DraftTotals {
  garments: number;
  subtotal: Poisha;
  discount: Poisha;
  total: Poisha;
  advance: Poisha;
  balance: Poisha;
}

export function draftTotals(draft: OrderDraft): DraftTotals {
  const garments = draft.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = draft.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
  const discount = draft.discount.amount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const advance = draft.advance.amount ?? 0;
  return { garments, subtotal, discount, total, advance, balance: total - advance };
}

const MAX_QUANTITY = 50;

export function validateDraft(draft: OrderDraft, ctx: DraftContext): DraftErrors {
  const errors: DraftErrors = {};
  const { customer } = draft;

  if (!customer) errors['customer'] = 'required';
  else if (customer.kind === 'existing' && !ctx.state.customers[customer.customerId]) errors['customer'] = 'unknown';
  else if (customer.kind === 'new') {
    if (!customer.name.trim()) errors['customer.name'] = 'required';
    if (!isValidPhone(customer.phone)) errors['customer.phone'] = 'invalid';
  }

  if (draft.items.length === 0) errors['items'] = 'required';
  const canSee = ctx.canSeeMeasurements(customerGender(draft, ctx.state));
  const customerId = customer?.kind === 'existing' ? customer.customerId : null;

  for (const item of draft.items) {
    const at = `items.${item.key}`;
    const template = templateById(ctx.config, item.templateId);
    if (!template) {
      errors[`${at}.template`] = 'unknown';
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      errors[`${at}.quantity`] = 'invalid';
    }
    if (item.price === null) errors[`${at}.price`] = 'required';

    const m = item.measurements;
    if (m.kind === 'none') {
      if (template.fields.length > 0 && canSee) errors[`${at}.measurements`] = 'required';
    } else if (m.kind === 'saved') {
      const exists = customerId
        ? ctx.state.profiles[profileKey(customerId, template.id)]?.versions.some((v) => v.id === m.versionId)
        : false;
      if (!exists) errors[`${at}.measurements`] = 'unknown';
      else if (!m.confirmed) errors[`${at}.measurements`] = 'confirm';
    } else {
      for (const field of template.fields) {
        if (field.required && m.values[field.key] === undefined) errors[`${at}.measure.${field.key}`] = 'required';
      }
    }

    if (item.assignedTo && ctx.canAssign !== false) {
      const people = assignees(ctx.config, ctx.branchId ? [ctx.branchId] : []);
      if (!people.some((s) => s.id === item.assignedTo)) errors[`${at}.assignedTo`] = 'unknown';
    }

    if (!item.deliveryDate) errors[`${at}.deliveryDate`] = 'required';
    else if (item.deliveryDate < ctx.today) errors[`${at}.deliveryDate`] = 'past';
    if (item.trialDate && item.trialDate < ctx.today) errors[`${at}.trialDate`] = 'past';
    else if (item.trialDate && item.deliveryDate && item.trialDate > item.deliveryDate) {
      errors[`${at}.trialDate`] = 'after-delivery';
    }
  }

  const totals = draftTotals(draft);
  if (draft.discount.unreadable) errors['discount.amount'] = 'invalid';
  else if (totals.discount > totals.subtotal) errors['discount.amount'] = 'exceeds';
  if (draft.advance.unreadable) errors['advance.amount'] = 'invalid';
  else if (totals.advance > totals.total) errors['advance.amount'] = 'exceeds';
  return errors;
}

/** The message shown beside the field an error path points at. */
export function draftErrorKey(path: string, code: DraftErrorCode): MessageKey {
  if (path === 'customer') return 'draft.error.customer';
  if (path === 'customer.name') return 'customerForm.error.name';
  if (path === 'customer.phone') return 'customerForm.error.phone';
  if (path === 'items') return 'draft.error.items';
  if (path === 'discount.amount') return code === 'invalid' ? 'input.invalidMoney' : 'draft.error.discount';
  if (path === 'advance.amount') return code === 'invalid' ? 'input.invalidMoney' : 'draft.error.advance';
  if (/\.measure\./.test(path)) return 'measure.required';
  const field = path.split('.')[2];
  switch (field) {
    case 'template':
      return 'draft.error.template';
    case 'quantity':
      return 'draft.error.quantity';
    case 'price':
      return 'draft.error.price';
    case 'measurements':
      return code === 'confirm' ? 'draft.error.confirm' : code === 'unknown' ? 'draft.error.measurementsUnknown' : 'draft.error.measurements';
    case 'assignedTo':
      return 'draft.error.worker';
    case 'deliveryDate':
      return code === 'past' ? 'draft.error.past' : 'draft.error.deliveryDate';
    default:
      return code === 'past' ? 'draft.error.past' : 'draft.error.trialAfterDelivery';
  }
}

export type DraftStep = 'customer' | 'garments' | 'details' | 'money' | 'review';

export const DRAFT_STEPS: DraftStep[] = ['customer', 'garments', 'details', 'money', 'review'];

/** Which mobile step shows the field an error path points at. */
export function stepOf(path: string): DraftStep {
  if (path.startsWith('customer')) return 'customer';
  if (path === 'items' || /^items\.[^.]+\.(template|quantity|measurements|measure)/.test(path)) return 'garments';
  return 'money';
}

export function errorsForStep(errors: DraftErrors, step: DraftStep): DraftErrors {
  if (step === 'review') return errors;
  return Object.fromEntries(Object.entries(errors).filter(([path]) => stepOf(path) === step));
}

export interface BuildContext {
  config: ShopConfig;
  state: ShopState;
  newId(): string;
  number: string;
  branchId: string;
  staffId: string;
  /** ISO timestamp used as the time new measurements were taken. */
  now: string;
  /** Whether the person saving may assign work. When false, no worker is sent. */
  canAssign?: boolean;
}

/**
 * Turns a valid draft into the events that create it, in the order they must apply:
 * a new customer, new measurement versions, the order (one item per garment, each with its own
 * frozen measurement snapshot), then the advance. Throws if the draft refers to unknown data.
 */
export function buildOrderEvents(draft: OrderDraft, ctx: BuildContext): { orderId: string; events: EventBody[] } {
  if (!draft.customer) throw new Error('Order draft has no customer');
  const events: EventBody[] = [];

  let customerId: string;
  if (draft.customer.kind === 'new') {
    const c = draft.customer;
    customerId = ctx.newId();
    const phone = c.phone.trim() ? normalizePhone(c.phone) : null;
    const created: Omit<Customer, 'createdAt' | 'version'> = {
      id: customerId,
      name: c.name.trim(),
      nameAlt: c.nameAlt.trim() || null,
      phone,
      householdId: null,
      gender: c.gender,
      notes: '',
    };
    events.push({ type: 'customer.created', customer: created });
  } else {
    customerId = draft.customer.customerId;
  }

  const items: NewOrderItem[] = [];
  for (const item of draft.items) {
    const template = templateById(ctx.config, item.templateId);
    if (!template) throw new Error(`Unknown template: ${item.templateId}`);

    let snapshot: MeasurementSnapshot | null = null;
    const m = item.measurements;
    if (m.kind === 'saved') {
      const version = ctx.state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId);
      if (!version) throw new Error(`Unknown measurement version: ${m.versionId}`);
      snapshot = snapshotOf(version);
    } else if (m.kind === 'new') {
      const values: Record<string, MeasurementValue> = {};
      for (const field of template.fields) {
        const value = m.values[field.key];
        if (value !== undefined) values[field.key] = { value, unit: field.unit };
      }
      const version: MeasurementVersion = {
        id: ctx.newId(),
        takenAt: ctx.now,
        takenBy: ctx.staffId,
        source: m.source,
        notes: m.notes.trim(),
        values,
      };
      events.push({ type: 'measurement.recorded', customerId, templateId: template.id, version });
      snapshot = snapshotOf(version);
    }

    for (let n = 0; n < item.quantity; n++) {
      items.push({
        id: ctx.newId(),
        templateId: template.id,
        garmentName: template.name,
        price: item.price ?? 0,
        wearer: item.wearer.trim() || null,
        measurements: snapshot,
        designNotes: item.designNotes.trim(),
        fabricNote: item.fabricNote.trim(),
        photoIds: [...item.photoIds],
        stages: template.stages,
        assignedTo: ctx.canAssign === false ? null : (item.assignedTo ?? null),
        trialDate: item.trialDate || null,
        deliveryDate: item.deliveryDate || null,
      });
    }
  }

  const orderId = ctx.newId();
  const discount = draft.discount.amount ? { amount: draft.discount.amount, reason: draft.discount.reason.trim() } : null;
  events.push({
    type: 'order.created',
    order: { id: orderId, number: ctx.number, customerId, branchId: ctx.branchId, notes: draft.notes.trim(), discount, items },
  });

  if (draft.advance.amount) {
    events.push({
      type: 'payment.recorded',
      orderId,
      payment: {
        id: ctx.newId(),
        amount: draft.advance.amount,
        method: draft.advance.method,
        reference: draft.advance.reference.trim(),
        kind: 'advance',
        corrects: null,
        reason: '',
      },
    });
  }
  return { orderId, events };
}

/**
 * Starts a repeat order from an earlier one: same customer, garments, prices, wearers and notes.
 * Cancelled items are left out. Saved measurements must be confirmed again; when the earlier
 * item's measurements were never saved to the profile (as in group orders), they are copied
 * in as new values for the person to check.
 */
export function draftFromOrder(
  order: Order,
  ctx: { config: ShopConfig; state: ShopState; canSee: boolean; newKey(): string; deliveryDate: string },
): OrderDraft {
  const items: DraftItem[] = [];
  for (const previous of order.items) {
    if (previous.cancelled) continue;
    const template = templateById(ctx.config, previous.templateId);
    if (!template || !template.active) continue;
    let measurements = initialMeasurements(template, order.customerId, ctx.state, ctx.canSee);
    if (measurements.kind === 'new' && previous.measurements) {
      const values: Record<string, number> = {};
      for (const [key, v] of Object.entries(previous.measurements.values)) values[key] = v.value;
      measurements = { kind: 'new', values, source: previous.measurements.source, notes: '' };
    }
    items.push({
      key: ctx.newKey(),
      templateId: template.id,
      quantity: 1,
      price: previous.price,
      wearer: previous.wearer ?? '',
      measurements,
      designNotes: previous.designNotes,
      fabricNote: previous.fabricNote,
      photoIds: [],
      trialDate: '',
      deliveryDate: ctx.deliveryDate,
    });
  }
  return { ...emptyDraft(), customer: { kind: 'existing', customerId: order.customerId }, items };
}
