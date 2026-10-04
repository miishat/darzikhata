import { templateById, type PaymentMethod, type ShopConfig, type ShopState } from '@darzikhata/domain';
import type { DraftItem, DraftMeasurements, OrderDraft } from './draft';

const VERSION = 1;
const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

/** The browser storage key for one person's draft in one shop and branch. */
export function draftKey(shopKey: string, branchId: string, staffId: string): string {
  return `dk.draft.${shopKey}.${branchId}.${staffId}`;
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === 'string';
const isAmount = (v: unknown): boolean => v === null || (typeof v === 'number' && Number.isFinite(v));

function isMeasurements(v: unknown): v is DraftMeasurements {
  if (!isObject(v)) return false;
  if (v['kind'] === 'none') return true;
  if (v['kind'] === 'saved') return isString(v['versionId']) && typeof v['confirmed'] === 'boolean';
  if (v['kind'] !== 'new') return false;
  return (
    isObject(v['values']) &&
    Object.values(v['values']).every((n) => typeof n === 'number' && Number.isFinite(n)) &&
    isString(v['source']) &&
    isString(v['notes'])
  );
}

function isItem(v: unknown): v is DraftItem {
  return (
    isObject(v) &&
    isString(v['key']) &&
    isString(v['templateId']) &&
    typeof v['quantity'] === 'number' &&
    isAmount(v['price']) &&
    isString(v['wearer']) &&
    isMeasurements(v['measurements']) &&
    isString(v['designNotes']) &&
    isString(v['fabricNote']) &&
    Array.isArray(v['photoIds']) &&
    v['photoIds'].every(isString) &&
    isString(v['trialDate']) &&
    isString(v['deliveryDate']) &&
    (v['assignedTo'] === undefined || v['assignedTo'] === null || isString(v['assignedTo']))
  );
}

function isCustomer(v: unknown): boolean {
  if (v === null) return true;
  if (!isObject(v)) return false;
  if (v['kind'] === 'existing') return isString(v['customerId']);
  return (
    v['kind'] === 'new' &&
    isString(v['name']) &&
    isString(v['nameAlt']) &&
    isString(v['phone']) &&
    (v['gender'] === null || isString(v['gender']))
  );
}

function isDraft(v: unknown): v is OrderDraft {
  if (!isObject(v)) return false;
  const { discount, advance } = v;
  return (
    isCustomer(v['customer']) &&
    Array.isArray(v['items']) &&
    v['items'].every(isItem) &&
    isObject(discount) &&
    isAmount(discount['amount']) &&
    isString(discount['reason']) &&
    isObject(advance) &&
    isAmount(advance['amount']) &&
    METHODS.includes(advance['method'] as PaymentMethod) &&
    isString(advance['reference']) &&
    isString(v['notes'])
  );
}

/** Measurement values and notes are left out for people who may not see them. */
function withoutValues(m: DraftMeasurements): DraftMeasurements {
  return m.kind === 'new' ? { kind: 'new', values: {}, source: m.source, notes: '' } : m;
}

/** Keeps the draft in this browser. Storage that is full or blocked is ignored: the draft is a convenience. */
export function writeDraft(key: string, draft: OrderDraft, options: { keepMeasurements: boolean }): void {
  try {
    const kept: OrderDraft = options.keepMeasurements
      ? draft
      : { ...draft, items: draft.items.map((i) => ({ ...i, measurements: withoutValues(i.measurements) })) };
    window.localStorage.setItem(key, JSON.stringify({ v: VERSION, draft: kept }));
  } catch {
    // Nothing to do: the draft simply is not kept this time.
  }
}

/** The stored draft, or null when there is none or it cannot be trusted. */
export function readDraft(key: string): OrderDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed['v'] !== VERSION || !isDraft(parsed['draft'])) return null;
    return parsed['draft'];
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignored, as in writeDraft.
  }
}

export interface RestoreContext {
  config: ShopConfig;
  state: ShopState;
  /** False when the person may not see women's measurements: values are dropped. */
  keepMeasurements: boolean;
  /** Staff ids who can be chosen as a worker right now. */
  workers: string[];
}

/**
 * Brings a stored draft up to date with the shop as it is now: garments whose template is gone
 * and a customer who no longer exists are dropped, saved measurements must be confirmed again,
 * and a worker who can no longer be chosen is forgotten.
 */
export function restoreDraft(draft: OrderDraft, ctx: RestoreContext): OrderDraft {
  const items = draft.items
    .filter((item) => templateById(ctx.config, item.templateId))
    .map((item): DraftItem => {
      const m = item.measurements;
      const measurements: DraftMeasurements = m.kind === 'saved' ? { ...m, confirmed: false } : ctx.keepMeasurements ? m : withoutValues(m);
      return { ...item, measurements, assignedTo: item.assignedTo && ctx.workers.includes(item.assignedTo) ? item.assignedTo : null };
    });
  const customer =
    draft.customer?.kind === 'existing' && !ctx.state.customers[draft.customer.customerId] ? null : draft.customer;
  const { unreadable: _d, ...discount } = draft.discount;
  const { unreadable: _a, ...advance } = draft.advance;
  return { ...draft, customer, items, discount, advance };
}
