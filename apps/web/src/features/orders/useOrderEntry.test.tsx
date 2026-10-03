import { moneySummary, profileKey } from '@darzikhata/domain';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { I18nProvider } from '../../i18n/I18nProvider';
import { useOrderEntry, type SaveResult } from './useOrderEntry';

let count = 0;
const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function setup(path = '/app/orders/new') {
  const db = new DarziDb(`entry-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo('rahman');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </I18nProvider>
    </StoreProvider>
  );
  return { store, ...renderHook(() => useOrderEntry(), { wrapper }) };
}

const shirtValues = { length: 29, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15.5 };

describe('useOrderEntry', () => {
  it('saves the spec example in one batch: 2 shirts and a panjabi, ৳2,400, ৳1,000 paid', async () => {
    const { store, result } = await setup();
    const eventsBefore = Object.keys(store.getSnapshot().state.appliedEventIds).length;
    act(() => result.current.setCustomer({ kind: 'new', name: 'জসিম উদ্দিন', nameAlt: '', phone: '', gender: 'male' }));
    act(() => result.current.addItem('shirt'));
    act(() => result.current.addItem('panjabi'));
    const [shirt, panjabi] = result.current.draft.items;
    act(() =>
      result.current.updateItem(shirt!.key, { quantity: 2, measurements: { kind: 'new', values: shirtValues, source: 'body', notes: '' } }),
    );
    act(() =>
      result.current.updateItem(panjabi!.key, {
        measurements: { kind: 'new', values: { ...shirtValues, length: 42 }, source: 'body', notes: '' },
      }),
    );
    act(() => result.current.update({ advance: { amount: 100000, method: 'cash', reference: '' } }));
    expect(result.current.totals).toMatchObject({ garments: 3, total: 240000, balance: 140000 });
    expect(result.current.errors).toEqual({});

    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await result.current.save();
    });

    if (!saved?.ok) throw new Error('expected the order to save');
    const { state } = store.getSnapshot();
    const order = state.orders[saved.orderId]!;
    expect(order).toMatchObject({ number: 'A-0041', branchId: 'main' });
    expect(order.items).toHaveLength(3);
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
    expect(state.customers[order.customerId]!.name).toBe('জসিম উদ্দিন');
    // customer, 2 measurement versions, order, advance
    expect(Object.keys(state.appliedEventIds).length).toBe(eventsBefore + 5);
  });

  it('saves nothing while there are problems, and marks the attempt', async () => {
    const { store, result } = await setup();
    const before = store.getSnapshot().state;
    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toEqual({ ok: false, problem: null });
    expect(result.current.attempted).toBe(true);
    expect(result.current.errors).toEqual({ customer: 'required', items: 'required' });
    expect(store.getSnapshot().state).toBe(before);
  });

  it('switches to saved measurements when an existing customer is chosen', async () => {
    const { store, result } = await setup();
    const customerId = Object.values(store.getSnapshot().state.profiles).find((p) => p.templateId === 'shirt')!.customerId;
    act(() => result.current.addItem('shirt'));
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });

    act(() => result.current.setCustomer({ kind: 'existing', customerId }));
    const latest = store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions.at(-1)!;
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'saved', versionId: latest.id, confirmed: false });
  });

  it('keeps measurements already typed when the customer changes', async () => {
    const { store, result } = await setup();
    const customerId = Object.values(store.getSnapshot().state.profiles).find((p) => p.templateId === 'shirt')!.customerId;
    act(() => result.current.addItem('shirt'));
    const key = result.current.draft.items[0]!.key;
    act(() => result.current.updateItem(key, { measurements: { kind: 'new', values: { chest: 40 }, source: 'body', notes: '' } }));
    act(() => result.current.setCustomer({ kind: 'existing', customerId }));
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'new', values: { chest: 40 }, source: 'body', notes: '' });
  });

  it('starts a repeat order from ?repeat= without counting it as a change', async () => {
    const { store, result } = await setup('/app/orders/new?repeat=rahman-o40');
    const order = store.getSnapshot().state.orders['rahman-o40']!;
    expect(result.current.draft.customer).toEqual({ kind: 'existing', customerId: order.customerId });
    expect(result.current.draft.items.map((i) => i.templateId)).toEqual(
      order.items.filter((i) => !i.cancelled).map((i) => i.templateId),
    );
    expect(result.current.dirty).toBe(false);
  });

  it('starts with a customer from ?customer= and becomes dirty once something changes', async () => {
    const { result } = await setup('/app/orders/new?customer=rahman-c1');
    expect(result.current.draft.customer).toEqual({ kind: 'existing', customerId: 'rahman-c1' });
    expect(result.current.dirty).toBe(false);
    act(() => result.current.addItem('pant'));
    expect(result.current.dirty).toBe(true);
  });
});
