import { itemSummaryGroup, replay } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { generateShop } from '../../seed/generate';
import { otherDeviceEdit, otherDeviceTarget } from './otherDevice';

const { state } = replay(generateShop('rahman', '2026-10-03').events);

describe('Another device’s edit', () => {
  it('targets the customer open on a profile, edit or measurement screen', () => {
    for (const path of ['/app/customers/rahman-c2', '/app/customers/rahman-c2/edit', '/app/customers/rahman-c2/measure/shirt']) {
      expect(otherDeviceTarget(path, state)).toEqual({ kind: 'customer', customerId: 'rahman-c2' });
    }
  });

  it('targets the first garment still in work on an open order', () => {
    // In Uniform House's group order the first wearers' garments are delivered and the last are in work.
    const uniform = replay(generateShop('uniform', '2026-10-03').events).state;
    const order = uniform.orders['uniform-o27']!;
    expect(itemSummaryGroup(order.items[0]!)).toBe('delivered');
    const garment = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    expect(otherDeviceTarget('/app/orders/uniform-o27', uniform)).toEqual({ kind: 'item', orderId: 'uniform-o27', itemId: garment.id });
  });

  it('has nothing to change elsewhere', () => {
    for (const path of ['/app/orders', '/app/orders/new', '/app/customers', '/app/customers/new', '/app/customers/nobody', '/app/work']) {
      expect(otherDeviceTarget(path, state)).toBeNull();
    }
  });

  it('writes a note based on the version this device shows', () => {
    const customer = state.customers['rahman-c2']!;
    expect(otherDeviceEdit({ kind: 'customer', customerId: 'rahman-c2' }, state, 'নোট')).toEqual({
      type: 'customer.updated',
      customerId: 'rahman-c2',
      baseVersion: customer.version,
      changes: { notes: 'নোট' },
    });
    const order = Object.values(state.orders)[0]!;
    const garment = order.items[0]!;
    expect(otherDeviceEdit({ kind: 'item', orderId: order.id, itemId: garment.id }, state, 'নোট')).toEqual({
      type: 'item.updated',
      orderId: order.id,
      itemId: garment.id,
      baseVersion: garment.version,
      changes: { designNotes: 'নোট' },
    });
  });
});
