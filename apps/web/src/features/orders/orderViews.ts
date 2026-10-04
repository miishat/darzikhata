import type { ShopState } from '@darzikhata/domain';
import { matchesStatus, statusCounts, type OrderListQuery, type OrderRow, type OrderStatusFilter } from './orderList';

/** The desktop view tabs. They are the phone's status chips under another name: Late is the overdue status and Owed is the money-due filter. */
export type OrderView = 'all' | 'open' | 'trial' | 'ready' | 'late' | 'owed';

export const ORDER_VIEWS: readonly OrderView[] = ['all', 'open', 'trial', 'ready', 'late', 'owed'];

const STATUS_OF: Record<Exclude<OrderView, 'owed'>, OrderStatusFilter> = {
  all: 'all',
  open: 'open',
  trial: 'trial',
  ready: 'ready',
  late: 'overdue',
};

/** Whether an order belongs to a view. An order can be in several views at once. */
export function inView(row: OrderRow, view: OrderView): boolean {
  return view === 'owed' ? row.balance > 0 : matchesStatus(row, STATUS_OF[view]);
}

/** Orders per view, ignoring the search text. */
export function countViews(state: ShopState, today: string): Record<OrderView, number> {
  const c = statusCounts(state, today);
  return { all: c.all, open: c.open, trial: c.trial, ready: c.ready, late: c.overdue, owed: c.owed };
}

/** The URL filters a view stands for. The address keeps the phone's `status` and `due` params. */
export function viewQuery(view: OrderView): Pick<OrderListQuery, 'status' | 'dueOnly'> {
  return view === 'owed' ? { status: 'all', dueOnly: true } : { status: STATUS_OF[view], dueOnly: false };
}

/**
 * The view a query is showing, or null when no single tab matches (finished orders, or a status
 * together with money due), so the caller can list those filters as chips instead.
 * Without money access the owed filter does not apply.
 */
export function viewOfQuery(query: Pick<OrderListQuery, 'status' | 'dueOnly'>, money: boolean): OrderView | null {
  const owed = query.dueOnly && money;
  if (owed) return query.status === 'all' ? 'owed' : null;
  return ORDER_VIEWS.find((v) => v !== 'owed' && STATUS_OF[v] === query.status) ?? null;
}
