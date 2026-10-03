import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import type { Payment } from './model';
import { moneySummary } from './payments';
import { eventFactory, newCustomer, newOrder, newOrderItem } from './testing/fixtures';

type PaymentInput = Omit<Payment, 'at' | 'by'>;

const pay = (overrides: Partial<PaymentInput> = {}): PaymentInput => ({
  id: 'p1',
  amount: 100000,
  method: 'cash',
  reference: '',
  kind: 'advance',
  corrects: null,
  reason: '',
  ...overrides,
});

function shop() {
  const ev = eventFactory();
  const base = [
    ev({ type: 'customer.created', customer: newCustomer() }),
    ev({
      type: 'order.created',
      order: newOrder({
        items: [
          newOrderItem({ id: 'shirt-1' }),
          newOrderItem({ id: 'shirt-2' }),
          newOrderItem({ id: 'panjabi-1', price: 100000 }),
        ],
      }),
    }),
  ];
  return { ev, base };
}

describe('payment.recorded', () => {
  it('records the spec example advance and derives a ৳1,400 balance', () => {
    const { ev, base } = shop();
    const { state } = replay([...base, ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() })]);
    const order = state.orders.o1!;
    expect(order.payments[0]).toMatchObject({ id: 'p1', by: 'staff-owner' });
    expect(moneySummary(order).balance).toBe(140000);
  });

  it('rejects invalid payments', () => {
    const { ev, base } = shop();
    const { outcomes } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'nope', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 0 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 10.5 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ method: 'card' as never }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
    ]);
    expect(outcomes.slice(2).map((o) => o.reason ?? o.outcome)).toEqual([
      'unknown-order',
      'invalid-amount',
      'invalid-amount',
      'invalid-method',
      'applied',
      'payment-exists',
    ]);
  });

  it('only refunds what has been paid, and needs a reason', () => {
    const { ev, base } = shop();
    const { outcomes, state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r1', kind: 'refund', amount: 150000, reason: 'r' }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r2', kind: 'refund', amount: 50000 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r3', kind: 'refund', amount: 50000, reason: 'r' }) }),
    ]);
    expect(outcomes.slice(3).map((o) => o.reason ?? o.outcome)).toEqual([
      'refund-exceeds-paid',
      'reason-required',
      'applied',
    ]);
    expect(moneySummary(state.orders.o1!).paid).toBe(50000);
  });

  it('corrects a payment with a new record instead of editing it', () => {
    const { ev, base } = shop();
    const { outcomes, state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({
        type: 'payment.recorded',
        orderId: 'o1',
        payment: pay({ id: 'c1', kind: 'correction', corrects: 'p1', amount: -50000, reason: 'typed 1000 not 500' }),
      }),
    ]);
    expect(outcomes.at(-1)!.outcome).toBe('applied');
    const order = state.orders.o1!;
    expect(order.payments.map((p) => p.amount)).toEqual([100000, -50000]);
    expect(moneySummary(order).paid).toBe(50000);
  });

  it('rejects invalid corrections', () => {
    const { ev, base } = shop();
    const correction = (overrides: Partial<PaymentInput>) =>
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ kind: 'correction', reason: 'r', ...overrides }) });
    const { outcomes } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      correction({ id: 'c1', corrects: 'nope', amount: -100 }),
      correction({ id: 'c2', corrects: 'p1', amount: 0 }),
      correction({ id: 'c3', corrects: 'p1', amount: -100, reason: '' }),
      correction({ id: 'c4', corrects: 'p1', amount: -200000 }),
      correction({ id: 'c5', corrects: 'p1', amount: -100 }),
      correction({ id: 'c6', corrects: 'c5', amount: -100 }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'p9', corrects: 'p1' }) }),
    ]);
    expect(outcomes.slice(3).map((o) => o.reason ?? o.outcome)).toEqual([
      'invalid-correction-target',
      'invalid-amount',
      'reason-required',
      'correction-below-zero',
      'applied',
      'invalid-correction-target',
      'invalid-correction-target',
    ]);
  });

  it('shows credit due after cancelling an overpaid item', () => {
    const { ev, base } = shop();
    const { state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 240000 }) }),
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: 'fabric not available' }),
    ]);
    expect(moneySummary(state.orders.o1!)).toEqual({ total: 140000, paid: 240000, balance: 0, creditDue: 100000 });
  });
});

describe('net paid floor', () => {
  it('rejects a correction that would push net paid below zero', () => {
    const { ev, base } = shop();
    const { outcomes, state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'p1', amount: 100000 }) }),
      ev({
        type: 'payment.recorded',
        orderId: 'o1',
        payment: pay({ id: 'p2', amount: 50000, kind: 'refund', reason: 'returned' }),
      }),
      ev({
        type: 'payment.recorded',
        orderId: 'o1',
        payment: pay({ id: 'p3', amount: 80000, kind: 'correction', corrects: 'p2', reason: 'typo' }),
      }),
    ]);
    expect(outcomes.at(-1)).toMatchObject({ outcome: 'rejected', reason: 'net-paid-below-zero' });
    expect(state.orders.o1!.payments).toHaveLength(2);
  });
});
