import { itemSummaryGroup, itemsForWorker, toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { workItems } from './workList';

const bn = (n: number) => toBanglaDigits(String(n));
const supervisor = { staffId: 'uniform-supervisor', pin: '3333' };
const region = (name: string) => screen.getByRole('region', { name });

describe('Work lists', () => {
  it('lists every unfinished garment for the owner, by worker or by stage', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/work?view=list' });
    const refs = workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });
    expect(await screen.findByText(`${bn(refs.length)}টি পোশাক`)).toBeTruthy();
    expect(within(region('কারিগর ঠিক হয়নি')).getAllByRole('row')).toHaveLength(refs.length + 1);

    await userEvent.selectOptions(screen.getByLabelText('ভাগ করুন'), 'ধাপ অনুযায়ী');
    expect(router.state.location.search).toBe('?by=stage');
    const stitching = refs.filter((r) => r.item.stageKey === 'stitching').length;
    expect(within(await screen.findByRole('region', { name: 'সেলাই' })).getAllByRole('row')).toHaveLength(stitching + 1);
  });

  it('shows a tailor only their own garments, by stage, without the worker filter', async () => {
    const { store } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/work?view=list',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    const mine = itemsForWorker(Object.values(store.getSnapshot().state.orders), 'nakshi-tailor');
    expect(await screen.findByText(`${bn(mine.length)}টি পোশাক`)).toBeTruthy();
    expect(screen.queryByLabelText('কারিগর')).toBeNull();
    expect(screen.queryByLabelText('ভাগ করুন')).toBeNull();
    expect(region('সেলাই')).toBeTruthy();
  });

  it('gives several garments to one worker after a preview, skipping ones they already have', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work?view=list', as: supervisor });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'সব বেছে নিন: রফিক মিয়া' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'সব বেছে নিন: সেলিম শেখ' }));
    expect(screen.getByText('৬টি পোশাক বাছাই করা')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('কারিগর'), 'সেলিম শেখ');
    const preview = within(dialog).getByRole('list', { name: 'যা হবে' });
    expect(within(preview).getAllByRole('listitem')).toHaveLength(6);
    expect(within(preview).getAllByText(/আগে থেকেই সেলিম শেখ/)).toHaveLength(4);
    expect(within(preview).getAllByText(/রফিক মিয়া → সেলিম শেখ/)).toHaveLength(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    const results = await within(dialog).findByRole('list', { name: 'ফলাফল' });
    expect(within(results).getAllByText('হয়েছে')).toHaveLength(2);
    expect(within(results).getAllByText('বাদ গেছে')).toHaveLength(4);
    const items = store.getSnapshot().state.orders['uniform-o27']!.items.filter((i) => itemSummaryGroup(i) === 'unfinished');
    expect(items.every((i) => i.assignedTo === 'uniform-tailor-2')).toBe(true);

    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('region', { name: 'রফিক মিয়া' })).toBeNull();
    expect(screen.queryByText('৬টি পোশাক বাছাই করা')).toBeNull();
  });

  it('moves garments forward together, with a result for each', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work?view=list&by=stage', as: supervisor });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'সব বেছে নিন: কাটিং' }));
    await userEvent.click(screen.getByRole('button', { name: 'ধাপ বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'ধাপ বদলান' });
    const targets = within(within(dialog).getByLabelText('নতুন ধাপ')).getAllByRole('option');
    expect(targets.map((o) => o.textContent)).toEqual(['সেলাই']);
    expect(within(within(dialog).getByRole('list', { name: 'যা হবে' })).getAllByText(/কাটিং → সেলাই/)).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    expect(within(await within(dialog).findByRole('list', { name: 'ফলাফল' })).getAllByText('হয়েছে')).toHaveLength(6);
    expect(store.getSnapshot().state.orders['uniform-o27']!.items.filter((i) => i.stageKey === 'stitching')).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(within(region('সেলাই')).getAllByRole('row')).toHaveLength(7);
  });

  it('reports a garment someone changed after the preview opened, and keeps their change', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work?view=list', as: supervisor });
    const order = store.getSnapshot().state.orders['uniform-o27']!;
    const item = order.items.find((i) => i.assignedTo === 'uniform-tailor-1' && itemSummaryGroup(i) === 'unfinished')!;
    const title = `${order.number} ${item.garmentName.bn} ${bn(order.items.indexOf(item) + 1)}`;
    await userEvent.click(await screen.findByRole('checkbox', { name: `${title} বেছে নিন` }));
    await userEvent.click(screen.getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('কারিগর'), 'সেলিম শেখ');

    await act(() =>
      store.dispatch({ type: 'item.assigned', orderId: order.id, itemId: item.id, baseVersion: item.version, assigneeId: 'uniform-owner' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    const results = await within(dialog).findByRole('list', { name: 'ফলাফল' });
    expect(within(results).getByText('এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।')).toBeTruthy();
    const after = store.getSnapshot().state.orders[order.id]!.items.find((i) => i.id === item.id)!;
    expect(after.assignedTo).toBe('uniform-owner');
  });
});
