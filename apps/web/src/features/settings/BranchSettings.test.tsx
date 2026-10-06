import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Branch settings', () => {
  it('adds a branch, after which the branch switcher appears', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    const add = await screen.findByRole('button', { name: 'নতুন শাখা' });
    expect(screen.queryByLabelText('শাখা')).toBeNull();
    await userEvent.click(add);
    const dialog = await screen.findByRole('dialog', { name: 'নতুন শাখা' });
    await userEvent.type(within(dialog).getByLabelText('নাম (বাংলা)'), 'কারখানা');
    await userEvent.type(within(dialog).getByLabelText('নাম (ইংরেজি)'), 'Workshop');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'কারখানা' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const list = await screen.findByRole('list', { name: 'শাখার তালিকা' });
    expect(within(list).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toHaveLength(2);
    expect(store.getSnapshot().config!.branches.at(-1)).toMatchObject({
      id: 'workshop',
      name: { bn: 'কারখানা', en: 'Workshop' },
      kind: 'workshop',
    });
    await userEvent.click(await screen.findByRole('button', { name: /সব শাখা/ }));
    expect(await screen.findByLabelText('শাখা')).toBeTruthy();
  });

  it('moves a device to another branch at once', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/branches' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা: দোকানের কম্পিউটার'), 'কারখানা');
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().config!.devices[0]!.branchId).toBe('workshop');
  });

  it('needs a name for a branch', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    const before = store.getSnapshot().config;
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন শাখা' }));
    const dialog = await screen.findByRole('dialog', { name: 'নতুন শাখা' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('শাখার নাম লিখুন')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });
});
