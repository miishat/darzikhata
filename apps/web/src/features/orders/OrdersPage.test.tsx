import { itemSummaryGroup, moneySummary, toBanglaDigits, todayInDhaka, type Order } from '@darzikhata/domain';
import { act, cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { DEFAULT_LIST_QUERY, queryOrders } from './orderList';
import { countViews } from './orderViews';

const table = () => screen.getByRole('table', { name: 'অর্ডার তালিকা' });
const bodyRows = () => within(table()).getAllByRole('row').slice(1);
const bn = (n: number) => toBanglaDigits(String(n));
const numberOf = (row: HTMLElement) => within(row).getByText(/^[A-Z]-\d{4}$/).textContent;

describe('Orders list', () => {
  it('shows 20 orders a page, newest first, with paging', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    expect(await screen.findByText('১–২০, মোট ৪০')).toBeTruthy();
    expect(bodyRows()).toHaveLength(20);
    expect(numberOf(bodyRows()[0]!)).toBe('A-0040');
    await userEvent.click(screen.getByRole('button', { name: 'পরের পাতা' }));
    expect(await screen.findByText('২১–৪০, মোট ৪০')).toBeTruthy();
    expect(numberOf(bodyRows()[19]!)).toBe('A-0001');
  });

  it('filters with view tabs that show their counts and keep the address params the phone uses', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const today = todayInDhaka(new Date());
    const state = store.getSnapshot().state;
    const counts = countViews(state, today);
    const overdue = queryOrders(state, { ...DEFAULT_LIST_QUERY, status: 'overdue' }, today);
    expect(overdue.total).toBeGreaterThan(0);

    const tabs = within(await screen.findByRole('tablist', { name: 'অর্ডারের ভিউ' }));
    expect(tabs.getAllByRole('tab').map((t) => t.textContent!.replace(/[০-৯]+$/, ''))).toEqual(['সব', 'চলমান', 'ট্রায়াল', 'রেডি', 'দেরি', 'বাকি আছে']);
    expect(tabs.getByRole('tab', { name: /^সব/ }).getAttribute('aria-selected')).toBe('true');
    expect(tabs.getByRole('tab', { name: /^দেরি/ }).textContent).toContain(bn(counts.late));

    await userEvent.click(tabs.getByRole('tab', { name: /^দেরি/ }));
    expect(await screen.findByText(new RegExp(`^১–${bn(overdue.rows.length)}, মোট ${bn(overdue.total)}$`))).toBeTruthy();
    expect(bodyRows()).toHaveLength(overdue.rows.length);
    expect(router.state.location.search).toBe('?status=overdue');
    // The tab names the status, so there is no chip for it.
    expect(screen.queryByRole('list', { name: 'চালু ফিল্টার' })).toBeNull();
    const panel = screen.getByRole('tabpanel');
    expect(panel.getAttribute('aria-labelledby')).toBe(tabs.getByRole('tab', { name: /^দেরি/ }).id);
    expect(tabs.getByRole('tab', { name: /^দেরি/ }).getAttribute('aria-controls')).toBe(panel.id);

    const owed = queryOrders(state, { ...DEFAULT_LIST_QUERY, dueOnly: true }, today).total;
    await userEvent.click(tabs.getByRole('tab', { name: /^বাকি আছে/ }));
    expect(await screen.findByText(new RegExp(`মোট ${bn(owed)}$`))).toBeTruthy();
    expect(router.state.location.search).toBe('?due=1');
  });

  it('selects the tab for an old address, and lists a filter no tab can show', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders?status=ready' });
    expect((await screen.findByRole('tab', { name: /^রেডি/ })).getAttribute('aria-selected')).toBe('true');

    await act(() => router.navigate('/app/orders?status=closed'));
    const chips = within(await screen.findByRole('list', { name: 'চালু ফিল্টার' }));
    expect(chips.getByText('অবস্থা: শেষ')).toBeTruthy();
    expect(screen.getAllByRole('tab').every((t) => t.getAttribute('aria-selected') === 'false')).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'সব ফিল্টার মুছুন' }));
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('list', { name: 'চালু ফিল্টার' })).toBeNull();
  });

  it('filters by worker and delivery dates with a chip each, and removes them from the chips', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/orders' });
    const today = todayInDhaka(new Date());
    const state = store.getSnapshot().state;
    const first = queryOrders(state, DEFAULT_LIST_QUERY, today, 1000).rows.find((r) => r.workers.length > 0)!;
    const id = first.workers[0]!;
    const name = store.getSnapshot().config!.staff.find((p) => p.id === id)!.name;
    const expected = queryOrders(state, { ...DEFAULT_LIST_QUERY, worker: id }, today).total;

    await userEvent.click(await screen.findByRole('button', { name: 'কারিগর' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'কারিগর বাছাই' })).getByRole('button', { name }));
    expect(router.state.location.search).toBe(`?worker=${id}`);
    const chips = within(await screen.findByRole('list', { name: 'চালু ফিল্টার' }));
    expect(chips.getByText(`কারিগর: ${name}`)).toBeTruthy();
    expect(await screen.findByText(new RegExp(`মোট ${bn(expected)}$`))).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'ডেলিভারির তারিখ' }));
    const group = within(screen.getByRole('group', { name: 'ডেলিভারির তারিখ বাছাই' }));
    await userEvent.type(group.getByLabelText('থেকে'), '2020-01-01');
    expect(router.state.location.search).toBe(`?worker=${id}&from=2020-01-01`);
    expect(chips.getByText(/^ডেলিভারি .* থেকে$/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: `কারিগর: ${name} সরান` }));
    expect(router.state.location.search).toBe('?from=2020-01-01');
  });

  it('shows a branch chip for a chosen branch and takes it off with the chip', async () => {
    await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders' });
    await userEvent.click(await screen.findByRole('button', { name: /সব শাখা/ }));
    await userEvent.selectOptions(await screen.findByLabelText('শাখা'), 'কারখানা');
    const chips = within(await screen.findByRole('list', { name: 'চালু ফিল্টার' }));
    expect(chips.getByText('শাখা: কারখানা')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'শাখা: কারখানা সরান' }));
    expect(screen.queryByRole('list', { name: 'চালু ফিল্টার' })).toBeNull();
  });

  it('shows customer, a pill per garment, delivery, worker and what is owed, and marks the open order', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const state = store.getSnapshot().state;
    const headers = await screen.findAllByRole('columnheader');
    expect(headers.map((c) => c.textContent)).toEqual(['কাস্টমার', 'পোশাক ও ধাপ', 'ডেলিভারি', 'কারিগর', 'বাকি']);
    const rows = bodyRows();
    // A row names its customer with a link, and carries its order number under it.
    const row = rows[0]!;
    const order = Object.values(state.orders).find((o) => o.number === numberOf(row))!;
    expect(within(row).getByRole('link', { name: state.customers[order.customerId]!.name })).toBeTruthy();
    expect(within(row).getAllByRole('listitem').length).toBeGreaterThan(0);
    expect(rows.some((r) => within(r).queryByText('পরিশোধিত'))).toBe(true);
    expect(rows.every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);

    await userEvent.click(row);
    expect(row.getAttribute('aria-selected')).toBe('true');
  });

  it('moves the selection with Up and Down, opens the full page with Enter, and closes with Escape', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders?status=open' });
    await screen.findByRole('table', { name: 'অর্ডার তালিকা' });
    const ids = () => bodyRows().map((r) => r.getAttribute('data-order-id'));
    const first = ids()[0]!;
    bodyRows()[0]!.focus();

    await userEvent.keyboard('{ArrowDown}');
    expect(router.state.location.pathname).toBe(`/app/orders/${ids()[1]}`);
    expect(document.activeElement).toBe(bodyRows()[1]);
    expect(bodyRows()[1]!.getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' })).toBeTruthy();
    await userEvent.keyboard('{ArrowUp}');
    expect(router.state.location.pathname).toBe(`/app/orders/${first}`);

    await userEvent.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe(`/app/orders/${first}`);
    expect(router.state.location.search).toBe('?status=open&full=1');
    expect(screen.queryByRole('table', { name: 'অর্ডার তালিকা' })).toBeNull();
    await userEvent.click(within(screen.getByRole('region', { name: 'অর্ডারের বিস্তারিত' })).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(router.state.location.search).toBe('?status=open');

    bodyRows()[0]!.focus();
    await userEvent.keyboard('{ArrowDown}');
    await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'অর্ডারের বিস্তারিত' })).toBeNull();
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(router.state.location.search).toBe('?status=open');
  });

  it('does not move the selection from keys typed in the search box', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    await userEvent.type(await screen.findByRole('searchbox', { name: 'অর্ডার নম্বর, নাম বা ফোন' }), '{ArrowDown}{Enter}');
    expect(router.state.location.pathname).toBe('/app/orders');
  });

  it('hands over from the panel footer by choosing the garment, never from a key', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.items.filter((i) => itemSummaryGroup(i) === 'ready').length >= 2)!;
    const readyCount = order.items.filter((i) => itemSummaryGroup(i) === 'ready').length;
    await act(() => router.navigate(`/app/orders/${order.id}`));
    const panel = within(await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' }));
    // The footer button and each garment's own button have different names.
    expect(panel.getAllByRole('button', { name: 'হস্তান্তর করুন' })).toHaveLength(readyCount);
    await userEvent.keyboard('{Enter}');
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(panel.getByRole('button', { name: 'হস্তান্তর' }));
    const pick = await screen.findByRole('dialog', { name: 'কোনটি হস্তান্তর করবেন?' });
    expect(within(pick).getAllByRole('button').length).toBeGreaterThanOrEqual(readyCount);
    expect(store.getSnapshot().state.orders[order.id]!.items.filter((i) => itemSummaryGroup(i) === 'ready')).toHaveLength(readyCount);
  });

  it('filters with chips on a phone, with counts that ignore the search, and Owed maps to money due', async () => {
    const { store, router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders' });
    const today = todayInDhaka(new Date());
    const state = store.getSnapshot().state;
    const bn = (n: number) => toBanglaDigits(String(n));
    const chips = within(await screen.findByRole('group', { name: 'অবস্থা অনুযায়ী দেখুন' }));
    const late = queryOrders(state, { ...DEFAULT_LIST_QUERY, status: 'overdue' }, today).total;
    const owed = queryOrders(state, { ...DEFAULT_LIST_QUERY, dueOnly: true }, today).total;
    expect(chips.getAllByRole('button').map((b) => b.textContent!.replace(/[০-৯]+$/, ''))).toEqual([
      'সব', 'চলমান', 'ট্রায়াল', 'রেডি', 'দেরি', 'বাকি আছে',
    ]);

    await userEvent.click(chips.getByRole('button', { name: new RegExp(String.raw`^দেরি\s*${bn(late)}$`) }));
    expect(await screen.findByText(`${bn(late)}টি অর্ডার`)).toBeTruthy();
    expect(router.state.location.search).toBe('?status=overdue');

    await userEvent.type(screen.getByRole('searchbox', { name: 'অর্ডার খুঁজুন' }), 'zzzz');
    expect(chips.getByRole('button', { name: new RegExp(String.raw`^দেরি\s*${bn(late)}$`) })).toBeTruthy();

    await userEvent.clear(screen.getByRole('searchbox', { name: 'অর্ডার খুঁজুন' }));
    await userEvent.click(chips.getByRole('button', { name: new RegExp(String.raw`^বাকি আছে\s*${bn(owed)}$`) }));
    expect(await screen.findByText(`${bn(owed)}টি অর্ডার`)).toBeTruthy();
    expect(router.state.location.search).toBe('?due=1');
  });

  it('lists a phone filter that no chip shows, with a way to clear it', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders?status=closed' });
    const list = within(await screen.findByRole('list', { name: 'চালু ফিল্টার' }));
    expect(list.getByText('অবস্থা: শেষ')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'সব ফিল্টার মুছুন' }));
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('list', { name: 'চালু ফিল্টার' })).toBeNull();
  });

  it('lists the desktop-only worker and date filters on a phone, with a way to clear them', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders?worker=nobody&from=2020-01-01' });
    const list = within(await screen.findByRole('list', { name: 'চালু ফিল্টার' }));
    expect(list.getByText('কারিগর: nobody')).toBeTruthy();
    expect(list.getAllByRole('listitem')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'সব ফিল্টার মুছুন' }));
    expect(router.state.location.search).toBe('');
  });

  it('sorts from a sheet opened by the header button on a phone', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders' });
    await userEvent.click(await screen.findByRole('button', { name: 'সাজান: নতুন আগে' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'ডেলিভারির তারিখ' }));
    expect(router.state.location.search).toBe('?sort=delivery');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('finds an order by its number typed in Bangla digits', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    await userEvent.type(await screen.findByLabelText('অর্ডার নম্বর, নাম বা ফোন'), '৪০');
    expect(await screen.findByText('১–১, মোট ১')).toBeTruthy();
    expect(numberOf(bodyRows()[0]!)).toBe('A-0040');
  });

  it('opens an order beside the list and closes it back to the same filters', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders?status=open' });
    const row = (await screen.findAllByRole('row'))[1]!;
    const number = numberOf(row)!;
    await userEvent.click(within(row).getByRole('link'));

    const panel = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    expect(within(panel).getByRole('heading', { name: number })).toBeTruthy();
    expect(table()).toBeTruthy();
    expect(router.state.location.search).toBe('?status=open');
    expect(router.state.location.pathname).toMatch(/^\/app\/orders\/rahman-o\d+$/);

    await userEvent.click(within(panel).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('region', { name: 'অর্ডারের বিস্তারিত' })).toBeNull();
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(screen.getByRole('tab', { name: /^চলমান/ }).getAttribute('aria-selected')).toBe('true');
  });

  it('shows the panel money block and take-payment button to staff with money access, and hides them from others', async () => {
    const owed = (store: { getSnapshot(): { state: { orders: Record<string, Order> } } }) =>
      Object.values(store.getSnapshot().state.orders).find((o) => moneySummary(o).balance > 0)!;

    const withMoney = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders' });
    await act(() => withMoney.router.navigate(`/app/orders/${owed(withMoney.store).id}`));
    const panel = within(await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' }));
    expect(panel.getByRole('region', { name: 'টাকার হিসাব' })).toBeTruthy();
    expect(panel.getByRole('button', { name: 'টাকা নিন' })).toBeTruthy();
    cleanup();

    const without = await renderApp({
      layout: 'desktop',
      shop: 'uniform',
      path: '/app/orders',
      as: { staffId: 'uniform-supervisor', pin: '3333' },
    });
    await act(() => without.router.navigate(`/app/orders/${owed(without.store).id}`));
    const hidden = within(await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' }));
    expect(hidden.queryByRole('region', { name: 'টাকার হিসাব' })).toBeNull();
    expect(hidden.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
  });

  it('hides money columns and filters from staff without money access', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'uniform',
      path: '/app/orders',
      as: { staffId: 'uniform-supervisor', pin: '3333' },
    });
    const headers = within(await screen.findByRole('table', { name: 'অর্ডার তালিকা' }))
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['কাস্টমার', 'পোশাক ও ধাপ', 'ডেলিভারি', 'কারিগর']);
    expect(screen.queryByRole('tab', { name: /^বাকি আছে/ })).toBeNull();
    expect(screen.queryByRole('option', { name: 'বাকি বেশি আগে' })).toBeNull();
  });

  it('opens an order on its own screen on mobile, with a way back to the same list', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders?status=ready' });
    const list = await screen.findByRole('list', { name: 'অর্ডার তালিকা' });
    await userEvent.click(within(list).getAllByRole('link')[0]!);

    expect(await screen.findByRole('heading', { name: /^[A-Z]-\d{4}$/ })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'অর্ডার তালিকা' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'সব অর্ডার' }));
    expect(await screen.findByRole('list', { name: 'অর্ডার তালিকা' })).toBeTruthy();
    expect(router.state.location.search).toBe('?status=ready');
  });
});

describe('Orders on a phone: filters the chips cannot show', () => {
  it('lists status and money due together when both are in the address', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders?status=ready&due=1' });
    const active = await screen.findByRole('list', { name: 'চালু ফিল্টার' });
    expect(within(active).getByText('অবস্থা: রেডি আছে')).toBeTruthy();
    expect(within(active).getByText('শুধু বাকি আছে এমন')).toBeTruthy();
  });
});
