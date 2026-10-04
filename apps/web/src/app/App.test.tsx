import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const mainNav = () => screen.getByRole('navigation', { name: 'প্রধান মেনু' });

describe('App', () => {
  it('opens a sample shop from the welcome screen into the desktop workspace', async () => {
    await renderApp({ layout: 'desktop' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'এই দোকান খুলুন: রহমান টেইলার্স' }));

    expect(await screen.findByRole('heading', { name: 'হোম' })).toBeTruthy();
    expect(screen.getByText('রহমান টেইলার্স')).toBeTruthy();
    expect(screen.getByText('প্রধান দোকান')).toBeTruthy();
    const nav = within(mainNav());
    for (const name of ['হোম', 'অর্ডার', 'কাস্টমার ও মাপ', 'কাজের তালিকা', 'পেমেন্ট', 'সেটিংস']) {
      expect(nav.getByRole('link', { name })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: 'নতুন অর্ডার' })).toBeTruthy();
  });

  it('uses bottom tabs on mobile with a centre New Order button, and Payments in the account menu', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app' });
    const nav = within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['হোম', 'অর্ডার', 'নতুন অর্ডার', 'কাস্টমার', 'কাজ']);
    expect(nav.queryByRole('link', { name: 'আরও' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    const menu = await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' });
    expect(within(menu).getByRole('link', { name: 'পেমেন্ট' })).toBeTruthy();
    expect(within(menu).getByRole('link', { name: 'সেটিংস' })).toBeTruthy();
    expect(within(menu).getByRole('button', { name: 'ইউজার বদলান' })).toBeTruthy();
  });

  it('switches to a tailor by PIN and hides money from them', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app' });
    await userEvent.click(await screen.findByRole('button', { name: /ইউজার বদলান/ }));

    expect(await screen.findByRole('heading', { name: 'কে ব্যবহার করছেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /জামাল উদ্দিন/ }));
    for (const digit of ['১', '১', '১', '১']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(await screen.findByText('পিন মেলেনি, আবার চেষ্টা করুন')).toBeTruthy();

    for (const digit of ['৪', '৪', '৪', '৪']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(await screen.findByRole('heading', { name: 'কাজের তালিকা' })).toBeTruthy();
    const links = within(mainNav()).getAllByRole('link').map((l) => l.getAttribute('aria-label'));
    expect(links).toEqual(['কাজের তালিকা']);
    await userEvent.click(screen.getByRole('button', { name: 'অ্যাকাউন্ট ও আরও' }));
    expect(within(await screen.findByRole('dialog', { name: 'অ্যাকাউন্ট ও আরও' })).getByRole('button', { name: 'ইউজার বদলান' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'নতুন অর্ডার' })).toBeNull();
  });

  it('shows a message instead of a page the role cannot use', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/payments', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'এই অংশ দেখার অনুমতি আপনার নেই।');
  });

  it('sends people with no saved shop to the welcome screen', async () => {
    await renderApp({ layout: 'desktop', path: '/app/orders' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();
  });

  it('switches language and layout from More, and resets the demo after confirming', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    await userEvent.click(await screen.findByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'More' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: 'Mobile' }));
    expect(within(screen.getByRole('navigation', { name: 'Main menu' })).getAllByRole('link')).toHaveLength(5);

    const before = Object.keys(store.getSnapshot().state.orders).length;
    await userEvent.click(screen.getByRole('button', { name: 'Reset demo data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset demo data' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
  });
});
