import { balanceDue, formatTaka, moneySummary, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { nextMove } from './stageMoves';

async function openPage(keep: (order: Order) => boolean, shop: 'rahman' | 'uniform' = 'rahman') {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders' });
  const order = Object.values(app.store.getSnapshot().state.orders)
    .sort((a, b) => a.number.localeCompare(b.number))
    .find(keep)!;
  await act(() => app.router.navigate(`/app/orders/${order.id}?full=1`));
  const page = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  return { ...app, order, page };
}

const customerOf = (store: ShopStore, order: Order) => store.getSnapshot().state.customers[order.customerId]!;
const readyCount = (order: Order) => order.items.filter((item) => nextMove(item)?.stage.group === 'delivered').length;

describe('Desktop order page', () => {
  it('leads with the customer, then the order number, the key numbers and the order’s papers', async () => {
    const { store, order, page } = await openPage((o) => balanceDue(o) > 0);
    const customer = customerOf(store, order);
    const money = moneySummary(order);

    const who = within(page).getByRole('region', { name: 'কাস্টমার' });
    expect(within(who).getAllByRole('link', { name: customer.name })[0]!.getAttribute('href')).toBe(`/app/customers/${customer.id}`);
    expect(within(who).getByRole('link', { name: 'কল করুন' }).getAttribute('href')).toBe(`tel:${customer.phone}`);
    expect(within(who).getByRole('link', { name: 'প্রোফাইল দেখুন' })).toBeTruthy();
    expect(within(page).getByRole('heading', { level: 1, name: order.number })).toBeTruthy();
    expect(within(page).getAllByText(formatTaka(money.balance, 'bn')).length).toBeGreaterThan(0);

    const papers = within(page).getByRole('group', { name: 'এই অর্ডারের কাগজ' });
    expect(within(papers).getByRole('link', { name: 'রসিদ প্রিন্ট' }).getAttribute('href')).toBe(`/print/receipt/${order.id}`);
    expect(within(papers).getByRole('link', { name: 'কাজের স্লিপ' }).getAttribute('href')).toBe(`/print/job/${order.id}`);
    expect(within(page).getByRole('link', { name: 'আবার অর্ডার' }).getAttribute('href')).toBe(`/app/orders/new?repeat=${order.id}`);
  });

  it('shows one section at a time under tabs that the arrow keys move between, and Share opens the status link', async () => {
    const { page } = await openPage((o) => balanceDue(o) > 0);
    const garments = within(page).getByRole('tab', { name: /^পোশাক/ });
    expect(garments.getAttribute('aria-selected')).toBe('true');
    expect(within(page).queryByRole('region', { name: 'টাকার হিসাব' })).toBeNull();

    garments.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(within(page).getByRole('tab', { name: 'টাকার হিসাব' }).getAttribute('aria-selected')).toBe('true');
    expect(within(page).getByRole('region', { name: 'টাকার হিসাব' })).toBeTruthy();

    await userEvent.click(within(page).getByRole('button', { name: 'স্ট্যাটাস লিংক শেয়ার করুন' }));
    expect(within(page).getByRole('tab', { name: 'স্ট্যাটাস লিংক' }).getAttribute('aria-selected')).toBe('true');
    expect(within(page).getByRole('region', { name: 'স্ট্যাটাস লিংক' })).toBeTruthy();
  });

  it('takes payment from the bar along the bottom', async () => {
    const { page } = await openPage((o) => balanceDue(o) > 0);
    await userEvent.click(within(page).getByRole('button', { name: 'টাকা নিন' }));
    expect(await screen.findByRole('dialog', { name: 'টাকা জমা' })).toBeTruthy();
  });

  it('asks which garment to hand over when several are ready', async () => {
    const { page } = await openPage((o) => readyCount(o) > 1, 'uniform');
    await userEvent.click(within(page).getByRole('button', { name: 'হস্তান্তর' }));
    const pick = await screen.findByRole('dialog', { name: 'কোনটি হস্তান্তর করবেন?' });
    expect(within(pick).getAllByRole('listitem').length).toBeGreaterThan(1);
  });

  it('goes back to the list with the close button', async () => {
    const { router, page } = await openPage((o) => balanceDue(o) > 0);
    await userEvent.click(within(page).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(router.state.location.pathname).toBe('/app/orders');
  });
});
