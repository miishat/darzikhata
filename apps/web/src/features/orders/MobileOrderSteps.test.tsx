import { moneySummary } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';

const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

async function fill(region: HTMLElement, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await userEvent.type(within(region).getByLabelText(label), value);
}

const next = () => userEvent.click(screen.getByRole('button', { name: 'পরের ধাপ' }));
const summaryRow = (label: RegExp) =>
  within(screen.getByRole('table', { name: 'অর্ডারের হিসাব' })).getByRole('row', { name: label });

describe('Order entry on mobile', () => {
  it('takes a new customer through every step and opens a receipt showing the balance', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    expect(await screen.findByRole('heading', { name: 'কাস্টমার' })).toBeTruthy();
    expect(screen.getByText('ধাপ ১/৫')).toBeTruthy();

    await next();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(screen.getByText('কাস্টমার বেছে নিন বা নতুন কাস্টমার যোগ করুন')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম উদ্দিন');
    await userEvent.type(screen.getByLabelText('ফোন'), '01799887766');
    await next();

    expect(await screen.findByRole('heading', { name: 'পোশাক ও মাপ' })).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'পাঞ্জাবি');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.click(screen.getByRole('button', { name: 'শার্ট ১' }));
    const shirt = screen.getByRole('region', { name: 'শার্ট ১' });
    await userEvent.clear(within(shirt).getByLabelText('সংখ্যা'));
    await userEvent.type(within(shirt).getByLabelText('সংখ্যা'), '২');
    await fill(shirt, SHIRT);
    await userEvent.click(screen.getByRole('button', { name: 'পাঞ্জাবি ২' }));
    await fill(screen.getByRole('region', { name: 'পাঞ্জাবি ২' }), { ...SHIRT, 'ঝুল': '42' });
    await next();

    expect(await screen.findByRole('heading', { name: 'ডিজাইন ও ছবি' })).toBeTruthy();
    await userEvent.type(within(screen.getByRole('region', { name: 'শার্ট ১' })).getByLabelText('ডিজাইনের নোট'), 'দুই পকেট');
    await next();

    expect(await screen.findByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(within(summaryRow(/^মোট/)).getByText('৳২,৪০০')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('অগ্রিম'), '১০০০');
    expect(within(summaryRow(/^বাকি/)).getByText('৳১,৪০০')).toBeTruthy();
    await next();

    expect(await screen.findByRole('heading', { name: 'যাচাই করুন' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'অর্ডার সেভ করুন' }));

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const totals = screen.getByRole('table', { name: 'হিসাব' });
    expect(within(within(totals).getByRole('row', { name: /^বাকি/ })).getByText('৳১,৪০০')).toBeTruthy();

    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.items.map((i) => i.templateId)).toEqual(['shirt', 'shirt', 'panjabi']);
    expect(order.items[0]!.designNotes).toBe('দুই পকেট');
    expect(order.items[0]!.measurements?.values['collar']).toEqual({ value: 15.5, unit: 'inch' });
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
    expect(store.getSnapshot().state.customers[order.customerId]).toMatchObject({ name: 'জসিম উদ্দিন', phone: '01799887766' });
  }, 20_000);

  it('keeps what was typed when going back a step', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.click(await screen.findByRole('button', { name: 'আগের ধাপ' }));
    expect(await screen.findByLabelText('নাম')).toHaveProperty('value', 'জসিম');
  });

  it('shows missing measurements beside the fields and stays on the step', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.type(within(screen.getByRole('region', { name: 'শার্ট ১' })).getByLabelText('ঝুল'), '29');
    await next();

    expect(screen.getByRole('heading', { name: 'পোশাক ও মাপ' })).toBeTruthy();
    const shirt = screen.getByRole('region', { name: 'শার্ট ১' });
    expect(within(shirt).getAllByText('এই মাপটি লাগবে')).toHaveLength(5);
    expect(within(shirt).getByLabelText('বুক').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(within(shirt).getByLabelText('বুক'));
  });

  it('keeps the advance within the total', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await next();
    await next();
    await userEvent.type(await screen.findByLabelText('অগ্রিম'), '500');
    await next();
    expect(screen.getByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(screen.getByText('অগ্রিম মোট দামের বেশি হতে পারে না')).toBeTruthy();
  });

  it('does not let an unreadable price move on with the last valid one', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await next();
    await next();
    const price = await screen.findByLabelText('দাম (প্রতিটি)');
    await userEvent.type(price, '500x');
    await next();
    expect(screen.getByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
  });

  it('does not move on while the advance cannot be read', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    const before = Object.keys(store.getSnapshot().state.orders).length;
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await next();
    await next();
    await userEvent.type(await screen.findByLabelText('দাম (প্রতিটি)'), '500');
    await userEvent.type(screen.getByLabelText('অগ্রিম'), '100 tk');
    await next();

    expect(screen.getByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(screen.getByLabelText('অগ্রিম').getAttribute('aria-invalid')).toBe('true');
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);

    await userEvent.clear(screen.getByLabelText('অগ্রিম'));
    await next();
    expect(await screen.findByRole('heading', { name: 'যাচাই করুন' })).toBeTruthy();
  });

  it('caps the quantity at 999', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const quantity = within(screen.getByRole('region', { name: 'শার্ট ১' })).getByLabelText('সংখ্যা');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '1234567');
    expect((quantity as HTMLInputElement).value).toBe('৯৯৯');
  });

  it('asks before leaving a started order', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জ');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'হোম' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });
});

describe('Measuring a shirt with the keypad on a phone', () => {
  it('goes field to field without the system keyboard and on to the next step after the last', async () => {
    window.localStorage.removeItem('dk.keypad');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const shirt = screen.getByRole('region', { name: 'শার্ট ১' });
    expect(within(screen.getByRole('progressbar')).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('2');

    await userEvent.click(within(shirt).getByLabelText('ঝুল'));
    for (let i = 0; i < 8; i++) {
      await userEvent.click(screen.getByRole('button', { name: '২' }));
      await userEvent.click(screen.getByRole('button', { name: '৯' }));
      await userEvent.click(screen.getByRole('button', { name: 'অর্ধেক' }));
      await userEvent.click(screen.getByRole('button', { name: 'পরের মাপ' }));
    }
    expect(await screen.findByRole('heading', { name: 'ডিজাইন ও ছবি' })).toBeTruthy();
  }, 20_000);

  it('keeps room after Back and Next for the keypad only while it is open', async () => {
    const height = vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(240);
    try {
      await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
      await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
      await userEvent.type(screen.getByLabelText('নাম'), 'জসিম উদ্দিন');
      await userEvent.type(screen.getByLabelText('ফোন'), '01799887766');
      await next();
      await screen.findByRole('heading', { name: 'পোশাক ও মাপ' });
      await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'শার্ট');
      await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));

      expect(screen.queryByTestId('keypad-space')).toBeNull();
      await userEvent.click(screen.getByLabelText('বুক'));
      const space = screen.getByTestId('keypad-space');
      expect(space.style.height).toBe('240px');
      // The space comes after the Back/Next buttons, at the very end of the step.
      const nextButton = screen.getByRole('button', { name: 'পরের ধাপ' });
      expect(nextButton.compareDocumentPosition(space) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

      await userEvent.click(screen.getByRole('button', { name: 'বন্ধ করুন' }));
      expect(screen.queryByTestId('keypad-space')).toBeNull();
    } finally {
      height.mockRestore();
    }
  });
});
