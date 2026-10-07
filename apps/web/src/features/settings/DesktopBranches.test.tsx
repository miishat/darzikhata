import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Desktop branches', () => {
  it('adds a branch beside the list, after which the branch switcher appears', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    expect(screen.queryByLabelText('শাখা')).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন শাখা' }));
    expect(await screen.findByRole('heading', { name: 'নতুন শাখা', level: 2 })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('নাম (বাংলা)'), 'কারখানা');
    await userEvent.type(screen.getByLabelText('নাম (ইংরেজি)'), 'Workshop');
    await userEvent.click(screen.getByRole('radio', { name: 'কারখানা' }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    const list = screen.getByRole('list', { name: 'শাখার তালিকা' });
    expect(within(list).getAllByRole('button')).toHaveLength(2);
    expect(within(list).getByRole('button', { current: true }).textContent).toContain('কারখানা');
    expect(store.getSnapshot().config!.branches.at(-1)).toMatchObject({ id: 'workshop', name: { bn: 'কারখানা', en: 'Workshop' }, kind: 'workshop' });
    await userEvent.click(await screen.findByRole('button', { name: /সব শাখা/ }));
    expect(await screen.findByLabelText('শাখা')).toBeTruthy();
  });

  it('moves a device to another branch at once', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/branches' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা: দোকানের কম্পিউটার'), 'কারখানা');
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().config!.devices[0]!.branchId).toBe('workshop');
    // It has left the chosen branch's list; the other branch now has it.
    expect(screen.queryByLabelText('শাখা: দোকানের কম্পিউটার')).toBeNull();
    await userEvent.click(within(screen.getByRole('list', { name: 'শাখার তালিকা' })).getByRole('button', { name: /কারখানা/ }));
    expect(await screen.findByLabelText('শাখা: দোকানের কম্পিউটার')).toBeTruthy();
  });

  it('renames a branch and shows who works there', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/branches' });
    const config = store.getSnapshot().config!;
    const branch = config.branches[0]!;
    const people = within((await screen.findByRole('heading', { name: 'যাঁরা এখানে কাজ করেন' })).closest('section')!);
    for (const s of config.staff.filter((x) => x.active && (x.branchIds === 'all' || x.branchIds.includes(branch.id))))
      expect(people.getByText(s.name)).toBeTruthy();
    const name = screen.getByLabelText('নাম (ইংরেজি)');
    await userEvent.clear(name);
    await userEvent.type(name, 'Main Shop');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByText('সেভ হয়েছে');
    expect(store.getSnapshot().config!.branches[0]).toMatchObject({ id: branch.id, name: { bn: branch.name.bn, en: 'Main Shop' } });
  });

  it('needs a name for a branch', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    const before = store.getSnapshot().config;
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন শাখা' }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(screen.getByText('শাখার নাম লিখুন')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });
});
