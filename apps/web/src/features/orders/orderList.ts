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

export type OrderStatusFilter = 'all' | 'open' | 'ready' | 'overdue' | 'closed';
export type OrderSort = 'newest' | 'oldest' | 'delivery' | 'balance';

export interface OrderListQuery {
  text: string;
  status: OrderStatusFilter;
  dueOnly: boolean;
  sort: OrderSort;
  /** 1-based. */
  page: number;
}

export const DEFAULT_LIST_QUERY: OrderListQuery = { text: '', status: 'all', dueOnly: false, sort: 'newest', page: 1 };
export const PAGE_SIZE = 20;

export interface OrderRow {
  order: Order;
  customer: Customer | undefined;
  progress: OrderProgress;
  /** Earliest promised date among garments not yet handed over. */
  nextDelivery: string | null;
  overdue: boolean;
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
  const workers: string[] = [];
  for (const item of order.items) {
    if (item.cancelled) continue;
    if (item.assignedTo && !workers.includes(item.assignedTo)) workers.push(item.assignedTo);
    const group = itemSummaryGroup(item);
    if (group === 'delivered') continue;
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
    total: orderTotal(order),
    balance: balanceDue(order),
    workers,
  };
}

function matchesStatus(row: OrderRow, status: OrderStatusFilter): boolean {
  switch (status) {
    case 'all':
      return true;
    case 'open':
      return !isOrderClosed(row.order);
    case 'ready':
      return row.progress.ready > 0;
    case 'overdue':
      return row.overdue;
    case 'closed':
      return isOrderClosed(row.order);
  }
}

function matchesText(row: OrderRow, text: string): boolean {
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

export function queryOrders(state: ShopState, query: OrderListQuery, today: string, pageSize = PAGE_SIZE): OrderPage {
  const matched = Object.values(state.orders)
    .map((order) => orderRow(order, state, today))
    .filter((row) => matchesStatus(row, query.status) && matchesText(row, query.text) && (!query.dueOnly || row.balance > 0))
    .sort(compare(query.sort));
  const pages = Math.max(1, Math.ceil(matched.length / pageSize));
  const page = Math.min(Math.max(1, Math.floor(query.page) || 1), pages);
  return { rows: matched.slice((page - 1) * pageSize, page * pageSize), total: matched.length, page, pages };
}

const STATUSES: readonly OrderStatusFilter[] = ['all', 'open', 'ready', 'overdue', 'closed'];
const SORTS: readonly OrderSort[] = ['newest', 'oldest', 'delivery', 'balance'];

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
  return params;
}
