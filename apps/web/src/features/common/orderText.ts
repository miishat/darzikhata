import { labelIn, type Language, type Order, type OrderItem, type OrderProgress } from '@darzikhata/domain';
import { formatNumber, translate } from '../../i18n/format';

/** "মোট ৩টি: ২টি চলছে, ১টি রেডি". Groups with no garments are left out. */
export function progressText(progress: OrderProgress, language: Language): string {
  const parts = (['unfinished', 'ready', 'delivered', 'cancelled'] as const)
    .filter((group) => progress[group] > 0)
    .map((group) => translate(language, `progress.${group}`, { n: formatNumber(progress[group], language) }));
  return `${translate(language, 'progress.total', { n: formatNumber(progress.total, language) })}: ${parts.join(', ')}`;
}

/** "শার্ট ×২, পাঞ্জাবি": garments that are not cancelled, in order of first appearance. */
export function garmentSummary(order: Order, language: Language): string {
  const counts = new Map<string, number>();
  for (const item of order.items) {
    if (item.cancelled) continue;
    const name = labelIn(item.garmentName, language);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${formatNumber(n, language)}` : name)).join(', ');
}

/** The name a garment goes by on screens and print-outs: "শার্ট ২" for the order's second item. */
export function itemTitle(order: Order, item: OrderItem, language: Language): string {
  return `${labelIn(item.garmentName, language)} ${formatNumber(order.items.indexOf(item) + 1, language)}`;
}
