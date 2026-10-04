import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const supervisor = { staffId: 'uniform-supervisor', pin: '3333' };

describe('Work board', () => {
  it('opens on the board with one column per stage and counts in the title area', async () => {
    await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    const board = await screen.findByRole('region', { name: 'কাজের বোর্ড' });
    expect(within(board).getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual([
      'বুকড, ০টি পোশাক',
      'কাটিং, ৬টি পোশাক',
      'সেলাই, ০টি পোশাক',
      'রেডি, ০টি পোশাক',
    ]);
    expect(screen.getByText('৬টি চলছে')).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'বোর্ড', selected: true })).toBeTruthy();
    expect(screen.getByRole('tabpanel')).toBeTruthy();
  });

  it('keeps the board or list choice in the address', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    await userEvent.click(await screen.findByRole('tab', { name: 'তালিকা' }));
    expect(router.state.location.search).toBe('?view=list');
    expect(await screen.findByRole('region', { name: 'রফিক মিয়া' })).toBeTruthy();
    await userEvent.click(screen.getByRole('tab', { name: 'বোর্ড' }));
    expect(router.state.location.search).toBe('');
    expect(screen.queryByRole('region', { name: 'রফিক মিয়া' })).toBeNull();
  });

  it('filters by worker chips with counts, keeping the choice in the address', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    const group = await screen.findByRole('group', { name: 'কারিগর অনুযায়ী দেখুন' });
    expect(within(group).getByRole('button', { name: 'কারিগর ঠিক হয়নি ০' })).toBeTruthy();
    const chip = within(group).getByRole('button', { name: 'সেলিম শেখ ৪' });
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    await userEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(router.state.location.search).toBe('?worker=uniform-tailor-2');
    const board = screen.getByRole('region', { name: 'কাজের বোর্ড' });
    expect(within(board).getAllByRole('checkbox')).toHaveLength(4);
  });

  it('shows ten cards in a column, then a button for the rest', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/work' });
    const board = await screen.findByRole('region', { name: 'কাজের বোর্ড' });
    const column = within(board).getByRole('region', { name: 'সেলাই, ১৬টি পোশাক' });
    expect(within(column).getAllByRole('listitem')).toHaveLength(10);
    await userEvent.click(within(column).getByRole('button', { name: '+৬টি আরও' }));
    expect(within(column).getAllByRole('listitem')).toHaveLength(16);
    await userEvent.click(within(column).getByRole('button', { name: 'কম দেখান' }));
    expect(within(column).getAllByRole('listitem')).toHaveLength(10);
  });

  it('assigns three garments to a worker from the board with a preview and a confirmation', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    const assignments = () =>
      Object.values(store.getSnapshot().state.orders)
        .flatMap((o) => o.items)
        .map((i) => i.assignedTo)
        .join(',');
    const before = assignments();
    const board = await screen.findByRole('region', { name: 'কাজের বোর্ড' });
    const boxes = within(board).getAllByRole('checkbox');
    for (const box of boxes.slice(0, 3)) await userEvent.click(box);
    expect(screen.getByText('৩টি পোশাক বাছাই করা')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('কারিগর'), 'সেলিম শেখ');
    const preview = within(within(dialog).getByRole('list', { name: 'যা হবে' })).getAllByRole('listitem');
    expect(preview).toHaveLength(3);
    const changing = preview.filter((li) => !li.textContent?.includes('আগে থেকেই')).length;
    expect(changing).toBeGreaterThan(0);
    // nothing is saved until the person confirms
    expect(assignments()).toBe(before);
    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    await within(dialog).findByRole('list', { name: 'ফলাফল' });
    expect(assignments()).not.toBe(before);
    expect(assignments().split('uniform-tailor-2').length - before.split('uniform-tailor-2').length).toBe(changing);
    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByText('৩টি পোশাক বাছাই করা')).toBeNull();
  });

  it('offers no bulk action on a bare keystroke', async () => {
    await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    const board = await screen.findByRole('region', { name: 'কাজের বোর্ড' });
    await userEvent.click(within(board).getAllByRole('checkbox')[0]!);
    await userEvent.keyboard('a{Enter}');
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
