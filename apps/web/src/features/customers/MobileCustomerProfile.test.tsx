import { formatMeasurement, profileKey } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { deltaText } from './measurementView';

/** A Rahman Tailors customer with saved shirt measurements, opened on the phone. */
async function shirtCustomer() {
  const app = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers' });
  const { state } = app.store.getSnapshot();
  const order = Object.values(state.orders).find((o) => o.items.some((i) => state.profiles[profileKey(o.customerId, 'shirt')]))!;
  const customerId = order.customerId;
  await act(() => app.router.navigate(`/app/customers/${customerId}?tab=shirt`));
  return { ...app, customerId, customer: state.customers[customerId]! };
}

describe('Phone customer profile', () => {
  it('shows the centred header, the three numbers, tabs and the bottom bar', async () => {
    const { store, customer, customerId } = await shirtCustomer();
    expect(await screen.findByRole('heading', { name: customer.name, level: 1 })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'কল করুন' }).getAttribute('href')).toBe(`tel:${customer.phone}`);
    expect(screen.getByRole('link', { name: 'মেসেজ পাঠান' }).getAttribute('href')).toBe(`sms:${customer.phone}`);

    const orders = Object.values(store.getSnapshot().state.orders).filter((o) => o.customerId === customerId);
    const strip = screen.getByText('অর্ডার', { selector: 'dt' }).closest('dl')!;
    expect(within(strip).getByText('বাকি')).toBeTruthy();
    expect(within(strip).getByText('শেষ এসেছেন')).toBeTruthy();
    expect(orders.length).toBeGreaterThan(0);

    const tabs = screen.getByRole('tablist', { name: 'কাস্টমারের তথ্য' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual(['মাপ', 'অর্ডার', 'হিসাব']);
    expect(within(tabs).getByRole('tab', { name: 'মাপ' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tabpanel')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'বার দেখান' }));
    expect(screen.getByRole('link', { name: 'নতুন মাপ' }).getAttribute('href')).toBe(`/app/customers/${customerId}/measure/shirt`);
    const repeat = screen.getByRole('link', { name: 'আবার অর্ডার' });
    expect(repeat.getAttribute('href')).toMatch(/^\/app\/orders\/new\?repeat=/);

    await userEvent.click(within(tabs).getByRole('tab', { name: 'অর্ডার' }));
    expect(within(tabs).getByRole('tab', { name: 'অর্ডার' }).getAttribute('aria-selected')).toBe('true');
    expect(within(screen.getByRole('tabpanel')).getAllByRole('link').length).toBe(orders.length);
  });

  it('badges each measurement that changed since the previous version', async () => {
    const { store, customerId } = await shirtCustomer();
    const profile = store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!;
    const last = profile.versions.at(-1)!;
    const chest = last.values['chest']!;
    await act(() =>
      store.dispatch({
        type: 'measurement.recorded',
        customerId,
        templateId: 'shirt',
        version: {
          ...last,
          id: 'v-new',
          takenAt: new Date().toISOString(),
          values: { ...last.values, chest: { ...chest, value: chest.value + 0.5 } },
        },
      }),
    );
    const card = await screen.findByRole('region', { name: 'শার্ট মাপ' });
    expect(within(card).getAllByText(deltaText(0.5, 'bn'))).toHaveLength(1);
    expect(within(card).getByText(formatMeasurement(chest.value + 0.5, 'bn'))).toBeTruthy();
    expect(within(card).getAllByText('আগের মাপ থেকে')).toHaveLength(1);
  });

  it('hides money from staff without money.view, keeping the rest', async () => {
    const app = await renderApp({
      layout: 'mobile',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    const customerId = Object.keys(app.store.getSnapshot().state.profiles)[0]!.split(':')[0]!;
    await act(() => app.router.navigate(`/app/customers/${customerId}`));
    const tabs = await screen.findByRole('tablist', { name: 'কাস্টমারের তথ্য' });
    expect(within(tabs).queryByRole('tab', { name: 'হিসাব' })).toBeNull();
    expect(screen.queryByText('বাকি', { selector: 'dt' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'তথ্য বদলান' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'বার দেখান' }));
    expect(screen.getByRole('link', { name: 'নতুন মাপ' })).toBeTruthy();
  });
});
