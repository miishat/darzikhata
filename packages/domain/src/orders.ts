import type { Order, OrderItem } from './model';
import type { Poisha } from './money';
import { stageGroup, type SummaryGroup } from './stages';

export function itemSummaryGroup(item: OrderItem): SummaryGroup {
  return item.cancelled ? 'cancelled' : stageGroup(item.stages, item.stageKey);
}

/** Sum of prices of items that are not cancelled. */
export function subtotal(order: Order): Poisha {
  return order.items.filter((i) => !i.cancelled).reduce((sum, i) => sum + i.price, 0);
}

export function adjustmentsTotal(order: Order): Poisha {
  return order.priceAdjustments.reduce((sum, a) => sum + a.amount, 0);
}

/** Subtotal minus discount plus price adjustments, never below zero. */
export function orderTotal(order: Order): Poisha {
  return Math.max(0, subtotal(order) - (order.discount?.amount ?? 0) + adjustmentsTotal(order));
}

export interface OrderProgress {
  unfinished: number;
  ready: number;
  delivered: number;
  cancelled: number;
  total: number;
}

export function orderProgress(order: Order): OrderProgress {
  const progress: OrderProgress = { unfinished: 0, ready: 0, delivered: 0, cancelled: 0, total: order.items.length };
  for (const item of order.items) progress[itemSummaryGroup(item)] += 1;
  return progress;
}

/** An order is closed when every item is delivered or cancelled. */
export function isOrderClosed(order: Order): boolean {
  const p = orderProgress(order);
  return p.total > 0 && p.delivered + p.cancelled === p.total;
}

export function itemDeliveredAt(item: OrderItem): string | null {
  if (item.cancelled || stageGroup(item.stages, item.stageKey) !== 'delivered') return null;
  const last = item.stageHistory[item.stageHistory.length - 1];
  return last ? last.at : null;
}

/** When the last item was delivered or cancelled; null while the order is open. */
export function orderClosedAt(order: Order): string | null {
  if (!isOrderClosed(order)) return null;
  let latest: string | null = null;
  for (const item of order.items) {
    const at = item.cancelled ? item.cancelled.at : itemDeliveredAt(item);
    if (at && (latest === null || at > latest)) latest = at;
  }
  return latest;
}
