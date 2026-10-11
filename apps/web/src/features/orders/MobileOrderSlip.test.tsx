import { moneySummary } from '@darzikhata/domain';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';

const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

async function fill(scope: HTMLElement, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await userEvent.type(within(scope).getByLabelText(label), value);
}

const slipRow = (name: RegExp) => screen.getByRole('button', { name });
const done = () => userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'হয়েছে' }));
const save = () => userEvent.click(screen.getByRole('button', { name: 'অর্ডার সেভ করুন' }));
const summaryRow = (label: RegExp) => within(screen.getByRole('table', { name: 'অর্ডারের হিসাব' })).getByRole('row', { name: label });

async function newCustomer(name: string, phone?: string) {
  await userEvent.click(await screen.findByRole('button', { name: /^কাস্টমার/ }));
  await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
  await userEvent.type(screen.getByLabelText('নাম'), name);
  if (phone) await userEvent.type(screen.getByLabelText('ফোন'), phone);
  await done();
}

async function addGarment(name: string) {
  await userEvent.click(slipRow(/পোশাক যোগ করুন/));
  await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name }));
  return screen.findByRole('dialog');
}

describe('Order entry on a phone', () => {
  it('takes a new customer, two garment lines and an advance, then opens a receipt showing the balance', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    expect(await screen.findByRole('heading', { name: 'নতুন অর্ডার' })).toBeTruthy();

    await newCustomer('জসিম উদ্দিন', '01799887766');
    expect(screen.getByText('জসিম উদ্দিন')).toBeTruthy();

    let sheet = await addGarment('শার্ট');
    expect(sheet.getAttribute('aria-labelledby')).toBeTruthy();
    await userEvent.clear(within(sheet).getByLabelText('সংখ্যা'));
    await userEvent.type(within(sheet).getByLabelText('সংখ্যা'), '২');
    await fill(sheet, SHIRT);
    await userEvent.click(within(sheet).getByRole('radio', { name: 'ডিজাইন' }));
    await userEvent.type(within(sheet).getByLabelText('ডিজাইনের নোট'), 'দুই পকেট');
    await done();

    sheet = await addGarment('পাঞ্জাবি');
    await fill(sheet, { ...SHIRT, 'ঝুল': '42' });
    await done();

    expect(slipRow(/শার্ট ১ × ২/)).toBeTruthy();
    expect(slipRow(/পাঞ্জাবি ২ × ১/)).toBeTruthy();

    await userEvent.click(slipRow(/অগ্রিম, ছাড় ও নোট/));
    await userEvent.type(await screen.findByLabelText('অগ্রিম'), '১০০০');
    await done();
    expect(within(summaryRow(/^মোট/)).getByText('৳২,৪০০')).toBeTruthy();
    expect(within(summaryRow(/^বাকি/)).getByText('৳১,৪০০')).toBeTruthy();

    await save();
    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const totals = screen.getByRole('table', { name: 'হিসাব' });
    expect(within(within(totals).getByRole('row', { name: /^বাকি/ })).getByText('৳১,৪০০')).toBeTruthy();

    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.items.map((i) => i.templateId)).toEqual(['shirt', 'shirt', 'panjabi']);
    expect(order.items[0]!.designNotes).toBe('দুই পকেট');
    expect(order.items[0]!.measurements?.values['collar']).toEqual({ value: 15.5, unit: 'inch' });
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
    expect(store.getSnapshot().state.customers[order.customerId]).toMatchObject({ name: 'জসিম উদ্দিন', phone: '01799887766' });
  }, 30_000);

  it('opens the customer when saving an empty order, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    const before = Object.keys(store.getSnapshot().state.orders).length;
    await screen.findByRole('heading', { name: 'নতুন অর্ডার' });
    await save();
    expect(await screen.findByRole('dialog', { name: 'কাস্টমার' })).toBeTruthy();
    expect(screen.getByText('কাস্টমার বেছে নিন বা নতুন কাস্টমার যোগ করুন')).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
  });

  it('opens the garment with missing measurements and shows what is needed beside the fields', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');
    await userEvent.type(within(sheet).getByLabelText('ঝুল'), '29');
    await done();
    await save();

    const again = await screen.findByRole('dialog', { name: 'শার্ট ১' });
    expect(within(again).getAllByText('এই মাপটি লাগবে')).toHaveLength(5);
    expect(within(again).getByLabelText('বুক').getAttribute('aria-invalid')).toBe('true');
  });

  it('keeps the advance within the total', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    await addGarment('অল্টারেশন');
    await done();
    await userEvent.click(slipRow(/অগ্রিম, ছাড় ও নোট/));
    await userEvent.type(await screen.findByLabelText('অগ্রিম'), '500');
    await done();
    await save();
    const payment = await screen.findByRole('dialog', { name: 'অগ্রিম, ছাড় ও নোট' });
    expect(within(payment).getByText('অগ্রিম মোট দামের বেশি হতে পারে না')).toBeTruthy();
  });

  it('keeps the payment sheet open while the advance cannot be read', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    const before = Object.keys(store.getSnapshot().state.orders).length;
    await newCustomer('জসিম');
    await addGarment('অল্টারেশন');
    await done();
    await userEvent.click(slipRow(/অগ্রিম, ছাড় ও নোট/));
    await userEvent.type(await screen.findByLabelText('অগ্রিম'), '100 tk');
    await done();

    const payment = screen.getByRole('dialog', { name: 'অগ্রিম, ছাড় ও নোট' });
    expect(within(payment).getByLabelText('অগ্রিম').getAttribute('aria-invalid')).toBe('true');
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);

    await userEvent.clear(within(payment).getByLabelText('অগ্রিম'));
    await done();
    expect(screen.queryByRole('dialog')).toBeNull();
  }, 15_000);

  it('caps the quantity at 999', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');
    const quantity = within(sheet).getByLabelText('সংখ্যা');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '1234567');
    expect((quantity as HTMLInputElement).value).toBe('৯৯৯');
  });

  it('folds the save bar into a total tab and brings it back', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'সেভ বার লুকান' }));
    expect(screen.queryByRole('button', { name: 'অর্ডার সেভ করুন' })).toBeNull();
    expect(document.documentElement.dataset['dockOpen']).toBeUndefined();
    await userEvent.click(screen.getByRole('button', { name: 'সেভ বার দেখান' }));
    expect(screen.getByRole('button', { name: 'অর্ডার সেভ করুন' })).toBeTruthy();
    expect(document.documentElement.dataset['dockOpen']).toBe('1');
  });

  it('asks before leaving a started order', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জ');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'হোম' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });

  it('starts over from the menu', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম উদ্দিন');
    expect(screen.getByText('জসিম উদ্দিন')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'আরও' }));
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন করে শুরু' }));
    expect(screen.queryByText('জসিম উদ্দিন')).toBeNull();
  });
});

describe('Measuring a shirt with the keypad on a phone', () => {
  it('goes field to field without the system keyboard and on to the design tab after the last', async () => {
    window.localStorage.removeItem('dk.keypad');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');

    await userEvent.click(within(sheet).getByLabelText('ঝুল'));
    for (let i = 0; i < 8; i++) {
      await userEvent.click(screen.getByRole('button', { name: '২' }));
      await userEvent.click(screen.getByRole('button', { name: '৯' }));
      await userEvent.click(screen.getByRole('button', { name: 'অর্ধেক' }));
      await userEvent.click(screen.getByRole('button', { name: 'পরের মাপ' }));
    }
    expect(await within(sheet).findByLabelText('ডিজাইনের নোট')).toBeTruthy();
  }, 30_000);

  it('keeps room under the last button for the keypad only while it is open', async () => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
      await newCustomer('জসিম');
      const sheet = await addGarment('শার্ট');
      expect(screen.queryByTestId('keypad-space')).toBeNull();
      await userEvent.click(within(sheet).getByLabelText('বুক'));
      const space = screen.getByTestId('keypad-space');
      expect(space.style.height).toBe('240px');
      const doneButton = within(sheet).getByRole('button', { name: 'হয়েছে' });
      expect(doneButton.compareDocumentPosition(space) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      await userEvent.click(screen.getByRole('button', { name: 'বন্ধ করুন' }));
      expect(screen.queryByTestId('keypad-space')).toBeNull();
    } finally {
      height.mockRestore();
    }
  });
});

describe('A kept draft on a phone', () => {
  it('comes back on the slip with a badge by the title and can be thrown away from the menu', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম উদ্দিন');
    await waitFor(() => expect(window.localStorage.getItem('dk.draft.rahman.main.rahman-owner')).not.toBeNull(), { timeout: 2000 });
    cleanup();

    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    expect(await screen.findByText('জসিম উদ্দিন')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('আগের খসড়া ফিরিয়ে আনা হয়েছে।');
    expect(screen.getByRole('heading', { name: /নতুন অর্ডার/ }).contains(screen.getByRole('status'))).toBe(true);

    await userEvent.click(screen.getByRole('button', { name: 'আরও' }));
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন করে শুরু' }));
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByText('জসিম উদ্দিন')).toBeNull();
    expect(store.getSnapshot().session).toBeTruthy();
    expect(window.localStorage.getItem('dk.draft.rahman.main.rahman-owner')).toBeNull();
  }, 30_000);
});
