import { emptyState, type ShopState } from '@darzikhata/domain';
import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_QUERY, orderRow, queryOrders, readListQuery, writeListQuery, type OrderListQuery } from './orderList';

const TODAY = '2026-10-03';
const customer = (id: string, name: string, phone: string) => ({
  id, name, nameAlt: null, phone, householdId: null, gender: 'male' as const, notes: '', createdAt: '', version: 1,
});

function state(): ShopState {
  const orders = [
    // Open, overdue, owes ৳700.
    makeOrder({ id: 'o1', number: 'A-0001', customerId: 'rahim', createdAt: '2026-09-01T05:00:00.000Z', items: [makeItem({ id: 'a', deliveryDate: '2026-09-30', assignedTo: 'tailor-1' })] }),
    // One garment ready, one delivered; paid in full.
    makeOrder({
      id: 'o2', number: 'A-0002', customerId: 'karim', createdAt: '2026-09-20T05:00:00.000Z',
      items: [makeItem({ id: 'b', stageKey: 'ready', deliveryDate: '2026-10-04', assignedTo: 'tailor-2' }), makeItem({ id: 'c', stageKey: 'delivered', deliveryDate: '2026-10-01', assignedTo: 'tailor-1' })],
      payments: [makePayment({ amount: 140000 })],
    }),
    // Closed: delivered and cancelled; overpaid, so the shop owes credit.
    makeOrder({
      id: 'o3', number: 'A-0003', customerId: 'rahim', createdAt: '2026-09-25T05:00:00.000Z',
      items: [makeItem({ id: 'd', stageKey: 'delivered', deliveryDate: '2026-09-28' }), makeItem({ id: 'e', cancelled: { reason: 'x', at: '', by: '' }, assignedTo: 'tailor-2' })],
      payments: [makePayment({ amount: 100000 })],
    }),
    // Open, due later, owes ৳1,400.
    makeOrder({ id: 'o4', number: 'B-0001', customerId: 'karim', createdAt: '2026-10-02T05:00:00.000Z', items: [makeItem({ id: 'f', deliveryDate: '2026-10-10', price: 140000 })] }),
  ];
  return {
    ...emptyState(),
    customers: { rahim: customer('rahim', 'রহিম উদ্দিন', '01712345678'), karim: customer('karim', 'করিম', '01811000000') },
    orders: Object.fromEntries(orders.map((o) => [o.id, o])),
  };
}

const numbers = (query: Partial<OrderListQuery>, pageSize?: number) =>
  queryOrders(state(), { ...DEFAULT_LIST_QUERY, ...query }, TODAY, pageSize).rows.map((r) => r.order.number);

describe('orderRow', () => {
  it('derives progress, next delivery, overdue, money and workers', () => {
    const s = state();
    expect(orderRow(s.orders['o2']!, s, TODAY)).toMatchObject({
      customer: { id: 'karim' },
      progress: { unfinished: 0, ready: 1, delivered: 1, cancelled: 0, total: 2 },
      nextDelivery: '2026-10-04',
      overdue: false,
      total: 140000,
      balance: 0,
      workers: ['tailor-2', 'tailor-1'],
    });
    expect(orderRow(s.orders['o1']!, s, TODAY)).toMatchObject({ overdue: true, balance: 70000 });
    expect(orderRow(s.orders['o3']!, s, TODAY)).toMatchObject({ nextDelivery: null, balance: -30000, workers: [] });
  });
});

describe('queryOrders', () => {
  it('lists newest first by default', () => {
    expect(numbers({})).toEqual(['B-0001', 'A-0003', 'A-0002', 'A-0001']);
    expect(numbers({ sort: 'oldest' })).toEqual(['A-0001', 'A-0002', 'A-0003', 'B-0001']);
  });

  it('filters by status', () => {
    expect(numbers({ status: 'open' })).toEqual(['B-0001', 'A-0002', 'A-0001']);
    expect(numbers({ status: 'ready' })).toEqual(['A-0002']);
    expect(numbers({ status: 'overdue' })).toEqual(['A-0001']);
    expect(numbers({ status: 'closed' })).toEqual(['A-0003']);
  });

  it('searches order numbers, names and phones, combined with other filters', () => {
    expect(numbers({ text: '1' })).toEqual(['B-0001', 'A-0001']);
    expect(numbers({ text: 'রহিম' })).toEqual(['A-0003', 'A-0001']);
    expect(numbers({ text: '০১৮১১' })).toEqual(['B-0001', 'A-0002']);
    expect(numbers({ text: 'রহিম', status: 'open' })).toEqual(['A-0001']);
  });

  it('shows only orders with money owed, largest balance first when sorted by balance', () => {
    expect(numbers({ dueOnly: true, sort: 'balance' })).toEqual(['B-0001', 'A-0001']);
  });

  it('sorts by next delivery with finished orders last', () => {
    expect(numbers({ sort: 'delivery' })).toEqual(['A-0001', 'A-0002', 'B-0001', 'A-0003']);
  });

  it('pages results and keeps the page in range', () => {
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, page: 2 }, TODAY, 3)).toMatchObject({ total: 4, page: 2, pages: 2 });
    expect(numbers({ page: 2 }, 3)).toEqual(['A-0001']);
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, page: 9 }, TODAY, 3).page).toBe(2);
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, text: 'nobody' }, TODAY)).toMatchObject({ rows: [], total: 0, page: 1, pages: 1 });
  });
});

describe('list query in the URL', () => {
  it('round-trips and leaves defaults out', () => {
    const query: OrderListQuery = { text: 'রহিম', status: 'overdue', dueOnly: true, sort: 'delivery', page: 3 };
    const params = writeListQuery(query);
    expect(params.toString()).toBe('q=%E0%A6%B0%E0%A6%B9%E0%A6%BF%E0%A6%AE&status=overdue&due=1&sort=delivery&page=3');
    expect(readListQuery(params)).toEqual(query);
    expect(writeListQuery(DEFAULT_LIST_QUERY).toString()).toBe('');
  });

  it('ignores values it does not know', () => {
    expect(readListQuery(new URLSearchParams('status=lost&sort=random&page=-2&due=yes'))).toEqual(DEFAULT_LIST_QUERY);
  });
});
