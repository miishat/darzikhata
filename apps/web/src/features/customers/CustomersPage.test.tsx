import { balanceDue, formatTaka, type Customer } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const customerList = () => screen.getByRole('list', { name: 'কাস্টমার তালিকা' });
/** Seed names can repeat once the name pool runs out, so tests pick someone whose name and alternate name are one of a kind. */
const uniquelyNamed = (customers: Customer[]) =>
  customers.find(
    (c) =>
      c.nameAlt &&
      customers.filter((o) => o.name === c.name || o.nameAlt === c.nameAlt || o.name === c.nameAlt || o.nameAlt === c.name)
        .length === 1,
  )!;
const startsWith = (text: string) => new RegExp(`^${text}`);

describe('Customers', () => {
  it('lists every customer and searches across Bangla and English names', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const customers = Object.values(store.getSnapshot().state.customers);
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    expect(within(customerList()).getAllByRole('link')).toHaveLength(customers.length);

    const target = uniquelyNamed(customers);
    await userEvent.type(screen.getByLabelText('কাস্টমার খুঁজুন'), target.nameAlt!);
    expect(within(customerList()).getByRole('link', { name: startsWith(target.name) })).toBeTruthy();
    expect(within(customerList()).getAllByRole('link').length).toBeLessThan(customers.length);
  });

  it('opens a profile beside the list on desktop and keeps the search', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const target = uniquelyNamed(Object.values(store.getSnapshot().state.customers));
    expect(await screen.findByText('বাম পাশ থেকে একজন কাস্টমার বেছে নিন')).toBeTruthy();

    await userEvent.type(screen.getByLabelText('কাস্টমার খুঁজুন'), target.name);
    await userEvent.click(within(customerList()).getByRole('link', { name: startsWith(target.name) }));

    expect(await screen.findByRole('heading', { name: target.name })).toBeTruthy();
    expect(screen.getByLabelText('কাস্টমার খুঁজুন')).toHaveProperty('value', target.name);
    const link = within(customerList()).getByRole('link', { name: startsWith(target.name) });
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('shows the household and its other members', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    const { state } = store.getSnapshot();
    const household = await screen.findByRole('region', { name: 'পরিবার' });
    expect(within(household).getByText(state.households['rahman-h1']!.label)).toBeTruthy();
    const member = within(household).getByRole('link', { name: state.customers['rahman-c3']!.name });
    expect(member.getAttribute('href')).toBe('/app/customers/rahman-c3');
  });

  it('lists orders newest first with balances and repeat links', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const { state } = store.getSnapshot();
    const customerId = state.orders['rahman-o40']!.customerId;
    await act(() => router.navigate(`/app/customers/${customerId}`));

    const history = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    const orders = Object.values(state.orders)
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const orderLinks = within(history).getAllByRole('link', { name: /^[A-Z]-\d{4}/ });
    expect(orderLinks.map((l) => l.textContent!.slice(0, 6))).toEqual(orders.map((o) => o.number));
    expect(orderLinks[0]!.getAttribute('href')).toBe(`/app/orders/${orders[0]!.id}`);

    const repeat = within(history).getAllByRole('link', { name: 'আবার অর্ডার' });
    expect(repeat).toHaveLength(orders.length);
    expect(repeat[0]!.getAttribute('href')).toBe(`/app/orders/new?repeat=${orders[0]!.id}`);
    for (const order of orders.filter((o) => balanceDue(o) > 0)) {
      expect(within(history).getAllByText(`বাকি ${formatTaka(balanceDue(order), 'bn')}`).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'এই কাস্টমারের নতুন অর্ডার' }).getAttribute('href')).toBe(
      `/app/orders/new?customer=${customerId}`,
    );
  });

  it('hides balances and order actions from staff without those permissions', async () => {
    const { store, router } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    const order = Object.values(store.getSnapshot().state.orders)[0]!;
    await act(() => router.navigate(`/app/customers/${order.customerId}`));
    const history = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    expect(within(history).queryByText(/^বাকি/)).toBeNull();
    expect(within(history).queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'তথ্য বদলান' })).toBeNull();
  });

  it('shows the list, then the profile alone on mobile, with a way back', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers' });
    const target = uniquelyNamed(Object.values(store.getSnapshot().state.customers));
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    await userEvent.click(within(customerList()).getByRole('link', { name: startsWith(target.name) }));

    expect(await screen.findByRole('heading', { name: target.name })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'কাস্টমার তালিকা' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'সব কাস্টমার' }));
    expect(await screen.findByRole('list', { name: 'কাস্টমার তালিকা' })).toBeTruthy();
  });

  it('says so when a customer does not exist', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/nobody' });
    expect((await screen.findByRole('alert')).textContent).toBe('কাস্টমার পাওয়া যায়নি');
  });
});
