import { toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const supervisor = { staffId: 'uniform-supervisor', pin: '3333' };

describe('Branch scope', () => {
  it('lets the owner switch between branches, remembers the choice, and filters the orders list', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders' });
    const count = Object.keys(store.getSnapshot().state.orders).length;
    expect(await screen.findByText(`১–২০, মোট ${toBanglaDigits(String(count))}`)).toBeTruthy();
    await userEvent.click(await screen.findByRole('button', { name: /সব শাখা/ }));
    const branch = screen.getByLabelText('শাখা');
    expect(branch).toHaveProperty('value', 'all');

    await userEvent.selectOptions(branch, 'কারখানা');
    expect(await screen.findByText('১–১, মোট ১')).toBeTruthy();
    expect(screen.getByRole('row', { name: /A-0027/ })).toBeTruthy();
    expect(window.localStorage.getItem('dk.branch')).toBe('workshop');
  });

  it('shows staff of one branch only that branch, with no switcher', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders', as: supervisor });
    expect(await screen.findByText('১–১, মোট ১')).toBeTruthy();
    expect(screen.queryByLabelText('শাখা')).toBeNull();
    expect(screen.getByText('কারখানা')).toBeTruthy();

    const shopOrder = Object.values(store.getSnapshot().state.orders).find((o) => o.branchId === 'shop')!;
    await act(() => router.navigate(`/app/orders/${shopOrder.id}`));
    expect((await screen.findByRole('alert')).textContent).toBe('এই অর্ডারটি আপনার শাখার নয়');
  });

  it('limits payments and global search to the chosen branch', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/payments' });
    await userEvent.click(await screen.findByRole('button', { name: /সব শাখা/ }));
    await userEvent.selectOptions(await screen.findByLabelText('শাখা'), 'কারখানা');
    const due = screen.getByRole('table', { name: 'বাকি টাকা' });
    // The header and the group order.
    expect(within(due).getAllByRole('row')).toHaveLength(2);
    expect(within(due).getByText('A-0027')).toBeTruthy();

    const shopOrder = Object.values(store.getSnapshot().state.orders).find((o) => o.branchId === 'shop')!;
    await userEvent.type(screen.getByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), shopOrder.number);
    expect(screen.queryByRole('option', { name: new RegExp(`^${shopOrder.number}`) })).toBeNull();
  });

  it('keeps orders of other branches off a customer profile', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders', as: supervisor });
    await screen.findByText('১–১, মোট ১');
    const shopOrder = Object.values(store.getSnapshot().state.orders).find((o) => o.branchId === 'shop')!;
    await act(() => router.navigate(`/app/customers/${shopOrder.customerId}`));
    const region = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    expect(within(region).queryByRole('link', { name: new RegExp(shopOrder.number) })).toBeNull();
  });

  it('offers the switcher under More on a phone', async () => {
    await renderApp({ layout: 'mobile', shop: 'uniform', path: '/app/more' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা'), 'দোকান');
    expect(window.localStorage.getItem('dk.branch')).toBe('shop');
  });
});
