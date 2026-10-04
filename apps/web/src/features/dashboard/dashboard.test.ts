import type { OrderItem } from '@darzikhata/domain';
import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { dashboardModel, dayPart, firstTrialTime, todoRows } from './dashboard';

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
      collectedCount: 0,
      collectedByMethod: { cash: 0, bkash: 0, nagad: 0, bank: 0 },
      firstTrialTime: null,
      deliveriesOwing: 0,
      readyOwed: 0,
      oldestLateDays: null,
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

describe('tile sub-lines', () => {
  const owing = (id: string, n: number, items: OrderItem[], paid: number) =>
    makeOrder({
      id,
      number: `C-000${n}`,
      items,
      payments: paid > 0 ? [makePayment({ id: `pay-${id}`, amount: paid, at: LATE_YESTERDAY })] : [],
    });

  it('counts the orders delivering today that still owe money', () => {
    const list = [
      owing('d1', 1, [makeItem({ id: 'a', price: 10000, stageKey: 'ready', deliveryDate: TODAY }), makeItem({ id: 'b', price: 5000, stageKey: 'ready', deliveryDate: TODAY })], 0),
      owing('d2', 2, [makeItem({ id: 'p', price: 10000, stageKey: 'ready', deliveryDate: TODAY })], 10000),
      owing('d3', 3, [makeItem({ id: 'c', price: 10000, stageKey: 'ready', deliveryDate: TODAY })], 4000),
    ];
    const model = dashboardModel(list, TODAY);
    expect(model.deliveriesToday).toHaveLength(4);
    expect(model.deliveriesOwing).toBe(2);
  });

  it('is zero when nothing is delivering today', () => {
    expect(dashboardModel([], TODAY).deliveriesOwing).toBe(0);
  });

  it('totals what ready orders still owe', () => {
    const list = [
      owing('r1', 1, [makeItem({ id: 'a', price: 20000, stageKey: 'ready' })], 5000),
      owing('r2', 2, [makeItem({ id: 'b', price: 7000, stageKey: 'ready' })], 0),
      owing('r3', 3, [makeItem({ id: 'c', price: 9000, stageKey: 'cutting' })], 0),
    ];
    expect(dashboardModel(list, TODAY).readyOwed).toBe(22000);
  });

  it('is zero when nothing is ready', () => {
    expect(dashboardModel([], TODAY).readyOwed).toBe(0);
  });

  it('gives the age in days of the oldest late garment', () => {
    const list = [
      makeOrder({ id: 'l1', number: 'L-0001', items: [makeItem({ id: 'a', stageKey: 'cutting', deliveryDate: '2026-10-01' })] }),
      makeOrder({ id: 'l2', number: 'L-0002', items: [makeItem({ id: 'b', stageKey: 'cutting', deliveryDate: '2026-09-28' })] }),
    ];
    expect(dashboardModel(list, TODAY).oldestLateDays).toBe(5);
  });

  it('has no late age when nothing is late', () => {
    expect(dashboardModel([], TODAY).oldestLateDays).toBeNull();
  });

  it('shows no trial time when the trial date carries none', () => {
    expect(dashboardModel(orders, TODAY).firstTrialTime).toBeNull();
    expect(firstTrialTime([])).toBeNull();
  });

  it('reads the time of the first trial when the date carries one', () => {
    const at = (id: string, trialDate: string) => ({ order: orders[0]!, item: makeItem({ id, trialDate }) });
    expect(firstTrialTime([at('a', `${TODAY}T16:00`), at('b', `${TODAY}T11:30`)])).toBe('11:30');
  });
});

describe('today money split', () => {
  it('counts payments and splits today by method', () => {
    const list = [
      makeOrder({
        id: 'm1',
        number: 'M-0001',
        items: [makeItem({ id: 'a' })],
        payments: [
          makePayment({ id: 'a1', amount: 30000, method: 'cash', at: JUST_AFTER_MIDNIGHT }),
          makePayment({ id: 'a2', amount: 20000, method: 'bkash', at: JUST_AFTER_MIDNIGHT }),
          makePayment({ id: 'a3', amount: 90000, method: 'cash', at: LATE_YESTERDAY }),
        ],
      }),
    ];
    const model = dashboardModel(list, TODAY);
    expect(model.collectedCount).toBe(2);
    expect(model.collectedByMethod).toEqual({ cash: 30000, bkash: 20000, nagad: 0, bank: 0 });
  });

  it('keeps the split summing to the total when a correction has a different method than its target', () => {
    const list = [
      makeOrder({
        id: 'm2',
        number: 'M-0002',
        items: [makeItem({ id: 'a' })],
        payments: [
          makePayment({ id: 'b1', amount: 50000, method: 'cash', at: LATE_YESTERDAY }),
          makePayment({ id: 'b2', kind: 'refund', amount: 10000, method: 'cash', reason: 'x', at: LATE_YESTERDAY }),
          makePayment({ id: 'b3', kind: 'correction', amount: -5000, method: 'bkash', corrects: 'b2', reason: 'typo', at: JUST_AFTER_MIDNIGHT }),
        ],
      }),
    ];
    const model = dashboardModel(list, TODAY);
    expect(model.collectedToday).toBe(5000);
    expect(model.collectedByMethod).toEqual({ cash: 0, bkash: 5000, nagad: 0, bank: 0 });
    expect(Object.values(model.collectedByMethod).reduce((a, b) => a + b, 0)).toBe(model.collectedToday);
  });

  it('subtracts a refund from its own method and still sums to the total', () => {
    const list = [
      makeOrder({
        id: 'm3',
        number: 'M-0003',
        items: [makeItem({ id: 'a' })],
        payments: [
          makePayment({ id: 'c1', amount: 40000, method: 'cash', at: JUST_AFTER_MIDNIGHT }),
          makePayment({ id: 'c2', amount: 20000, method: 'nagad', at: JUST_AFTER_MIDNIGHT }),
          makePayment({ id: 'c3', kind: 'refund', amount: 15000, method: 'cash', reason: 'x', at: JUST_AFTER_MIDNIGHT }),
        ],
      }),
    ];
    const model = dashboardModel(list, TODAY);
    expect(model.collectedByMethod).toEqual({ cash: 25000, bkash: 0, nagad: 20000, bank: 0 });
    expect(Object.values(model.collectedByMethod).reduce((a, b) => a + b, 0)).toBe(model.collectedToday);
  });

  it('is empty on a quiet day', () => {
    const model = dashboardModel([], TODAY);
    expect(model.collectedCount).toBe(0);
    expect(model.collectedByMethod).toEqual({ cash: 0, bkash: 0, nagad: 0, bank: 0 });
  });
});

describe('dayPart', () => {
  // Dhaka is UTC+6.
  it.each([
    ['2026-10-03T00:00:00Z', 'morning'],
    ['2026-10-03T06:30:00Z', 'afternoon'],
    ['2026-10-03T11:30:00Z', 'evening'],
    ['2026-10-03T15:00:00Z', 'night'],
    ['2026-10-02T21:59:00Z', 'night'],
  ])('%s is %s in Dhaka', (iso, part) => {
    expect(dayPart(new Date(iso))).toBe(part);
  });
});
