import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const openSync = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /^(অনলাইন|অফলাইন|সিঙ্ক হচ্ছে…)/ }));
  return screen.findByRole('dialog', { name: 'সিঙ্ক' });
};

const payment = {
  type: 'payment.recorded',
  orderId: 'rahman-o40',
  payment: { id: 'p-offline', amount: 10000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
} as const;

describe('Sync status', () => {
  it('keeps the connection in words and counts the sample change for someone who can settle it', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/orders' });
    const button = await screen.findByRole('button', { name: 'অনলাইন · যাচাই বাকি ১' });
    expect(button.getAttribute('data-tour')).toBe('sync-status');
    expect(button.textContent).toMatch(/^অনলাইন.*১$/);
    const dialog = await openSync();
    const link = within(dialog).getByRole('link', { name: /যাচাই করুন/ });
    expect(link.textContent).toContain('১টি পরিবর্তন আপনাকে যাচাই করতে হবে');
    expect(link.getAttribute('href')).toBe('/app/review');
    expect(link.getAttribute('data-tour')).toBe('review-link');
    expect(within(dialog).getByText('অনলাইনে থাকুন')).toBeTruthy();
    expect(within(dialog).getByText(/^এখন অনলাইন · শেষ সিঙ্ক: /)).toBeTruthy();
  });

  it('puts the change to review first on a phone, and names the online switch for the connection only', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/orders' });
    const button = await screen.findByRole('button', { name: 'অনলাইন · যাচাই বাকি ১' });
    expect(button.textContent).toBe('১');
    const dialog = await openSync();
    const links = within(dialog).getAllByRole('link');
    expect(links[0]!.textContent).toContain('১টি পরিবর্তন আপনাকে যাচাই করতে হবে');
    expect(links[0]!.textContent).toContain('অন্য ডিভাইসের সাথে মেলেনি, কোনটি রাখবেন বেছে নিন');
    expect(links[0]!.getAttribute('href')).toBe('/app/review');
    expect(within(dialog).getByText('অনলাইনে থাকুন')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('switch', { name: 'অফলাইনে যান' }));
    expect(await within(dialog).findByText(/^এখন অফলাইন · /)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'অফলাইন · যাচাই বাকি ১' })).toBeTruthy();
  });

  it('shows the tailor plain online, since the waiting change is not theirs to settle', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    const button = await screen.findByRole('button', { name: 'অনলাইন' });
    expect(button.textContent).toBe('');
    const dialog = await openSync();
    expect(within(dialog).queryByRole('link', { name: /যাচাই/ })).toBeNull();
  });

  it('goes offline, counts waiting changes, and sends them when back online', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    let dialog = await openSync();
    expect(within(dialog).getByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeTruthy();
    expect(within(dialog).getByText(/^এখন অনলাইন · শেষ সিঙ্ক: /)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('switch', { name: 'অফলাইনে যান' }));
    expect(await within(dialog).findByRole('switch', { name: 'অনলাইনে যান' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: /এখনই সিঙ্ক করুন/ })).toHaveProperty('disabled', true);
    await userEvent.keyboard('{Escape}');

    await act(() => store.dispatch(payment));
    expect(await screen.findByRole('button', { name: 'অফলাইন · সিঙ্ক বাকি ১ · যাচাই বাকি ১' })).toBeTruthy();
    dialog = await openSync();
    expect(within(dialog).getByText('এই ডিভাইসে সিঙ্ক বাকি: ১টি পরিবর্তন')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('switch', { name: 'অনলাইনে যান' }));
    expect(await within(dialog).findByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().sync).toMatchObject({ online: true, pending: 0 });
    expect(screen.getByRole('button', { name: 'অনলাইন · যাচাই বাকি ১' })).toBeTruthy();
  });

  it('lets another device change the open customer, at once when online and after a sync when offline', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    const dialog = await openSync();
    await userEvent.click(within(dialog).getByRole('button', { name: /অন্য ডিভাইস থেকে বদলান/ }));
    expect(await within(dialog).findByText('অন্য ডিভাইসের পরিবর্তন এসেছে।')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c2']).toMatchObject({ notes: 'অন্য ডিভাইস থেকে লেখা নোট', version: 2 });

    await userEvent.click(within(dialog).getByRole('switch', { name: 'অফলাইনে যান' }));
    await userEvent.click(within(dialog).getByRole('button', { name: /অন্য ডিভাইস থেকে বদলান/ }));
    expect(await within(dialog).findByText('অন্য ডিভাইস পরিবর্তনটি সার্ভারে পাঠিয়েছে। অনলাইনে গেলে এখানে আসবে।')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c2']!.version).toBe(2);

    await userEvent.click(within(dialog).getByRole('switch', { name: 'অনলাইনে যান' }));
    await within(dialog).findByRole('switch', { name: 'অফলাইনে যান' });
    await waitFor(() => expect(store.getSnapshot().state.customers['rahman-c2']!.version).toBe(3));
  });

  it('forgets the other-device message once the dialog is closed', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    let dialog = await openSync();
    await userEvent.click(within(dialog).getByRole('button', { name: /অন্য ডিভাইস থেকে বদলান/ }));
    expect(await within(dialog).findByText('অন্য ডিভাইসের পরিবর্তন এসেছে।')).toBeTruthy();
    await userEvent.keyboard('{Escape}');
    dialog = await openSync();
    expect(within(dialog).queryByText('অন্য ডিভাইসের পরিবর্তন এসেছে।')).toBeNull();
  });

  it('announces the status through a live region without renaming the button', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const button = await screen.findByRole('button', { name: /^অনলাইন/ });
    const live = document.querySelector('[aria-live="polite"].sr-only');
    expect(live?.textContent).toBe(button.getAttribute('aria-label') ?? button.textContent);
    expect(button.querySelector('[aria-live]')).toBeNull();
  });

  it('opens a centred card on a desktop with the title announced but not shown, and lines centred', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/work' });
    const dialog = await openSync();
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!)!;
    expect(title.textContent).toBe('সিঙ্ক');
    expect(title.className).toContain('sr-only');
    expect(within(dialog).queryByRole('button', { name: 'বন্ধ করুন' })).toBeNull();
    expect(within(dialog).getByText('আগে একটি কাস্টমার বা অর্ডার খুলুন।').className).toContain('text-center');
    expect(within(dialog).getByRole('link', { name: /যাচাই করুন/ }).textContent).toContain('১টি পরিবর্তন আপনাকে যাচাই করতে হবে');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('has nothing for another device to change until a customer or order is open', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/work' });
    const dialog = await openSync();
    expect(within(dialog).getByRole('button', { name: /অন্য ডিভাইস থেকে বদলান/ })).toHaveProperty('disabled', true);
    expect(within(dialog).getByText('আগে একটি কাস্টমার বা অর্ডার খুলুন।')).toBeTruthy();
  });
});
