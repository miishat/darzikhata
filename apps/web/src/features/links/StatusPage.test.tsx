import { isOrderClosed, orderClosedAt, toBanglaDigits, todayInDhaka, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { addDays } from '../../lib/dates';
import type { SeedShopKey } from '../../seed/shops';
import { renderApp } from '../../test/renderApp';

const TOKEN = 'TestToken_0123456789ab';

/** Creates a link as the owner, signs out, and opens the link like a customer would. */
async function openAsCustomer(
  shop: SeedShopKey,
  keep: (order: Order) => boolean,
  before?: (store: ShopStore, order: Order) => Promise<unknown>,
) {
  const app = await renderApp({ layout: 'mobile', shop, path: '/app' });
  const order = Object.values(app.store.getSnapshot().state.orders).find(keep)!;
  await act(async () => {
    await app.store.dispatch({ type: 'link.created', orderId: order.id, token: TOKEN });
    await before?.(app.store, order);
    await app.store.signOut();
  });
  await act(() => app.router.navigate(`/s/${TOKEN}`));
  return { ...app, order };
}

describe('Public status page', () => {
  it('shows the order’s progress and nothing private', async () => {
    const { store, order } = await openAsCustomer('uniform', (o) => o.id === 'uniform-o27');
    expect(await screen.findByRole('heading', { name: 'ইউনিফর্ম হাউস' })).toBeTruthy();
    expect(screen.getByText(`আপনার অর্ডার ${order.number}`)).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();

    const garments = screen.getByRole('list', { name: 'পোশাকের অবস্থা' });
    expect(within(garments).getAllByRole('listitem')).toHaveLength(order.items.length);
    expect(within(garments).getAllByText('ক্লাস ৭ - রাফি')).toHaveLength(2);
    expect(within(garments).getAllByText(/ডেলিভারি হয়েছে/).length).toBeGreaterThan(0);

    const text = document.body.textContent!;
    const { config, state } = store.getSnapshot();
    const customer = state.customers[order.customerId]!;
    expect(text).not.toContain('৳');
    expect(text).not.toContain(customer.name);
    expect(text).not.toContain(customer.phone!);
    expect(text).not.toContain(order.notes);
    for (const staff of config!.staff) expect(text).not.toContain(staff.name);
  });

  it('leads with how many garments are ready, with a bar, and pins a call button', async () => {
    const { order, store } = await openAsCustomer('rahman', (o) => !isOrderClosed(o));
    const live = order.items.filter((i) => i.cancelled === null);
    const ready = live.filter((i) => i.stageKey === 'ready' || i.stageKey === 'delivered').length;
    const headline = `${toBanglaDigits(String(live.length))}টির মধ্যে ${toBanglaDigits(String(ready))}টি রেডি`;
    expect(await screen.findByRole('heading', { name: headline })).toBeTruthy();
    expect(screen.getByRole('img', { name: headline })).toBeTruthy();
    expect(screen.getByText('দাম বা মাপ এখানে দেখানো হয় না।', { exact: false })).toBeTruthy();
    expect(screen.getByText(/সর্বশেষ আপডেট/)).toBeTruthy();

    const phone = store.getSnapshot().config!.profile.phone;
    expect(screen.getByRole('link', { name: 'দোকানে কল করুন' }).getAttribute('href')).toBe(`tel:${phone}`);
    expect(screen.getByText('দাম বা মাপ এখানে দেখানো হয় না।', { exact: false }).closest('main')!.textContent).not.toMatch(/ইঞ্চি|৳/);
  });

  it('leaves out the call button when the shop has no phone', async () => {
    await openAsCustomer('rahman', (o) => !isOrderClosed(o), (store) =>
      store.updateConfig((c) => ({ ...c, profile: { ...c.profile, phone: '' } })),
    );
    expect(await screen.findByRole('list', { name: 'পোশাকের অবস্থা' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'দোকানে কল করুন' })).toBeNull();
  });

  it('says a turned-off link no longer works', async () => {
    await openAsCustomer('rahman', (o) => !isOrderClosed(o), (store, order) =>
      store.dispatch({ type: 'link.revoked', orderId: order.id, token: TOKEN }),
    );
    expect(await screen.findByText('এই লিংকটি আর কাজ করে না। দোকানে যোগাযোগ করুন।')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'পোশাকের অবস্থা' })).toBeNull();
  });

  it('expires the link the set number of days after the order is finished', async () => {
    const twoDaysAgo = addDays(todayInDhaka(new Date()), -2);
    await openAsCustomer(
      'rahman',
      (o) => (orderClosedAt(o) ?? '9999') < twoDaysAgo,
      (store) => store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 1 } })),
    );
    expect(await screen.findByText('এই লিংকটি আর কাজ করে না। দোকানে যোগাযোগ করুন।')).toBeTruthy();
  });

  it('explains a link this browser does not know', async () => {
    await renderApp({ layout: 'mobile', path: '/s/unknown-token' });
    expect(
      await screen.findByText('এই লিংকটি পাওয়া যায়নি। ডেমোতে লিংক শুধু যে ব্রাউজারে তৈরি হয়েছে সেখানেই খোলে।'),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeNull();
  });

  it('switches to English', async () => {
    const { order } = await openAsCustomer('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByText(`Your order ${order.number}`)).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rahman Tailors' })).toBeTruthy();
  });
});
