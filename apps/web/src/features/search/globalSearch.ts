import { orderNumberMatches, searchCustomers, type Customer, type Order, type ShopState } from '@darzikhata/domain';

export type SearchHit =
  | { kind: 'order'; order: Order; customer: Customer | null }
  | { kind: 'customer'; customer: Customer };

/**
 * One search box for customers and orders. An order whose number matches is the most precise
 * hit, so order hits come first, newest number first. Customers follow in the domain's ranking:
 * phone match, then name text, then a sound-alike name across Bangla and English.
 */
export function globalSearch(state: ShopState, query: string, limit = 8): SearchHit[] {
  if (!query.trim()) return [];
  const orders: SearchHit[] = Object.values(state.orders)
    .filter((order) => orderNumberMatches(order.number, query))
    .sort((a, b) => b.number.localeCompare(a.number))
    .map((order) => ({ kind: 'order', order, customer: state.customers[order.customerId] ?? null }));
  const customers: SearchHit[] = searchCustomers(Object.values(state.customers), query, limit).map((customer) => ({
    kind: 'customer',
    customer,
  }));
  return [...orders, ...customers].slice(0, limit);
}
