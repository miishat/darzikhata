import { balanceDue, formatTaka, moneySummary, subtotal, type Order } from '@darzikhata/domain';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

async function openOrder(keep: (order: Order) => boolean, language: 'bn' | 'en' = 'bn') {
  const app = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders', language });
  const order = Object.values(app.store.getSnapshot().state.orders)
    .sort((a, b) => a.number.localeCompare(b.number))
    .find(keep)!;
  await act(() => app.router.navigate(`/app/orders/${order.id}?full=1`));
  const money = await screen.findByRole('region', { name: language === 'bn' ? 'টাকার হিসাব' : 'Money' });
  return { ...app, order, money };
}

const latest = (store: ShopStore, id: string) => store.getSnapshot().state.orders[id]!;

describe('Desktop money window', () => {
  it('fills in a suggested amount, names it on the button and shows the order before and after', async () => {
    const { store, order, money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 40000);
    const balance = balanceDue(order);
    const half = Math.round(balance / 2 / 1000) * 1000;

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা নিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা জমা' });
    const summary = within(dialog).getByRole('complementary', { name: 'এই অর্ডারের হিসাব' });
    expect(within(summary).getByText('সেভ করার পরে পুরো টাকা শোধ হয়ে যাবে')).toBeTruthy();
    expect(within(dialog).queryByLabelText('রেফারেন্স / TrxID (ঐচ্ছিক)')).toBeNull();

    await userEvent.click(within(dialog).getByRole('button', { name: `অর্ধেক ${formatTaka(half, 'bn')}` }));
    expect(within(summary).getByText(`সেভ করার পরে বাকি থাকবে ${formatTaka(balance - half, 'bn')}`)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'বিকাশ' }));
    await userEvent.type(within(dialog).getByLabelText('রেফারেন্স / TrxID (ঐচ্ছিক)'), 'TX7');
    await userEvent.click(within(dialog).getByRole('button', { name: `${formatTaka(half, 'bn')} জমা করুন` }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(latest(store, order.id).payments.at(-1)).toMatchObject({ amount: half, method: 'bkash', reference: 'TX7' });
  });

  it('sets a discount from a percentage of the price, and clears it again', async () => {
    const { store, order, money } = await openOrder((o) => !o.discount && subtotal(o) >= 100000);
    const tenth = Math.round(subtotal(order) / 10 / 1000) * 1000;

    await userEvent.click(within(money).getByRole('button', { name: 'ছাড় বদলান' }));
    let dialog = await screen.findByRole('dialog', { name: 'ছাড় বদলান' });
    await userEvent.click(within(dialog).getByRole('button', { name: `১০% · ${formatTaka(tenth, 'bn')}` }));
    expect(within(dialog).getByLabelText('ছাড়')).toHaveProperty('value', formatTaka(tenth, 'bn').replace('৳', '').replace(/,/g, ''));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    await waitFor(() => expect(latest(store, order.id).discount?.amount).toBe(tenth));

    await userEvent.click(within(money).getByRole('button', { name: 'ছাড় বদলান' }));
    dialog = await screen.findByRole('dialog', { name: 'ছাড় বদলান' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'ছাড় নেই' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    await waitFor(() => expect(latest(store, order.id).discount).toBeNull());
    expect(moneySummary(latest(store, order.id)).total).toBe(moneySummary(order).total);
  });

  it('reads in English when the app is in English', async () => {
    const { money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 0, 'en');
    await userEvent.click(within(money).getByRole('button', { name: 'Take Payment' }));
    const dialog = await screen.findByRole('dialog', { name: 'Payment' });
    expect(within(dialog).getByRole('button', { name: /^Record ৳/ })).toBeTruthy();
    // Everything but the customer's saved name is in English; ৳ is the only Bangla-block character allowed.
    const labels = [
      within(dialog).getByRole('complementary', { name: 'This Order’s Money' }),
      within(dialog).getByRole('group', { name: 'Quick Amounts' }),
      within(dialog).getByRole('group', { name: 'Paid by' }),
    ];
    for (const part of labels) expect(part.textContent).not.toMatch(/[ঀ-৲৴-৿]/);
  });
});
