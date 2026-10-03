import type { Label } from './label';
import type { Order, StatusLink } from './model';
import { itemSummaryGroup, orderClosedAt } from './orders';
import { stageByKey, type SummaryGroup } from './stages';

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Encodes random bytes as an unguessable URL-safe token. Needs at least 16 bytes (128 bits). */
export function tokenFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 16) throw new Error('Status link tokens need at least 16 random bytes');
  let bits = 0;
  let value = 0;
  let token = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      token += BASE64URL[(value >> bits) & 63];
    }
  }
  if (bits > 0) token += BASE64URL[(value << (6 - bits)) & 63];
  return token;
}

/** The newest link that has not been revoked. */
export function activeLink(order: Order): StatusLink | null {
  for (let i = order.links.length - 1; i >= 0; i--) {
    const link = order.links[i]!;
    if (!link.revokedAt) return link;
  }
  return null;
}

export type LinkState = 'active' | 'revoked' | 'expired' | 'unknown';

/** Links stop working when revoked, or `expiryDays` after the order is fully delivered or cancelled. */
export function linkState(order: Order, token: string, now: string, expiryDays: number): LinkState {
  const link = order.links.find((l) => l.token === token);
  if (!link) return 'unknown';
  if (link.revokedAt) return 'revoked';
  const closedAt = orderClosedAt(order);
  if (closedAt && Date.parse(now) - Date.parse(closedAt) > expiryDays * DAY_MS) return 'expired';
  return 'active';
}

export function findOrderByToken(orders: Iterable<Order>, token: string): Order | null {
  for (const order of orders) {
    if (order.links.some((l) => l.token === token)) return order;
  }
  return null;
}

export interface ShopContact {
  name: string;
  phone: string;
  address: string;
}

/** Exactly what a customer may see. No measurements, prices, payments, notes or staff. */
export interface PublicOrderView {
  shop: ShopContact;
  orderNumber: string;
  lastUpdatedAt: string;
  items: Array<{
    garmentName: Label;
    wearer: string | null;
    group: SummaryGroup;
    stageLabel: Label;
    trialDate: string | null;
    deliveryDate: string | null;
  }>;
}

export function publicOrderView(order: Order, shop: ShopContact): PublicOrderView {
  return {
    shop: { name: shop.name, phone: shop.phone, address: shop.address },
    orderNumber: order.number,
    lastUpdatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      garmentName: item.garmentName,
      wearer: item.wearer,
      group: itemSummaryGroup(item),
      stageLabel: stageByKey(item.stages, item.stageKey).label,
      trialDate: item.trialDate,
      deliveryDate: item.deliveryDate,
    })),
  };
}
