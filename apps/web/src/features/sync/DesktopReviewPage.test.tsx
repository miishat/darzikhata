import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

// Every sample shop starts with one waiting change. In Rahman Tailors it is about সুমন দাস
// (rahman-c4): this device changed his phone and notes while another device changed his notes.
const detail = () => screen.findByRole('region', { name: 'কাস্টমার: সুমন দাস' });
const open = () => renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/review' });

describe('Review queue on a desktop', () => {
  it('lists the changes and shows the chosen one field by field, current value before the waiting one', async () => {
    await open();
    const list = await screen.findByRole('region', { name: 'যাচাইয়ের তালিকা' });
    expect(within(list).getByText('১টি বাকি')).toBeTruthy();
    const row = within(list).getByRole('button', { name: /সুমন দাস/ });
    expect(row.getAttribute('aria-current')).toBe('true');
    expect(within(row).getByText('২টি ঘরে অমিল')).toBeTruthy();

    const section = await detail();
    expect(section.getAttribute('data-tour')).toBe('review-item');
    expect(within(section).getByRole('link', { name: 'প্রোফাইল দেখুন' }).getAttribute('href')).toBe('/app/customers/rahman-c4');
    const phone = within(section).getByRole('row', { name: /^ফোন/ });
    expect(within(phone).getAllByRole('cell').map((c) => c.textContent)).toEqual(expect.arrayContaining(['01347594519', '01712345678']));
    expect(within(section).getByRole('button', { name: 'বাছাই করা মান সেভ করুন' })).toHaveProperty('disabled', true);
  });

  it('saves only the fields ticked to take the new value', async () => {
    const { store } = await open();
    const section = await detail();
    await userEvent.click(within(section).getByRole('checkbox', { name: 'নতুনটা নিন: ফোন' }));
    await userEvent.click(within(section).getByRole('button', { name: 'বাছাই করা মান সেভ করুন' }));

    const status = await screen.findByRole('status');
    expect(status.textContent).toBe('সমাধান হয়েছে');
    await waitFor(() => expect(document.activeElement).toBe(status));
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'কলার একটু ঢিলা পছন্দ করেন' });
    expect(screen.getByText('যাচাই করার মতো কিছু নেই')).toBeTruthy();
  });

  it('uses the whole waiting change', async () => {
    const { store } = await open();
    await userEvent.click(within(await detail()).getByRole('button', { name: 'অপেক্ষমাণ পরিবর্তন রাখুন' }));
    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' });
  });

  it('needs the connection to settle anything', async () => {
    const { store } = await open();
    const section = await detail();
    await act(() => store.setOnline(false));
    expect(await screen.findByText('সমাধান করতে অনলাইনে যান।')).toBeTruthy();
    for (const button of within(section).getAllByRole('button')) expect(button).toHaveProperty('disabled', true);
    for (const box of within(section).getAllByRole('checkbox')) expect(box).toHaveProperty('disabled', true);
  });
});
