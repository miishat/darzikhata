import { itemsForWorker, toBanglaDigits } from '@darzikhata/domain';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { itemTitle } from '../common/orderText';
import { nextMove } from '../orders/stageMoves';
import { phaseCounts, workItems, workPhase } from './workList';

const bn = (n: number) => toBanglaDigits(String(n));

describe('Phone work list', () => {
  it('shows a three-way switch with counts and no bulk controls', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/work' });
    const refs = workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });
    const counts = phaseCounts(refs);
    const tabs = await screen.findByRole('tablist', { name: 'ধাপ' });
    expect(within(tabs).getAllByRole('tab').map((t) => t.textContent)).toEqual([
      `শুরু হয়নি${bn(counts.start)}`,
      `চলছে${bn(counts.making)}`,
      `শেষের ধাপে${bn(counts.finish)}`,
    ]);
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByLabelText('ভাগ করুন')).toBeNull();
    expect(screen.queryByRole('button', { name: 'কারিগর ঠিক করুন' })).toBeNull();

    const shown = refs.filter((r) => workPhase(r.item) === 'making');
    expect(screen.getAllByRole('region')).toHaveLength(shown.length);

    await userEvent.click(within(tabs).getByRole('tab', { name: /^শুরু হয়নি/ }));
    expect(screen.getAllByRole('region')).toHaveLength(counts.start);
  });

  it('lets a tailor finish a garment with one tap', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    const orders = Object.values(store.getSnapshot().state.orders);
    const mine = itemsForWorker(orders, 'nakshi-tailor').filter((r) => nextMove(r.item) !== null);
    const target = mine.find((r) => workPhase(r.item) === 'making') ?? mine[0]!;
    const { order, item } = target;
    const next = nextMove(item)!;
    const stage = item.stages.find((s) => s.key === item.stageKey)!;

    await userEvent.click(await screen.findByRole('tab', { name: new RegExp(`^${{ start: 'শুরু হয়নি', making: 'চলছে', finish: 'শেষের ধাপে' }[workPhase(item)]}`) }));
    const card = await screen.findByRole('region', { name: `${order.number} ${itemTitle(order, item, 'bn')}` });
    await userEvent.click(within(card).getByRole('button', { name: `${stage.label.bn} শেষ` }));

    await waitFor(() => {
      const after = store.getSnapshot().state.orders[order.id]!.items.find((i) => i.id === item.id)!;
      expect(after.stageKey).toBe(next.stage.key);
    });
  });
});
