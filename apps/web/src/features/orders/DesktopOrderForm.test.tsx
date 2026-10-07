import { currentVersion, formatMeasurement, profileKey } from '@darzikhata/domain';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { chooseOption, optionLabels } from '../../test/chooseOption';

const region = (name: string) => screen.getByRole('region', { name });
const save = () => userEvent.click(within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'অর্ডার সেভ করে রসিদ দেখান' }));
const CONFIRM = 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন';
const garments = () => region('পোশাক ও মাপ');
const tiles = () => screen.getByRole('group', { name: 'পোশাক' });
/** Adds a garment from the empty card's buttons, or from the "add garment" tile's list once there is one. */
const addGarment = async (name: string) => {
  const more = within(garments()).queryByRole('button', { name: 'পোশাক যোগ করুন' });
  if (more) await userEvent.click(more);
  await userEvent.click(within(within(garments()).getByRole('group', { name: 'পোশাক যোগ করুন' })).getByRole('button', { name: `+ ${name}` }));
};

describe('Order entry on desktop', () => {
  it('uses saved measurements only after they are confirmed, showing the problem beside them', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const { state } = store.getSnapshot();
    const profile = Object.values(state.profiles).find((p) => p.templateId === 'shirt')!;
    const customer = state.customers[profile.customerId]!;

    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    expect(garments()).toBeTruthy();
    await userEvent.type(within(bar).getByLabelText('কাস্টমার খুঁজুন'), customer.name);
    await userEvent.click(within(bar).getByRole('button', { name: new RegExp(`^${customer.name}`) }));
    await addGarment('শার্ট');
    expect(within(tiles()).getByRole('button', { name: 'শার্ট ১' }).getAttribute('aria-pressed')).toBe('true');

    await save();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(within(garments()).getByText('মাপ এখনো ঠিক আছে কিনা কাস্টমারের কাছে জেনে টিক দিন')).toBeTruthy();

    await userEvent.click(within(garments()).getByRole('checkbox', { name: CONFIRM }));
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(customer.id);
    expect(order.items[0]!.measurements?.versionId).toBe(state.profiles[profileKey(customer.id, 'shirt')]!.versions.at(-1)!.id);
  });

  it('keeps each line’s measurements to itself when switching lines', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await userEvent.click(within(bar).getByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(within(bar).getByLabelText('নাম'), 'জসিম উদ্দিন');
    const addShirt = () => addGarment('শার্ট');
    const middle = () => garments();
    const fillAll = async (values: Record<string, string>) => {
      for (const [label, value] of Object.entries(values)) await userEvent.type(within(middle()).getByLabelText(label), value);
    };

    await addShirt();
    await userEvent.type(within(middle()).getByLabelText('বুক'), '40');
    await userEvent.type(within(middle()).getByLabelText('ঝুল'), '30');
    await userEvent.type(within(middle()).getByLabelText('পেট'), '34');
    await addShirt();
    await userEvent.click(within(tiles()).getByRole('button', { name: 'শার্ট ২' }));

    for (const label of ['বুক', 'ঝুল', 'পেট']) expect(within(middle()).getByLabelText(label)).toHaveProperty('value', '');
    await userEvent.type(within(middle()).getByLabelText('ঝুল'), '28');
    await fillAll({ 'বুক': '36', 'পেট': '32', 'কাঁধ (পুট)': '16', 'হাতা': '22', 'গলা': '14' });
    await userEvent.type(within(middle()).getByLabelText('দাম (প্রতিটি)'), '500');

    await userEvent.click(within(tiles()).getByRole('button', { name: 'শার্ট ১' }));
    expect(within(middle()).getByLabelText('বুক')).toHaveProperty('value', '৪০');
    await fillAll({ 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15' });
    await userEvent.type(within(middle()).getByLabelText('দাম (প্রতিটি)'), '500');
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

    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    const lineButtons = within(tiles()).getAllByRole('button', { name: /^\S+ [০-৯]+$/ });
    expect(lineButtons).toHaveLength(lines.length);
    for (const button of lineButtons) {
      await userEvent.click(button);
      const checkbox = within(garments()).queryByRole('checkbox', { name: CONFIRM });
      if (checkbox) await userEvent.click(checkbox);
    }
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(previous.customerId);
    expect(order.items.map((i) => [i.templateId, i.price])).toEqual(lines.map((i) => [i.templateId, i.price]));
  });

  it('shows the measurement confirmation of a repeated order without choosing a line first', async () => {
    // rahman-o39 is a single shirt with measurements.
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?repeat=rahman-o39' });
    await screen.findByRole('region', { name: 'কাস্টমার' });
    expect(within(garments()).getByRole('checkbox', { name: CONFIRM })).toBeTruthy();
  });

  it('does not save while the advance cannot be read', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await addGarment('অল্টারেশন');
    const before = Object.keys(store.getSnapshot().state.orders).length;
    const summary = region('অর্ডারের হিসাব');
    await userEvent.type(within(garments()).getByLabelText('দাম (প্রতিটি)'), '500');
    await userEvent.type(within(summary).getByLabelText('অগ্রিম'), '500 tk');
    await save();

    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
    expect(screen.queryByRole('heading', { name: 'রসিদ' })).toBeNull();
  });

  it('starts with the customer chosen on their profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    expect(within(bar).getByText(customer.name)).toBeTruthy();
    expect(within(bar).getByRole('link', { name: /^প্রোফাইল · / }).getAttribute('href')).toBe('/app/customers/rahman-c1');
    expect(within(bar).getByText('আগের বাকি')).toBeTruthy();
    expect(within(bar).getByText('চলমান অর্ডার')).toBeTruthy();
    expect(within(bar).getByText('শেষ এসেছেন')).toBeTruthy();
  });

  it('never saves when Enter is pressed in a field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await addGarment('অল্টারেশন');
    const before = Object.keys(store.getSnapshot().state.orders).length;

    await userEvent.type(within(region('অর্ডারের হিসাব')).getByLabelText('অগ্রিম'), '100{Enter}');

    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
    expect(screen.getByRole('region', { name: 'অর্ডারের হিসাব' })).toBeTruthy();
  });

  it('marks a value that differs from the last version, in words as well as outline', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const { state } = store.getSnapshot();
    const profile = Object.values(state.profiles).find((p) => p.templateId === 'shirt')!;
    const chest = currentVersion(profile)!.values['chest']!.value;
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await userEvent.type(within(bar).getByLabelText('কাস্টমার খুঁজুন'), state.customers[profile.customerId]!.name);
    await userEvent.click(within(bar).getByRole('button', { name: new RegExp(`^${state.customers[profile.customerId]!.name}`) }));
    await addGarment('শার্ট');
    await userEvent.click(within(garments()).getByRole('button', { name: 'নতুন মাপ নিন' }));

    const field = within(garments()).getByLabelText('বুক');
    expect(screen.queryByText(/^আগে /)).toBeNull();
    await userEvent.clear(field);
    await userEvent.type(field, String(chest + 2));
    expect(screen.getByText(`আগে ${formatMeasurement(chest, 'bn')}`)).toBeTruthy();
    expect(field.parentElement!.className).toContain('border-warn');
    await userEvent.clear(field);
    await userEvent.type(field, String(chest));
    expect(screen.queryByText(/^আগে /)).toBeNull();
  });

  it('lists the garments with missing required measurements in one alert that matches the field errors', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await userEvent.click(within(bar).getByRole('button', { name: 'নতুন কাস্টমার' }));
    await addGarment('শার্ট');
    expect(within(tiles()).getByText(/টি মাপ বাকি$/)).toBeTruthy();
    await save();

    const alert = screen.getByRole('alert');
    const fields = within(garments())
      .getAllByText('এই মাপটি লাগবে')
      .filter((el) => el.closest('fieldset'));
    expect(fields.length).toBeGreaterThan(0);
    const toBn = (n: number) => String(n).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!);
    expect(alert.textContent).toContain(`শার্ট ১: ${toBn(fields.length)}টি মাপ বাকি`);
  });

  it('changes the customer from the bar, by search or to a new one', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    const other = Object.values(store.getSnapshot().state.customers).find((c) => c.id !== 'rahman-c1')!;

    await userEvent.click(within(bar).getByRole('button', { name: 'কাস্টমার বদলান' }));
    const menu = within(bar).getByRole('group', { name: 'অন্য কাস্টমার বেছে নিন' });
    expect(document.activeElement).toBe(within(menu).getByLabelText('কাস্টমার খুঁজুন'));
    await userEvent.type(within(menu).getByLabelText('কাস্টমার খুঁজুন'), other.name);
    await userEvent.click(within(menu).getAllByRole('button', { name: new RegExp(`^${other.name}`) })[0]!);
    expect(within(bar).queryByRole('group', { name: 'অন্য কাস্টমার বেছে নিন' })).toBeNull();
    expect(within(bar).getByText(other.name)).toBeTruthy();

    await userEvent.click(within(bar).getByRole('button', { name: 'কাস্টমার বদলান' }));
    await userEvent.click(within(bar).getByRole('button', { name: 'নতুন কাস্টমার' }));
    expect(within(bar).getByLabelText('নাম')).toHaveProperty('value', '');
    await userEvent.click(within(bar).getByRole('button', { name: 'অন্য কাস্টমার' }));
    expect(within(bar).getByLabelText('কাস্টমার খুঁজুন')).toBeTruthy();
  });

  it('keeps the tab order customer bar, garments, then summary, and never offers a save shortcut', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    const order = (a: Element, b: Element) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(order(bar, garments())).toBe(true);
    expect(order(garments(), region('অর্ডারের হিসাব'))).toBe(true);
    const button = within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'অর্ডার সেভ করে রসিদ দেখান' });
    expect(button.getAttribute('aria-keyshortcuts')).toBeNull();
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await addGarment('শার্ট');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'অর্ডার' }));
    const dialog = await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' });
    expect(dialog.textContent).toContain('অর্ডারটি এখনো সেভ হয়নি। খসড়া এই কম্পিউটারেই থাকবে।');
    expect(within(dialog).getByRole('button', { name: 'খসড়া রেখে যান' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'এখানেই থাকুন' }));
    expect(region('কাস্টমার')).toBeTruthy();
  });

  it('uses the default leave wording, and no draft-kept claim, when the start does not keep a draft', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    expect(screen.queryByText(/নিজে থেকে রাখা হয়/)).toBeNull();
    await addGarment('শার্ট');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'অর্ডার' }));
    const dialog = await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' });
    expect(dialog.textContent).toContain('এই পাতায় যা লিখেছেন তা সেভ হয়নি।');
    expect(dialog.textContent).not.toContain('খসড়া এই কম্পিউটারেই থাকবে');
    expect(within(dialog).getByRole('button', { name: 'সেভ না করে যান' })).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: 'খসড়া রেখে যান' })).toBeNull();
  });
});

describe('Worker field on desktop', () => {
  const addCustomerAndAlteration = async () => {
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await userEvent.click(within(bar).getByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(within(bar).getByLabelText('নাম'), 'জসিম উদ্দিন');
    await addGarment('অল্টারেশন');
    return bar;
  };

  it('gives the chosen worker to the saved garment', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    await addCustomerAndAlteration();
    const middle = garments();
    const worker = within(middle).getByLabelText('কারিগর');
    expect(await optionLabels(worker)).toContain('কেউ নেই');
    await chooseOption(worker, 'আব্দুর রহমান');
    if (!(within(middle).getByLabelText('দাম (প্রতিটি)') as HTMLInputElement).value) {
      await userEvent.type(within(middle).getByLabelText('দাম (প্রতিটি)'), '200');
    }
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.items.map((i) => i.assignedTo)).toEqual(['rahman-owner']);
  }, 30_000);

  it('leaves the garment unassigned when nobody is chosen', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    await addCustomerAndAlteration();
    const middle = garments();
    if (!(within(middle).getByLabelText('দাম (প্রতিটি)') as HTMLInputElement).value) {
      await userEvent.type(within(middle).getByLabelText('দাম (প্রতিটি)'), '200');
    }
    await save();
    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.items.map((i) => i.assignedTo)).toEqual([null]);
  }, 30_000);

  it('hides the field from a role that may not assign work', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/orders/new', as: { staffId: 'nakshi-counter', pin: '2222' } });
    await addCustomerAndAlteration();
    expect(within(garments()).queryByLabelText('কারিগর')).toBeNull();
  });
});

describe('Draft autosave on desktop', () => {
  const KEY = 'dk.draft.rahman.main.rahman-owner';

  it('brings the draft back after a reload, says so, and starts over on request', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    expect(screen.getByText(/নিজে থেকে রাখা হয়/)).toBeTruthy();
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await addGarment('শার্ট');
    await waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull(), { timeout: 2000 });
    cleanup();

    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const again = await screen.findByRole('region', { name: 'কাস্টমার' });
    expect(within(tiles()).getByRole('button', { name: 'শার্ট ১' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('আগের খসড়া ফিরিয়ে আনা হয়েছে।');

    await userEvent.click(screen.getByRole('button', { name: 'নতুন করে শুরু' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'নতুন অর্ডার' }));
    expect(screen.queryByRole('button', { name: 'শার্ট ১' })).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  }, 30_000);

  it('discards on purpose only after confirming, then leaves', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const bar = await screen.findByRole('region', { name: 'কাস্টমার' });
    await addGarment('শার্ট');
    await waitFor(() => expect(window.localStorage.getItem(KEY)).not.toBeNull(), { timeout: 2000 });

    await userEvent.click(within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'খসড়া বাতিল' }));
    await userEvent.click(await screen.findByRole('button', { name: 'খসড়া রাখুন' }));
    expect(window.localStorage.getItem(KEY)).not.toBeNull();

    await userEvent.click(within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'খসড়া বাতিল' }));
    await userEvent.click(await screen.findByRole('button', { name: 'হ্যাঁ, মুছে ফেলুন' }));
    expect(await screen.findByRole('heading', { name: 'অর্ডার' })).toBeTruthy();
    // Checked after the leave has settled, so a late write from the closing form would show.
    expect(window.localStorage.getItem(KEY)).toBeNull();
  }, 30_000);
});
