import { balanceDue, isOrderClosed, type Customer, type Order } from '@darzikhata/domain';

export type DirectoryFilter = 'all' | 'owes' | 'open';

export interface DirectoryRow {
  customer: Customer;
  orderCount: number;
  /** Orders with a garment still to deliver. */
  openCount: number;
  /** What the customer owes across their orders; an overpaid order counts as nothing, not credit. */
  owed: number;
  /** When their newest order was taken, or null with no orders. */
  lastVisit: string | null;
}

/** One row per customer, in the order given, with what the directory shows about their orders. */
export function directoryRows(customers: Customer[], orders: Order[]): DirectoryRow[] {
  const byCustomer = new Map<string, Order[]>();
  for (const order of orders) {
    const list = byCustomer.get(order.customerId);
    if (list) list.push(order);
    else byCustomer.set(order.customerId, [order]);
  }
  return customers.map((customer) => {
    const theirs = byCustomer.get(customer.id) ?? [];
    let owed = 0;
    let openCount = 0;
    let lastVisit: string | null = null;
    for (const order of theirs) {
      owed += Math.max(0, balanceDue(order));
      if (!isOrderClosed(order)) openCount += 1;
      if (lastVisit === null || order.createdAt > lastVisit) lastVisit = order.createdAt;
    }
    return { customer, orderCount: theirs.length, openCount, owed, lastVisit };
  });
}

export function filterRows(rows: DirectoryRow[], filter: DirectoryFilter): DirectoryRow[] {
  if (filter === 'owes') return rows.filter((r) => r.owed > 0);
  if (filter === 'open') return rows.filter((r) => r.openCount > 0);
  return rows;
}

export function directoryCounts(rows: DirectoryRow[]): { all: number; owes: number; open: number; owedTotal: number } {
  return {
    all: rows.length,
    owes: rows.filter((r) => r.owed > 0).length,
    open: rows.filter((r) => r.openCount > 0).length,
    owedTotal: rows.reduce((sum, r) => sum + r.owed, 0),
  };
}
