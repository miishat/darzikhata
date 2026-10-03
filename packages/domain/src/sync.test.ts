import { describe, expect, it } from 'vitest';
import type { DomainEvent } from './events';
import { nextOrderNumber } from './numbering';
import {
  createServer,
  deviceView,
  pullEvents,
  pushEvents,
  resolveReview,
  syncDevice,
  syncStatus,
} from './sync';
import { eventFactory, newCustomer, newOrder } from './testing/fixtures';

const payment = (id: string) => ({
  id,
  amount: 100000,
  method: 'cash' as const,
  reference: '',
  kind: 'advance' as const,
  corrects: null,
  reason: '',
});

function baseServer() {
  const setup = eventFactory('dev-setup');
  return createServer([
    setup({ type: 'customer.created', customer: newCustomer() }),
    setup({ type: 'order.created', order: newOrder() }),
  ]);
}

describe('pushEvents', () => {
  it('never duplicates orders or payments when the same events are sent twice', () => {
    const ev = eventFactory('dev-A');
    const batch: DomainEvent[] = [
      ev({ type: 'order.created', order: newOrder({ id: 'o2', number: 'A-0002' }) }),
      ev({ type: 'payment.recorded', orderId: 'o2', payment: payment('p1') }),
    ];
    const first = pushEvents(baseServer(), batch);
    const second = pushEvents(first.server, batch);

    expect(first.results.map((r) => r.outcome)).toEqual(['applied', 'applied']);
    expect(second.results.map((r) => r.outcome)).toEqual(['duplicate', 'duplicate']);
    expect(second.server.log).toHaveLength(4);
    expect(Object.keys(second.server.state.orders)).toEqual(['o1', 'o2']);
    expect(second.server.state.orders.o2!.payments).toHaveLength(1);
  });

  it('accepts orders created offline on two devices, because each has its own series', () => {
    const server = baseServer();
    const existing = Object.values(server.state.orders).map((o) => o.number);
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const fromA = a({ type: 'order.created', order: newOrder({ id: 'oa', number: nextOrderNumber(existing, 'A') }) });
    const fromB = b({ type: 'order.created', order: newOrder({ id: 'ob', number: nextOrderNumber(existing, 'B') }) });

    const result = pushEvents(pushEvents(server, [fromA]).server, [fromB]);
    expect(result.results[0]!.outcome).toBe('applied');
    expect(Object.values(result.server.state.orders).map((o) => o.number).sort()).toEqual(['A-0001', 'A-0002', 'B-0001']);
  });

  it('sends a stale edit to review and keeps the newer value', () => {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const server = pushEvents(baseServer(), [
      a({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01811111111' } }),
    ]).server;
    const stale = b({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01922222222' } });

    const result = pushEvents(server, [stale]);
    expect(result.results).toEqual([{ eventId: stale.id, outcome: 'conflict', reason: 'stale-edit' }]);
    expect(result.server.review).toEqual([{ event: stale, outcome: 'conflict', reason: 'stale-edit', currentVersion: 2 }]);
    expect(result.server.state.customers.c1!.phone).toBe('01811111111');
  });

  it('does not queue the same event for review twice', () => {
    const ev = eventFactory('dev-A');
    const bad = ev({ type: 'payment.recorded', orderId: 'nope', payment: payment('p1') });
    const once = pushEvents(baseServer(), [bad]);
    const twice = pushEvents(once.server, [bad]);
    expect(twice.results).toEqual([{ eventId: bad.id, outcome: 'rejected', reason: 'unknown-order' }]);
    expect(twice.server.review).toHaveLength(1);
  });
});

describe('resolveReview', () => {
  function serverWithConflict() {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const updated = pushEvents(baseServer(), [
      a({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01811111111' } }),
    ]).server;
    const stale = b({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01922222222' } });
    return { server: pushEvents(updated, [stale]).server, stale };
  }

  it('keeps the current value and clears the review item', () => {
    const { server, stale } = serverWithConflict();
    const resolved = resolveReview(server, stale.id, 'keepCurrent', { id: 'r1', at: '2026-10-03T06:00:00.000Z' });
    expect(resolved.result).toBeNull();
    expect(resolved.server.review).toEqual([]);
    expect(resolved.server.state.customers.c1!.phone).toBe('01811111111');
  });

  it('re-applies the waiting edit on top of the current version', () => {
    const { server, stale } = serverWithConflict();
    const resolved = resolveReview(server, stale.id, 'applyMine', { id: 'r1', at: '2026-10-03T06:00:00.000Z' });
    expect(resolved.result).toEqual({ eventId: 'r1', outcome: 'applied' });
    expect(resolved.server.review).toEqual([]);
    expect(resolved.server.state.customers.c1).toMatchObject({ phone: '01922222222', version: 3 });
    expect(resolved.server.log.at(-1)).toMatchObject({ id: 'r1', baseVersion: 2, deviceId: 'dev-B' });
  });

  it('refuses to re-apply rejected events and unknown ids', () => {
    const ev = eventFactory('dev-A');
    const bad = ev({ type: 'payment.recorded', orderId: 'nope', payment: payment('p1') });
    const server = pushEvents(baseServer(), [bad]).server;
    const meta = { id: 'r1', at: '2026-10-03T06:00:00.000Z' };
    expect(() => resolveReview(server, bad.id, 'applyMine', meta)).toThrow('Only stale edits can be re-applied');
    expect(() => resolveReview(server, 'missing', 'keepCurrent', meta)).toThrow('No review item for event missing');
    expect(resolveReview(server, bad.id, 'keepCurrent', meta).server.review).toEqual([]);
  });
});

describe('device sync', () => {
  it('pulls only events after the cursor', () => {
    const server = baseServer();
    expect(pullEvents(server, 0).events).toHaveLength(2);
    expect(pullEvents(server, 2)).toEqual({ events: [], cursor: 2 });
  });

  it('pushes pending events, pulls events from other devices, and clears pending', () => {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    let server = baseServer();
    const fromB = b({ type: 'payment.recorded', orderId: 'o1', payment: payment('pb') });
    server = pushEvents(server, [fromB]).server;

    const fromA = a({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'cutting', reason: '' });
    const synced = syncDevice(server, { pending: [fromA], cursor: 2 });

    expect(synced.results).toEqual([{ eventId: fromA.id, outcome: 'applied' }]);
    expect(synced.pulled.map((e) => e.id)).toEqual([fromB.id, fromA.id]);
    expect(synced.device).toEqual({ pending: [], cursor: 4 });
  });

  it('clears pending after a retry when the first attempt reached the server', () => {
    const ev = eventFactory('dev-A');
    const pending = [ev({ type: 'payment.recorded', orderId: 'o1', payment: payment('p1') })];
    const reached = pushEvents(baseServer(), pending).server;
    const retry = syncDevice(reached, { pending, cursor: 2 });
    expect(retry.results[0]!.outcome).toBe('duplicate');
    expect(retry.server.state.orders.o1!.payments).toHaveLength(1);
    expect(retry.device.pending).toEqual([]);
  });

  it('shows pending local changes on top of synced data', () => {
    const server = baseServer();
    const ev = eventFactory('dev-A');
    const pending = [ev({ type: 'payment.recorded', orderId: 'o1', payment: payment('p1') })];
    expect(deviceView(server.log, pending).orders.o1!.payments).toHaveLength(1);
    expect(deviceView(server.log, []).orders.o1!.payments).toHaveLength(0);
  });
});

describe('syncStatus', () => {
  it('derives the indicator', () => {
    expect(syncStatus({ online: false, syncing: false, reviewCount: 3 })).toBe('offline');
    expect(syncStatus({ online: true, syncing: true, reviewCount: 3 })).toBe('syncing');
    expect(syncStatus({ online: true, syncing: false, reviewCount: 1 })).toBe('needs-attention');
    expect(syncStatus({ online: true, syncing: false, reviewCount: 0 })).toBe('online');
  });
});
