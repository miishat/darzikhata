import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import type { TourTarget } from './scenarios';

/** The presenter highlights controls by these names, so every scenario's targets must exist. */
const marked = () => new Set(Array.from(document.querySelectorAll('[data-tour]'), (e) => e.getAttribute('data-tour')));
const expectMarked = (targets: TourTarget[]) => {
  const found = marked();
  expect(targets.filter((t) => !found.has(t))).toEqual([]);
};

describe('Tour targets', () => {
  it('marks the laptop shell and the home screen', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/dashboard' });
    await screen.findByRole('region', { name: 'নেওয়ার জন্য রেডি' });
    expectMarked(['new-order', 'sync-status', 'switch-user', 'nav-orders', 'nav-customers', 'nav-work', 'nav-settings', 'ready-list']);
  });

  it('marks the phone shell, with settings under More', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/more' });
    await screen.findByRole('heading', { name: 'আরও' });
    expectMarked(['new-order', 'sync-status', 'switch-user', 'nav-orders', 'nav-customers', 'nav-work', 'nav-settings']);
  });

  it('marks order entry, including the repeat-order confirmation', async () => {
    const { router, store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expectMarked(['new-customer', 'add-garment', 'advance', 'save-order']);
    const earlier = Object.values(store.getSnapshot().state.orders).find((o) => o.items.some((i) => !i.cancelled && i.measurements))!;
    // The form keeps its draft on the same route, so leave it first; then open each line until one asks for confirmation.
    await act(() => router.navigate('/app/dashboard'));
    await screen.findByRole('region', { name: 'নেওয়ার জন্য রেডি' });
    await act(() => router.navigate(`/app/orders/new?repeat=${earlier.id}`));
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    for (const line of within(left).getAllByRole('button', { name: /^\S+ [০-৯]+$/ })) {
      await userEvent.click(line);
      if (screen.queryByRole('checkbox', { name: 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন' })) break;
    }
    await screen.findByRole('checkbox', { name: 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন' });
    expectMarked(['confirm-measurements']);
  });

  it('marks the order detail, its status link and the receipt balance', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/rahman-o32' });
    const detail = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    expectMarked(['hand-over', 'order-status', 'create-link', 'order-again']);
    await userEvent.click(within(detail).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await within(detail).findByRole('button', { name: 'লিংক বন্ধ করুন' });
    expectMarked(['open-link', 'revoke-link']);
    await act(() => router.navigate('/print/receipt/rahman-o32'));
    await screen.findByRole('heading', { name: 'রসিদ' });
    expectMarked(['receipt-balance']);
  });

  it('marks the review item and the template editor’s add-stage button', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/review' });
    await screen.findByRole('heading', { name: 'যাচাইয়ের তালিকা' });
    expectMarked(['review-item']);
    await act(() => router.navigate('/app/settings/templates/blouse'));
    await screen.findByRole('table', { name: 'ধাপ' });
    expectMarked(['add-stage']);
  });
});
