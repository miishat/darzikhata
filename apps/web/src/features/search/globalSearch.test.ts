import { replay, type ShopState } from '@darzikhata/domain';
import { eventFactory, newCustomer, newOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { globalSearch } from './globalSearch';

function state(): ShopState {
  const e = eventFactory();
  return replay([
    e({ type: 'customer.created', customer: newCustomer({ id: 'rahim', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678' }) }),
    e({ type: 'customer.created', customer: newCustomer({ id: 'karim', name: 'করিম', nameAlt: null, phone: '01811142000' }) }),
    e({ type: 'customer.created', customer: newCustomer({ id: 'rahima', name: 'Rahima Khatun', nameAlt: null, phone: null }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o1', number: 'A-0142', customerId: 'karim' }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o2', number: 'B-0142', customerId: 'rahim' }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o3', number: 'A-0007', customerId: 'rahim' }) }),
  ]).state;
}

const ids = (hits: ReturnType<typeof globalSearch>) =>
  hits.map((h) => (h.kind === 'order' ? `order:${h.order.number}` : `customer:${h.customer.id}`));

describe('globalSearch', () => {
  it('returns nothing for an empty query', () => {
    expect(globalSearch(state(), '  ')).toEqual([]);
  });

  it('puts exact order numbers first, newest series first, then phone matches', () => {
    expect(ids(globalSearch(state(), '১৪২'))).toEqual(['order:B-0142', 'order:A-0142', 'customer:karim']);
  });

  it('matches a full order number in any case and carries its customer', () => {
    const hits = globalSearch(state(), 'a-142');
    expect(ids(hits)).toEqual(['order:A-0142']);
    expect(hits[0]).toMatchObject({ kind: 'order', customer: { id: 'karim' } });
  });

  it('ranks name text above sound-alike names across scripts', () => {
    // "রহিম" is in Rahim's Bangla name; "Rahima Khatun" only sounds alike.
    expect(ids(globalSearch(state(), 'রহিম'))).toEqual(['customer:rahim', 'customer:rahima']);
    // Equal matches fall back to alphabetical order by name.
    expect(ids(globalSearch(state(), 'rahim'))).toEqual(['customer:rahima', 'customer:rahim']);
  });

  it('finds customers by phone in Bangla digits', () => {
    expect(ids(globalSearch(state(), '০১৭১২'))).toEqual(['customer:rahim']);
  });

  it('stops at the limit', () => {
    expect(globalSearch(state(), '১৪২', 2)).toHaveLength(2);
  });
});
