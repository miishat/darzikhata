import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import { isEditEvent } from './events';
import { emptyState } from './model';
import { eventFactory, newCustomer, newOrder } from './testing/fixtures';

describe('applyEvent', () => {
  it('records applied event ids', () => {
    const ev = eventFactory();
    const event = ev({ type: 'customer.created', customer: newCustomer() });
    const result = applyEvent(emptyState(), event);
    expect(result.kind).toBe('applied');
    expect(result.state.appliedEventIds[event.id]).toBe(true);
  });

  it('treats a repeated event id as a duplicate and changes nothing', () => {
    const ev = eventFactory();
    const payment = ev({
      type: 'payment.recorded',
      orderId: 'o1',
      payment: { id: 'p1', amount: 100000, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
    });
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'order.created', order: newOrder() }),
      payment,
    ]);
    const again = applyEvent(state, payment);
    expect(again.kind).toBe('duplicate');
    expect(again.state).toBe(state);
    expect(again.state.orders.o1!.payments).toHaveLength(1);
  });

  it('does not record ids of rejected events, so a fixed retry can apply', () => {
    const ev = eventFactory();
    const event = ev({ type: 'order.created', order: newOrder() });
    const rejected = applyEvent(emptyState(), event);
    expect(rejected.kind).toBe('rejected');
    expect(rejected.state.appliedEventIds[event.id]).toBeUndefined();
  });

  it('replaying the same log twice gives the same state', () => {
    const ev = eventFactory();
    const log = [ev({ type: 'customer.created', customer: newCustomer() }), ev({ type: 'order.created', order: newOrder() })];
    const once = replay(log).state;
    const twice = replay(log, once);
    expect(twice.state).toEqual(once);
    expect(twice.outcomes.map((o) => o.outcome)).toEqual(['duplicate', 'duplicate']);
  });
});

describe('isEditEvent', () => {
  it('identifies edit events', () => {
    const ev = eventFactory();
    expect(isEditEvent(ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: {} }))).toBe(true);
    expect(isEditEvent(ev({ type: 'item.assigned', orderId: 'o1', itemId: 'i1', baseVersion: 1, assigneeId: null }))).toBe(true);
    expect(isEditEvent(ev({ type: 'customer.created', customer: newCustomer() }))).toBe(false);
    expect(isEditEvent(ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'cutting', reason: '' }))).toBe(false);
  });
});
