import { describe, expect, it } from 'vitest';
import { balanceDue, correctedAmount, moneySummary, netPaid } from './payments';
import { makeItem, makePayment, spec54Order } from './testing/fixtures';

describe('payments', () => {
  it('derives the spec example balance of ৳1,400 after a ৳1,000 advance', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 100000 })] });
    expect(balanceDue(order)).toBe(140000);
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
  });

  it('adds partial payments and subtracts refunds', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'p2', kind: 'payment', amount: 50000 }),
      makePayment({ id: 'p3', kind: 'refund', amount: 20000 }),
    ];
    expect(netPaid(payments)).toBe(130000);
  });

  it('applies a correction as a signed delta to the payment it corrects', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'c1', kind: 'correction', corrects: 'p1', amount: -50000, reason: 'typed 1000 instead of 500' }),
    ];
    expect(netPaid(payments)).toBe(50000);
    expect(correctedAmount(payments, 'p1')).toBe(50000);
  });

  it('applies a correction to a refund in the refund direction', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'r1', kind: 'refund', amount: 50000 }),
      makePayment({ id: 'c1', kind: 'correction', corrects: 'r1', amount: -20000, reason: 'refund was 300' }),
    ];
    expect(correctedAmount(payments, 'r1')).toBe(30000);
    expect(netPaid(payments)).toBe(70000);
  });

  it('throws for an unknown payment id', () => {
    expect(() => correctedAmount([], 'nope')).toThrow('Unknown payment: nope');
  });

  it('shows credit due when a cancellation leaves the customer overpaid', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 200000 })] });
    order.items[2] = makeItem({ id: 'panjabi-1', price: 100000, cancelled: { reason: 'r', at: 'x', by: 'y' } });
    expect(balanceDue(order)).toBe(-60000);
    expect(moneySummary(order)).toEqual({ total: 140000, paid: 200000, balance: 0, creditDue: 60000 });
  });
});
