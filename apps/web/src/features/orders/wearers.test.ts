import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { wearerGroups } from './wearers';

describe('wearerGroups', () => {
  it('is empty when no garment names a wearer', () => {
    expect(wearerGroups(makeOrder())).toEqual([]);
  });

  it('groups garments by wearer in order of first appearance, unnamed last, with progress', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', wearer: 'Rafi', stageKey: 'delivered' }),
        makeItem({ id: 'b', wearer: 'Tanha' }),
        makeItem({ id: 'c' }),
        makeItem({ id: 'd', wearer: 'Rafi', stageKey: 'ready' }),
      ],
    });
    const groups = wearerGroups(order);
    expect(groups.map((g) => [g.wearer, g.items.map((i) => i.id)])).toEqual([
      ['Rafi', ['a', 'd']],
      ['Tanha', ['b']],
      [null, ['c']],
    ]);
    expect(groups[0]!.progress).toEqual({ unfinished: 0, ready: 1, delivered: 1, cancelled: 0, total: 2 });
  });
});
