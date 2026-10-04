import { itemSummaryGroup, moneySummary, toBanglaDigits, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { nextMove } from './stageMoves';

function find(store: ShopStore, keep: (order: Order) => boolean): Order {
  const order = Object.values(store.getSnapshot().state.orders).find(keep);
  if (!order) throw new Error('No sample order fits this test');
  return order;
}

async function openOrder(
  shop: 'rahman' | 'nakshi' | 'uniform',
  keep: (order: Order) => boolean,
  as?: { staffId: string; pin: string },
) {
  const app = await renderApp({ layout: 'mobile', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = find(app.store, keep);
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  await screen.findByRole('heading', { name: order.number });
  return { ...app, order };
}

const readyCount = (o: Order) => o.items.filter((i) => nextMove(i)?.stage.group === 'delivered').length;
const owes = (o: Order) => moneySummary(o).balance > 0;

describe('Order detail on a phone', () => {
  it('shows one customer, money and garment layout with call and message links', async () => {
    const { order, store } = await openOrder('rahman', (o) => o.items.length >= 2);
    const customer = store.getSnapshot().state.customers[order.customerId]!;
    expect(screen.getByRole('link', { name: 'কল করুন' }).getAttribute('href')).toBe(`tel:${customer.phone}`);
    expect(screen.getByRole('link', { name: 'মেসেজ পাঠান' }).getAttribute('href')).toBe(`sms:${customer.phone}`);
    expect(screen.getByRole('link', { name: new RegExp(customer.name) })).toBeTruthy();
    expect(screen.getByRole('region', { name: 'টাকার হিসাব' })).toBeTruthy();
    expect(screen.getAllByRole('list', { name: 'ধাপ' }).length).toBeGreaterThan(0);
  });

  it('has at most one filled button: Take payment when money is owed, Hand over otherwise', async () => {
    const owing = await openOrder('rahman', (o) => owes(o) && readyCount(o) > 0);
    expect(screen.getByRole('button', { name: 'টাকা নিন' }).className).toContain('bg-brand');
    expect(screen.getByRole('button', { name: 'হস্তান্তর' }).className).not.toContain('bg-brand');
    const filled = screen.getAllByRole('button').filter((b) => /(^|\s)bg-brand(\s|$)/.test(b.className));
    expect(filled).toHaveLength(1);
    expect(owing.order.id).toBeTruthy();
  });

  it('makes Hand over the filled button when nothing is owed, and hides Take payment', async () => {
    const { store, order } = await openOrder('rahman', (o) => owes(o) && readyCount(o) > 0);
    await act(() =>
      store.dispatch({
        type: 'payment.recorded',
        orderId: order.id,
        payment: { id: 'pay-rest', amount: moneySummary(order).balance, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
      }),
    );
    expect(await screen.findByRole('button', { name: 'হস্তান্তর' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
    expect(screen.getByRole('button', { name: 'হস্তান্তর' }).className).toMatch(/(^|\s)bg-brand(\s|$)/);
  });

  it('hides Hand over when no garment is ready', async () => {
    await openOrder('rahman', (o) => readyCount(o) === 0 && o.items.some((i) => itemSummaryGroup(i) === 'unfinished'));
    expect(screen.queryByRole('button', { name: 'হস্তান্তর' })).toBeNull();
  });

  it('asks which garment to hand over when several are ready, then confirms', async () => {
    const { order, store } = await openOrder('rahman', (o) => readyCount(o) >= 2);
    await userEvent.click(screen.getByRole('button', { name: 'হস্তান্তর' }));
    const picker = await screen.findByRole('dialog', { name: 'কোনটি হস্তান্তর করবেন?' });
    const choices = within(picker).getAllByRole('button').filter((b) => b.textContent !== 'বাতিল');
    expect(choices).toHaveLength(readyCount(order));
    await userEvent.click(choices[0]!);
    const confirm = await screen.findByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
    await userEvent.click(within(confirm).getByRole('button', { name: 'নিশ্চিত করুন' }));
    await act(async () => undefined);
    const after = store.getSnapshot().state.orders[order.id]!;
    expect(after.items.filter((i) => i.stageKey === 'delivered').length).toBe(
      order.items.filter((i) => i.stageKey === 'delivered').length + 1,
    );
  });

  it('never records money from one tap: Take payment opens the existing dialog', async () => {
    const { order, store } = await openOrder('rahman', (o) => owes(o));
    await userEvent.click(screen.getByRole('button', { name: 'টাকা নিন' }));
    expect(await screen.findByRole('dialog', { name: 'টাকা জমা' })).toBeTruthy();
    expect(store.getSnapshot().state.orders[order.id]!.payments).toEqual(order.payments);
  });

  it('opens the accounts sheet with history, refund, discount and price adjustment', async () => {
    await openOrder('rahman', (o) => o.payments.length > 0);
    await userEvent.click(screen.getByRole('button', { name: 'হিসাব' }));
    const sheet = await screen.findByRole('dialog', { name: 'টাকার হিসাব' });
    expect(within(sheet).getByRole('table', { name: 'পেমেন্ট' })).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'ছাড় বদলান' })).toBeTruthy();
    expect(within(sheet).getByRole('button', { name: 'দাম সমন্বয়' })).toBeTruthy();
    expect(within(sheet).queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
    await userEvent.click(within(sheet).getByRole('button', { name: 'ছাড় বদলান' }));
    expect(await screen.findByRole('dialog', { name: 'ছাড় বদলান' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'টাকার হিসাব' })).toBeNull();
  });

  it('keeps garment actions in the card menu', async () => {
    const { order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished'));
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const card = screen.getByRole('region', { name: `${item.garmentName.bn} ${toBanglaDigits(String(order.items.indexOf(item) + 1))}` });
    expect(within(card).queryByRole('button', { name: 'আইটেম বাতিল' })).toBeNull();
    await userEvent.click(within(card).getByRole('button', { name: /^আরও কাজ/ }));
    const menu = await screen.findByRole('dialog');
    expect(within(menu).getByRole('button', { name: 'আইটেম বাতিল' })).toBeTruthy();
    expect(within(menu).getByRole('button', { name: 'আইটেম বদলান' })).toBeTruthy();
    expect(within(menu).getByRole('button', { name: 'অন্য ধাপ…' })).toBeTruthy();
  });

  it('shows no money, bar payment or accounts link to a production supervisor', async () => {
    await openOrder('uniform', (o) => o.branchId === 'workshop' && o.items.some((i) => itemSummaryGroup(i) === 'unfinished'), {
      staffId: 'uniform-supervisor',
      pin: '3333',
    });
    expect(screen.queryByRole('region', { name: 'টাকার হিসাব' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'হিসাব' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'রসিদ প্রিন্ট' })).toBeNull();
  });

  it('puts print receipt, job slip, tags and order again in the header menu', async () => {
    await openOrder('rahman', () => true);
    await userEvent.click(screen.getByRole('button', { name: /^আরও:/ }));
    const menu = await screen.findByRole('dialog');
    for (const name of ['রসিদ প্রিন্ট', 'কাজের স্লিপ', 'কাপড়ের ট্যাগ', 'আবার অর্ডার']) {
      expect(within(menu).getByRole('link', { name })).toBeTruthy();
    }
    await userEvent.click(within(menu).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves a garment on with one outlined button named from its stages', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => !i.cancelled && i.stageKey === 'cutting'));
    const item = order.items.find((i) => !i.cancelled && i.stageKey === 'cutting')!;
    const card = screen.getByRole('region', { name: `${item.garmentName.bn} ${toBanglaDigits(String(order.items.indexOf(item) + 1))}` });
    const button = within(card).getByRole('button', { name: 'কাটিং শেষ, পরের ধাপ: সেলাই' });
    expect(button.className).not.toMatch(/(^|\s)bg-brand(\s|$)/);
    await userEvent.click(button);
    await act(async () => undefined);
    expect(store.getSnapshot().state.orders[order.id]!.items.find((i) => i.id === item.id)!.stageKey).toBe('stitching');
  });

  it('offers to assign a worker when nobody has the garment', async () => {
    const { order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished' && !i.assignedTo));
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished' && !i.assignedTo)!;
    const card = screen.getByRole('region', { name: `${item.garmentName.bn} ${toBanglaDigits(String(order.items.indexOf(item) + 1))}` });
    await userEvent.click(within(card).getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    expect(await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' })).toBeTruthy();
  });
});

describe('Order detail bottom bar on a phone', () => {
  it('shows a supervisor only the hand over button, and no empty bar once nothing is ready', async () => {
    const { store, order } = await openOrder('uniform', (o) => o.branchId === 'workshop' && readyCount(o) > 0, {
      staffId: 'uniform-supervisor',
      pin: '3333',
    });
    expect(screen.getByRole('button', { name: 'হস্তান্তর' })).toBeTruthy();
    expect(document.body.querySelector('.fixed.border-t.z-20')).not.toBeNull();
    for (const item of order.items.filter((i) => nextMove(i)?.stage.group === 'delivered')) {
      await act(() => store.dispatch({ type: 'item.stageChanged', orderId: order.id, itemId: item.id, to: 'delivered', reason: '' }));
    }
    await act(async () => undefined);
    expect(screen.queryByRole('button', { name: 'হস্তান্তর' })).toBeNull();
    expect(document.body.querySelector('.fixed.border-t.z-20')).toBeNull();
    expect(document.body.querySelector('.pb-28')).toBeNull();
  });
});
