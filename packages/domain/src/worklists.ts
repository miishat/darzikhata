import type { Order, OrderItem } from './model';
import type { Poisha } from './money';
import { itemSummaryGroup } from './orders';
import { balanceDue } from './payments';

/** Bangladesh is UTC+6 with no daylight saving. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Today's date in Dhaka as YYYY-MM-DD. */
export function todayInDhaka(now: Date): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

export interface ItemRef {
  order: Order;
  item: OrderItem;
}

function items(orders: Order[], keep: (item: OrderItem) => boolean): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (keep(item)) refs.push({ order, item });
    }
  }
  return refs;
}

const byNumber = (a: ItemRef, b: ItemRef) => a.order.number.localeCompare(b.order.number);

/** Unfinished items with a trial on the given date. */
export function trialsOn(orders: Order[], date: string): ItemRef[] {
  return items(orders, (i) => itemSummaryGroup(i) === 'unfinished' && i.trialDate === date).sort(byNumber);
}

/** Items promised for the given date that have not been handed over yet. */
export function deliveriesOn(orders: Order[], date: string): ItemRef[] {
  return items(orders, (i) => {
    const group = itemSummaryGroup(i);
    return (group === 'unfinished' || group === 'ready') && i.deliveryDate === date;
  }).sort(byNumber);
}

/** Unfinished items whose delivery date has passed, oldest first. */
export function overdueItems(orders: Order[], today: string): ItemRef[] {
  return items(
    orders,
    (i) => itemSummaryGroup(i) === 'unfinished' && i.deliveryDate !== null && i.deliveryDate < today,
  ).sort((a, b) => a.item.deliveryDate!.localeCompare(b.item.deliveryDate!) || byNumber(a, b));
}

/** Orders with at least one garment ready to collect. */
export function readyForPickup(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.items.some((i) => itemSummaryGroup(i) === 'ready'))
    .sort((a, b) => a.number.localeCompare(b.number));
}

/** Orders where the customer still owes money, largest first. */
export function outstandingBalances(orders: Order[]): Array<{ order: Order; balance: Poisha }> {
  return orders
    .map((order) => ({ order, balance: balanceDue(order) }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance || a.order.number.localeCompare(b.order.number));
}

/** Unfinished items assigned to a worker; pass null for unassigned items. */
export function itemsForWorker(orders: Order[], workerId: string | null): ItemRef[] {
  return items(orders, (i) => itemSummaryGroup(i) === 'unfinished' && i.assignedTo === workerId).sort(byNumber);
}
