import { balanceDue, formatTaka, type Customer } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatNumber } from '../../i18n/format';
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
    await userEvent.type(screen.getByLabelText('নাম বা ফোন (বাংলা/English)'), target.nameAlt!);
    expect(within(customerList()).getByRole('link', { name: startsWith(target.name) })).toBeTruthy();
    expect(within(customerList()).getAllByRole('link').length).toBeLessThan(customers.length);
  });

  it('opens a profile panel beside the list on desktop, keeps the search, and closes back to the full list', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const target = uniquelyNamed(Object.values(store.getSnapshot().state.customers));
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    expect(screen.queryByRole('heading', { name: target.name })).toBeNull();

    await userEvent.type(screen.getByLabelText('নাম বা ফোন (বাংলা/English)'), target.name);
    await userEvent.click(within(customerList()).getByRole('link', { name: startsWith(target.name) }));

    expect(await screen.findByRole('heading', { name: target.name })).toBeTruthy();
    expect(screen.getByLabelText('নাম বা ফোন (বাংলা/English)')).toHaveProperty('value', target.name);
    const link = within(customerList()).getByRole('link', { name: startsWith(target.name) });
    expect(link.getAttribute('aria-current')).toBe('page');

    await userEvent.click(screen.getByRole('link', { name: 'বন্ধ করুন' }));
    expect(router.state.location.pathname).toBe('/app/customers');
  });

  it('filters the list to customers who owe money or have open orders', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const { state } = store.getSnapshot();
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    const owing = new Set(Object.values(state.orders).filter((o) => balanceDue(o) > 0).map((o) => o.customerId));

    const filters = screen.getByRole('group', { name: 'কাস্টমার ছাঁকুন' });
    const owes = within(filters).getByRole('button', { name: /বাকি/ });
    await userEvent.click(owes);
    expect(owes.getAttribute('aria-pressed')).toBe('true');
    expect(within(customerList()).getAllByRole('link')).toHaveLength(owing.size);

    await userEvent.click(within(filters).getByRole('button', { name: /সব কাস্টমার/ }));
    expect(within(customerList()).getAllByRole('link')).toHaveLength(Object.keys(state.customers).length);
  });

  it('shows the household and its other members', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    const { state } = store.getSnapshot();
    const household = await screen.findByRole('region', { name: 'পরিবার' });
    expect(within(household).getByText(state.households['rahman-h1']!.label)).toBeTruthy();
    const member = within(household).getByRole('link', { name: state.customers['rahman-c3']!.name });
    expect(member.getAttribute('href')).toBe('/app/customers/rahman-c3');
  });

  it('lists the four newest orders with balances, and repeats the latest from the header', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const { state } = store.getSnapshot();
    const customerId = state.orders['rahman-o40']!.customerId;
    await act(() => router.navigate(`/app/customers/${customerId}`));

    const history = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    const orders = Object.values(state.orders)
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const orderLinks = within(history).getAllByRole('link', { name: /^[A-Z]-\d{4}/ });
    expect(orderLinks.map((l) => l.textContent!.slice(0, 6))).toEqual(orders.slice(0, 4).map((o) => o.number));
    expect(orderLinks[0]!.getAttribute('href')).toBe(`/app/orders/${orders[0]!.id}`);
    expect(within(history).getByRole('link', { name: `সব ${formatNumber(orders.length, 'bn')}টি` })).toBeTruthy();

    for (const order of orders.slice(0, 4).filter((o) => balanceDue(o) > 0)) {
      expect(within(history).getAllByText(`বাকি ${formatTaka(balanceDue(order), 'bn')}`).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'আবার অর্ডার' }).getAttribute('href')).toBe(`/app/orders/new?repeat=${orders[0]!.id}`);
  });

  it('labels the order value as order value and shows owed in the stat tiles', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const { state } = store.getSnapshot();
    const customerId = state.orders['rahman-o40']!.customerId;
    await act(() => router.navigate(`/app/customers/${customerId}`));
    await screen.findByRole('heading', { level: 1 });
    expect(screen.getByText('অর্ডারের মোট মূল্য')).toBeTruthy();
    expect(screen.queryByText(/লাভ|profit/i)).toBeNull();
    expect(screen.getByText('বাকি', { selector: 'dt' })).toBeTruthy();
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
    expect(screen.queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(screen.queryByText('অর্ডারের মোট মূল্য')).toBeNull();
    expect(screen.queryByText('বাকি', { selector: 'dt' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'তথ্য বদলান' })).toBeNull();
    expect(within(screen.getByRole('group', { name: 'কাস্টমার ছাঁকুন' })).queryByRole('button', { name: /বাকি/ })).toBeNull();
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
