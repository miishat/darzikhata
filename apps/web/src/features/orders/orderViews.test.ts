import { emptyState, type ShopState } from '@darzikhata/domain';
import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_QUERY, orderRow } from './orderList';
import { ORDER_VIEWS, countViews, inView, viewOfQuery, viewQuery } from './orderViews';

const TODAY = '2026-10-03';

function state(): ShopState {
  const orders = [
    // Open, late, trial today, owes money.
    makeOrder({ id: 'o1', number: 'A-0001', customerId: 'c', items: [makeItem({ id: 'a', deliveryDate: '2026-09-30', trialDate: TODAY })] }),
    // One ready, one delivered, paid in full.
    makeOrder({
      id: 'o2', number: 'A-0002', customerId: 'c',
      items: [makeItem({ id: 'b', stageKey: 'ready', deliveryDate: '2026-10-04' }), makeItem({ id: 'c', stageKey: 'delivered' })],
      payments: [makePayment({ amount: 140000 })],
    }),
    // Closed (delivered), overpaid.
    makeOrder({ id: 'o3', number: 'A-0003', customerId: 'c', items: [makeItem({ id: 'd', stageKey: 'delivered' })], payments: [makePayment({ amount: 200000 })] }),
    // Open, later, owes money.
    makeOrder({ id: 'o4', number: 'B-0001', customerId: 'c', items: [makeItem({ id: 'e', deliveryDate: '2026-10-10', price: 140000 })] }),
  ];
  return { ...emptyState(), orders: Object.fromEntries(orders.map((o) => [o.id, o])) };
}

const row = (id: string) => {
  const s = state();
  return orderRow(s.orders[id]!, s, TODAY);
};

describe('inView', () => {
  it('All holds every order', () => {
    expect(['o1', 'o2', 'o3', 'o4'].every((id) => inView(row(id), 'all'))).toBe(true);
  });
  it('Open holds orders that are not closed', () => {
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => inView(row(id), 'open'))).toEqual([true, true, false, true]);
  });
  it('Trial holds orders with a garment at trial or with a trial today', () => {
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => inView(row(id), 'trial'))).toEqual([true, false, false, false]);
  });
  it('Ready holds orders with a garment ready to collect', () => {
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => inView(row(id), 'ready'))).toEqual([false, true, false, false]);
  });
  it('Late holds orders with an unfinished garment past its date', () => {
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => inView(row(id), 'late'))).toEqual([true, false, false, false]);
  });
  it('Owed holds orders that still owe money, not overpaid ones', () => {
    expect(['o1', 'o2', 'o3', 'o4'].map((id) => inView(row(id), 'owed'))).toEqual([true, false, false, true]);
  });
});

describe('countViews', () => {
  it('counts each view, and an order may be in several', () => {
    expect(countViews(state(), TODAY)).toEqual({ all: 4, open: 3, trial: 1, ready: 1, late: 1, owed: 2 });
    // o1 is in open, trial, late and owed at once, so the views overlap and do not add up to All.
    const memberships = ORDER_VIEWS.filter((v) => inView(row('o1'), v));
    expect(memberships).toEqual(['all', 'open', 'trial', 'late', 'owed']);
  });

  it('agrees with filtering the list by each view', () => {
    const s = state();
    const counts = countViews(s, TODAY);
    for (const view of ORDER_VIEWS) {
      const n = Object.values(s.orders).filter((o) => inView(orderRow(o, s, TODAY), view)).length;
      expect(counts[view]).toBe(n);
    }
  });
});

describe('viewQuery and viewOfQuery', () => {
  it('maps a view onto the status and owed filters the phone chips use', () => {
    expect(viewQuery('late')).toEqual({ status: 'overdue', dueOnly: false });
    expect(viewQuery('owed')).toEqual({ status: 'all', dueOnly: true });
    expect(viewQuery('all')).toEqual({ status: 'all', dueOnly: false });
  });

  it('reads the view back from a query', () => {
    expect(viewOfQuery({ ...DEFAULT_LIST_QUERY, status: 'overdue' }, true)).toBe('late');
    expect(viewOfQuery({ ...DEFAULT_LIST_QUERY, dueOnly: true }, true)).toBe('owed');
    expect(viewOfQuery({ ...DEFAULT_LIST_QUERY, dueOnly: true }, false)).toBe('all');
  });

  it('has no tab for filters the tabs cannot show', () => {
    expect(viewOfQuery({ ...DEFAULT_LIST_QUERY, status: 'closed' }, true)).toBeNull();
    expect(viewOfQuery({ ...DEFAULT_LIST_QUERY, status: 'ready', dueOnly: true }, true)).toBeNull();
  });
});
