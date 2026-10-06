import { formatMeasurement, profileKey } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

/** A Rahman Tailors customer with at least two saved shirt versions, on their desktop measurement page. */
async function measuring() {
  const app = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
  const { state } = app.store.getSnapshot();
  const key = Object.keys(state.profiles).find((k) => k.endsWith(':shirt') && state.profiles[k]!.versions.length >= 2)!;
  const customerId = key.split(':')[0]!;
  await act(() => app.router.navigate(`/app/customers/${customerId}/measure/shirt`));
  await screen.findByRole('heading', { name: 'শার্ট: নতুন মাপ' });
  const versions = state.profiles[key]!.versions;
  return { ...app, customerId, versions };
}

describe('Desktop measurement form', () => {
  it('starts from the current version and shows earlier versions beside it', async () => {
    const { versions } = await measuring();
    const current = versions.at(-1)!;
    expect(screen.getByLabelText('বুক')).toHaveProperty('value', formatMeasurement(current.values.chest!.value, 'bn'));
    expect(screen.getAllByRole('button', { name: 'এগুলো বসান' }).length).toBe(Math.min(versions.length, 5));
    expect(screen.getByText(/বদলেছে · .*বাকি/)).toBeTruthy();
  });

  it('copies one earlier value into the new column and saves it', async () => {
    const { store, customerId, versions } = await measuring();
    const oldest = versions[0]!;
    const text = formatMeasurement(oldest.values.chest!.value, 'bn');
    await userEvent.clear(screen.getByLabelText('বুক'));
    await userEvent.click(screen.getAllByRole('button', { name: `বুক ${text} বসান` }).at(-1)!);
    expect(screen.getByLabelText('বুক')).toHaveProperty('value', text);
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    expect(await screen.findByRole('region', { name: 'মাপ' })).toBeTruthy();
    const saved = store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions;
    expect(saved).toHaveLength(versions.length + 1);
    expect(saved.at(-1)!.values.chest!.value).toBe(oldest.values.chest!.value);
  });

  it('copies a whole earlier version', async () => {
    const { store, customerId, versions } = await measuring();
    // Columns run newest first, so the last one is the oldest version shown.
    const copied = versions[versions.length - Math.min(versions.length, 5)]!;
    await userEvent.click(screen.getAllByRole('button', { name: 'এগুলো বসান' }).at(-1)!);
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    expect(await screen.findByRole('region', { name: 'মাপ' })).toBeTruthy();
    const saved = store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions.at(-1)!;
    for (const [key, value] of Object.entries(copied.values)) expect(saved.values[key]!.value).toBe(value.value);
  });

  it('switches garments from the bar, with the current one marked', async () => {
    await measuring();
    const garments = screen.getByRole('navigation', { name: 'পোশাক' });
    expect(within(garments).getByRole('link', { current: 'page' }).textContent).toMatch(/^শার্ট/);
    await userEvent.click(within(garments).getByRole('link', { name: /^প্যান্ট/ }));
    expect(await screen.findByRole('heading', { name: 'প্যান্ট: নতুন মাপ' })).toBeTruthy();
  });
});
