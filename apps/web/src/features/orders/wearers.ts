import { orderProgress, type Order, type OrderItem, type OrderProgress } from '@darzikhata/domain';

export interface WearerGroup {
  wearer: string | null;
  items: OrderItem[];
  progress: OrderProgress;
}

/** Garments grouped by who wears them, in order of first appearance, unnamed last. Empty when nobody is named. */
export function wearerGroups(order: Order): WearerGroup[] {
  if (!order.items.some((item) => item.wearer)) return [];
  const named = new Map<string, OrderItem[]>();
  const unnamed: OrderItem[] = [];
  for (const item of order.items) {
    if (!item.wearer) {
      unnamed.push(item);
      continue;
    }
    const list = named.get(item.wearer);
    if (list) list.push(item);
    else named.set(item.wearer, [item]);
  }
  const groups: WearerGroup[] = [...named].map(([wearer, items]) => ({ wearer, items, progress: orderProgress({ ...order, items }) }));
  if (unnamed.length > 0) groups.push({ wearer: null, items: unnamed, progress: orderProgress({ ...order, items: unnamed }) });
  return groups;
}
