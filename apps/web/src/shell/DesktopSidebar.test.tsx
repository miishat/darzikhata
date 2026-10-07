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
    // Payments and Settings sit below a plain line, with no section title.
    expect(nav.queryByText('হিসাব ও দোকান')).toBeNull();
    expect(nav.getAllByRole('separator')).toHaveLength(1);
  });

  it('shows the shop name, branch and app name in the header above the menu', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const nav = await screen.findByRole('navigation', { name: 'প্রধান মেনু' });
    const side = nav.closest('aside')!;
    expect(side.textContent).toMatch(/দর্জিখাতা/);
    expect(within(side).getByText(/দর্জিখাতা/).closest('span')!.textContent).toMatch(/·/);
  });

  it('folds to a rail of icons and short names, keeps every link and count, and remembers it', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'মেনু ছোট করুন' }));
    expect(screen.getByRole('button', { name: 'মেনু বড় করুন' }).getAttribute('aria-expanded')).toBe('false');
    expect(window.localStorage.getItem('dk.sidebar.rail')).toBe('1');

    const nav = within(screen.getByRole('navigation', { name: 'প্রধান মেনু' }));
    // Links keep their full names; the short names are what shows.
    const work = nav.getByRole('link', { name: 'কাজের তালিকা' });
    expect(work.textContent).toContain('কাজ');
    const counts = navCounts(store.getSnapshot().state, new Date().toISOString().slice(0, 10));
    const late = document.getElementById(work.getAttribute('aria-describedby')!)!;
    expect(late.textContent).toBe(toBanglaDigits(String(counts.lateGarments)) + ' দেরি');
    expect(nav.getAllByRole('separator')).toHaveLength(1);

    const side = within(nav.getByRole('link', { name: 'অর্ডার' }).closest('aside')!);
    expect(side.getByRole('button', { name: /অনলাইন|অফলাইন|দেখতে হবে/ })).toBeTruthy();
    expect(side.getByRole('button', { name: /ইউজার বদলান/ })).toBeTruthy();
    expect(side.getByRole('button', { name: 'অ্যাকাউন্ট ও আরও' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'মেনু বড় করুন' }));
    expect(window.localStorage.getItem('dk.sidebar.rail')).toBe('0');
    expect(screen.getByRole('button', { name: 'মেনু ছোট করুন' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('opens as a rail when it was left folded on this device', async () => {
    window.localStorage.setItem('dk.sidebar.rail', '1');
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    expect(await screen.findByRole('button', { name: 'মেনু বড় করুন' })).toBeTruthy();
  });

  it('keeps only search, language, theme, New Customer and New Order in the top bar', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const header = within(await screen.findByRole('banner'));
    expect(header.getAllByRole('combobox')).toHaveLength(1);
    expect(header.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)).toEqual(['বাংলা', 'English', 'রঙের থিম: হালকা']);
    // New Order's text ends in its N shortcut key.
    expect(header.getAllByRole('link').map((l) => l.textContent)).toEqual(['নতুন কাস্টমার', 'নতুন অর্ডারN']);
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
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    const title = document.getElementById(menu.getAttribute('aria-labelledby')!)!;
    expect(title.className).toContain('sr-only');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows language, theme and layout in view in the account popup, and switches language there', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    expect(within(menu).getAllByRole('radiogroup').map((g) => g.getAttribute('aria-label'))).toEqual(['ভাষা', 'রঙের থিম', 'স্ক্রিন লেআউট']);
    expect(within(menu).queryByRole('button', { expanded: false })).toBeNull();
    expect(within(menu).getByRole('button', { name: 'ইউজার বদলান' })).toBeTruthy();
    expect(within(menu).queryByRole('link', { name: 'পেমেন্ট' })).toBeNull();
    await userEvent.click(within(menu).getByRole('radio', { name: 'English' }));
    const english = await screen.findByRole('dialog', { name: 'Account and More' });
    expect(within(english).getByRole('button', { name: 'Reset Demo Data' })).toBeTruthy();
    await userEvent.click(within(english).getByRole('button', { name: 'Reset Demo Data' }));
    expect(await screen.findByRole('dialog', { name: 'Reset Demo Data' })).toBeTruthy();
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
