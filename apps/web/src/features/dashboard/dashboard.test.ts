import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { dashboardModel, todoRows } from './dashboard';

const TODAY = '2026-10-03';
/** 00:30 on 3 October in Dhaka, and 23:59 on 2 October. */
const JUST_AFTER_MIDNIGHT = '2026-10-02T18:30:00.000Z';
const LATE_YESTERDAY = '2026-10-02T17:59:00.000Z';

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'stitching', trialDate: TODAY, deliveryDate: '2026-10-06' }),
      makeItem({ id: 'b', stageKey: 'ready', deliveryDate: TODAY }),
    ],
    payments: [
      makePayment({ id: 'p1', amount: 100000, at: JUST_AFTER_MIDNIGHT }),
      makePayment({ id: 'p2', kind: 'refund', amount: 20000, reason: 'x' }),
    ],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    items: [makeItem({ id: 'c', stageKey: 'cutting', deliveryDate: '2026-10-01' })],
    payments: [
      makePayment({ id: 'p3', amount: 50000, at: LATE_YESTERDAY }),
      makePayment({ id: 'p4', kind: 'refund', amount: 10000, reason: 'x', at: LATE_YESTERDAY }),
      // The refund should have been ৳50, so today the shop holds ৳50 more.
      makePayment({ id: 'p5', kind: 'correction', amount: -5000, corrects: 'p4', reason: 'typo' }),
    ],
  }),
  makeOrder({
    id: 'o3',
    number: 'A-0003',
    items: [makeItem({ id: 'd', stageKey: 'delivered' })],
    payments: [makePayment({ id: 'p6', amount: 70000, at: LATE_YESTERDAY })],
  }),
];

describe('dashboardModel', () => {
  it('counts orders, garments and money for today', () => {
    const model = dashboardModel(orders, TODAY);
    expect(model).toMatchObject({
      openOrders: 2,
      inProgress: 2,
      readyGarments: 1,
      overdueGarments: 1,
      dueTotal: 85000,
      dueOrders: 2,
      collectedToday: 85000,
    });
    expect(model.trialsToday.map((r) => r.item.id)).toEqual(['a']);
    expect(model.deliveriesToday.map((r) => r.item.id)).toEqual(['b']);
    expect(model.overdue.map((r) => r.item.id)).toEqual(['c']);
    expect(model.ready.map((o) => o.id)).toEqual(['o1']);
  });

  it('is all zeros for a new shop', () => {
    expect(dashboardModel([], TODAY)).toEqual({
      openOrders: 0,
      inProgress: 0,
      readyGarments: 0,
      overdueGarments: 0,
      dueTotal: 0,
      dueOrders: 0,
      collectedToday: 0,
      trialsToday: [],
      deliveriesToday: [],
      overdue: [],
      ready: [],
    });
  });
});

describe('todoRows', () => {
  const mk = (n: number, fields: Parameters<typeof makeItem>[0]) =>
    makeOrder({ id: `x${n}`, number: `B-000${n}`, items: [makeItem({ id: `i${n}`, ...fields })] });

  it('lists trials, then deliveries, then the oldest late garments', () => {
    const list = [
      mk(1, { stageKey: 'cutting', deliveryDate: '2026-09-30' }),
      mk(2, { stageKey: 'cutting', deliveryDate: '2026-09-28' }),
      mk(3, { stageKey: 'stitching', trialDate: TODAY, deliveryDate: '2026-10-09' }),
      mk(4, { stageKey: 'stitching', deliveryDate: TODAY }),
    ];
    const rows = todoRows(dashboardModel(list, TODAY));
    expect(rows.map((r) => [r.kind, r.ref.item.id])).toEqual([
      ['trial', 'i3'],
      ['delivery', 'i4'],
      ['late', 'i2'],
      ['late', 'i1'],
    ]);
  });

  it('shows a garment once, even when it is both a trial and late', () => {
    const rows = todoRows(dashboardModel([mk(1, { stageKey: 'cutting', trialDate: TODAY, deliveryDate: '2026-09-30' })], TODAY));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('trial');
  });

  it('stops at six rows', () => {
    const list = Array.from({ length: 9 }, (_, i) => mk(i + 1, { stageKey: 'cutting', deliveryDate: '2026-09-01' }));
    expect(todoRows(dashboardModel(list, TODAY))).toHaveLength(6);
  });
});
