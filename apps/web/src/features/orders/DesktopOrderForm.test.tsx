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

  it('keeps each line’s measurements to itself when switching lines', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.click(within(left).getByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(within(left).getByLabelText('নাম'), 'জসিম উদ্দিন');
    const addShirt = async () => {
      await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'শার্ট');
      await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    };
    const middle = () => region('মাপ ও ডিজাইন');
    const fillAll = async (values: Record<string, string>) => {
      for (const [label, value] of Object.entries(values)) await userEvent.type(within(middle()).getByLabelText(label), value);
    };

    await addShirt();
    await userEvent.type(within(middle()).getByLabelText('বুক'), '40');
    await userEvent.type(within(middle()).getByLabelText('ঝুল'), '30');
    await userEvent.type(within(middle()).getByLabelText('পেট'), '34');
    await addShirt();
    await userEvent.click(within(left).getByRole('button', { name: 'শার্ট ২' }));

    for (const label of ['বুক', 'ঝুল', 'পেট']) expect(within(middle()).getByLabelText(label)).toHaveProperty('value', '');
    await userEvent.type(within(middle()).getByLabelText('ঝুল'), '28');
    await fillAll({ 'বুক': '36', 'পেট': '32', 'কাঁধ (পুট)': '16', 'হাতা': '22', 'গলা': '14' });
    await userEvent.type(within(region('অর্ডারের হিসাব')).getByLabelText('দাম (প্রতিটি)'), '500');

    await userEvent.click(within(left).getByRole('button', { name: 'শার্ট ১' }));
    expect(within(middle()).getByLabelText('বুক')).toHaveProperty('value', '৪০');
    await fillAll({ 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15' });
    await userEvent.type(within(region('অর্ডারের হিসাব')).getByLabelText('দাম (প্রতিটি)'), '500');
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    const values = order.items.map((i) => [i.measurements?.values['chest']?.value, i.measurements?.values['length']?.value]);
    expect(values).toEqual([
      [40, 30],
      [36, 28],
    ]);
  }, 30_000);

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

  it('does not save while the advance cannot be read', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const before = Object.keys(store.getSnapshot().state.orders).length;
    const summary = region('অর্ডারের হিসাব');
    await userEvent.type(within(summary).getByLabelText('দাম (প্রতিটি)'), '500');
    await userEvent.type(within(summary).getByLabelText('অগ্রিম'), '500 tk');
    await save();

    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
    expect(screen.queryByRole('heading', { name: 'রসিদ' })).toBeNull();
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
