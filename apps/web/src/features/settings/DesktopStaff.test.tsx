import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

async function trySignIn(store: ShopStore, staffId: string, pin: string): Promise<boolean> {
  let ok = false;
  await act(async () => {
    await store.signOut();
    ok = await store.signIn(staffId, pin);
  });
  return ok;
}

describe('Desktop staff table', () => {
  it('adds a person in the side panel, who can then sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন স্টাফ' }));
    const panel = await screen.findByRole('dialog', { name: 'নতুন স্টাফ' });
    await userEvent.type(within(panel).getByLabelText('নাম'), 'নতুন দর্জি');
    await userEvent.click(within(panel).getByRole('radio', { name: /^দর্জি/ }));
    await userEvent.type(within(panel).getByLabelText('পিন'), '৬৬৬৬');
    await userEvent.click(within(panel).getByRole('button', { name: 'সব শাখা' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'কারখানা' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    expect(within(table).getByRole('rowheader', { name: 'নতুন দর্জি' }).closest('tr')!.textContent).toContain('কারখানা');
    const added = store.getSnapshot().config!.staff.find((s) => s.name === 'নতুন দর্জি')!;
    expect(added).toMatchObject({ roleId: 'tailor', pin: '6666', branchIds: ['workshop'], active: true });
    expect(await trySignIn(store, added.id, '6666')).toBe(true);
  });

  it('deactivates a person from the table at once, so they can no longer sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('switch', { name: 'সেলিম শেখ: সক্রিয়' }));
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'সেলিম শেখ: সক্রিয়' }).getAttribute('aria-checked')).toBe('false');
    expect(store.getSnapshot().config!.staff.find((s) => s.id === 'uniform-tailor-2')!.active).toBe(false);
    expect(await trySignIn(store, 'uniform-tailor-2', '5555')).toBe(false);
  });

  it('changes a role from the table, but not your own', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.selectOptions(await screen.findByLabelText('সেলিম শেখ: দায়িত্ব'), 'ম্যানেজার');
    await screen.findByText('সেভ হয়েছে');
    expect(store.getSnapshot().config!.staff.find((s) => s.id === 'uniform-tailor-2')!.roleId).toBe('manager');

    const before = store.getSnapshot().config;
    await userEvent.selectOptions(screen.getByLabelText('কামাল হোসেন: দায়িত্ব'), 'ম্যানেজার');
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'নিজের দায়িত্ব বদলানো বা নিজেকে নিষ্ক্রিয় করা যাবে না');
    expect(store.getSnapshot().config).toBe(before);
    expect((screen.getByLabelText('কামাল হোসেন: দায়িত্ব') as HTMLSelectElement).value).toBe(before!.staff.find((s) => s.name === 'কামাল হোসেন')!.roleId);
  });

  it('masks the PIN in the panel and never shows one in the table', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    const text = table.textContent ?? '';
    for (const person of store.getSnapshot().config!.staff) {
      expect(text).not.toContain(person.pin);
      expect(text).not.toContain(person.pin.replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]!));
    }
    await userEvent.click(screen.getByRole('button', { name: 'সেলিম শেখ: বদলান' }));
    const panel = await screen.findByRole('dialog', { name: 'সেলিম শেখ' });
    const pin = within(panel).getByLabelText('পিন') as HTMLInputElement;
    expect(pin.type).toBe('password');
    expect(pin.getAttribute('autocomplete')).toBe('off');
    expect(pin.value).not.toBe('');
  });

  it('reads in English when the app is in English', async () => {
    await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff', language: 'en' });
    const table = await screen.findByRole('table', { name: 'Staff' });
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent ?? '');
    expect(headers).toEqual(['Name', 'Role', 'Branches', 'Status', 'Edit']);
    await userEvent.click(within(table).getAllByRole('button', { name: /^Edit / })[0]!);
    const panel = await screen.findByRole('dialog');
    const labels = [...panel.querySelectorAll('legend, label, button, p')].map((e) => e.textContent ?? '');
    for (const label of labels) expect(label).not.toMatch(/[ঀ-৲৴-৿]/);
  });
});
