import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Welcome on a desktop', () => {
  it('shows the three sample shops and what you can try as chips', async () => {
    await renderApp({ layout: 'desktop' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();
    for (const name of ['রহমান টেইলার্স', 'নকশী বুটিক', 'ইউনিফর্ম হাউস']) {
      expect(screen.getByRole('button', { name: `এই দোকান খুলুন: ${name}` })).toBeTruthy();
    }
    const features = within(screen.getByRole('list', { name: 'যা যা করে দেখতে পারেন' })).getAllByRole('listitem');
    expect(features.map((f) => f.textContent)).toEqual(['মাপের খাতা', 'অর্ডার ও ডেলিভারি', 'বাকি ও পেমেন্ট', 'কাজের তালিকা', 'রসিদ, স্লিপ ও ট্যাগ প্রিন্ট', 'ইন্টারনেট ছাড়াও চলে']);
    expect(screen.queryByText('যা যা করে দেখতে পারেন')).toBeNull();
  });

  it('switches to English', async () => {
    await renderApp({ layout: 'desktop' });
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'DarziKhata Demo' })).toBeTruthy();
    expect(within(screen.getByRole('list', { name: 'What You Can Try' })).getByText('Works Offline')).toBeTruthy();
  });
});

describe('Welcome on a phone', () => {
  it('keeps the single column without the feature chips', async () => {
    await renderApp({ layout: 'mobile' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'এই দোকান খুলুন: রহমান টেইলার্স' })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'যা যা করে দেখতে পারেন' })).toBeNull();
  });
});
