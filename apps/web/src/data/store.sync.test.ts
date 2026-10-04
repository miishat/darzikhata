import { replay, type EventBody } from '@darzikhata/domain';
import Dexie from 'dexie';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateShop } from '../seed/generate';
import { DarziDb } from './db';
import { ShopStore, type EditBody } from './store';

let dbCount = 0;
const dbs: Dexie[] = [];

function freshStore(name = `sync-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

function reopen(name: string) {
  const db = new DarziDb(name);
  dbs.push(db);
  return new ShopStore({ db });
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const pay = (id: string): EventBody => ({
  type: 'payment.recorded',
  orderId: 'rahman-o40',
  payment: { id, amount: 10000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
});

const editNotes = (store: ShopStore, customerId: string, notes: string): EditBody => ({
  type: 'customer.updated',
  customerId,
  baseVersion: store.getSnapshot().state.customers[customerId]!.version,
  changes: { notes },
});

const serverIds = async (db: DarziDb) => (await db.serverEvents.orderBy('seq').toArray()).map((r) => r.id);
const deviceIds = async (db: DarziDb) => (await db.events.orderBy('seq').toArray()).map((r) => r.id);

describe('Sync with the demo server', () => {
  it('starts every demo shop online, with nothing pending and the sample conflict waiting', async () => {
    for (const key of ['rahman', 'nakshi', 'uniform'] as const) {
      const { store, db } = freshStore();
      await store.startDemo(key);
      const { sync, state } = store.getSnapshot();
      expect(sync).toMatchObject({ online: true, syncing: false, pending: 0, lastSyncAt: '2026-10-03T06:00:00.000Z' });
      expect(sync.review).toHaveLength(1);
      expect(sync.review[0]).toMatchObject({ outcome: 'conflict', reason: 'stale-edit', event: { id: `${key}-conflict-mine` } });
      expect(state.customers[`${key}-c4`]!.notes).toBe('কলার একটু ঢিলা পছন্দ করেন');
      expect(await deviceIds(db)).toEqual(await serverIds(db));
    }
  });

  it('sends a change to the server straight away when online', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.dispatch(pay('p-online'));
    await store.syncNow();
    expect(store.getSnapshot().sync.pending).toBe(0);
    expect((await serverIds(db)).at(-1)).toBe('new-1');
    expect(await db.events.where('pending').equals(1).count()).toBe(0);
  });

  it('keeps changes on the device while offline, remembers them after a reload, and sends them once back online', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(pay('p-1'));
    await store.dispatch(pay('p-2'));
    expect(await store.syncNow()).toBeNull();
    expect(store.getSnapshot().sync.pending).toBe(2);
    expect(store.getSnapshot().state.orders['rahman-o40']!.payments.map((p) => p.id)).toContain('p-2');
    expect(await serverIds(db)).not.toContain('new-1');

    const reloaded = reopen(name);
    await reloaded.load();
    expect(reloaded.getSnapshot().sync).toMatchObject({ online: false, pending: 2 });

    await reloaded.setOnline(true);
    expect(reloaded.getSnapshot().sync).toMatchObject({ online: true, syncing: false, pending: 0 });
    expect((await serverIds(db)).slice(-2)).toEqual(['new-1', 'new-2']);
  });

  it('sends changes still waiting on a reload when the device is online', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(pay('p-1'));
    // The device came back online without sending them, such as when the tab closed mid-sync.
    await db.meta.put({ key: 'sync', value: { online: true, lastSyncAt: null } });

    const reloaded = reopen(name);
    await reloaded.load();
    await vi.waitFor(() => expect(reloaded.getSnapshot().sync).toMatchObject({ online: true, syncing: false, pending: 0 }));
    expect(await serverIds(db)).toContain('new-1');
  });

  it('keeps taking changes while a sync is starting, and sends them in that sync', async () => {
    const db = new DarziDb(`sync-${++dbCount}`);
    dbs.push(db);
    let open = () => {};
    const gate = new Promise<void>((resolve) => (open = resolve));
    let n = 0;
    const store = new ShopStore({ db, newId: () => `new-${++n}`, syncDelay: () => gate });
    await store.startDemo('rahman');
    const syncing = store.syncNow();
    expect(store.getSnapshot().sync.syncing).toBe(true);
    await store.dispatch(pay('p-during'));
    expect(store.getSnapshot().sync.pending).toBe(1);
    open();
    await syncing;
    expect(store.getSnapshot().sync).toMatchObject({ syncing: false, pending: 0 });
    expect(await serverIds(db)).toContain('new-1');
  });

  it('applies the same events only once, however often they are sent', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(pay('p-once'));
    await store.setOnline(true);
    await store.syncNow();
    await store.syncNow();
    const ids = await serverIds(db);
    expect(ids.filter((id) => id === 'new-1')).toHaveLength(1);
    expect(store.getSnapshot().state.orders['rahman-o40']!.payments.filter((p) => p.id === 'p-once')).toHaveLength(1);
  });

  it('holds a stale offline edit for review and shows the other device’s version instead', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(editNotes(store, 'rahman-c7', 'এই ডিভাইসের নোট'));
    expect(store.getSnapshot().state.customers['rahman-c7']!.notes).toBe('এই ডিভাইসের নোট');

    // Another device changes the same customer while this one is offline.
    expect(await store.pushFromOtherDevice(editNotes(store, 'rahman-c7', 'অন্য ডিভাইসের নোট'))).toEqual({ ok: true });
    expect(store.getSnapshot().state.customers['rahman-c7']!.notes).toBe('এই ডিভাইসের নোট');

    await store.setOnline(true);
    const results = store.getSnapshot();
    expect(results.state.customers['rahman-c7']!.notes).toBe('অন্য ডিভাইসের নোট');
    expect(results.sync.pending).toBe(0);
    expect(results.sync.review.map((r) => r.event.id)).toEqual(['rahman-conflict-mine', 'new-1']);
    expect(await deviceIds(db)).toEqual(await serverIds(db));

    const reloaded = reopen(name);
    await reloaded.load();
    expect(reloaded.getSnapshot().state).toEqual(store.getSnapshot().state);
    expect(reloaded.getSnapshot().sync.review).toHaveLength(2);
  });

  it('shows another device’s edit straight away when online', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.pushFromOtherDevice(editNotes(store, 'rahman-c7', 'অন্য ডিভাইসের নোট'));
    const customer = store.getSnapshot().state.customers['rahman-c7']!;
    expect(customer.notes).toBe('অন্য ডিভাইসের নোট');
    expect(customer.version).toBe(2);
  });

  it('cannot change from another device a record the server has not seen yet', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch({
      type: 'customer.created',
      customer: { id: 'walk-in', name: 'করিম', nameAlt: null, phone: null, householdId: null, gender: 'male', notes: '' },
    });
    expect(await store.pushFromOtherDevice(editNotes(store, 'walk-in', 'x'))).toEqual({ ok: false, reason: 'not-on-server' });
  });

  it('keeps the current version, dropping the waiting change', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const before = store.getSnapshot().state;
    expect(await store.resolveReview('rahman-conflict-mine', { kind: 'keepCurrent' })).toEqual({ ok: true });
    expect(store.getSnapshot().sync.review).toEqual([]);
    expect(store.getSnapshot().state).toEqual(before);
    expect(await db.serverReview.count()).toBe(0);
  });

  it('applies the waiting change on top of the current version', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.resolveReview('rahman-conflict-mine', { kind: 'applyMine' });
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' });
    expect(store.getSnapshot().sync.review).toEqual([]);
  });

  it('merges by sending only the parts chosen, as the signed-in person', async () => {
    const { store, db } = freshStore();
    await store.startDemo('nakshi');
    await store.signOut();
    await store.signIn('nakshi-counter', '2222');
    const current = store.getSnapshot().state.customers['nakshi-c4']!;
    const outcome = await store.resolveReview('nakshi-conflict-mine', {
      kind: 'merge',
      body: { type: 'customer.updated', customerId: 'nakshi-c4', baseVersion: current.version, changes: { phone: '01712345678' } },
    });
    expect(outcome).toEqual({ ok: true });
    expect(store.getSnapshot().state.customers['nakshi-c4']).toMatchObject({ phone: '01712345678', notes: 'কলার একটু ঢিলা পছন্দ করেন' });
    const last = (await db.serverEvents.orderBy('seq').last())!.event;
    expect(last).toMatchObject({ type: 'customer.updated', staffId: 'nakshi-counter', deviceId: 'device-a' });
  });

  it('needs the connection to settle a review item', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    expect(await store.resolveReview('rahman-conflict-mine', { kind: 'keepCurrent' })).toEqual({ ok: false, reason: 'offline' });
    await store.setOnline(true);
    expect(await store.resolveReview('missing', { kind: 'keepCurrent' })).toEqual({ ok: false, reason: 'gone' });
  });

  it('clears the demo server with the rest of the demo', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.clear();
    expect(await db.serverEvents.count()).toBe(0);
    expect(await db.serverReview.count()).toBe(0);
  });

  it('treats everything on a device saved before sync existed as already on the server', async () => {
    const name = `sync-upgrade-${++dbCount}`;
    const old = new Dexie(name);
    dbs.push(old);
    old.version(2).stores({ events: '++seq, &id', meta: 'key', photos: 'id' });
    const { config, events } = generateShop('rahman', '2026-10-03');
    await old.table('events').bulkAdd(events.map((event) => ({ id: event.id, event })));
    await old.table('meta').bulkPut([
      { key: 'config', value: config },
      { key: 'session', value: { shopKey: 'rahman', staffId: 'rahman-owner' } },
      { key: 'deviceId', value: 'device-a' },
    ]);
    old.close();

    const store = reopen(name);
    await store.load();
    expect(store.getSnapshot().sync).toMatchObject({ online: true, pending: 0, review: [], lastSyncAt: null });
    expect(await store.syncNow()).toEqual([]);
    expect(store.getSnapshot().state).toEqual(replay(events).state);
  });
});
