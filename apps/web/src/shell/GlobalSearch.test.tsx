import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const box = () => screen.getByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' });

describe('Global search', () => {
  it('finds an order by Bangla digits and opens it from the keyboard', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), '৪০');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options[0]!.textContent).toMatch(/^A-0040/);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(router.state.location.pathname).toBe('/app/orders/rahman-o40');
    expect(box()).toHaveProperty('value', '');
  });

  it('finds a customer by name and opens the profile on click', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), customer.name);
    await userEvent.click(screen.getByRole('option', { name: new RegExp(`^${customer.name}`) }));
    expect(router.state.location.pathname).toBe('/app/customers/rahman-c1');
  });

  it('says when nothing matches', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), 'zzzz');
    expect(screen.getByText('কিছু পাওয়া যায়নি')).toBeTruthy();
  });

  it('focuses search with "/" and opens a new order with N, but not while typing', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' });
    await userEvent.keyboard('/');
    expect(document.activeElement).toBe(box());
    expect(box()).toHaveProperty('value', '');

    await userEvent.keyboard('n');
    expect(box()).toHaveProperty('value', 'n');
    expect(router.state.location.pathname).toBe('/app/dashboard');

    await userEvent.clear(box());
    box().blur();
    await userEvent.keyboard('n');
    expect(router.state.location.pathname).toBe('/app/orders/new');
  });

  it('gives a tailor neither search nor the new-order shortcut', async () => {
    const { router } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(screen.queryByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' })).toBeNull();
    await userEvent.keyboard('n');
    expect(router.state.location.pathname).toBe('/app/work');
  });

  it('does not swallow N or "/" when they have nothing to do', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    for (const key of ['n', '/']) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('closes the results with Escape and wraps the highlight with the arrow keys', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), '০১৭');
    const count = within(screen.getByRole('listbox')).getAllByRole('option').length;
    expect(count).toBeGreaterThan(1);
    const selected = () => screen.getAllByRole('option').findIndex((o) => o.getAttribute('aria-selected') === 'true');

    await userEvent.keyboard('{ArrowUp}');
    expect(selected()).toBe(count - 1);
    await userEvent.keyboard('{ArrowDown}');
    expect(selected()).toBe(0);

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
