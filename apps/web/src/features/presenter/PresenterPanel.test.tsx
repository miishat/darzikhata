import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const panel = () => screen.findByRole('complementary', { name: 'উপস্থাপনা' });
const highlight = () => document.querySelector('style[data-presenter-highlight]')?.textContent ?? '';

async function startFirstOrder() {
  const scenarios = await panel();
  expect(within(scenarios).getByRole('heading', { name: 'একটি দৃশ্য বেছে নিন' })).toBeTruthy();
  await userEvent.click(within(scenarios).getByRole('button', { name: 'নতুন কাস্টমারের প্রথম অর্ডার' }));
  const dialog = await screen.findByRole('dialog', { name: 'নতুন কাস্টমারের প্রথম অর্ডার' });
  expect(within(dialog).getByText('রহমান টেইলার্স এর ডেমো ডেটা নতুন করে শুরু হবে, তারপর দৃশ্যটি চলবে।')).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: 'শুরু করুন' }));
  return within(await panel()).findByText('ধাপ ১/৬');
}

const current = async () => (await panel()).querySelector('[aria-current="step"]')?.textContent;

describe('Presenter mode', () => {
  it('is turned on and off from More', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'উপস্থাপনা মোড' }));
    expect(await panel()).toBeTruthy();
    expect(window.localStorage.getItem('dk.presenter')).toBe('on');
    await userEvent.click(screen.getByRole('checkbox', { name: 'উপস্থাপনা মোড' }));
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
  });

  it('starts a scenario on a fresh copy of its shop, highlights the next control and follows the app', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    const { store } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/dashboard' });
    await startFirstOrder();
    expect(store.getSnapshot().config?.id).toBe('rahman');
    expect(await current()).toBe('নতুন অর্ডার খুলুন');
    expect(highlight()).toContain('[data-tour="new-order"]');

    await userEvent.click(screen.getByRole('link', { name: '+ নতুন অর্ডার' }));
    expect(await within(await panel()).findByText('ধাপ ২/৬')).toBeTruthy();
    expect(await current()).toBe('নতুন কাস্টমার যোগ করুন: নাম আর ফোন');
    expect(highlight()).toContain('[data-tour="new-customer"]');
  });

  it('lets the presenter tick off or skip steps, then end the scenario', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await startFirstOrder();
    const box = await panel();
    await userEvent.click(within(box).getByRole('button', { name: 'বাদ দিন' }));
    await userEvent.click(within(box).getByRole('button', { name: 'হয়েছে' }));
    expect(within(box).getByText('ধাপ ৩/৬')).toBeTruthy();
    const steps = within(within(box).getByRole('list')).getAllByRole('listitem');
    expect(steps[0]!.textContent).toBe('নতুন অর্ডার খুলুন (বাদ দেওয়া)');
    expect(steps[1]!.textContent).toBe('নতুন কাস্টমার যোগ করুন: নাম আর ফোন (হয়েছে)');

    for (let i = 0; i < 4; i++) await userEvent.click(within(box).getByRole('button', { name: 'হয়েছে' }));
    expect(within(box).getByText('দৃশ্য শেষ')).toBeTruthy();
    expect(highlight()).toBe('');
    await userEvent.click(within(box).getByRole('button', { name: 'দৃশ্য বন্ধ করুন' }));
    expect(within(await panel()).getByRole('heading', { name: 'একটি দৃশ্য বেছে নিন' })).toBeTruthy();
  });

  it('folds away without losing its place', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await startFirstOrder();
    await userEvent.click(within(await panel()).getByRole('button', { name: 'ছোট করুন' }));
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'উপস্থাপনা খুলুন' }));
    expect(within(await panel()).getByText('ধাপ ১/৬')).toBeTruthy();
  });

  it('stays off the customer’s status page', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/s/not-a-real-token' });
    await screen.findByText(/^এই লিংকটি পাওয়া যায়নি/);
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'উপস্থাপনা খুলুন' })).toBeNull();
  });
});
