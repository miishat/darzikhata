import { applied, rejected, type DomainEvent, type Step } from './events';
import type { ShopState } from './model';
import { isPoisha } from './money';
import { correctedAmount, netPaid } from './payments';

type PaymentEvent = Extract<DomainEvent, { type: 'payment.recorded' }>;

const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

/** Payments are append-only. Mistakes are fixed with a correction record, never by editing. */
export function reducePaymentEvent(state: ShopState, event: PaymentEvent): Step {
  const order = state.orders[event.orderId];
  if (!order) return rejected('unknown-order');

  const { payment } = event;
  if (order.payments.some((p) => p.id === payment.id)) return rejected('payment-exists');
  if (!METHODS.includes(payment.method)) return rejected('invalid-method');
  if (!isPoisha(payment.amount)) return rejected('invalid-amount');

  if (payment.kind === 'correction') {
    const target = order.payments.find((p) => p.id === payment.corrects);
    if (!target || target.kind === 'correction') return rejected('invalid-correction-target');
    if (payment.amount === 0) return rejected('invalid-amount');
    if (!payment.reason.trim()) return rejected('reason-required');
    if (correctedAmount(order.payments, target.id) + payment.amount < 0) return rejected('correction-below-zero');
  } else {
    if (payment.amount <= 0) return rejected('invalid-amount');
    if (payment.corrects !== null) return rejected('invalid-correction-target');
    if (payment.kind === 'refund') {
      if (!payment.reason.trim()) return rejected('reason-required');
      if (payment.amount > netPaid(order.payments)) return rejected('refund-exceeds-paid');
    }
  }

  const recorded = { ...payment, at: event.at, by: event.staffId };
  const updated = { ...order, payments: [...order.payments, recorded], updatedAt: event.at };
  return applied({ ...state, orders: { ...state.orders, [order.id]: updated } });
}
