import {
  deliveriesOn,
  isOrderClosed,
  itemSummaryGroup,
  netPaid,
  balanceDue,
  outstandingBalances,
  overdueItems,
  readyForPickup,
  todayInDhaka,
  trialsOn,
  type ItemRef,
  type Order,
  type Poisha,
  type PaymentMethod,
} from '@darzikhata/domain';

export interface DashboardModel {
  /** Orders with a garment not yet delivered or cancelled. */
  openOrders: number;
  /** Garments in an in-progress stage. */
  inProgress: number;
  /** Garments ready to collect. */
  readyGarments: number;
  overdueGarments: number;
  /** What customers still owe, over every order with a balance. */
  dueTotal: Poisha;
  dueOrders: number;
  /** Money in today (Dhaka date): advances and payments, less refunds, with corrections. Never called profit. */
  collectedToday: Poisha;
  trialsToday: ItemRef[];
  deliveriesToday: ItemRef[];
  overdue: ItemRef[];
  ready: Order[];
  /** Number of advances and payments taken today. */
  collectedCount: number;
  /** Today's money by how it came in. */
  collectedByMethod: Record<PaymentMethod, Poisha>;
  /** Time (HH:mm) of the first trial today, when trial dates carry one. */
  firstTrialTime: string | null;
  /** How many of today's delivery orders still have money owed. */
  deliveriesOwing: number;
  /** What ready orders still owe in total. */
  readyOwed: Poisha;
  /** Days the oldest late garment is past its delivery date, or null when none is late. */
  oldestLateDays: number | null;
}

const METHODS: PaymentMethod[] = ['cash', 'bkash', 'nagad', 'bank'];

function dayNumber(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!) / 86_400_000;
}

/** The time of the earliest trial that carries one ("2026-10-03T11:30"), or null. Dates alone carry no time. */
export function firstTrialTime(refs: ItemRef[]): string | null {
  const times = refs.flatMap((r) => /T(\d{2}:\d{2})/.exec(r.item.trialDate ?? '')?.[1] ?? []);
  return times.length === 0 ? null : times.sort()[0]!;
}

export type DayPart = 'morning' | 'afternoon' | 'evening' | 'night';

/** The part of the day in Dhaka (UTC+6), for the greeting. */
export function dayPart(now: Date): DayPart {
  const hour = new Date(now.getTime() + 6 * 3_600_000).getUTCHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 20) return 'evening';
  return 'night';
}

/**
 * Today's money for one order. A correction's direction depends on the record it corrects,
 * which may be from an earlier day, so this is everything held minus everything held
 * from other days, not a sum over today's records alone.
 */
function collectedOn(order: Order, today: string): Poisha {
  const others = order.payments.filter((p) => todayInDhaka(new Date(p.at)) !== today);
  return netPaid(order.payments) - netPaid(others);
}

function collectedByMethod(orders: Order[], today: string): Record<PaymentMethod, Poisha> {
  const split = { cash: 0, bkash: 0, nagad: 0, bank: 0 };
  for (const method of METHODS) {
    split[method] = orders.reduce((sum, o) => sum + collectedOn({ ...o, payments: o.payments.filter((p) => p.method === method) }, today), 0);
  }
  return split;
}

export function dashboardModel(orders: Order[], today: string): DashboardModel {
  let inProgress = 0;
  let readyGarments = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const group = itemSummaryGroup(item);
      if (group === 'unfinished') inProgress++;
      if (group === 'ready') readyGarments++;
    }
  }
  const due = outstandingBalances(orders);
  const overdue = overdueItems(orders, today);
  const trialsToday = trialsOn(orders, today);
  const deliveriesToday = deliveriesOn(orders, today);
  const ready = readyForPickup(orders);
  const deliveryOrders = new Map(deliveriesToday.map((r) => [r.order.id, r.order]));
  return {
    openOrders: orders.filter((o) => !isOrderClosed(o)).length,
    inProgress,
    readyGarments,
    overdueGarments: overdue.length,
    dueTotal: due.reduce((sum, r) => sum + r.balance, 0),
    dueOrders: due.length,
    collectedToday: orders.reduce((sum, o) => sum + collectedOn(o, today), 0),
    trialsToday,
    deliveriesToday,
    overdue,
    ready,
    collectedCount: orders.reduce(
      (n, o) => n + o.payments.filter((p) => (p.kind === 'advance' || p.kind === 'payment') && todayInDhaka(new Date(p.at)) === today).length,
      0,
    ),
    collectedByMethod: collectedByMethod(orders, today),
    firstTrialTime: firstTrialTime(trialsToday),
    deliveriesOwing: [...deliveryOrders.values()].filter((o) => balanceDue(o) > 0).length,
    readyOwed: ready.reduce((sum, o) => sum + Math.max(0, balanceDue(o)), 0),
    oldestLateDays: overdue.length === 0 ? null : Math.round(dayNumber(today) - dayNumber(overdue[0]!.item.deliveryDate!)),
  };
}

export const TODO_LIMIT = 6;
export type TodoKind = 'trial' | 'delivery' | 'late';
export interface TodoRow {
  kind: TodoKind;
  ref: ItemRef;
}

/** The phone's one list: today's trials, today's deliveries, then the oldest late garments. Each garment once. */
export function todoRows(model: DashboardModel, limit = TODO_LIMIT): TodoRow[] {
  const seen = new Set<string>();
  const rows: TodoRow[] = [];
  const groups: Array<[TodoKind, ItemRef[]]> = [
    ['trial', model.trialsToday],
    ['delivery', model.deliveriesToday],
    ['late', model.overdue],
  ];
  for (const [kind, refs] of groups) {
    for (const ref of refs) {
      if (seen.has(ref.item.id)) continue;
      seen.add(ref.item.id);
      rows.push({ kind, ref });
    }
  }
  return rows.slice(0, limit);
}
