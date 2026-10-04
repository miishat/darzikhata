import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { toBanglaDigits } from '@darzikhata/domain';
import { renderApp } from '../test/renderApp';
import { navCounts } from './navCounts';
import { dashboardModel } from '../features/dashboard/dashboard';

describe('Desktop sidebar and top bar', () => {
  it('shows counts that match the dashboard, with names that stay the same', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const nav = within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));
    const model = dashboardModel(Object.values(store.getSnapshot().state.orders), new Date().toISOString().slice(0, 10));
    expect(model.openOrders).toBeGreaterThan(0);
    const orders = nav.getByRole('link', { name: 'অর্ডার' });
    expect(orders.textContent).toContain(toBanglaDigits(String(model.openOrders)));
    expect(nav.getByText('হিসাব ও দোকান')).toBeTruthy();
  });

  it('keeps only search, language and New Order in the top bar', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const header = within(await screen.findByRole('banner'));
    expect(header.getAllByRole('combobox')).toHaveLength(1);
    expect(header.getAllByRole('button')).toHaveLength(1);
    expect(header.getByRole('link', { name: 'নতুন অর্ডার' })).toBeTruthy();
    expect(header.queryByRole('button', { name: /অনলাইন|অফলাইন|দেখতে হবে/ })).toBeNull();
  });

  it('shows the late garments as a word badge on the work link', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const nav = within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));
    const counts = navCounts(store.getSnapshot().state, new Date().toISOString().slice(0, 10));
    expect(counts.lateGarments).toBeGreaterThan(0);
    const work = nav.getByRole('link', { name: 'কাজের তালিকা' });
    expect(work.textContent).toContain(toBanglaDigits(String(counts.lateGarments)) + ' দেরি');
  });

  it('opens the sign-in page from the person button and keeps the user signed in until another is chosen', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const nav = await screen.findByRole('navigation', { name: 'প্রধান মেনু' });
    const side = within(nav.closest('aside')!);
    await userEvent.click(side.getByRole('button', { name: /ইউজার বদলান/ }));
    await act(async () => {});
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(store.getSnapshot().session?.staffId).toBe('rahman-owner');
    await userEvent.click(await screen.findByRole('button', { name: 'বাতিল' }));
    expect(router.state.location.pathname).toMatch(/^\/app/);
  });

  it('opens the account and more dialog from the ellipsis button', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    expect(await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' })).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('switches the branch scope from the branch popover and closes it when focus leaves', async () => {
    await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/dashboard' });
    const trigger = await screen.findByRole('button', { name: /সব শাখা/ });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await userEvent.click(trigger);
    const menu = await screen.findByRole('group', { name: /শাখা/ });
    await userEvent.selectOptions(within(menu).getByLabelText('শাখা'), 'দোকান');
    expect((within(menu).getByLabelText('শাখা') as HTMLSelectElement).value).toBe('shop');
    expect(trigger.textContent).toContain('দোকান');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: /শাখা/ })).toBeNull();
  });
});
