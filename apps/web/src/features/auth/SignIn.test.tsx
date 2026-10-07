import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Sign-in on a desktop', () => {
  it('shows the shop, the clock and everyone as faces, and opens the number pad for the picked face', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/sign-in' });
    expect(await screen.findByRole('heading', { name: 'কে ব্যবহার করছেন?' })).toBeTruthy();
    expect(screen.getByText('নকশী বুটিক')).toBeTruthy();
    expect(screen.getByText(/^[০-৯]{2}:[০-৯]{2}$/)).toBeTruthy();
    expect(screen.queryByRole('group', { name: 'পিন' })).toBeNull();

    const face = screen.getByRole('button', { name: /জামাল উদ্দিন/ });
    expect(face.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(face);
    expect(face.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: 'জামাল উদ্দিন, আপনার পিন দিন' })).toBeTruthy();
    const pad = screen.getByRole('group', { name: 'পিন' });
    expect(within(pad).getByRole('button', { name: 'শেষ সংখ্যা মুছুন' })).toBeTruthy();
    expect(within(pad).queryByRole('button', { name: 'অন্য কেউ' })).toBeNull();

    await userEvent.click(face);
    expect(screen.queryByRole('group', { name: 'পিন' })).toBeNull();
  });

  it('takes the PIN typed on the keyboard, with backspace, in either script', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/sign-in' });
    await userEvent.click(await screen.findByRole('button', { name: /জামাল উদ্দিন/ }));
    await userEvent.keyboard('1112');
    expect(await screen.findByText('পিন মেলেনি, আবার চেষ্টা করুন')).toBeTruthy();

    await userEvent.keyboard('৪৪9{Backspace}৪৪');
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(store.getSnapshot().session?.staffId).toBe('nakshi-tailor');
    expect(router.state.location.pathname).toMatch(/^\/app/);
  });

  it('offers a way back to the app only while someone is still signed in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/sign-in' });
    expect(await screen.findByRole('button', { name: 'কাজে ফিরে যান' })).toBeTruthy();
    await act(() => store.signOut());
    expect(screen.queryByRole('button', { name: 'কাজে ফিরে যান' })).toBeNull();
  });
});

describe('Sign-in on a phone', () => {
  it('keeps the list of names', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/sign-in' });
    expect(await screen.findByRole('heading', { name: 'কে ব্যবহার করছেন?' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /জামাল উদ্দিন/ }).getAttribute('aria-pressed')).toBeNull();
  });
});
