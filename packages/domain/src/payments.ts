import type { Order, Payment } from './model';
import type { Poisha } from './money';
import { orderTotal } from './orders';

/** +1 when the payment adds to money held, -1 when it takes away; a correction follows the record it corrects. */
export function effectSign(payment: Payment, all: Payment[]): number {
  if (payment.kind === 'refund') return -1;
  if (payment.kind === 'correction') {
    const target = all.find((p) => p.id === payment.corrects);
    return target?.kind === 'refund' ? -1 : 1;
  }
  return 1;
}

/** Money actually held for the order: payments and advances, minus refunds, with corrections applied. */
export function netPaid(payments: Payment[]): Poisha {
  return payments.reduce((sum, p) => sum + effectSign(p, payments) * p.amount, 0);
}

/** The amount a payment stands at after all corrections to it. */
export function correctedAmount(payments: Payment[], paymentId: string): Poisha {
  const original = payments.find((p) => p.id === paymentId);
  if (!original) throw new Error(`Unknown payment: ${paymentId}`);
  return payments
    .filter((p) => p.kind === 'correction' && p.corrects === paymentId)
    .reduce((sum, p) => sum + p.amount, original.amount);
}

/** Positive: customer owes this much. Negative: the shop owes the customer (credit due). */
export function balanceDue(order: Order): Poisha {
  return orderTotal(order) - netPaid(order.payments);
}

export interface MoneySummary {
  total: Poisha;
  paid: Poisha;
  balance: Poisha;
  creditDue: Poisha;
}

export function moneySummary(order: Order): MoneySummary {
  const total = orderTotal(order);
  const paid = netPaid(order.payments);
  const balance = total - paid;
  return { total, paid, balance: Math.max(0, balance), creditDue: Math.max(0, -balance) };
}
