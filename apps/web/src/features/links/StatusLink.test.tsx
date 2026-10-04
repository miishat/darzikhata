import { isOrderClosed, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SeedShopKey } from '../../seed/shops';
import { renderApp } from '../../test/renderApp';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
});

async function openOrder(shop: SeedShopKey, keep: (order: Order) => boolean, as?: { staffId: string; pin: string }) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = Object.values(app.store.getSnapshot().state.orders).find(keep)!;
  await act(() => app.router.navigate(`/app/orders/${order.id}?full=1`));
  await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  return { ...app, order };
}

const section = () => screen.getByRole('region', { name: 'স্ট্যাটাস লিংক' });
const urlField = () => within(section()).getByLabelText('লিংক') as HTMLInputElement;

describe('Status link section', () => {
  it('creates a link and shows where it goes', async () => {
    const { store, order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    expect(within(section()).getByText('ডেমোতে লিংকটি শুধু এই ব্রাউজারেই খোলে।')).toBeTruthy();
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));

    await within(section()).findByLabelText('লিংক');
    const links = store.getSnapshot().state.orders[order.id]!.links;
    expect(links).toHaveLength(1);
    expect(links[0]!.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(urlField().value).toBe(`${window.location.origin}/s/${links[0]!.token}`);
    expect(urlField().readOnly).toBe(true);
    expect(within(section()).getByRole('link', { name: 'খুলে দেখুন' }).getAttribute('href')).toBe(`/s/${links[0]!.token}`);
  });

  it('shares the link, or copies it when sharing is not available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await userEvent.click(await within(section()).findByRole('button', { name: 'শেয়ার করুন' }));
    const text = `রহমান টেইলার্স: অর্ডার ${order.number} এর অবস্থা দেখুন: ${urlField().value}`;
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text }));

    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(within(section()).getByRole('button', { name: 'শেয়ার করুন' }));
    expect(writeText).toHaveBeenCalledWith(text);
    expect((await within(section()).findByRole('status')).textContent).toBe('কপি হয়েছে');
  });

  it('turns the link off after confirming', async () => {
    const { store, order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await userEvent.click(await within(section()).findByRole('button', { name: 'লিংক বন্ধ করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'লিংক বন্ধ করবেন?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'লিংক বন্ধ করুন' }));

    expect(await within(section()).findByRole('button', { name: 'লিংক তৈরি করুন' })).toBeTruthy();
    expect(store.getSnapshot().state.orders[order.id]!.links[0]!.revokedAt).not.toBeNull();
  });

  it('is only for staff who may manage links', async () => {
    await openOrder('uniform', (o) => o.id === 'uniform-o27', { staffId: 'uniform-supervisor', pin: '3333' });
    expect(screen.queryByRole('region', { name: 'স্ট্যাটাস লিংক' })).toBeNull();
  });
});
