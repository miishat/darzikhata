import { moneySummary, replay } from '@darzikhata/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from './db';
import { ShopStore } from './store';

let dbCount = 0;
const dbs: DarziDb[] = [];

function freshStore(name = `test-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

/** Makes saving an event finish slowly so a second action can land while it is in flight. */
function slowAdd(db: DarziDb) {
  const add = db.events.add.bind(db.events);
  db.events.add = (async (...args: Parameters<typeof add>) => {
    const result = await add(...args);
    await new Promise((r) => setTimeout(r, 40));
    return result;
  }) as typeof db.events.add;
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const advance = (id: string, amount: number) =>
  ({
    type: 'payment.recorded',
    orderId: 'rahman-o40',
    payment: { id, amount, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
  }) as const;

describe('ShopStore', () => {
  it('starts empty when nothing is saved', async () => {
    const { store } = freshStore();
    expect(store.getSnapshot().status).toBe('loading');
    await store.load();
    expect(store.getSnapshot().status).toBe('empty');
  });

  it('starts a demo shop signed in as the owner', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    const snap = store.getSnapshot();
    expect(snap.status).toBe('ready');
    expect(snap.config?.id).toBe('rahman');
    expect(snap.session).toEqual({ shopKey: 'rahman', staffId: 'rahman-owner' });
    expect(snap.deviceId).toBe('device-a');
    expect(Object.keys(snap.state.orders).length).toBeGreaterThanOrEqual(40);
  });

  it('saves applied changes so a reload sees them', async () => {
    const { store, name } = freshStore();
    await store.startDemo('rahman');
    const before = moneySummary(store.getSnapshot().state.orders['rahman-o40']!).paid;

    const outcome = await store.dispatch(advance('extra-1', 10000));
    expect(outcome.kind).toBe('applied');
    expect(moneySummary(store.getSnapshot().state.orders['rahman-o40']!).paid).toBe(before + 10000);

    const reloaded = new ShopStore({ db: new DarziDb(name) });
    await reloaded.load();
    const event = reloaded.getSnapshot().state.orders['rahman-o40']!.payments.at(-1)!;
    expect(event).toMatchObject({ id: 'extra-1', by: 'rahman-owner', at: '2026-10-03T06:00:00.000Z' });
  });

  it('does not save rejected changes', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const count = await db.events.count();
    const outcome = await store.dispatch(advance('bad', -5));
    expect(outcome).toMatchObject({ kind: 'rejected', reason: 'invalid-amount' });
    expect(await db.events.count()).toBe(count);
  });

  it('keeps the save order the same as the apply order for rapid changes', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await Promise.all([store.dispatch(advance('a', 100)), store.dispatch(advance('b', 100)), store.dispatch(advance('c', 100))]);
    const last = await db.events.orderBy('seq').reverse().limit(3).toArray();
    expect(last.map((r) => r.id).reverse()).toEqual(['new-1', 'new-2', 'new-3']);
  });

  it('refuses changes when nobody is signed in', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.signOut();
    await expect(store.dispatch(advance('x', 100))).rejects.toThrow('No one is signed in to a shop');
  });

  it('signs staff in only with the right PIN', async () => {
    const { store } = freshStore();
    await store.startDemo('nakshi');
    await store.signOut();
    expect(store.getSnapshot().session?.staffId).toBeNull();
    expect(await store.signIn('nakshi-tailor', '1111')).toBe(false);
    expect(await store.signIn('nobody', '4444')).toBe(false);
    expect(await store.signIn('nakshi-tailor', '৪৪৪৪')).toBe(true);
    expect(store.getSnapshot().session?.staffId).toBe('nakshi-tailor');
  });

  it('clears everything', async () => {
    const { store, db } = freshStore();
    await store.startDemo('uniform');
    await store.clear();
    expect(store.getSnapshot().status).toBe('empty');
    expect(await db.events.count()).toBe(0);
  });

  it('notifies subscribers on change', async () => {
    const { store } = freshStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    await store.load();
    unsubscribe();
    await store.startDemo('rahman');
    expect(calls).toBe(1);
  });

  it('Reset during an in-flight dispatch leaves memory equal to the persisted log', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    slowAdd(db);
    const pending = store.dispatch(advance('old-shop-pay', 100));
    const reset = store.startDemo('nakshi');
    await Promise.all([pending, reset]);
    const rows = await db.events.orderBy('seq').toArray();
    expect(rows.some((r) => r.id === 'new-1')).toBe(false);
    expect(store.getSnapshot().config?.id).toBe('nakshi');
    expect(store.getSnapshot().state).toEqual(replay(rows.map((r) => r.event)).state);
  });

  it('clear after an in-flight dispatch leaves an empty log and empty state', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    slowAdd(db);
    const pending = store.dispatch(advance('doomed', 100));
    const cleared = store.clear();
    await Promise.all([pending, cleared]);
    expect(await db.events.count()).toBe(0);
    expect(store.getSnapshot().status).toBe('empty');
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(0);
  });

  it('signOut right after an un-awaited dispatch lets the dispatch finish under its own session', async () => {
    // Tasks run in call order: a dispatch queued before signOut succeeds, one queued after it throws.
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const pending = store.dispatch(advance('before-out', 100));
    const out = store.signOut();
    const after = store.dispatch(advance('after-out', 100));
    await expect(pending).resolves.toMatchObject({ kind: 'applied' });
    await out;
    await expect(after).rejects.toThrow('No one is signed in to a shop');
    expect((await db.events.where('id').equals('new-1').first())?.event.staffId).toBe('rahman-owner');
    expect(await db.events.where('id').equals('new-2').count()).toBe(0);
  });
});
