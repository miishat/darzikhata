import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toBanglaDigits } from '@darzikhata/domain';
import { renderApp } from '../test/renderApp';
import { dashboardModel } from '../features/dashboard/dashboard';

describe('Desktop sidebar and top bar', () => {
  it('shows counts that match the dashboard, with names that stay the same', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const nav = within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));
    const model = dashboardModel(Object.values(store.getSnapshot().state.orders), new Date().toISOString().slice(0, 10));
    expect(model.openOrders).toBeGreaterThan(0);
    const orders = nav.getByRole('link', { name: 'অর্ডার' });
    expect(orders.textContent).toContain(toBanglaDigits(String(model.openOrders)));
    expect(nav.getByText('হিসাব ও দোকান')).toBeTruthy();
  });

  it('keeps only search, language and New Order in the top bar', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const header = within(await screen.findByRole('banner'));
    expect(header.getAllByRole('combobox')).toHaveLength(1);
    expect(header.getAllByRole('button')).toHaveLength(1);
    expect(header.getByRole('link', { name: 'নতুন অর্ডার' })).toBeTruthy();
    expect(header.queryByRole('button', { name: /অনলাইন|অফলাইন|দেখতে হবে/ })).toBeNull();
  });
});
