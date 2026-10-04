import {
  balanceDue,
  customerMatchScore,
  isOrderClosed,
  itemSummaryGroup,
  orderNumberMatches,
  orderProgress,
  orderTotal,
  type Customer,
  type Order,
  type OrderProgress,
  type Poisha,
  type ShopState,
} from '@darzikhata/domain';

export type OrderStatusFilter = 'all' | 'open' | 'trial' | 'ready' | 'overdue' | 'closed';
export type OrderSort = 'newest' | 'oldest' | 'delivery' | 'balance';

export interface OrderListQuery {
  text: string;
  status: OrderStatusFilter;
  dueOnly: boolean;
  sort: OrderSort;
  /** 1-based. */
  page: number;
  /** A staff id: only orders with a garment made by this person. Empty for anyone. */
  worker: string;
  /** Next delivery on or after this date (YYYY-MM-DD). Empty for no limit. */
  from: string;
  /** Next delivery on or before this date (YYYY-MM-DD). Empty for no limit. */
  to: string;
}

export const DEFAULT_LIST_QUERY: OrderListQuery = { text: '', status: 'all', dueOnly: false, sort: 'newest', page: 1, worker: '', from: '', to: '' };
export const PAGE_SIZE = 20;

export interface OrderRow {
  order: Order;
  customer: Customer | undefined;
  progress: OrderProgress;
  /** Earliest promised date among garments not yet handed over. */
  nextDelivery: string | null;
  overdue: boolean;
  /** A garment is at the trial stage or has its trial today (not delivered, not cancelled). */
  trial: boolean;
  total: Poisha;
  /** Negative when the shop owes the customer. */
  balance: Poisha;
  /** Staff ids of the garments' makers, once each, cancelled garments left out. */
  workers: string[];
}

export interface OrderPage {
  rows: OrderRow[];
  total: number;
  page: number;
  pages: number;
}

export function orderRow(order: Order, state: ShopState, today: string): OrderRow {
  let nextDelivery: string | null = null;
  let overdue = false;
  let trial = false;
  const workers: string[] = [];
  for (const item of order.items) {
    if (item.cancelled) continue;
    if (item.assignedTo && !workers.includes(item.assignedTo)) workers.push(item.assignedTo);
    const group = itemSummaryGroup(item);
    if (group === 'delivered') continue;
    if (group === 'unfinished' && (item.stageKey === 'trial' || item.trialDate === today)) trial = true;
    if (item.deliveryDate) {
      if (nextDelivery === null || item.deliveryDate < nextDelivery) nextDelivery = item.deliveryDate;
      if (group === 'unfinished' && item.deliveryDate < today) overdue = true;
    }
  }
  return {
    order,
    customer: state.customers[order.customerId],
    progress: orderProgress(order),
    nextDelivery,
    overdue,
    trial,
    total: orderTotal(order),
    balance: balanceDue(order),
    workers,
  };
}

export function matchesStatus(row: OrderRow, status: OrderStatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'open':
      return !isOrderClosed(row.order);
    case 'trial':
      return row.trial;
    case 'ready':
      return row.progress.ready > 0;
    case 'overdue':
      return row.overdue;
    case 'closed':
      return isOrderClosed(row.order);
  }
}

function matchesRange(row: OrderRow, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (row.nextDelivery === null) return false;
  return (!from || row.nextDelivery >= from) && (!to || row.nextDelivery <= to);
}

export function matchesText(row: OrderRow, text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  return (
    orderNumberMatches(row.order.number, trimmed) || (!!row.customer && customerMatchScore(row.customer, trimmed) > 0)
  );
}

function compare(sort: OrderSort): (a: OrderRow, b: OrderRow) => number {
  const byNumber = (a: OrderRow, b: OrderRow) => a.order.number.localeCompare(b.order.number);
  switch (sort) {
    case 'newest':
      return (a, b) => b.order.createdAt.localeCompare(a.order.createdAt) || byNumber(b, a);
    case 'oldest':
      return (a, b) => a.order.createdAt.localeCompare(b.order.createdAt) || byNumber(a, b);
    case 'delivery':
      return (a, b) => {
        if (a.nextDelivery !== b.nextDelivery) {
          if (a.nextDelivery === null) return 1;
          if (b.nextDelivery === null) return -1;
          return a.nextDelivery.localeCompare(b.nextDelivery);
        }
        return byNumber(a, b);
      };
    case 'balance':
      return (a, b) => b.balance - a.balance || byNumber(a, b);
  }
}

/** Orders per chip. The search text is ignored on purpose, so the numbers stay put while typing. */
export function statusCounts(state: ShopState, today: string): Record<OrderStatusFilter | 'owed', number> {
  const counts = { all: 0, open: 0, trial: 0, ready: 0, overdue: 0, closed: 0, owed: 0 };
  for (const order of Object.values(state.orders)) {
    const row = orderRow(order, state, today);
    for (const status of STATUSES) if (matchesStatus(row, status)) counts[status] += 1;
    if (row.balance > 0) counts.owed += 1;
  }
  return counts;
}

export function queryOrders(state: ShopState, query: OrderListQuery, today: string, pageSize = PAGE_SIZE): OrderPage {
  const matched = Object.values(state.orders)
    .map((order) => orderRow(order, state, today))
    .filter(
      (row) =>
        matchesStatus(row, query.status) &&
        matchesText(row, query.text) &&
        (!query.dueOnly || row.balance > 0) &&
        (!query.worker || row.workers.includes(query.worker)) &&
        matchesRange(row, query.from, query.to),
    )
    .sort(compare(query.sort));
  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(query.page) || 1), pages);
  return { rows: matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length, page, pages };
}

const STATUSES: readonly OrderStatusFilter[] = ['all', 'open', 'trial', 'ready', 'overdue', 'closed'];
const SORTS: readonly OrderSort[] = ['newest', 'oldest', 'delivery', 'balance'];

function readDate(value: string | null): string {
  if (!value || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return '';
  const [y, m, d] = value.split('-').map(Number);
  const real = new Date(Date.UTC(y!, m! - 1, d!));
  return real.getUTCFullYear() === y && real.getUTCMonth() === m! - 1 && real.getUTCDate() === d ? value : '';
}

/** Reads the list state from the URL; anything unknown falls back to the default. */
export function readListQuery(params: URLSearchParams): OrderListQuery {
  const status = params.get('status') as OrderStatusFilter | null;
  const sort = params.get('sort') as OrderSort | null;
  const page = Number(params.get('page'));
  return {
    text: params.get('q') ?? DEFAULT_LIST_QUERY.text,
    status: status && STATUSES.includes(status) ? status : DEFAULT_LIST_QUERY.status,
    dueOnly: params.get('due') === '1',
    sort: sort && SORTS.includes(sort) ? sort : DEFAULT_LIST_QUERY.sort,
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULT_LIST_QUERY.page,
    worker: params.get('worker') ?? DEFAULT_LIST_QUERY.worker,
    from: readDate(params.get('from')),
    to: readDate(params.get('to')),
  };
}

/** The URL form of a list state, leaving defaults out. */
export function writeListQuery(query: OrderListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.text) params.set('q', query.text);
  if (query.status !== DEFAULT_LIST_QUERY.status) params.set('status', query.status);
  if (query.dueOnly) params.set('due', '1');
  if (query.sort !== DEFAULT_LIST_QUERY.sort) params.set('sort', query.sort);
  if (query.page !== DEFAULT_LIST_QUERY.page) params.set('page', String(query.page));
  if (query.worker) params.set('worker', query.worker);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  return params;
}
