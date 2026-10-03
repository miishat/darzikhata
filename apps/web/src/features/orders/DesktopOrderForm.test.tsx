import { profileKey } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const region = (name: string) => screen.getByRole('region', { name });
const save = () => userEvent.click(within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'অর্ডার সেভ করুন' }));
const CONFIRM = 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন';

describe('Order entry on desktop', () => {
  it('uses saved measurements only after they are confirmed, showing the problem beside them', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const { state } = store.getSnapshot();
    const profile = Object.values(state.profiles).find((p) => p.templateId === 'shirt')!;
    const customer = state.customers[profile.customerId]!;

    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expect(region('মাপ ও ডিজাইন')).toBeTruthy();
    await userEvent.type(within(left).getByLabelText('কাস্টমার খুঁজুন'), customer.name);
    await userEvent.click(within(left).getByRole('button', { name: new RegExp(`^${customer.name}`) }));
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    expect(within(left).getByRole('button', { name: 'শার্ট ১' }).getAttribute('aria-pressed')).toBe('true');

    await save();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(within(region('মাপ ও ডিজাইন')).getByText('মাপ এখনো ঠিক আছে কিনা কাস্টমারের কাছে জেনে টিক দিন')).toBeTruthy();

    await userEvent.click(within(region('মাপ ও ডিজাইন')).getByRole('checkbox', { name: CONFIRM }));
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(customer.id);
    expect(order.items[0]!.measurements?.versionId).toBe(state.profiles[profileKey(customer.id, 'shirt')]!.versions.at(-1)!.id);
  });

  it('repeats an earlier order after each garment’s measurements are confirmed', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?repeat=rahman-o40' });
    const previous = store.getSnapshot().state.orders['rahman-o40']!;
    const lines = previous.items.filter((i) => !i.cancelled);

    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    const lineButtons = within(left).getAllByRole('button', { name: /^\S+ [০-৯]+$/ });
    expect(lineButtons).toHaveLength(lines.length);

    for (const button of lineButtons) {
      await userEvent.click(button);
      const checkbox = within(region('মাপ ও ডিজাইন')).queryByRole('checkbox', { name: CONFIRM });
      if (checkbox) await userEvent.click(checkbox);
    }
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(previous.customerId);
    expect(order.items.map((i) => [i.templateId, i.price])).toEqual(lines.map((i) => [i.templateId, i.price]));
  });

  it('starts with the customer chosen on their profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expect(within(left).getByText(store.getSnapshot().state.customers['rahman-c1']!.name)).toBeTruthy();
    expect(within(left).getByRole('button', { name: 'অন্য কাস্টমার' })).toBeTruthy();
  });

  it('never saves when Enter is pressed in a field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const before = Object.keys(store.getSnapshot().state.orders).length;

    await userEvent.type(within(region('অর্ডারের হিসাব')).getByLabelText('অগ্রিম'), '100{Enter}');

    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
    expect(screen.getByRole('region', { name: 'অর্ডারের হিসাব' })).toBeTruthy();
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'অর্ডার' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'এখানেই থাকুন' }));
    expect(region('কাস্টমার ও পোশাক')).toBeTruthy();
  });
});
