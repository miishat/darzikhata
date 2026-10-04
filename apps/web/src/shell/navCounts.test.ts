import { emptyState, type ShopState } from '@darzikhata/domain';
import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { navCounts } from './navCounts';

const TODAY = '2026-10-03';

function stateOf(...orders: ReturnType<typeof makeOrder>[]): ShopState {
  return { ...emptyState(), orders: Object.fromEntries(orders.map((o) => [o.id, o])) };
}

describe('navCounts', () => {
  it('is zero for an empty shop', () => {
    expect(navCounts(emptyState(), TODAY)).toEqual({ openOrders: 0, lateGarments: 0 });
  });

  it('counts only unfinished items and orders', () => {
    const state = stateOf(
      makeOrder({ id: 'o1', items: [makeItem({ id: 'a', stageKey: 'cutting', deliveryDate: '2026-10-01' })] }),
      makeOrder({ id: 'o2', items: [makeItem({ id: 'b', stageKey: 'delivered', deliveryDate: '2026-10-01' })] }),
      makeOrder({ id: 'o3', items: [makeItem({ id: 'c', stageKey: 'ready', deliveryDate: '2026-10-01' })] }),
    );
    expect(navCounts(state, TODAY)).toEqual({ openOrders: 2, lateGarments: 1 });
  });

  it('respects the branch scope it is given', () => {
    const late = makeOrder({ id: 'o1', items: [makeItem({ id: 'a', stageKey: 'cutting', deliveryDate: '2026-10-01' })] });
    const other = makeOrder({ id: 'o2', items: [makeItem({ id: 'b', stageKey: 'cutting', deliveryDate: '2026-10-01' })] });
    expect(navCounts(stateOf(late), TODAY)).toEqual({ openOrders: 1, lateGarments: 1 });
    expect(navCounts(stateOf(late, other), TODAY)).toEqual({ openOrders: 2, lateGarments: 2 });
  });

  it('does not call a garment due today late', () => {
    const state = stateOf(makeOrder({ id: 'o1', items: [makeItem({ id: 'a', stageKey: 'cutting', deliveryDate: TODAY })] }));
    expect(navCounts(state, TODAY)).toEqual({ openOrders: 1, lateGarments: 0 });
  });
});
