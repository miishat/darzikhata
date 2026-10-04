import { toBanglaDigits, todayInDhaka } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { DEFAULT_LIST_QUERY, queryOrders } from './orderList';

const table = () => screen.getByRole('table', { name: 'অর্ডার তালিকা' });
const bodyRows = () => within(table()).getAllByRole('row').slice(1);

describe('Orders list', () => {
  it('shows 20 orders a page, newest first, with paging', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    expect(await screen.findByText('৪০টি অর্ডার')).toBeTruthy();
    expect(bodyRows()).toHaveLength(20);
    expect(within(bodyRows()[0]!).getByRole('link', { name: 'A-0040' })).toBeTruthy();
    expect(screen.getByText('পাতা ১/২')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'পরের পাতা' }));
    expect(await screen.findByText('পাতা ২/২')).toBeTruthy();
    expect(within(bodyRows()[19]!).getByRole('link', { name: 'A-0001' })).toBeTruthy();
  });

  it('filters by status, shows the active filter, and clears it', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const today = todayInDhaka(new Date());
    const overdue = queryOrders(store.getSnapshot().state, { ...DEFAULT_LIST_QUERY, status: 'overdue' }, today);
    expect(overdue.total).toBeGreaterThan(0);

    await userEvent.selectOptions(await screen.findByLabelText('অবস্থা'), 'দেরি হয়েছে');
    expect(await screen.findByText(`${toBanglaDigits(String(overdue.total))}টি অর্ডার`)).toBeTruthy();
    expect(bodyRows()).toHaveLength(overdue.rows.length);
    expect(within(screen.getByRole('list', { name: 'চালু ফিল্টার' })).getByText('অবস্থা: দেরি হয়েছে')).toBeTruthy();
    expect(router.state.location.search).toBe('?status=overdue');

    await userEvent.click(screen.getByRole('button', { name: 'সব ফিল্টার মুছুন' }));
    expect(await screen.findByText('৪০টি অর্ডার')).toBeTruthy();
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
    expect(await screen.findByText('১টি অর্ডার')).toBeTruthy();
    expect(within(bodyRows()[0]!).getByRole('link', { name: 'A-0040' })).toBeTruthy();
  });

  it('opens an order beside the list and closes it back to the same filters', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders?status=open' });
    const first = within((await screen.findAllByRole('row'))[1]!).getByRole('link');
    const number = first.textContent!;
    await userEvent.click(first);

    const panel = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    expect(within(panel).getByRole('heading', { name: number })).toBeTruthy();
    expect(table()).toBeTruthy();
    expect(router.state.location.search).toBe('?status=open');
    expect(router.state.location.pathname).toMatch(/^\/app\/orders\/rahman-o\d+$/);

    await userEvent.click(within(panel).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('region', { name: 'অর্ডারের বিস্তারিত' })).toBeNull();
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(screen.getByLabelText('অবস্থা')).toHaveProperty('value', 'open');
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
    expect(headers).toEqual(['অর্ডার', 'কাস্টমার', 'পোশাক', 'ট্রায়াল / ডেলিভারি', 'অগ্রগতি', 'কারিগর']);
    expect(screen.queryByRole('checkbox', { name: 'শুধু বাকি আছে এমন' })).toBeNull();
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
