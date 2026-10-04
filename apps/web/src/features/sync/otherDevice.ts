import { itemSummaryGroup, type ShopState } from '@darzikhata/domain';
import type { EditBody } from '../../data/store';

/** The record open on screen that "another device" can change in the demo. */
export type OtherDeviceTarget =
  | { kind: 'customer'; customerId: string }
  | { kind: 'item'; orderId: string; itemId: string };

/**
 * Finds the open record from the address: a customer's profile, edit or measurement screen, or
 * an order's detail (its first garment still in work, or else its first garment not cancelled).
 */
export function otherDeviceTarget(pathname: string, state: ShopState): OtherDeviceTarget | null {
  const customer = /^\/app\/customers\/([^/]+)/.exec(pathname)?.[1];
  if (customer && customer !== 'new' && state.customers[customer]) return { kind: 'customer', customerId: customer };
  const orderId = /^\/app\/orders\/([^/]+)$/.exec(pathname)?.[1];
  const order = orderId && orderId !== 'new' ? state.orders[orderId] : undefined;
  if (!order) return null;
  const live = order.items.filter((i) => !i.cancelled);
  const garment = live.find((i) => itemSummaryGroup(i) === 'unfinished') ?? live[0];
  return garment ? { kind: 'item', orderId: order.id, itemId: garment.id } : null;
}

/** The edit the other device sends: a note that is easy to spot, based on the version this device shows. */
export function otherDeviceEdit(target: OtherDeviceTarget, state: ShopState, note: string): EditBody | null {
  if (target.kind === 'customer') {
    const customer = state.customers[target.customerId];
    if (!customer) return null;
    return { type: 'customer.updated', customerId: customer.id, baseVersion: customer.version, changes: { notes: note } };
  }
  const garment = state.orders[target.orderId]?.items.find((i) => i.id === target.itemId);
  if (!garment) return null;
  return {
    type: 'item.updated',
    orderId: target.orderId,
    itemId: garment.id,
    baseVersion: garment.version,
    changes: { designNotes: note },
  };
}
