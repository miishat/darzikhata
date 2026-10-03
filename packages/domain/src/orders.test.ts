import { describe, expect, it } from 'vitest';
import {
  isOrderClosed,
  itemDeliveredAt,
  itemSummaryGroup,
  orderClosedAt,
  orderProgress,
  orderTotal,
  subtotal,
} from './orders';
import { makeItem, makeOrder, spec54Order } from './testing/fixtures';

const delivered = (id: string, at: string) =>
  makeItem({
    id,
    stageKey: 'delivered',
    stageHistory: [{ from: 'ready', to: 'delivered', at, by: 'staff-owner', kind: 'forward', reason: '' }],
  });

describe('order totals', () => {
  it('totals the spec example at ৳2,400', () => {
    expect(orderTotal(spec54Order())).toBe(240000);
  });

  it('excludes cancelled items', () => {
    const order = spec54Order();
    order.items[0] = makeItem({ id: 'shirt-1', cancelled: { reason: 'changed mind', at: 'x', by: 'y' } });
    expect(subtotal(order)).toBe(170000);
    expect(orderTotal(order)).toBe(170000);
  });

  it('applies discount and price adjustments', () => {
    const order = spec54Order({
      discount: { amount: 20000, reason: 'regular customer' },
      priceAdjustments: [{ id: 'a1', amount: 15000, reason: 'extra embroidery', at: 'x', by: 'y' }],
    });
    expect(orderTotal(order)).toBe(240000 - 20000 + 15000);
  });

  it('never goes below zero', () => {
    const order = makeOrder({
      items: [makeItem({ cancelled: { reason: 'r', at: 'x', by: 'y' } })],
      discount: { amount: 10000, reason: 'r' },
    });
    expect(orderTotal(order)).toBe(0);
  });
});

describe('order progress', () => {
  it('counts items by summary group', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', stageKey: 'stitching' }),
        makeItem({ id: 'b', stageKey: 'ready' }),
        delivered('c', '2026-10-05T10:00:00.000Z'),
        makeItem({ id: 'd', cancelled: { reason: 'r', at: 'x', by: 'y' } }),
      ],
    });
    expect(orderProgress(order)).toEqual({ unfinished: 1, ready: 1, delivered: 1, cancelled: 1, total: 4 });
    expect(itemSummaryGroup(order.items[3]!)).toBe('cancelled');
  });

  it('keeps the order open when only one garment is collected', () => {
    const order = spec54Order();
    order.items[0] = delivered('shirt-1', '2026-10-05T10:00:00.000Z');
    expect(isOrderClosed(order)).toBe(false);
    expect(orderClosedAt(order)).toBeNull();
  });

  it('closes when every item is delivered or cancelled, at the latest of those times', () => {
    const order = makeOrder({
      items: [
        delivered('a', '2026-10-05T10:00:00.000Z'),
        makeItem({ id: 'b', cancelled: { reason: 'r', at: '2026-10-06T09:00:00.000Z', by: 'y' } }),
      ],
    });
    expect(isOrderClosed(order)).toBe(true);
    expect(orderClosedAt(order)).toBe('2026-10-06T09:00:00.000Z');
  });

  it('reports when an item was delivered', () => {
    expect(itemDeliveredAt(delivered('a', '2026-10-05T10:00:00.000Z'))).toBe('2026-10-05T10:00:00.000Z');
    expect(itemDeliveredAt(makeItem({ stageKey: 'ready' }))).toBeNull();
  });

  it('treats an order with no items as open', () => {
    expect(isOrderClosed(makeOrder({ items: [] }))).toBe(false);
  });
});
