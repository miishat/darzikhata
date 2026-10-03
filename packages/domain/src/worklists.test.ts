import { describe, expect, it } from 'vitest';
import { makeItem, makeOrder, makePayment } from './testing/fixtures';
import {
  deliveriesOn,
  itemsForWorker,
  outstandingBalances,
  overdueItems,
  readyForPickup,
  todayInDhaka,
  trialsOn,
} from './worklists';

const cancelled = { reason: 'r', at: 'x', by: 'y' };

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'stitching', trialDate: '2026-10-03', deliveryDate: '2026-10-01', assignedTo: 't1' }),
      makeItem({ id: 'b', stageKey: 'ready', deliveryDate: '2026-10-03' }),
      makeItem({ id: 'c', stageKey: 'cutting', deliveryDate: '2026-10-03', cancelled }),
    ],
    payments: [makePayment({ amount: 50000 })],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    items: [
      makeItem({ id: 'd', stageKey: 'booked', trialDate: '2026-10-03', deliveryDate: '2026-09-28', assignedTo: null }),
      makeItem({ id: 'e', stageKey: 'delivered', deliveryDate: '2026-09-01' }),
    ],
    payments: [makePayment({ amount: 140000 })],
  }),
];

const ids = (refs: Array<{ item: { id: string } }>) => refs.map((r) => r.item.id);

describe('todayInDhaka', () => {
  it('uses Dhaka time, which is UTC+6', () => {
    expect(todayInDhaka(new Date('2026-10-03T17:59:00.000Z'))).toBe('2026-10-03');
    expect(todayInDhaka(new Date('2026-10-03T18:00:00.000Z'))).toBe('2026-10-04');
  });
});

describe('work lists', () => {
  it('lists unfinished trials for a date', () => {
    expect(ids(trialsOn(orders, '2026-10-03'))).toEqual(['a', 'd']);
  });

  it('lists deliveries due on a date, excluding cancelled and delivered items', () => {
    expect(ids(deliveriesOn(orders, '2026-10-03'))).toEqual(['b']);
  });

  it('lists overdue unfinished items, oldest first', () => {
    expect(ids(overdueItems(orders, '2026-10-03'))).toEqual(['d', 'a']);
  });

  it('lists orders with something ready to collect', () => {
    expect(readyForPickup(orders).map((o) => o.id)).toEqual(['o1']);
  });

  it('lists outstanding balances, largest first', () => {
    expect(outstandingBalances(orders).map((r) => [r.order.id, r.balance])).toEqual([['o1', 90000]]);
  });

  it('lists unfinished work for a worker or unassigned work', () => {
    expect(ids(itemsForWorker(orders, 't1'))).toEqual(['a']);
    expect(ids(itemsForWorker(orders, null))).toEqual(['d']);
  });
});
