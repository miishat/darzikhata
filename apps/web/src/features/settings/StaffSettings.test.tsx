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

describe('Staff settings', () => {
  it('adds a person who can then sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন স্টাফ' }));
    const dialog = await screen.findByRole('dialog', { name: 'নতুন স্টাফ' });
    await userEvent.type(within(dialog).getByLabelText('নাম'), 'নতুন দর্জি');
    await userEvent.selectOptions(within(dialog).getByLabelText('দায়িত্ব'), 'দর্জি');
    await userEvent.type(within(dialog).getByLabelText('পিন'), '৬৬৬৬');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'সব শাখা' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'কারখানা' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    expect(within(table).getByRole('row', { name: /নতুন দর্জি/ }).textContent).toContain('কারখানা');
    const added = store.getSnapshot().config!.staff.find((s) => s.name === 'নতুন দর্জি')!;
    expect(added).toMatchObject({ roleId: 'tailor', pin: '6666', branchIds: ['workshop'], active: true });
    expect(await trySignIn(store, added.id, '6666')).toBe(true);
  });

  it('deactivates a person so they can no longer sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('button', { name: 'সেলিম শেখ: বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'সেলিম শেখ' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'সক্রিয়' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    expect(within(table).getByRole('row', { name: /সেলিম শেখ/ }).textContent).toContain('নিষ্ক্রিয়');
    expect(store.getSnapshot().config!.staff.find((s) => s.id === 'uniform-tailor-2')!.active).toBe(false);
    expect(await trySignIn(store, 'uniform-tailor-2', '5555')).toBe(false);
  });

  it('stops you changing your own role', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    const before = store.getSnapshot().config;
    await userEvent.click(await screen.findByRole('button', { name: 'কামাল হোসেন: বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'কামাল হোসেন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('দায়িত্ব'), 'ম্যানেজার');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(await within(dialog).findByText('নিজের দায়িত্ব বদলানো বা নিজেকে নিষ্ক্রিয় করা যাবে না')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });
});
