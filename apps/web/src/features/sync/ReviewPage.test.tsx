import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

// Every sample shop starts with one waiting change. In Rahman Tailors it is about সুমন দাস
// (rahman-c4): this device changed his phone and notes while another device changed his notes.
const entry = () => screen.findByRole('region', { name: 'কাস্টমার: সুমন দাস' });

describe('Review queue on a phone', () => {
  it('shows the waiting change field by field, beside what the record holds now', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    expect(await screen.findByRole('heading', { name: 'যাচাইয়ের তালিকা' })).toBeTruthy();
    const section = await entry();
    expect(section.getAttribute('data-tour')).toBe('review-item');
    expect(within(section).getByText(/^আব্দুর রহমান, /)).toBeTruthy();

    const phone = within(section).getByRole('row', { name: /^ফোন/ });
    expect(within(phone).getByText('01347594519')).toBeTruthy();
    expect(within(phone).getByText('01712345678')).toBeTruthy();
    const notes = within(section).getByRole('row', { name: /^নোট/ });
    expect(within(notes).getByText('কলার একটু ঢিলা পছন্দ করেন')).toBeTruthy();
    expect(within(notes).getByText('বুক পকেট ছাড়া শার্ট')).toBeTruthy();
    for (const name of ['এখন যা আছে রাখুন', 'অপেক্ষমাণ পরিবর্তন রাখুন', 'মিলিয়ে নিন']) {
      expect(within(section).getByRole('button', { name })).toBeTruthy();
    }
  });

  it('keeps what the record holds now', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    const before = store.getSnapshot().state.customers['rahman-c4'];
    await userEvent.click(within(await entry()).getByRole('button', { name: 'এখন যা আছে রাখুন' }));
    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(screen.getByText('যাচাই করার মতো কিছু নেই')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c4']).toEqual(before);
    expect(screen.getByRole('button', { name: 'অনলাইন' })).toBeTruthy();
  });

  it('uses the waiting change on top of the current version', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    await userEvent.click(within(await entry()).getByRole('button', { name: 'অপেক্ষমাণ পরিবর্তন রাখুন' }));
    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' });
  });

  it('merges by hand, field by field', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    const section = await entry();
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে নিন' }));
    const phone = within(section).getByRole('group', { name: 'ফোন' });
    expect(within(phone).getByRole('radio', { name: 'এখন যা আছে: 01347594519' })).toHaveProperty('checked', true);
    await userEvent.click(within(phone).getByRole('radio', { name: 'অপেক্ষমাণ পরিবর্তন: 01712345678' }));
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে সেভ করুন' }));

    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'কলার একটু ঢিলা পছন্দ করেন' });
  });

  it('moves focus to the result message once a change is settled', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    await userEvent.click(within(await entry()).getByRole('button', { name: 'এখন যা আছে রাখুন' }));
    const status = await screen.findByRole('status');
    // The message can be found as soon as it renders; the focus moves in an effect just after.
    await waitFor(() => expect(document.activeElement).toBe(status));
  });

  it('starts from the current choices again after cancelling a merge', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    const section = await entry();
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে নিন' }));
    await userEvent.click(within(section).getByRole('radio', { name: 'অপেক্ষমাণ পরিবর্তন: 01712345678' }));
    await userEvent.click(within(section).getByRole('button', { name: 'বাতিল' }));
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে নিন' }));
    expect(within(section).getByRole('radio', { name: 'এখন যা আছে: 01347594519' })).toHaveProperty('checked', true);
  });

  it('needs the connection to settle anything', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    const section = await entry();
    await act(() => store.setOnline(false));
    expect(await screen.findByText('সমাধান করতে অনলাইনে যান।')).toBeTruthy();
    for (const button of within(section).getAllByRole('button')) expect(button).toHaveProperty('disabled', true);
  });

  it('is closed to people who cannot settle any change', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/review', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});
