import {
  deliveriesOn,
  isOrderClosed,
  itemSummaryGroup,
  netPaid,
  outstandingBalances,
  overdueItems,
  readyForPickup,
  todayInDhaka,
  trialsOn,
  type ItemRef,
  type Order,
  type Poisha,
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
  return {
    openOrders: orders.filter((o) => !isOrderClosed(o)).length,
    inProgress,
    readyGarments,
    overdueGarments: overdue.length,
    dueTotal: due.reduce((sum, r) => sum + r.balance, 0),
    dueOrders: due.length,
    collectedToday: orders.reduce((sum, o) => sum + collectedOn(o, today), 0),
    trialsToday: trialsOn(orders, today),
    deliveriesToday: deliveriesOn(orders, today),
    overdue,
    ready: readyForPickup(orders),
  };
}
