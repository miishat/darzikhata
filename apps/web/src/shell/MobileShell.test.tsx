import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

afterEach(() => document.documentElement.removeAttribute('data-theme'));

const tabs = async () => within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));

describe('Phone tab bar', () => {
  it('puts New Order in the centre, with the accessible name without a plus sign', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    const nav = await tabs();
    const links = nav.getAllByRole('link');
    expect(links.map((l) => l.getAttribute('data-tour'))).toEqual(['nav-dashboard', 'nav-orders', 'new-order', 'nav-customers', 'nav-work']);
    expect(nav.getByRole('link', { name: 'নতুন অর্ডার' }).getAttribute('href')).toBe('/app/orders/new');
    expect(screen.queryByRole('link', { name: '+ নতুন অর্ডার' })).toBeNull();
  });

  it('marks the current tab', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders' });
    const nav = await tabs();
    expect(nav.getByRole('link', { name: 'অর্ডার' }).getAttribute('aria-current')).toBe('page');
    expect(nav.getByRole('link', { name: 'হোম' }).getAttribute('aria-current')).toBeNull();
  });

  it('hides the centre button and the tabs a role cannot use', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    const nav = await tabs();
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['কাজ']);
    expect(nav.queryByRole('link', { name: 'নতুন অর্ডার' })).toBeNull();
    expect(document.querySelector('[data-tour="new-order"]')).toBeNull();
  });
});

describe('Account menu', () => {
  it('opens from the header initial and holds the More page controls', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    expect(within(menu).getByRole('button', { name: 'ডেমো ডেটা রিসেট করুন' })).toBeTruthy();
    expect(within(menu).getByRole('switch', { name: 'মাপের কিপ্যাড' })).toBeTruthy();

    await userEvent.click(within(menu).getByRole('button', { name: /ভাষা/ }));
    expect(within(menu).getByRole('radio', { name: 'English' })).toBeTruthy();
    await userEvent.click(within(menu).getByRole('button', { name: /রঙের থিম/ }));
    await userEvent.click(within(menu).getByRole('radio', { name: 'গাঢ়' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('closes when a section link is followed', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.click(await screen.findByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    await userEvent.click(within(menu).getByRole('link', { name: 'পেমেন্ট' }));
    expect(screen.queryByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' })).toBeNull();
    expect(await screen.findByRole('heading', { name: 'পেমেন্ট' })).toBeTruthy();
  });

  it('leaves out payments and settings for a tailor', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    await userEvent.click(await screen.findByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    expect(within(menu).queryByRole('link', { name: 'পেমেন্ট' })).toBeNull();
    expect(within(menu).queryByRole('link', { name: 'সেটিংস' })).toBeNull();
  });
});
