import { formatTaka, outstandingBalances, toBanglaDigits, todayInDhaka } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { itemSummaryGroup } from '@darzikhata/domain';
import { dashboardModel } from './dashboard';

const bn = (n: number) => toBanglaDigits(String(n));
const rows = (name: string) => within(screen.getByRole('region', { name })).queryAllByRole('listitem');
const model = (store: ShopStore) => dashboardModel(Object.values(store.getSnapshot().state.orders), todayInDhaka(new Date()));

describe('Dashboard', () => {
  const panelTile = (name: RegExp) => within(screen.getByRole('region', { name: 'আজকের কাজ' })).getByRole('link', { name });
  const moneyBlock = () => within(screen.getByRole('region', { name: 'টাকা' }));

  it('shows today’s panel, the money card and the four lists for the owner', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    const m = model(store);
    expect(panelTile(/ট্রায়াল/).textContent).toContain(bn(m.trialsToday.length));
    expect(panelTile(/ডেলিভারি/).textContent).toContain(bn(m.deliveriesToday.length));
    expect(panelTile(/রেডি/).textContent).toContain(bn(m.readyGarments));
    expect(panelTile(/দেরি হয়েছে/).textContent).toContain(bn(m.overdueGarments));
    expect(panelTile(/দেরি হয়েছে/).className).toContain('bg-warn-soft');
    expect(moneyBlock().getByText('আজ জমা').closest('a')!.textContent).toContain(formatTaka(m.collectedToday, 'bn'));
    expect(moneyBlock().getByText('মোট বাকি').closest('a')!.textContent).toContain(formatTaka(m.dueTotal, 'bn'));
    expect(moneyBlock().getByText('ক্যাশ')).toBeTruthy();
    expect(rows('আজ ট্রায়াল')).toHaveLength(Math.min(5, m.trialsToday.length));
    expect(rows('আজ ডেলিভারি')).toHaveLength(Math.min(5, m.deliveriesToday.length));
    expect(rows('দেরি হয়েছে')).toHaveLength(Math.min(5, m.overdue.length));
    expect(rows('নেওয়ার জন্য রেডি')).toHaveLength(Math.min(5, m.ready.length));
  });

  it('greets the signed-in person and offers the work list print', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    expect(screen.getByText(/^শুভ (সকাল|দুপুর|সন্ধ্যা), /)).toBeTruthy();
    expect(screen.getByRole('link', { name: 'কাজের তালিকা প্রিন্ট' }).getAttribute('href')).toBe('/print/work');
  });

  it('lists the orders with the most ready garments first', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    const counted = model(store).ready.map((order) => ({
      number: order.number,
      n: order.items.filter((i) => itemSummaryGroup(i) === 'ready').length,
    }));
    expect(new Set(counted.map((c) => c.n)).size).toBeGreaterThan(1);
    const expected = [...counted].sort((a, b) => b.n - a.n).slice(0, 5);
    const shown = rows('নেওয়ার জন্য রেডি');
    expected.forEach((row, i) => expect(shown[i]!.textContent).toContain(row.number));
  });

  it('opens an order from a list', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const late = await screen.findByRole('region', { name: 'দেরি হয়েছে' });
    const first = model(store).overdue[0]!;
    await userEvent.click(within(late).getAllByRole('link', { name: new RegExp(first.order.number) })[0]!);
    expect(router.state.location.pathname).toBe(`/app/orders/${first.order.id}`);
  });

  it('counts a payment taken today', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    const before = model(store).collectedToday;
    const { order } = outstandingBalances(Object.values(store.getSnapshot().state.orders)).find((r) => r.balance >= 50000)!;
    await act(() =>
      store.dispatch({
        type: 'payment.recorded',
        orderId: order.id,
        payment: { id: 'paid-today', amount: 50000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
      }),
    );
    expect(moneyBlock().getByText('আজ জমা').closest('a')!.textContent).toContain(formatTaka(before + 50000, 'bn'));
  });

  it('hides money from staff without money access and keeps to their branch', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'uniform',
      path: '/app/dashboard',
      as: { staffId: 'uniform-supervisor', pin: '3333' },
    });
    await screen.findByRole('heading', { name: 'হোম' });
    expect(screen.queryByRole('region', { name: 'টাকা' })).toBeNull();
    expect(screen.queryByText('আজ জমা')).toBeNull();
    expect(screen.queryByText('মোট বাকি')).toBeNull();
    // The delivery and ready tile sub-lines state owed money, so they are hidden too.
    expect(within(screen.getByRole('region', { name: 'আজকের কাজ' })).queryByText(/বাকি/)).toBeNull();
    const ready = within(screen.getByRole('region', { name: 'নেওয়ার জন্য রেডি' }));
    expect(ready.getAllByRole('listitem')).toHaveLength(1);
    expect(ready.getByRole('link', { name: /A-0027/ })).toBeTruthy();
  });
});

describe('Dashboard on a phone', () => {
  const tile = (name: RegExp) => within(screen.getByRole('region', { name: 'আজকের কাজ' })).getByRole('link', { name });

  it('shows four tiles that match the counts and open the matching Orders filter', async () => {
    const { store, router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('region', { name: 'আজকের কাজ' });
    const m = model(store);
    expect(tile(/ট্রায়াল/).textContent).toContain(bn(m.trialsToday.length));
    expect(tile(/ডেলিভারি/).textContent).toContain(bn(m.deliveriesToday.length));
    expect(tile(/রেডি/).textContent).toContain(bn(m.readyGarments));
    expect(tile(/দেরি হয়েছে/).textContent).toContain(bn(m.overdueGarments));
    expect(tile(/দেরি হয়েছে/).className).toContain('bg-warn-soft');
    await userEvent.click(tile(/রেডি/));
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(router.state.location.search).toBe('?status=ready');
  });

  it('points the Trial tile at the Trial filter', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('region', { name: 'আজকের কাজ' });
    await userEvent.click(tile(/ট্রায়াল/));
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(router.state.location.search).toBe('?status=trial&sort=delivery');
  });

  it('lists at most six rows, each the whole link to its order, with money cards linking to Payments', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    const list = within(await screen.findByRole('region', { name: 'এখন যা করতে হবে' }));
    const rows = list.getAllByRole('listitem');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(6);
    for (const row of rows) expect(within(row).getByRole('link').getAttribute('href')).toMatch(/^\/app\/orders\/.+/);
    expect(list.getByRole('link', { name: 'সব দেখুন' }).getAttribute('href')).toBe('/app/orders');
    const money = within(screen.getByRole('region', { name: 'টাকা' }));
    expect(money.getByRole('link', { name: /আজ জমা/ }).getAttribute('href')).toBe('/app/payments');
    expect(money.getByRole('link', { name: /মোট বাকি/ }).getAttribute('href')).toBe('/app/payments');
  });

  it('hides the money cards without money access', async () => {
    await renderApp({ layout: 'mobile', shop: 'uniform', path: '/app/dashboard', as: { staffId: 'uniform-supervisor', pin: '3333' } });
    await screen.findByRole('region', { name: 'আজকের কাজ' });
    expect(screen.queryByRole('region', { name: 'টাকা' })).toBeNull();
    expect(screen.queryByText('আজ জমা')).toBeNull();
  });
});
