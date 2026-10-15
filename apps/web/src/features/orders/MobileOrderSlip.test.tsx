import { moneySummary } from '@darzikhata/domain';
import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';

const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

async function fill(scope: HTMLElement, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await userEvent.type(within(scope).getByLabelText(label), value);
}

// The slip's customer row, not the customer tick on the save bar (named "কাস্টমার · …").
const CUSTOMER_ROW = /^কাস্টমার(?! ·)/;
const slipRow = (name: RegExp) => screen.getByRole('button', { name });
const done = () => userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'হয়েছে' }));
const save = () => userEvent.click(screen.getByRole('button', { name: 'অর্ডার সেভ করুন' }));
const summaryRow = (label: RegExp) => within(screen.getByRole('table', { name: 'অর্ডারের হিসাব' })).getByRole('row', { name: label });

async function newCustomer(name: string, phone?: string) {
  await userEvent.click(await screen.findByRole('button', { name: CUSTOMER_ROW }));
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

    // Quantity reads "2 pieces" and only shows above one, so a × never means two things on this screen.
    expect(slipRow(/শার্ট ১\s*· ২টি/)).toBeTruthy();
    expect(slipRow(/পাঞ্জাবি ২/).textContent).not.toMatch(/×|১টি/);

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

  it('asks for a customer on an empty slip instead of showing a bare dot', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    const row = await screen.findByRole('button', { name: CUSTOMER_ROW });
    expect(row.textContent).toContain('কাস্টমার বেছে নিন');
    expect(row.textContent).not.toContain('·');
    await newCustomer('জসিম');
    expect(screen.getByRole('button', { name: CUSTOMER_ROW }).textContent).not.toContain('কাস্টমার বেছে নিন');
  });

  it('finds customers by phone from the first digit typed', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: CUSTOMER_ROW }));
    const sheet = within(await screen.findByRole('dialog'));
    await userEvent.type(sheet.getByRole('searchbox', { name: 'কাস্টমার খুঁজুন' }), '০১');
    expect(sheet.queryByText('কোনো কাস্টমার পাওয়া যায়নি')).toBeNull();
    expect(sheet.getAllByText(/^01/).length).toBeGreaterThan(0);
  });

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

  it('steps the quantity up and down, never below one', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');
    const quantity = within(sheet).getByLabelText('সংখ্যা') as HTMLInputElement;
    const less = within(sheet).getByRole('button', { name: 'একটি কম' });
    expect((less as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(within(sheet).getByRole('button', { name: 'একটি বেশি' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'একটি বেশি' }));
    expect(quantity.value).toBe('৩');
    await userEvent.click(less);
    expect(quantity.value).toBe('২');
    await done();
    expect(slipRow(/শার্ট ১\s*· ২টি/)).toBeTruthy();
  });

  it('removes a garment only after its remove button is held, not tapped', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');
    const remove = within(sheet).getByRole('button', { name: 'চেপে ধরে শার্ট ১ বাদ দিন' });
    expect(within(sheet).queryByText('×')).toBeNull();

    await userEvent.click(remove);
    expect(screen.getByRole('dialog', { name: 'শার্ট ১' })).toBeTruthy();

    fireEvent.pointerDown(remove);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull(), { timeout: 2000 });
    expect(screen.queryByRole('button', { name: /শার্ট ১/ })).toBeNull();
  });

  it('hides the tab bar while the save bar is on screen', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await screen.findByRole('heading', { name: 'নতুন অর্ডার' });
    expect(document.documentElement.dataset['hideTabs']).toBe('1');
    await userEvent.click(screen.getByRole('button', { name: 'ফিরে যান' }));
    await screen.findByRole('searchbox', { name: 'অর্ডার খুঁজুন' });
    expect(document.documentElement.dataset['hideTabs']).toBeUndefined();
  });

  it('keeps save grey until there is a customer and a priced garment, ticking each as it is done', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await screen.findByRole('heading', { name: 'নতুন অর্ডার' });
    const saveButton = () => screen.getByRole('button', { name: 'অর্ডার সেভ করুন' });
    expect(saveButton().getAttribute('aria-disabled')).toBe('true');
    expect(screen.getByRole('button', { name: 'কাস্টমার · এখনো হয়নি' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'পোশাক · এখনো হয়নি' })).toBeTruthy();

    await newCustomer('জসিম');
    expect(screen.getByRole('button', { name: 'কাস্টমার · হয়েছে' })).toBeTruthy();
    expect(saveButton().getAttribute('aria-disabled')).toBe('true');

    await addGarment('শার্ট');
    await done();
    expect(screen.getByRole('button', { name: 'পোশাক · হয়েছে' })).toBeTruthy();
    expect(saveButton().getAttribute('aria-disabled')).toBeNull();
  });

  it('opens the garment price when the only garment is at ৳0', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await newCustomer('জসিম');
    const sheet = await addGarment('শার্ট');
    await userEvent.click(within(sheet).getByRole('radio', { name: 'দাম' }));
    await userEvent.clear(within(sheet).getByLabelText('দাম (প্রতিটি)'));
    await done();
    expect(screen.getByRole('button', { name: 'পোশাক · এখনো হয়নি' })).toBeTruthy();
    await save();
    const again = await screen.findByRole('dialog', { name: 'শার্ট ১' });
    expect(within(again).getByLabelText('দাম (প্রতিটি)')).toBeTruthy();
  });

  it('goes to the order list from the back arrow when this is the first page opened', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'ফিরে যান' }));
    expect(await screen.findByRole('searchbox', { name: 'অর্ডার খুঁজুন' })).toBeTruthy();
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
