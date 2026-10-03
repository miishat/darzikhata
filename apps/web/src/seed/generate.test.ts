import {
  deliveriesOn,
  moneySummary,
  orderProgress,
  overdueItems,
  readyForPickup,
  replay,
  trialsOn,
  validateShopConfig,
} from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { addDays, dhakaTime, generateShop } from './generate';
import { SEED_SHOPS } from './shops';

const TODAY = '2026-10-03';

describe('date helpers', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-10-03', -3)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('turns Dhaka wall-clock time into UTC', () => {
    expect(dhakaTime('2026-10-03', 10, 30)).toBe('2026-10-03T04:30:00.000Z');
    expect(dhakaTime('2026-10-03', 2)).toBe('2026-10-02T20:00:00.000Z');
  });
});

describe.each(SEED_SHOPS.map((s) => s.key))('generateShop(%s)', (key) => {
  const { config, events } = generateShop(key, TODAY);
  const { state, outcomes } = replay(events);
  const orders = Object.values(state.orders);

  it('has a valid setup', () => {
    expect(validateShopConfig(config)).toEqual([]);
  });

  it('produces events that all apply', () => {
    expect(outcomes.filter((o) => o.outcome !== 'applied')).toEqual([]);
  });

  it('is the same on every run', () => {
    expect(generateShop(key, TODAY).events).toEqual(events);
  });

  it('keeps every event in the past', () => {
    const endOfYesterday = dhakaTime(TODAY, 0);
    expect(events.every((e) => e.at < endOfYesterday)).toBe(true);
  });

  it('has about 30 customers and 40 orders', () => {
    expect(Object.keys(state.customers)).toHaveLength(30);
    expect(orders.length).toBeGreaterThanOrEqual(40);
  });

  it('fills today’s lists', () => {
    expect(deliveriesOn(orders, TODAY).length).toBeGreaterThan(0);
    expect(overdueItems(orders, TODAY).length).toBeGreaterThan(0);
    expect(readyForPickup(orders).length).toBeGreaterThan(0);
  });

  it('includes a correction, a refund, a cancellation and a household', () => {
    const payments = orders.flatMap((o) => o.payments);
    expect(payments.some((p) => p.kind === 'correction')).toBe(true);
    expect(payments.some((p) => p.kind === 'refund')).toBe(true);
    expect(orders.some((o) => o.items.some((i) => i.cancelled))).toBe(true);
    expect(Object.keys(state.households).length).toBe(2);
  });

  it('never leaves an order overpaid', () => {
    expect(orders.filter((o) => moneySummary(o).creditDue > 0).map((o) => o.number)).toEqual([]);
  });
});

describe('shop-specific data', () => {
  it('gives Nakshi Boutique a trial today and the women’s measurement restriction', () => {
    const { config, events } = generateShop('nakshi', TODAY);
    const orders = Object.values(replay(events).state.orders);
    expect(config.settings.restrictFemaleMeasurements).toBe(true);
    expect(trialsOn(orders, TODAY).length).toBeGreaterThan(0);
  });

  it('gives Uniform House a 12-wearer group order with partial delivery at the workshop', () => {
    const { config, events } = generateShop('uniform', TODAY);
    const orders = Object.values(replay(events).state.orders);
    const group = orders.find((o) => o.branchId === 'workshop')!;
    expect(config.branches.map((b) => b.id)).toEqual(['shop', 'workshop']);
    expect(new Set(group.items.map((i) => i.wearer)).size).toBe(12);
    expect(orderProgress(group)).toMatchObject({ delivered: 10, ready: 8, unfinished: 6, total: 24 });
  });
});
