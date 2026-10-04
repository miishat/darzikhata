import { moneySummary, profileKey } from '@darzikhata/domain';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { I18nProvider } from '../../i18n/I18nProvider';
import { ShellProvider } from '../../shell/ShellPreference';
import { useOrderEntry, type SaveResult } from './useOrderEntry';

let count = 0;
const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function setup(path = '/app/orders/new', who: { shop?: 'rahman' | 'nakshi'; as?: { staffId: string; pin: string }; layout?: 'mobile' | 'desktop' } = {}) {
  window.localStorage.setItem('dk.layout', who.layout ?? 'desktop');
  const db = new DarziDb(`entry-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo(who.shop ?? 'rahman');
  if (who.as) {
    await store.signOut();
    await store.signIn(who.as.staffId, who.as.pin);
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>
      <I18nProvider>
        <ShellProvider>
          <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
        </ShellProvider>
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

  it('creates exactly one order when save is called twice before a re-render', async () => {
    const { store, result } = await setup();
    act(() => result.current.setCustomer({ kind: 'new', name: 'জসিম উদ্দিন', nameAlt: '', phone: '', gender: 'male' }));
    act(() => result.current.addItem('shirt'));
    const key = result.current.draft.items[0]!.key;
    act(() => result.current.updateItem(key, { measurements: { kind: 'new', values: shirtValues, source: 'body', notes: '' } }));
    expect(result.current.errors).toEqual({});
    const ordersBefore = Object.keys(store.getSnapshot().state.orders).length;
    const dispatch = vi.spyOn(store, 'dispatchBatch');

    let results: SaveResult[] = [];
    await act(async () => {
      const save = result.current.save;
      results = await Promise.all([save(), save()]);
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(Object.keys(store.getSnapshot().state.orders).length).toBe(ordersBefore + 1);
  });
});

describe('draft autosave', () => {
  const KEY = 'dk.draft.rahman.main.rahman-owner';
  const stored = () => window.localStorage.getItem(KEY);
  const typeSomething = (r: { current: ReturnType<typeof useOrderEntry> }) => {
    act(() => r.current.setCustomer({ kind: 'new', name: 'জসিম', nameAlt: '', phone: '', gender: 'male' }));
    act(() => r.current.addItem('shirt'));
    act(() => r.current.update({ advance: { amount: 50000, method: 'cash', reference: '' } }));
  };

  it('writes after a pause, brings the draft back, and clears on save', async () => {
    const first = await setup();
    expect(first.result.current.restored).toBe(false);
    typeSomething(first.result);
    expect(stored()).toBeNull();
    await waitFor(() => expect(stored()).not.toBeNull(), { timeout: 2000 });
    first.unmount();

    const second = await setup();
    expect(second.result.current.restored).toBe(true);
    expect(second.result.current.draft.customer).toMatchObject({ kind: 'new', name: 'জসিম' });
    expect(second.result.current.draft.items).toHaveLength(1);
    expect(second.result.current.draft.advance.amount).toBe(50000);
    expect(second.result.current.dirty).toBe(true);

    const key = second.result.current.draft.items[0]!.key;
    act(() => second.result.current.updateItem(key, { measurements: { kind: 'new', values: shirtValues, source: 'body', notes: '' } }));
    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await second.result.current.save();
    });
    expect(saved?.ok).toBe(true);
    expect(stored()).toBeNull();
    second.unmount();
    expect(stored()).toBeNull();
  });

  it('keeps a change made just before leaving', async () => {
    const { result, unmount } = await setup();
    typeSomething(result);
    unmount();
    expect(stored()).not.toBeNull();
  });

  it('writes at once when the page is hidden or closed, without waiting for the pause', async () => {
    const first = await setup();
    typeSomething(first.result);
    expect(stored()).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    expect(stored()).not.toBeNull();
    window.localStorage.removeItem(KEY);
    act(() => first.result.current.update({ notes: 'আরও' }));
    expect(stored()).toBeNull();
    const hidden = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    hidden.mockRestore();
    expect(stored()).toContain('আরও');
  });

  it('never records the advance: restoring only refills the field', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const second = await setup();
    const { state } = second.store.getSnapshot();
    expect(Object.values(state.orders).some((o) => o.number === 'A-0041')).toBe(false);
    expect(second.result.current.draft.advance.amount).toBe(50000);
  });

  it('keeps drafts apart by user and does not hand one to another', async () => {
    const owner = await setup('/app/orders/new', { shop: 'nakshi' });
    act(() => owner.result.current.setCustomer({ kind: 'new', name: 'রিনা', nameAlt: '', phone: '', gender: 'female' }));
    await waitFor(() => expect(window.localStorage.getItem('dk.draft.nakshi.main.nakshi-owner')).not.toBeNull(), { timeout: 2000 });
    owner.unmount();

    const counter = await setup('/app/orders/new', { shop: 'nakshi', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect(counter.result.current.restored).toBe(false);
    expect(counter.result.current.draft.customer).toBeNull();
  });

  it('ignores a corrupt stored draft', async () => {
    window.localStorage.setItem(KEY, '{broken');
    const { result } = await setup();
    expect(result.current.restored).toBe(false);
    expect(result.current.draft.items).toEqual([]);
    typeSomething(result);
    await waitFor(() => expect(JSON.parse(stored()!).v).toBe(1), { timeout: 2000 });
  });

  it('discard clears storage and starts empty', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const { result } = await setup();
    expect(result.current.restored).toBe(true);
    act(() => result.current.discard());
    expect(stored()).toBeNull();
    expect(result.current.restored).toBe(false);
    expect(result.current.draft.items).toEqual([]);
    expect(result.current.dirty).toBe(false);
    await new Promise((r) => setTimeout(r, 700));
    expect(stored()).toBeNull();
  });

  it('does not restore over a repeat order or a chosen customer', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const { result } = await setup('/app/orders/new?customer=rahman-c1');
    expect(result.current.restored).toBe(false);
    expect(result.current.draft.items).toEqual([]);
  });

  it('keeps no measurement values for someone who may not see women’s measurements', async () => {
    const { result, unmount } = await setup('/app/orders/new', { shop: 'nakshi', as: { staffId: 'nakshi-counter', pin: '2222' } });
    act(() => result.current.setCustomer({ kind: 'new', name: 'রিনা', nameAlt: '', phone: '', gender: 'female' }));
    act(() => result.current.addItem('alteration'));
    act(() => result.current.addItem('blouse'));
    const blouse = result.current.draft.items.find((i) => i.templateId === 'blouse')!;
    act(() => result.current.updateItem(blouse.key, { measurements: { kind: 'new', values: { chest: 34 }, source: 'body', notes: 'গোপন' } }));
    unmount();
    const raw = window.localStorage.getItem('dk.draft.nakshi.main.nakshi-counter') ?? '';
    expect(raw).not.toBe('');
    expect(raw).not.toContain('গোপন');
    expect(raw).not.toContain('"chest"');
    expect(raw).not.toMatch(/"values":{[^}]/);
  });

  const COUNTER_KEY = 'dk.draft.nakshi.main.nakshi-counter';
  const restricted = {
    v: 1,
    draft: {
      customer: { kind: 'new', name: 'রিনা', nameAlt: '', phone: '', gender: 'female' },
      items: [
        {
          key: 'k1', templateId: 'blouse', quantity: 1, price: 20000, wearer: '',
          measurements: { kind: 'new', values: { chest: 36 }, source: 'body', notes: 'গোপন' },
          designNotes: '', fabricNote: '', photoIds: [], trialDate: '', deliveryDate: '2099-01-01',
        },
      ],
      discount: { amount: null, reason: '' },
      advance: { amount: null, method: 'cash', reference: '' },
      notes: '',
    },
  };

  it('rewrites a stored draft without restricted values as soon as it is restored, with no edit', async () => {
    window.localStorage.setItem(COUNTER_KEY, JSON.stringify(restricted));
    const { result } = await setup('/app/orders/new', { shop: 'nakshi', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect(result.current.restored).toBe(true);
    const raw = window.localStorage.getItem(COUNTER_KEY) ?? '';
    expect(raw).not.toContain('গোপন');
    expect(raw).not.toContain('"chest"');
  });

  it('does not write the old draft back when it is discarded and the screen is left', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const { result, unmount } = await setup();
    act(() => result.current.update({ notes: 'আরও' }));
    act(() => {
      result.current.discard();
      unmount();
    });
    expect(stored()).toBeNull();
  });

  it('leaves an earlier plain draft alone when a customer order is started, changed and reverted', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const before = stored();
    expect(before).not.toBeNull();

    const other = await setup('/app/orders/new?customer=rahman-c1');
    act(() => other.result.current.addItem('shirt'));
    await new Promise((r) => setTimeout(r, 700));
    expect(stored()).toBe(before);
    act(() => other.result.current.removeItem(other.result.current.draft.items[0]!.key));
    await new Promise((r) => setTimeout(r, 700));
    expect(stored()).toBe(before);
    act(() => other.result.current.discard());
    other.unmount();
    expect(stored()).toBe(before);
  });

  it('reports that a plain start keeps a draft and a customer or repeat start does not', async () => {
    expect((await setup()).result.current.persists).toBe(true);
    expect((await setup('/app/orders/new?customer=rahman-c1')).result.current.persists).toBe(false);
    expect((await setup('/app/orders/new?repeat=rahman-o40')).result.current.persists).toBe(false);
  });

  it('leaves an earlier plain draft alone when a repeat order is started and changed', async () => {
    const first = await setup();
    typeSomething(first.result);
    first.unmount();
    const before = stored();
    expect(before).not.toBeNull();

    const other = await setup('/app/orders/new?repeat=rahman-o40');
    act(() => other.result.current.addItem('shirt'));
    await new Promise((r) => setTimeout(r, 700));
    expect(stored()).toBe(before);
    act(() => other.result.current.discard());
    other.unmount();
    expect(stored()).toBe(before);
  });

  it('drops the worker from a draft restored on a phone, and saves none, since the phone has no worker field', async () => {
    const KEY = 'dk.draft.rahman.main.rahman-owner';
    const desktop = await setup();
    act(() => desktop.result.current.setCustomer({ kind: 'new', name: 'জসিম', nameAlt: '', phone: '', gender: 'male' }));
    act(() => desktop.result.current.addItem('shirt'));
    const key = desktop.result.current.draft.items[0]!.key;
    act(() => desktop.result.current.updateItem(key, { assignedTo: desktop.result.current.workers[0]!.id }));
    desktop.unmount();
    expect(window.localStorage.getItem(KEY)).toContain('assignedTo');

    const phone = await setup('/app/orders/new', { layout: 'mobile' });
    expect(phone.result.current.restored).toBe(true);
    expect(phone.result.current.draft.items[0]!.assignedTo ?? null).toBeNull();
    act(() => phone.result.current.updateItem(key, { price: 1000 }));
    const key2 = phone.result.current.draft.items[0]!.key;
    act(() => phone.result.current.updateItem(key2, { measurements: { kind: 'new', values: shirtValues, source: 'body', notes: '' } }));
    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await phone.result.current.save();
    });
    if (!saved?.ok) throw new Error(JSON.stringify([saved, phone.result.current.errors]));
    expect(phone.store.getSnapshot().state.orders[saved.orderId]!.items.map((i) => i.assignedTo ?? null)).toEqual([null]);
  });

  it('sends no worker when the person may not assign, even if the draft carries one', async () => {
    window.localStorage.setItem(
      COUNTER_KEY,
      JSON.stringify({ ...restricted, draft: { ...restricted.draft, items: [{ ...restricted.draft.items[0], templateId: 'alteration', measurements: { kind: 'none' }, assignedTo: 'nakshi-worker' }] } }),
    );
    const { store, result } = await setup('/app/orders/new', { shop: 'nakshi', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect(result.current.canAssign).toBe(false);
    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    if (!saved?.ok) throw new Error(JSON.stringify([saved, result.current.errors]));
    expect(store.getSnapshot().state.orders[saved.orderId]!.items.map((i) => i.assignedTo ?? null)).toEqual([null]);
  });
});
