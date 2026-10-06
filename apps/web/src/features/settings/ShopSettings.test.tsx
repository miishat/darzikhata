import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Shop settings', () => {
  it('opens on the shop details and saves a change', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings' });
    expect(await screen.findByRole('heading', { name: 'দোকান', level: 2 })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/app/settings/shop');
    // Each section tile reads its name first, then what is in it now.
    const sections = within(screen.getByRole('navigation', { name: 'সেটিংসের অংশ' })).getAllByRole('link');
    expect(sections.map((l) => l.textContent)).toEqual(['দোকান', 'পোশাক ও ধাপ', 'স্টাফ', 'শাখা ও ডিভাইস'].map((name) => expect.stringMatching(new RegExp(`^${name}`))));
    expect(sections[0]!.getAttribute('aria-current')).toBe('page');

    const phone = screen.getByLabelText('ফোন');
    await userEvent.clear(phone);
    await userEvent.type(phone, '01700000000');
    const days = screen.getByLabelText('লিংকের মেয়াদ (দিন)');
    await userEvent.clear(days);
    await userEvent.type(days, '৭');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    const config = store.getSnapshot().config!;
    expect(config.profile.phone).toBe('01700000000');
    expect(config.settings.linkExpiryDays).toBe(7);
  });

  it('points out a missing name and impossible days, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/shop' });
    const before = store.getSnapshot().config;
    await userEvent.clear(await screen.findByLabelText('দোকানের নাম (বাংলা)'));
    await userEvent.clear(screen.getByLabelText('দোকানের নাম (ইংরেজি)'));
    const days = screen.getByLabelText('লিংকের মেয়াদ (দিন)');
    await userEvent.clear(days);
    await userEvent.type(days, '০');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('দোকানের নাম লিখুন')).toBeTruthy();
    expect(screen.getByText('১ থেকে ৩৬৫ দিনের মধ্যে দিন')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });

  it('turns the boutique’s women’s measurement restriction off', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/settings/shop' });
    const restrict = await screen.findByRole('checkbox', { name: 'মহিলা কাস্টমারের মাপ শুধু অনুমতি থাকা স্টাফ দেখবেন' });
    expect(restrict).toHaveProperty('checked', true);
    await userEvent.click(restrict);
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().config!.settings.restrictFemaleMeasurements).toBe(false);
  });

  it('is closed to staff without settings access', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/settings', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });

  it('puts unsaved changes back on discard', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/shop' });
    const address = (await screen.findByLabelText('ঠিকানা')) as HTMLInputElement;
    const before = address.value;
    const discard = screen.getByRole('button', { name: 'পরিবর্তন বাতিল' });
    expect(discard).toHaveProperty('disabled', true);
    await userEvent.type(address, ' (নতুন)');
    expect(screen.getByText('সেভ করা হয়নি এমন পরিবর্তন আছে')).toBeTruthy();
    await userEvent.click(discard);
    expect(address.value).toBe(before);
    expect(screen.queryByText('সেভ করা হয়নি এমন পরিবর্তন আছে')).toBeNull();
    expect(store.getSnapshot().config!.profile.address).toBe(before);
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/shop' });
    await userEvent.type(await screen.findByLabelText('ঠিকানা'), ' (নতুন)');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'সেটিংসের অংশ' })).getByRole('link', { name: /^স্টাফ/ }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });
});
