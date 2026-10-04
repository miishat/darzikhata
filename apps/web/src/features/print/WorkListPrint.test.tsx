import { itemsForWorker, todayInDhaka } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { dashboardModel, todoRows } from '../dashboard/dashboard';
import { workItems } from '../work/workList';

const printedRows = () =>
  screen.getAllByRole('table').reduce((sum, table) => sum + within(table).getAllByRole('row').length - 1, 0);
const ownerWork = (store: ShopStore) =>
  workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });

describe('Work-list print', () => {
  it('prints outside the app, one table per group with repeating headers', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?by=stage' });
    expect(await screen.findByRole('heading', { name: 'কাজের তালিকা' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();
    expect(printedRows()).toBe(ownerWork(store).length);

    const stitching = screen.getByRole('table', { name: 'সেলাই' });
    expect(within(stitching).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'অর্ডার',
      'পোশাক',
      'কে পরবেন',
      'কারিগর',
      'ট্রায়াল',
      'ডেলিভারি',
      'নোট',
    ]);
    expect(stitching.querySelector('thead')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'কাজের তালিকায় ফিরে যান' }).getAttribute('href')).toBe('/app/work?by=stage');
  });

  it('prints only the filtered garments and says which filter', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?stage=trial' });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(printedRows()).toBe(ownerWork(store).filter((r) => r.item.stageKey === 'trial').length);
    expect(screen.getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  const todayIds = (store: ShopStore) =>
    new Set(todoRows(dashboardModel(Object.values(store.getSnapshot().state.orders), todayInDhaka(new Date())), Infinity).map((r) => r.ref.item.id));

  it('prints only today’s work with ?today=1, and says so', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?today=1&by=stage' });
    await screen.findByRole('heading', { name: 'আজকের কাজের তালিকা' });
    const expected = ownerWork(store).filter((r) => todayIds(store).has(r.item.id));
    expect(expected.length).toBeGreaterThan(0);
    expect(expected.length).toBeLessThan(ownerWork(store).length);
    expect(printedRows()).toBe(expected.length);
  });

  it('keeps the stage filter with ?today=1', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?today=1&stage=trial' });
    await screen.findByRole('heading', { name: 'আজকের কাজের তালিকা' });
    expect(printedRows()).toBe(ownerWork(store).filter((r) => r.item.stageKey === 'trial' && todayIds(store).has(r.item.id)).length);
    expect(screen.getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('says so when nothing is due today', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?today=1&stage=no-such-stage' });
    await screen.findByRole('heading', { name: 'আজকের কাজের তালিকা' });
    expect(screen.getByText('আজকের জন্য কোনো কাজ নেই।')).toBeTruthy();
    expect(screen.queryAllByRole('table')).toHaveLength(0);
  });

  it('is linked from the work page with the same filters', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/work?by=stage&stage=cutting&view=list' });
    const link = await screen.findByRole('link', { name: 'তালিকা প্রিন্ট করুন' });
    expect(link.getAttribute('href')).toBe('/print/work?by=stage&stage=cutting&view=list');
  });

  it('prints a tailor’s own garments only', async () => {
    const { store } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/print/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(printedRows()).toBe(itemsForWorker(Object.values(store.getSnapshot().state.orders), 'nakshi-tailor').length);
  });
});
