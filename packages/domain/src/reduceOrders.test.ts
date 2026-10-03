import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import type { DomainEvent } from './events';
import type { ShopState } from './model';
import { orderProgress, orderTotal } from './orders';
import { ALTERATION_STAGES } from './templates';
import { eventFactory, newCustomer, newOrder, newOrderItem } from './testing/fixtures';

/** A shop with customer c1 and the spec example order o1 (two shirts and a panjabi). */
function shopWithOrder() {
  const ev = eventFactory();
  const { state } = replay([
    ev({ type: 'customer.created', customer: newCustomer() }),
    ev({
      type: 'order.created',
      order: newOrder({
        items: [
          newOrderItem({ id: 'shirt-1' }),
          newOrderItem({ id: 'shirt-2' }),
          newOrderItem({ id: 'panjabi-1', templateId: 'panjabi', price: 100000 }),
        ],
      }),
    }),
  ]);
  return { ev, state };
}

function run(state: ShopState, events: DomainEvent[]) {
  return replay(events, state);
}

function reasons(result: ReturnType<typeof replay>) {
  return result.outcomes.map((o) => o.reason ?? o.outcome);
}

describe('order.created', () => {
  it('creates the order with every item at its first stage', () => {
    const { state } = shopWithOrder();
    const order = state.orders.o1!;
    expect(order.number).toBe('A-0001');
    expect(order.items.map((i) => i.stageKey)).toEqual(['booked', 'booked', 'booked']);
    expect(orderTotal(order)).toBe(240000);
  });

  it('rejects invalid orders', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.created', order: newOrder() }),
      ev({ type: 'order.created', order: newOrder({ id: 'o2' }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o3', number: 'A-0003', customerId: 'nobody' }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o4', number: 'A-0004', items: [] }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o5', number: 'A-0005', items: [newOrderItem({ price: 10.5 })] }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o6', number: 'A-0006', items: [newOrderItem({ stages: [] })] }) }),
      ev({
        type: 'order.created',
        order: newOrder({ id: 'o7', number: 'A-0007', discount: { amount: 80000, reason: 'too much' } }),
      }),
      ev({
        type: 'order.created',
        order: newOrder({ id: 'o8', number: 'A-0008', items: [newOrderItem(), newOrderItem()] }),
      }),
    ]);
    expect(reasons(result)).toEqual([
      'order-exists',
      'number-taken',
      'unknown-customer',
      'no-items',
      'invalid-price',
      'invalid-stages',
      'discount-exceeds-subtotal',
      'duplicate-item',
    ]);
  });
});

describe('stage changes', () => {
  it('moves items forward and records history with who and when', () => {
    const { ev, state } = shopWithOrder();
    const move = ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' });
    const item = run(state, [move]).state.orders.o1!.items[0]!;
    expect(item.stageKey).toBe('cutting');
    expect(item.stageHistory).toEqual([
      { from: 'booked', to: 'cutting', at: move.at, by: 'staff-owner', kind: 'forward', reason: '' },
    ]);
  });

  it('allows skipping the optional trial stage', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'stitching', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'ready', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'applied', 'applied']);
    expect(orderProgress(result.state.orders.o1!)).toMatchObject({ unfinished: 2, ready: 1 });
  });

  it('requires a reason for rework and rejects invalid moves', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'stitching', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'booked', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'booked', reason: 'collar redo' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'nope', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'nope', itemId: 'shirt-1', to: 'cutting', reason: '' }),
    ]);
    expect(reasons(result)).toEqual([
      'skips-required',
      'applied',
      'reason-required',
      'applied',
      'unknown-item',
      'unknown-order',
    ]);
    expect(result.state.orders.o1!.items[0]!.stageHistory[1]).toMatchObject({ kind: 'rework', reason: 'collar redo' });
  });

  it('keeps the order open when one garment is delivered', () => {
    const { ev, state } = shopWithOrder();
    const steps = ['cutting', 'stitching', 'ready', 'delivered'].map((to) =>
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to, reason: '' }),
    );
    const order = run(state, steps).state.orders.o1!;
    expect(orderProgress(order)).toEqual({ unfinished: 2, ready: 0, delivered: 1, cancelled: 0, total: 3 });
  });

  it('uses the stages copied onto the item, not the current template', () => {
    const ev = eventFactory();
    const result = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'order.created', order: newOrder({ items: [newOrderItem({ templateId: 'alteration', stages: ALTERATION_STAGES })] }) }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'working', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'applied', 'applied']);
  });
});

describe('item edits', () => {
  it('assigns a worker when based on the current version', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.assigned', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, assigneeId: 'tailor-1' }),
    ]);
    expect(result.state.orders.o1!.items[0]).toMatchObject({ assignedTo: 'tailor-1', version: 2 });
  });

  it('turns a stale edit into a conflict', () => {
    const { ev, state } = shopWithOrder();
    const first = run(state, [
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, changes: { deliveryDate: '2026-10-10' } }),
    ]).state;
    const result = applyEvent(
      first,
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, changes: { deliveryDate: '2026-10-12' } }),
    );
    expect(result).toMatchObject({ kind: 'conflict', currentVersion: 2 });
    expect(result.state.orders.o1!.items[0]!.deliveryDate).toBe('2026-10-10');
  });

  it('records fitting adjustments without touching measurements', () => {
    const { ev, state } = shopWithOrder();
    const item = run(state, [
      ev({ type: 'item.adjustmentAdded', orderId: 'o1', itemId: 'shirt-1', adjustment: { id: 'a1', note: 'চেস্ট ½ ঢিলা' } }),
    ]).state.orders.o1!.items[0]!;
    expect(item.adjustments).toEqual([{ id: 'a1', note: 'চেস্ট ½ ঢিলা', at: expect.any(String), by: 'staff-owner' }]);
    expect(item.measurements).toBeNull();
  });

  it('rejects price edits that would leave the discount above the subtotal', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.discountSet', orderId: 'o1', baseVersion: 1, discount: { amount: 200000, reason: 'r' } }),
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'panjabi-1', baseVersion: 1, changes: { price: 0 } }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'discount-exceeds-subtotal']);
  });
});

describe('cancellation', () => {
  it('cancels an item with a reason and removes it from the total', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: '' }),
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: 'customer changed mind' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'panjabi-1', to: 'cutting', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['reason-required', 'applied', 'item-cancelled']);
    expect(orderTotal(result.state.orders.o1!)).toBe(140000);
  });

  it('cannot cancel a delivered item', () => {
    const { ev, state } = shopWithOrder();
    const steps = ['cutting', 'stitching', 'ready', 'delivered'].map((to) =>
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to, reason: '' }),
    );
    const result = run(state, [...steps, ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'shirt-1', reason: 'r' })]);
    expect(reasons(result).at(-1)).toBe('already-delivered');
  });
});

describe('discounts and price adjustments', () => {
  it('sets a discount on the current version', () => {
    const { ev, state } = shopWithOrder();
    const order = run(state, [
      ev({ type: 'order.discountSet', orderId: 'o1', baseVersion: 1, discount: { amount: 20000, reason: 'regular' } }),
    ]).state.orders.o1!;
    expect(orderTotal(order)).toBe(220000);
    expect(order.version).toBe(2);
  });

  it('adds signed price adjustments with reasons', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a1', amount: 15000, reason: 'extra embroidery' } }),
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a2', amount: -5000, reason: '' } }),
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a3', amount: -999999, reason: 'r' } }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'reason-required', 'total-negative']);
    expect(orderTotal(result.state.orders.o1!)).toBe(255000);
  });
});

describe('status links', () => {
  it('creates and revokes links', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'link.created', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.created', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'nope' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'link-exists', 'applied', 'already-revoked', 'unknown-link']);
    expect(result.state.orders.o1!.links[0]!.revokedAt).not.toBeNull();
  });

  it('stamps updatedAt with the time of the last change', () => {
    const { ev, state } = shopWithOrder();
    const last = ev({ type: 'link.created', orderId: 'o1', token: 'tok1' });
    expect(run(state, [last]).state.orders.o1!.updatedAt).toBe(last.at);
  });
});
