import { formatMeasurement, profileKey } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

/** A Rahman Tailors customer with saved shirt measurements and at least one shirt order. */
async function shirtCustomer(layout: 'desktop' | 'mobile' = 'desktop') {
  const app = await renderApp({ layout, shop: 'rahman', path: '/app/customers' });
  const { state } = app.store.getSnapshot();
  const order = Object.values(state.orders).find((o) =>
    o.items.some((i) => i.templateId === 'shirt' && i.measurements && state.profiles[profileKey(o.customerId, 'shirt')]),
  )!;
  const customerId = order.customerId;
  await act(() => app.router.navigate(`/app/customers/${customerId}?tab=shirt`));
  const profile = state.profiles[profileKey(customerId, 'shirt')]!;
  return { ...app, customerId, order, profile };
}

const row = (scope: HTMLElement, label: string) => within(scope).getByRole('row', { name: new RegExp(`^${label}`) });

describe('Measurements', () => {
  it('shows the current version with units, source and date', async () => {
    const { profile } = await shirtCustomer();
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getByRole('tab', { name: 'শার্ট' }).getAttribute('aria-selected')).toBe('true');
    const panel = within(section).getByRole('tabpanel');
    const current = profile.versions.at(-1)!;
    const chest = current.values['chest']!.value;
    expect(within(row(panel, 'বুক')).getByText(`${formatMeasurement(chest, 'bn')} ইঞ্চি`)).toBeTruthy();
    expect(within(panel).getByText(/তারিখে, (শরীর থেকে|নমুনা পোশাক থেকে)$/)).toBeTruthy();
    expect(within(section).queryByRole('tab', { name: 'অল্টারেশন' })).toBeNull();
  });

  it('records a new version without changing measurements frozen on orders', async () => {
    const { store, customerId, profile, order } = await shirtCustomer();
    const versionsBefore = profile.versions.length;
    const frozen = order.items.find((i) => i.templateId === 'shirt')!.measurements;

    const section = await screen.findByRole('region', { name: 'মাপ' });
    await userEvent.click(within(section).getByRole('link', { name: 'নতুন মাপ নিন' }));
    expect(await screen.findByRole('heading', { name: 'শার্ট: নতুন মাপ' })).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('বুক'));
    await userEvent.type(screen.getByLabelText('বুক'), '৪০½');
    await userEvent.click(screen.getByRole('radio', { name: 'নমুনা পোশাক থেকে' }));
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    const panel = within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('tabpanel');
    expect(within(row(panel, 'বুক')).getByText('৪০½ ইঞ্চি')).toBeTruthy();
    expect(within(panel).getByText(/তারিখে, নমুনা পোশাক থেকে$/)).toBeTruthy();

    const { state } = store.getSnapshot();
    const versions = state.profiles[profileKey(customerId, 'shirt')]!.versions;
    expect(versions).toHaveLength(versionsBefore + 1);
    expect(versions.at(-1)).toMatchObject({ source: 'sample', takenBy: 'rahman-owner', values: { chest: { value: 40.5, unit: 'inch' } } });
    expect(state.orders[order.id]!.items.find((i) => i.templateId === 'shirt')!.measurements).toEqual(frozen);
  });

  it('compares the current values with an order’s frozen copy', async () => {
    const { order } = await shirtCustomer();
    const section = await screen.findByRole('region', { name: 'মাপ' });
    await userEvent.click(within(section).getByRole('link', { name: 'নতুন মাপ নিন' }));
    await userEvent.clear(await screen.findByLabelText('বুক'));
    await userEvent.type(screen.getByLabelText('বুক'), '৪০½');
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    const panel = within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('tabpanel');
    await userEvent.selectOptions(within(panel).getByLabelText('তুলনা করুন'), `অর্ডার ${order.number}`);
    expect(within(row(panel, 'বুক')).getByText('বদলেছে')).toBeTruthy();
  });

  it('requires every required measurement', async () => {
    const { store, customerId, profile } = await shirtCustomer();
    await userEvent.click(within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('link', { name: 'নতুন মাপ নিন' }));
    await userEvent.clear(await screen.findByLabelText('বুক'));
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));
    expect(screen.getByText('এই মাপটি লাগবে')).toBeTruthy();
    expect(store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions).toHaveLength(profile.versions.length);
  });

  it('hides women’s measurements from staff without that permission', async () => {
    const counter = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-counter', pin: '2222' },
    });
    const profileKeyWithVersions = Object.keys(counter.store.getSnapshot().state.profiles)[0]!;
    const customerId = profileKeyWithVersions.split(':')[0]!;
    await act(() => counter.router.navigate(`/app/customers/${customerId}`));
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getByText('এই কাস্টমারের মাপ দেখার অনুমতি আপনার নেই।')).toBeTruthy();
    expect(within(section).queryByRole('tab')).toBeNull();
    expect(within(section).queryByText(/ইঞ্চি/)).toBeNull();
  });

  it('shows them to cutting staff who have the permission', async () => {
    const cutting = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    const customerId = Object.keys(cutting.store.getSnapshot().state.profiles)[0]!.split(':')[0]!;
    await act(() => cutting.router.navigate(`/app/customers/${customerId}`));
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getAllByText(/ইঞ্চি$/).length).toBeGreaterThan(0);
  });
});
