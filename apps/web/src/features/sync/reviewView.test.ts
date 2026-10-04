import { createServer, pushEvents, roleOf, type DomainEvent, type ReviewItem, type ShopState } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { seedConflict } from '../../seed/conflict';
import { generateShop } from '../../seed/generate';
import type { SeedShopKey } from '../../seed/shops';
import { scopeState } from '../branches/branchScope';
import { canReview, mergeBody, reviewEntry } from './reviewView';

const TODAY = '2026-10-03';

/** A demo shop's server after the sample conflict, plus any further stale edits pushed to it. */
function shop(key: SeedShopKey, extra: (state: ShopState) => DomainEvent[] = () => []) {
  const { config, events } = generateShop(key, TODAY);
  const conflict = seedConflict(key, config, events, TODAY);
  let server = pushEvents(createServer([...events, conflict.theirs]), [conflict.mine]).server;
  server = pushEvents(server, extra(server.state)).server;
  return { config, state: server.state, review: server.review };
}

const meta = (id: string) => ({ id, at: '2026-10-02T12:00:00.000Z', deviceId: 'device-a', staffId: 'uniform-counter' });

describe('Review entries', () => {
  it('shows the sample conflict field by field, current against waiting', () => {
    const { state, review } = shop('rahman');
    const before = state.customers['rahman-c4']!;
    const entry = reviewEntry(review[0]!, state);
    expect(entry).toMatchObject({
      eventId: 'rahman-conflict-mine',
      outcome: 'conflict',
      reason: 'stale-edit',
      subject: { kind: 'customer', customerId: 'rahman-c4', name: before.name },
      staffId: 'rahman-owner',
      canApplyMine: true,
      canMerge: true,
    });
    expect(entry.rows).toEqual([
      { field: 'phone', current: { kind: 'text', value: before.phone }, waiting: { kind: 'text', value: '01712345678' } },
      {
        field: 'notes',
        current: { kind: 'text', value: 'কলার একটু ঢিলা পছন্দ করেন' },
        waiting: { kind: 'text', value: 'বুক পকেট ছাড়া শার্ট' },
      },
    ]);
  });

  it('leaves out fields that already match and only merges when two or more differ', () => {
    const { state, review } = shop('rahman', (s) => [
      {
        ...meta('same-notes'),
        type: 'customer.updated',
        customerId: 'rahman-c4',
        baseVersion: s.customers['rahman-c4']!.version - 1,
        changes: { notes: 'কলার একটু ঢিলা পছন্দ করেন', phone: '01999999999' },
      },
    ]);
    const entry = reviewEntry(review[1]!, state);
    expect(entry.rows.map((r) => r.field)).toEqual(['phone']);
    expect(entry.canApplyMine).toBe(true);
    expect(entry.canMerge).toBe(false);
  });

  it('describes a stale garment edit and assignment with the order number and garment', () => {
    const { state, review } = shop('uniform', (s) => {
      const order = s.orders['uniform-o27']!;
      const garment = order.items[0]!;
      return [
        { ...meta('price'), type: 'item.updated', orderId: order.id, itemId: garment.id, baseVersion: garment.version - 1, changes: { price: 99900 } },
        { ...meta('assign'), type: 'item.assigned', orderId: order.id, itemId: garment.id, baseVersion: garment.version - 1, assigneeId: null },
      ];
    });
    const garment = state.orders['uniform-o27']!.items[0]!;
    const [price, assign] = review.slice(1).map((item) => reviewEntry(item, state));
    expect(price!.subject).toEqual({ kind: 'order', orderId: 'uniform-o27', number: state.orders['uniform-o27']!.number, garment: garment.garmentName });
    expect(price!.rows).toEqual([{ field: 'price', current: { kind: 'money', value: garment.price }, waiting: { kind: 'money', value: 99900 } }]);
    expect(assign!.rows).toEqual([
      { field: 'assignee', current: { kind: 'staff', value: garment.assignedTo }, waiting: { kind: 'staff', value: null } },
    ]);
  });

  it('offers only dismissal for a change the server refused', () => {
    const { state } = shop('rahman');
    const refused: ReviewItem = {
      event: { ...meta('gone'), type: 'item.stageChanged', orderId: 'missing', itemId: 'x', to: 'ready', reason: '' },
      outcome: 'rejected',
      reason: 'unknown-order',
      currentVersion: null,
    };
    expect(reviewEntry(refused, state)).toMatchObject({ subject: null, rows: [], canApplyMine: false, canMerge: false, reason: 'unknown-order' });
  });
});

describe('Who sees a review item', () => {
  it('needs the right to edit what the change is about', () => {
    const { config, state, review } = shop('nakshi');
    expect(canReview(review[0]!, state, roleOf(config, 'nakshi-counter')!)).toBe(true);
    expect(canReview(review[0]!, state, roleOf(config, 'nakshi-tailor')!)).toBe(false);
  });

  it('hides changes to orders outside the chosen branches, but never customers', () => {
    const { config, state, review } = shop('uniform', (s) => {
      const garment = s.orders['uniform-o27']!.items[0]!;
      return [{ ...meta('workshop'), type: 'item.updated', orderId: 'uniform-o27', itemId: garment.id, baseVersion: garment.version - 1, changes: { price: 1 } }];
    });
    const owner = roleOf(config, 'uniform-owner')!;
    const shopOnly = scopeState(state, ['shop']);
    expect(canReview(review[1]!, state, owner)).toBe(true);
    expect(canReview(review[1]!, shopOnly, owner)).toBe(false);
    expect(canReview(review[0]!, shopOnly, owner)).toBe(true);
  });
});

describe('Merging', () => {
  it('takes only the chosen fields, based on the current version', () => {
    const { state, review } = shop('rahman');
    const current = state.customers['rahman-c4']!;
    expect(mergeBody(review[0]!, state, ['phone'])).toEqual({
      type: 'customer.updated',
      customerId: 'rahman-c4',
      baseVersion: current.version,
      changes: { phone: '01712345678' },
    });
    expect(mergeBody(review[0]!, state, [])).toBeNull();
  });
});
