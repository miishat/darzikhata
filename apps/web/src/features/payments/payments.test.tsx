import { balanceDue, formatTaka, moneySummary, netPaid, outstandingBalances, type Order } from '@darzikhata/domain';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

function find(store: ShopStore, keep: (order: Order) => boolean): Order {
  const order = Object.values(store.getSnapshot().state.orders)
    .sort((a, b) => a.number.localeCompare(b.number))
    .find(keep);
  if (!order) throw new Error('No sample order fits this test');
  return order;
}

async function openOrder(keep: (order: Order) => boolean, as?: { staffId: string; pin: string }, shop: 'rahman' | 'nakshi' = 'rahman') {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = find(app.store, keep);
  await act(() => app.router.navigate(`/app/orders/${order.id}?full=1`));
  await userEvent.click(await screen.findByRole('tab', { name: 'টাকার হিসাব' }));
  const money = await screen.findByRole('region', { name: 'টাকার হিসাব' });
  return { ...app, order, money };
}

const latest = (store: ShopStore, id: string) => store.getSnapshot().state.orders[id]!;
const totalsRow = (scope: HTMLElement, label: RegExp) =>
  within(within(scope).getByRole('table', { name: 'হিসাব' })).getByRole('row', { name: label });

describe('Payments on an order', () => {
  it('records a payment only when the button is pressed, never on Enter', async () => {
    const { store, order, money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 20000);
    const balance = balanceDue(order);

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা নিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা জমা' });
    const amount = within(dialog).getByLabelText('টাকার অঙ্ক');
    expect(amount).toHaveProperty('value', formatTaka(balance, 'bn').replace('৳', '').replace(/,/g, ''));
    await userEvent.clear(amount);
    await userEvent.type(amount, '১০০{Enter}');
    expect(screen.getByRole('dialog', { name: 'টাকা জমা' })).toBeTruthy();
    expect(latest(store, order.id).payments).toHaveLength(order.payments.length);

    await userEvent.click(within(dialog).getByRole('radio', { name: 'বিকাশ' }));
    await userEvent.type(within(dialog).getByLabelText('রেফারেন্স / TrxID (ঐচ্ছিক)'), 'TX99');
    await userEvent.click(within(dialog).getByRole('button', { name: /জমা করুন$/ }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'টাকা জমা' })).toBeNull());
    const after = latest(store, order.id);
    expect(after.payments.at(-1)).toMatchObject({ amount: 10000, method: 'bkash', reference: 'TX99', kind: 'payment' });
    expect(within(totalsRow(money, /^বাকি/)).getByText(formatTaka(balance - 10000, 'bn'))).toBeTruthy();
  });

  it('needs a reason for a refund and never refunds more than was paid', async () => {
    const { store, order, money } = await openOrder((o) => netPaid(o.payments) > 10000);
    const paid = netPaid(order.payments);

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা ফেরত দিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা ফেরত' });
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), String(paid / 100 + 1));
    await userEvent.click(within(dialog).getByRole('button', { name: /ফেরত দিন$/ }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    expect(within(dialog).getByText('যত টাকা জমা আছে তার বেশি ফেরত দেওয়া যাবে না')).toBeTruthy();

    await userEvent.clear(within(dialog).getByLabelText('টাকার অঙ্ক'));
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), '100');
    await userEvent.type(within(dialog).getByLabelText('ফেরতের কারণ'), 'কাপড় কম লেগেছে');
    await userEvent.click(within(dialog).getByRole('button', { name: /ফেরত দিন$/ }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'টাকা ফেরত' })).toBeNull());
    expect(netPaid(latest(store, order.id).payments)).toBe(paid - 10000);
    expect(within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getByText('কাপড় কম লেগেছে')).toBeTruthy();
  });

  it('corrects a mistyped payment with a new record, keeping the original', async () => {
    const { store, order, money } = await openOrder(
      (o) => o.payments.some((p) => p.kind === 'advance' && p.amount > 20000) && !o.payments.some((p) => p.kind === 'correction'),
    );
    const advance = order.payments.find((p) => p.kind === 'advance')!;
    const rowsBefore = within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row').length;

    await userEvent.click(within(money).getAllByRole('button', { name: 'ভুল ঠিক করুন' })[order.payments.indexOf(advance)]!);
    const dialog = await screen.findByRole('dialog', { name: 'ভুল ঠিক করুন' });
    await userEvent.type(within(dialog).getByLabelText('সঠিক অঙ্ক'), String((advance.amount - 10000) / 100));
    await userEvent.type(within(dialog).getByLabelText('সংশোধনের কারণ'), 'ভুল অঙ্ক লেখা হয়েছিল');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    const after = latest(store, order.id);
    expect(after.payments.at(-1)).toMatchObject({ kind: 'correction', corrects: advance.id, amount: -10000 });
    expect(after.payments.find((p) => p.id === advance.id)).toEqual(advance);
    expect(within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row')).toHaveLength(rowsBefore + 1);
  });

  it('offers to refund credit due after a cancellation, and does nothing on its own', async () => {
    const app = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const order = find(app.store, (o) => o.items.filter((i) => !i.cancelled && i.stageKey !== 'delivered').length >= 2);
    const item = order.items.find((i) => !i.cancelled && i.stageKey !== 'delivered')!;
    await act(async () => {
      const due = balanceDue(order);
      if (due > 0) {
        await app.store.dispatch({
          type: 'payment.recorded',
          orderId: order.id,
          payment: { id: 'pay-all', amount: due, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
        });
      }
      await app.store.dispatch({ type: 'item.cancelled', orderId: order.id, itemId: item.id, reason: 'বাদ' });
    });
    const credit = moneySummary(latest(app.store, order.id)).creditDue;
    expect(credit).toBe(item.price);

    await act(() => app.router.navigate(`/app/orders/${order.id}?full=1`));
    await userEvent.click(await screen.findByRole('tab', { name: 'টাকার হিসাব' }));
    const money = await screen.findByRole('region', { name: 'টাকার হিসাব' });
    expect(within(totalsRow(money, /^ফেরত পাওনা/)).getByText(formatTaka(credit, 'bn'))).toBeTruthy();
    expect(within(money).getByText('ফেরত দিন, অথবা কাস্টমারের ক্রেডিট হিসেবে রেখে দিন। নিজে থেকে কিছু হবে না।')).toBeTruthy();

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা ফেরত দিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা ফেরত' });
    await userEvent.type(within(dialog).getByLabelText('ফেরতের কারণ'), 'বাতিল আইটেমের টাকা');
    await userEvent.click(within(dialog).getByRole('button', { name: /ফেরত দিন$/ }));
    await waitFor(() => expect(moneySummary(latest(app.store, order.id)).creditDue).toBe(0));
  });

  it('adds a price adjustment with a reason', async () => {
    const { store, order, money } = await openOrder((o) => o.items.some((i) => !i.cancelled));
    const before = moneySummary(order).total;
    await userEvent.click(within(money).getByRole('button', { name: 'দাম সমন্বয়' }));
    const dialog = await screen.findByRole('dialog', { name: 'দাম সমন্বয়' });
    await userEvent.click(within(dialog).getByRole('radio', { name: 'দাম বাড়ান' }));
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), '50');
    await userEvent.type(within(dialog).getByLabelText('কারণ'), 'বাড়তি লাইনিং');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    expect(moneySummary(latest(store, order.id)).total).toBe(before + 5000);
    expect(within(totalsRow(money, /^সমন্বয়/)).getByText(formatTaka(5000, 'bn'))).toBeTruthy();
  });

  it('lets counter staff take payments but not refund or correct them', async () => {
    const { money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 0, { staffId: 'nakshi-counter', pin: '2222' }, 'nakshi');
    expect(within(money).getByRole('button', { name: 'টাকা নিন' })).toBeTruthy();
    expect(within(money).queryByRole('button', { name: 'টাকা ফেরত দিন' })).toBeNull();
    expect(within(money).queryByRole('button', { name: 'ভুল ঠিক করুন' })).toBeNull();
  });
});

describe('Payments page', () => {
  it('lists money due, largest first, with the total, and records nothing until an order is opened', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const state = store.getSnapshot().state;
    const due = outstandingBalances(Object.values(state.orders));
    const table = await screen.findByRole('table', { name: 'বাকি টাকা' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(due.length + 1);
    expect(within(rows[1]!).getByText(due[0]!.order.number)).toBeTruthy();
    const sum = due.reduce((s, r) => s + r.balance, 0);
    expect(within(screen.getByRole('group', { name: 'কোন হিসাব দেখবেন' })).getByText(formatTaka(sum, 'bn'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
  });

  it('narrows the list by search', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const first = outstandingBalances(Object.values(store.getSnapshot().state.orders))[0]!.order;
    await userEvent.type(await screen.findByLabelText('অর্ডার নম্বর, নাম বা ফোন'), first.number);
    const rows = within(screen.getByRole('table', { name: 'বাকি টাকা' })).getAllByRole('row');
    expect(rows).toHaveLength(2);
  });

  it('opens the customer beside the list and takes a payment for the picked order', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const { order, balance } = outstandingBalances(Object.values(store.getSnapshot().state.orders))[0]!;
    const name = store.getSnapshot().state.customers[order.customerId]!.name;
    const table = await screen.findByRole('table', { name: 'বাকি টাকা' });
    await userEvent.click(within(within(table).getAllByRole('row')[1]!).getByRole('link', { name }));
    expect(router.state.location.search).toBe(`?order=${order.id}`);

    const card = screen.getByRole('complementary', { name: `${name}: টাকার হিসাব` });
    expect(within(card).getByRole('link', { name: 'অর্ডার খুলুন' }).getAttribute('href')).toBe(`/app/orders/${order.id}`);
    await userEvent.click(within(card).getByRole('button', { name: 'টাকা নিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা জমা' });
    await userEvent.click(within(dialog).getByRole('button', { name: /জমা করুন$/ }));
    await waitFor(() => expect(balanceDue(latest(store, order.id))).toBe(0));
    expect(netPaid(latest(store, order.id).payments)).toBe(netPaid(order.payments) + balance);

    await userEvent.click(within(card).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('complementary', { name: `${name}: টাকার হিসাব` })).toBeNull();
  });

  it('switches between the customer orders in the card, with the picked one checked', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const orders = Object.values(store.getSnapshot().state.orders);
    const owing = outstandingBalances(orders).find(({ order }) => orders.filter((o) => o.customerId === order.customerId).length > 1);
    if (!owing) throw new Error('No sample customer has two orders');
    const other = orders.find((o) => o.customerId === owing.order.customerId && o.id !== owing.order.id)!;
    await act(() => router.navigate(`/app/payments?order=${owing.order.id}`));

    const list = await screen.findByRole('region', { name: 'অর্ডার' });
    expect(within(list).getByRole('button', { name: new RegExp(owing.order.number) }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(within(list).getByRole('button', { name: new RegExp(other.number) }));
    expect(router.state.location.search).toBe(`?order=${other.id}`);
    expect(screen.getByRole('region', { name: other.number })).toBeTruthy();
  });

  it('on a phone lists one card per unpaid order, with no table', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/payments' });
    const due = outstandingBalances(Object.values(store.getSnapshot().state.orders));
    const list = await screen.findByRole('list', { name: 'বাকি টাকা' });
    expect(within(list).getAllByRole('link')).toHaveLength(due.length);
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByText(formatTaka(due.reduce((s, r) => s + r.balance, 0), 'bn'))).toBeTruthy();
  });
});
