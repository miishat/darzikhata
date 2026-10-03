import type { Label } from './label';
import type { MeasurementSnapshot, MeasurementVersion } from './measurements';
import type { Customer, Discount, OrderItem, Payment, ShopState } from './model';
import type { Poisha } from './money';
import type { Stage } from './stages';

/** Who made a change, where, and when. The id is generated on the device and makes re-sending safe. */
export interface EventMeta {
  id: string;
  at: string;
  deviceId: string;
  staffId: string;
}

export type NewCustomer = Omit<Customer, 'createdAt' | 'version'>;

export interface NewOrderItem {
  id: string;
  templateId: string;
  garmentName: Label;
  price: Poisha;
  wearer: string | null;
  measurements: MeasurementSnapshot | null;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  stages: Stage[];
  assignedTo: string | null;
  trialDate: string | null;
  deliveryDate: string | null;
}

export interface NewOrder {
  id: string;
  number: string;
  customerId: string;
  branchId: string;
  notes: string;
  discount: Discount | null;
  items: NewOrderItem[];
}

export type CustomerChanges = Partial<Pick<Customer, 'name' | 'nameAlt' | 'phone' | 'householdId' | 'gender' | 'notes'>>;
export type ItemChanges = Partial<
  Pick<OrderItem, 'price' | 'designNotes' | 'fabricNote' | 'trialDate' | 'deliveryDate' | 'wearer'>
>;

export type EventBody =
  | { type: 'customer.created'; customer: NewCustomer }
  | { type: 'customer.updated'; customerId: string; baseVersion: number; changes: CustomerChanges }
  | { type: 'household.created'; household: { id: string; label: string } }
  | { type: 'measurement.recorded'; customerId: string; templateId: string; version: MeasurementVersion }
  | { type: 'order.created'; order: NewOrder }
  | { type: 'order.discountSet'; orderId: string; baseVersion: number; discount: Discount | null }
  | { type: 'order.priceAdjusted'; orderId: string; adjustment: { id: string; amount: Poisha; reason: string } }
  | { type: 'item.stageChanged'; orderId: string; itemId: string; to: string; reason: string }
  | { type: 'item.assigned'; orderId: string; itemId: string; baseVersion: number; assigneeId: string | null }
  | { type: 'item.updated'; orderId: string; itemId: string; baseVersion: number; changes: ItemChanges }
  | { type: 'item.adjustmentAdded'; orderId: string; itemId: string; adjustment: { id: string; note: string } }
  | { type: 'item.cancelled'; orderId: string; itemId: string; reason: string }
  | { type: 'payment.recorded'; orderId: string; payment: Omit<Payment, 'at' | 'by'> }
  | { type: 'link.created'; orderId: string; token: string }
  | { type: 'link.revoked'; orderId: string; token: string };

export type DomainEvent = EventMeta & EventBody;
export type EventType = EventBody['type'];

/**
 * Edit events change an existing record and carry the version they were based on.
 * Everything else only adds information and always applies when valid.
 */
export const EDIT_EVENT_TYPES = ['customer.updated', 'order.discountSet', 'item.assigned', 'item.updated'] as const;

export type EditEvent = Extract<DomainEvent, { type: (typeof EDIT_EVENT_TYPES)[number] }>;

export function isEditEvent(event: DomainEvent): event is EditEvent {
  return (EDIT_EVENT_TYPES as readonly string[]).includes(event.type);
}

/** Result of one reducer step. */
export type Step =
  | { ok: true; state: ShopState }
  | { ok: false; conflict: true; currentVersion: number }
  | { ok: false; conflict: false; reason: string };

export const applied = (state: ShopState): Step => ({ ok: true, state });
export const rejected = (reason: string): Step => ({ ok: false, conflict: false, reason });
export const stale = (currentVersion: number): Step => ({ ok: false, conflict: true, currentVersion });
