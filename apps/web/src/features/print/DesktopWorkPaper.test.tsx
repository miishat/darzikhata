import { todayInDhaka, toScript } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { dashboardModel, todoRows } from '../dashboard/dashboard';
import { workItems } from '../work/workList';

// Every printed garment ends with its stages as a list of circles.
const printed = () => screen.queryAllByRole('list', { name: 'ধাপগুলো' });
const ownerWork = (store: ShopStore) =>
  workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });

describe('Work-list print on a desktop', () => {
  it('prints every garment once under its group, in bands by delivery, with its stages to fill in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?by=stage' });
    expect(await screen.findByRole('heading', { name: 'কাজের তালিকা' })).toBeTruthy();
    const work = ownerWork(store);
    expect(printed()).toHaveLength(work.length);

    const today = todayInDhaka(new Date());
    const late = work.filter((r) => r.item.deliveryDate && r.item.deliveryDate.slice(0, 10) < today).length;
    expect(late).toBeGreaterThan(0);
    expect(screen.getByText(`${toScript(String(late), 'bn')}টি দেরি`)).toBeTruthy();

    const stitching = screen.getByRole('table', { name: 'সেলাই' });
    const bands = within(stitching).getAllByRole('rowheader').map((h) => h.textContent?.split(' · ')[0]);
    expect(bands.length).toBeGreaterThan(0);
    for (const band of bands) expect(['দেরি', 'এই সপ্তাহে', 'পরে']).toContain(band);

    const stages = within(within(stitching).getAllByRole('list', { name: 'ধাপগুলো' })[0]!).getAllByRole('listitem');
    const now = stages.findIndex((s) => s.textContent?.includes('(এখন)'));
    expect(stages[now]!.textContent).toContain('সেলাই');
    for (const done of stages.slice(0, now)) expect(done.textContent).toContain('(শেষ)');
    for (const next of stages.slice(now + 1)) expect(next.textContent).not.toMatch(/\((শেষ|এখন)\)/);
  });

  it('keeps the filters and says which', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?stage=trial' });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(printed()).toHaveLength(ownerWork(store).filter((r) => r.item.stageKey === 'trial').length);
    expect(screen.getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('prints only today’s work with ?today=1, or says nothing is due', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?today=1' });
    await screen.findByRole('heading', { name: 'আজকের কাজের তালিকা' });
    const ids = new Set(
      todoRows(dashboardModel(Object.values(store.getSnapshot().state.orders), todayInDhaka(new Date())), Infinity).map((r) => r.ref.item.id),
    );
    expect(printed()).toHaveLength(ownerWork(store).filter((r) => ids.has(r.item.id)).length);
  });

  it('says so when nothing is due today', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?today=1&stage=no-such-stage' });
    await screen.findByRole('heading', { name: 'আজকের কাজের তালিকা' });
    expect(screen.getByText('আজকের জন্য কোনো কাজ নেই।')).toBeTruthy();
    expect(printed()).toHaveLength(0);
  });
});
