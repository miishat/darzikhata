import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { directoryCounts, directoryRows, filterRows } from './directoryView';

const customer = (id: string) => ({
  id, name: id, nameAlt: null, phone: null, householdId: null, gender: 'male' as const, notes: '', createdAt: '', version: 1,
});

const orders = [
  // rahim: open and owes the full price.
  makeOrder({ id: 'o1', customerId: 'rahim', createdAt: '2026-09-01T05:00:00.000Z', items: [makeItem({ id: 'a', price: 70000 })] }),
  // rahim: delivered and paid in full, the newest visit.
  makeOrder({
    id: 'o2', customerId: 'rahim', createdAt: '2026-09-20T05:00:00.000Z',
    items: [makeItem({ id: 'b', stageKey: 'delivered', price: 50000 })],
    payments: [makePayment({ amount: 50000 })],
  }),
  // karim: delivered but overpaid, which is not money owed.
  makeOrder({
    id: 'o3', customerId: 'karim', createdAt: '2026-09-10T05:00:00.000Z',
    items: [makeItem({ id: 'c', stageKey: 'delivered', price: 30000 })],
    payments: [makePayment({ amount: 40000 })],
  }),
];

describe('directoryRows', () => {
  it('sums what each customer owes, counts open orders and finds the last visit, keeping the given order', () => {
    const rows = directoryRows([customer('karim'), customer('rahim'), customer('nobody')], orders);
    expect(rows.map((r) => r.customer.id)).toEqual(['karim', 'rahim', 'nobody']);
    expect(rows[1]).toMatchObject({ orderCount: 2, openCount: 1, owed: 70000, lastVisit: '2026-09-20T05:00:00.000Z' });
    expect(rows[0]).toMatchObject({ orderCount: 1, openCount: 0, owed: 0 });
    expect(rows[2]).toMatchObject({ orderCount: 0, openCount: 0, owed: 0, lastVisit: null });
  });
});

describe('filterRows and directoryCounts', () => {
  const rows = directoryRows([customer('karim'), customer('rahim'), customer('nobody')], orders);

  it('narrows to customers who owe money or have an open order', () => {
    expect(filterRows(rows, 'all')).toHaveLength(3);
    expect(filterRows(rows, 'owes').map((r) => r.customer.id)).toEqual(['rahim']);
    expect(filterRows(rows, 'open').map((r) => r.customer.id)).toEqual(['rahim']);
  });

  it('counts each filter and totals what is owed', () => {
    expect(directoryCounts(rows)).toEqual({ all: 3, owes: 1, open: 1, owedTotal: 70000 });
  });
});
