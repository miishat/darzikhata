import type { Label } from './label';
import type { MeasurementProfile, MeasurementSnapshot } from './measurements';
import type { Poisha } from './money';
import type { Stage } from './stages';

export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  name: string;
  /** The same name in the other script, if known. */
  nameAlt: string | null;
  phone: string | null;
  householdId: string | null;
  gender: Gender | null;
  notes: string;
  createdAt: string;
  version: number;
}

/** Groups customers such as family members sharing a phone. Never merges them. */
export interface Household {
  id: string;
  label: string;
  createdAt: string;
}

export interface Discount {
  amount: Poisha;
  reason: string;
}

export interface PriceAdjustment {
  id: string;
  /** Signed: positive adds to the total, negative reduces it. */
  amount: Poisha;
  reason: string;
  at: string;
  by: string;
}

export interface StageChange {
  from: string;
  to: string;
  at: string;
  by: string;
  kind: 'forward' | 'rework';
  reason: string;
}

/** A change requested at a fitting. The measurement snapshot itself is never edited. */
export interface FittingAdjustment {
  id: string;
  note: string;
  at: string;
  by: string;
}

export interface Cancellation {
  reason: string;
  at: string;
  by: string;
}

export interface OrderItem {
  id: string;
  templateId: string;
  garmentName: Label;
  price: Poisha;
  /** Who will wear it, for group orders, e.g. "Rahim - class 7". */
  wearer: string | null;
  measurements: MeasurementSnapshot | null;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  /** Copied from the template when ordered, so later template edits never change this item. */
  stages: Stage[];
  stageKey: string;
  stageHistory: StageChange[];
  assignedTo: string | null;
  trialDate: string | null;
  deliveryDate: string | null;
  adjustments: FittingAdjustment[];
  cancelled: Cancellation | null;
  version: number;
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank';
export type PaymentKind = 'advance' | 'payment' | 'refund' | 'correction';

export interface Payment {
  id: string;
  /** Positive for advance, payment and refund. Signed delta for a correction. */
  amount: Poisha;
  method: PaymentMethod;
  reference: string;
  kind: PaymentKind;
  /** For corrections: the id of the payment being corrected. */
  corrects: string | null;
  reason: string;
  at: string;
  by: string;
}

export interface StatusLink {
  token: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  branchId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  notes: string;
  discount: Discount | null;
  priceAdjustments: PriceAdjustment[];
  items: OrderItem[];
  payments: Payment[];
  links: StatusLink[];
  version: number;
}

/** Everything rebuilt from the event log. */
export interface ShopState {
  customers: Record<string, Customer>;
  households: Record<string, Household>;
  /** Keyed by profileKey(customerId, templateId). */
  profiles: Record<string, MeasurementProfile>;
  orders: Record<string, Order>;
  appliedEventIds: Record<string, true>;
}

export function emptyState(): ShopState {
  return { customers: {}, households: {}, profiles: {}, orders: {}, appliedEventIds: {} };
}
