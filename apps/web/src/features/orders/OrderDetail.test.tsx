import {
  formatMeasurement,
  isOrderClosed,
  itemSummaryGroup,
  moneySummary,
  toBanglaDigits,
  type Order,
  type OrderItem,
} from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { chooseOption } from '../../test/chooseOption';

const title = (order: Order, item: OrderItem) => `${item.garmentName.bn} ${toBanglaDigits(String(order.items.indexOf(item) + 1))}`;

function find(store: ShopStore, keep: (order: Order) => boolean): Order {
  const order = Object.values(store.getSnapshot().state.orders).find(keep);
  if (!order) throw new Error('No sample order fits this test');
  return order;
}

async function openOrder(shop: 'rahman' | 'nakshi' | 'uniform', keep: (order: Order) => boolean, as?: { staffId: string; pin: string }) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = find(app.store, keep);
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  return { ...app, order };
}

const latest = (store: ShopStore, id: string) => store.getSnapshot().state.orders[id]!;

/** Opens a garment's overflow menu and picks one of its items. */
async function pick(order: Order, item: OrderItem, name: string) {
  await userEvent.click(within(screen.getByRole('region', { name: title(order, item) })).getByRole('button', { name: `আরও কাজ: ${title(order, item)}` }));
  const menu = await screen.findByRole('dialog', { name: title(order, item) });
  await userEvent.click(within(menu).getByRole('button', { name }));
}

describe('Order detail', () => {
  it('hands over one garment and keeps the order open', async () => {
    const { store, order } = await openOrder('rahman', (o) => {
      const groups = o.items.map(itemSummaryGroup);
      return groups.includes('ready') && groups.filter((g) => g === 'ready' || g === 'unfinished').length >= 2;
    });
    const item = order.items.find((i) => itemSummaryGroup(i) === 'ready')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'হস্তান্তর করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));

    expect(await within(card).findByText('ডেলিভারি হয়েছে')).toBeTruthy();
    const after = latest(store, order.id);
    expect(after.items.find((i) => i.id === item.id)!.stageKey).toBe('delivered');
    expect(isOrderClosed(after)).toBe(false);
    expect(within(screen.getByRole('region', { name: 'অর্ডারের বিস্তারিত' })).getByText('চলমান')).toBeTruthy();
  });

  it('asks for hand-over confirmation when delivering through the stage picker', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'ready'));
    const item = order.items.find((i) => itemSummaryGroup(i) === 'ready')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await pick(order, item, 'অন্য ধাপ…');
    const picker = await screen.findByRole('dialog', { name: 'ধাপ বদলান' });
    await chooseOption(within(picker).getByLabelText('নতুন ধাপ'), 'ডেলিভারি হয়েছে');
    await userEvent.click(within(picker).getByRole('button', { name: 'সেভ করুন' }));

    const confirm = await screen.findByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.stageKey).toBe(item.stageKey);

    await userEvent.click(within(confirm).getByRole('button', { name: 'নিশ্চিত করুন' }));
    expect(await within(card).findByText('ডেলিভারি হয়েছে')).toBeTruthy();
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.stageKey).toBe('delivered');
  });

  it('moves a garment on, then back for rework with a reason', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => !i.cancelled && i.stageKey === 'cutting'));
    const item = order.items.find((i) => !i.cancelled && i.stageKey === 'cutting')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'সেলাই এ নিন' }));
    expect(await within(card).findByText('সেলাই')).toBeTruthy();

    await pick(order, item, 'অন্য ধাপ…');
    const dialog = await screen.findByRole('dialog', { name: 'ধাপ বদলান' });
    await chooseOption(within(dialog).getByLabelText('নতুন ধাপ'), 'কাটিং');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    await userEvent.type(within(dialog).getByLabelText('আবার কাজের কারণ'), 'কাঁধ ভুল কাটা হয়েছে');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('আবার কাজ: কাঁধ ভুল কাটা হয়েছে')).toBeTruthy();
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.stageKey).toBe('cutting');
  });

  it('cancels a garment with a reason and drops it from the total', async () => {
    const { store, order } = await openOrder(
      'rahman',
      (o) => o.items.filter((i) => itemSummaryGroup(i) === 'unfinished').length >= 2,
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const before = moneySummary(order).total;
    const card = screen.getByRole('region', { name: title(order, item) });

    await pick(order, item, 'আইটেম বাতিল');
    const dialog = await screen.findByRole('dialog', { name: 'আইটেম বাতিল' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    await userEvent.type(within(dialog).getByLabelText('বাতিলের কারণ'), 'কাস্টমার চান না');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('বাতিল: কাস্টমার চান না')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: /^আরও কাজ/ })).toBeNull();
    expect(moneySummary(latest(store, order.id)).total).toBe(Math.max(0, before - item.price));
  });

  it('records a fitting change without touching the frozen measurements', async () => {
    const { store, order } = await openOrder('rahman', (o) =>
      o.items.some((i) => itemSummaryGroup(i) === 'unfinished' && i.measurements),
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished' && i.measurements)!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await pick(order, item, 'ফিটিংয়ের পরিবর্তন লিখুন');
    const dialog = await screen.findByRole('dialog', { name: 'ফিটিংয়ের পরিবর্তন লিখুন' });
    await userEvent.type(within(dialog).getByLabelText('কী বদলাতে হবে'), 'হাতা ½ ইঞ্চি ছোট');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('হাতা ½ ইঞ্চি ছোট')).toBeTruthy();
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.measurements).toEqual(item.measurements);
  });

  it('shows frozen measurements only to people allowed to see them', async () => {
    const keep = (o: Order) => o.items.some((i) => !i.cancelled && i.measurements);
    const counter = await openOrder('nakshi', keep, { staffId: 'nakshi-counter', pin: '2222' });
    const item = counter.order.items.find((i) => !i.cancelled && i.measurements)!;
    const card = screen.getByRole('region', { name: title(counter.order, item) });
    expect(within(card).getByText('মাপ দেখার অনুমতি নেই')).toBeTruthy();
    expect(within(card).queryByRole('table')).toBeNull();
  });

  it('shows them to cutting staff', async () => {
    const keep = (o: Order) => o.items.some((i) => !i.cancelled && i.measurements);
    const cutting = await openOrder('nakshi', keep, { staffId: 'nakshi-cutting', pin: '3333' });
    const item = cutting.order.items.find((i) => !i.cancelled && i.measurements)!;
    const card = screen.getByRole('region', { name: title(cutting.order, item) });
    const value = Object.values(item.measurements!.values)[0]!;
    expect(within(card).getAllByText(`${formatMeasurement(value.value, 'bn')} ইঞ্চি`).length).toBeGreaterThan(0);
  });

  it('offers only the actions a production supervisor may take', async () => {
    const { order } = await openOrder(
      'uniform',
      (o) => o.branchId === 'workshop' && o.items.some((i) => itemSummaryGroup(i) === 'unfinished'),
      { staffId: 'uniform-supervisor', pin: '3333' },
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const card = screen.getByRole('region', { name: title(order, item) });
    await userEvent.click(within(card).getByRole('button', { name: `আরও কাজ: ${title(order, item)}` }));
    const menu = await screen.findByRole('dialog', { name: title(order, item) });
    expect(within(menu).getByRole('button', { name: 'অন্য ধাপ…' })).toBeTruthy();
    expect(within(menu).queryByRole('button', { name: 'আইটেম বাতিল' })).toBeNull();
    expect(within(menu).queryByRole('button', { name: 'আইটেম বদলান' })).toBeNull();
    await userEvent.keyboard('{Escape}');
    await userEvent.click(within(screen.getByRole('region', { name: 'অর্ডারের বিস্তারিত' })).getByRole('button', { name: 'আরও: রসিদ, স্লিপ, ট্যাগ, আবার অর্ডার' }));
    const more = await screen.findByRole('dialog', { name: 'আরও' });
    expect(within(more).queryByRole('link', { name: 'রসিদ প্রিন্ট' })).toBeNull();
    expect(within(more).getByRole('link', { name: 'কাজের স্লিপ' })).toBeTruthy();
  });

  it('opens the order’s menu as a popup headed by the order, with its papers and actions in labelled groups', async () => {
    const { order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished'));
    await userEvent.click(within(screen.getByRole('region', { name: 'অর্ডারের বিস্তারিত' })).getByRole('button', { name: 'আরও: রসিদ, স্লিপ, ট্যাগ, আবার অর্ডার' }));
    const more = await screen.findByRole('dialog', { name: 'আরও' });
    expect(within(more).getByText(order.number)).toBeTruthy();
    const papers = within(more).getByRole('region', { name: 'এই অর্ডারের কাগজ' });
    expect(within(papers).getByRole('link', { name: 'রসিদ প্রিন্ট' }).getAttribute('href')).toBe(`/print/receipt/${order.id}`);
    expect(within(within(more).getByRole('region', { name: 'অর্ডার' })).getByRole('link', { name: 'আবার অর্ডার' })).toBeTruthy();
    expect(within(more).queryByRole('button', { name: 'বন্ধ করুন' })).toBeNull();

    await userEvent.keyboard('{Escape}');
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    await userEvent.click(within(screen.getByRole('region', { name: title(order, item) })).getByRole('button', { name: `আরও কাজ: ${title(order, item)}` }));
    const menu = await screen.findByRole('dialog', { name: title(order, item) });
    expect(within(within(menu).getByRole('region', { name: 'এই পোশাক' })).getByRole('button', { name: 'আইটেম বদলান' })).toBeTruthy();
  });

  it('does not overwrite an item changed elsewhere while its dialog was open', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished'));
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await pick(order, item, 'আইটেম বদলান');
    const dialog = await screen.findByRole('dialog', { name: 'আইটেম বদলান' });
    await act(() =>
      store.dispatch({ type: 'item.updated', orderId: order.id, itemId: item.id, baseVersion: item.version, changes: { fabricNote: 'অন্য ডিভাইস' } }),
    );
    await userEvent.type(within(dialog).getByLabelText('ডিজাইনের নোট'), ' বোতাম কালো');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।',
    );
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.fabricNote).toBe('অন্য ডিভাইস');
  });
});
