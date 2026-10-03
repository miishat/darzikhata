import { STANDARD_STAGES, type EventBody } from '@darzikhata/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from './db';
import { ShopStore } from './store';

let dbCount = 0;
const dbs: DarziDb[] = [];

function freshStore(name = `batch-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const customer: EventBody = {
  type: 'customer.created',
  customer: { id: 'walk-in', name: 'করিম', nameAlt: 'Karim', phone: '01711000000', householdId: null, gender: 'male', notes: '' },
};

const order = (number: string): EventBody => ({
  type: 'order.created',
  order: {
    id: 'walk-in-order',
    number,
    customerId: 'walk-in',
    branchId: 'main',
    notes: '',
    discount: null,
    items: [
      {
        id: 'walk-in-i1',
        templateId: 'shirt',
        garmentName: { bn: 'শার্ট', en: 'Shirt' },
        price: 70000,
        wearer: null,
        measurements: null,
        designNotes: '',
        fabricNote: '',
        photoIds: [],
        stages: STANDARD_STAGES,
        assignedTo: null,
        trialDate: null,
        deliveryDate: '2026-10-10',
      },
    ],
  },
});

const advance = (amount: number): EventBody => ({
  type: 'payment.recorded',
  orderId: 'walk-in-order',
  payment: { id: 'walk-in-p1', amount, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
});

describe('ShopStore batches', () => {
  it('gives the next number in this device series', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    expect(store.nextOrderNumber()).toBe('A-0041');
  });

  it('saves a customer, order and advance together, each seeing the one before', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    const before = await db.events.count();

    const result = await store.dispatchBatch([customer, order(store.nextOrderNumber()), advance(30000)]);

    expect(result.ok).toBe(true);
    expect(await db.events.count()).toBe(before + 3);
    const saved = store.getSnapshot().state.orders['walk-in-order']!;
    expect(saved.number).toBe('A-0041');
    expect(saved.payments.map((p) => p.amount)).toEqual([30000]);

    const reloaded = new ShopStore({ db: new DarziDb(name) });
    await reloaded.load();
    expect(reloaded.getSnapshot().state.orders['walk-in-order']?.customerId).toBe('walk-in');
  });

  it('saves nothing when any change is rejected, and reports which one', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const before = await db.events.count();
    const stateBefore = store.getSnapshot().state;

    const result = await store.dispatchBatch([customer, order('A-0001'), advance(30000)]);

    expect(result).toMatchObject({ ok: false, failedIndex: 1, outcome: { kind: 'rejected', reason: 'number-taken' } });
    expect(await db.events.count()).toBe(before);
    expect(store.getSnapshot().state).toBe(stateBefore);
  });

  it('stores photos on the device and clears them with the demo', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    const id = await store.savePhoto('data:image/jpeg;base64,AAAA');
    expect(await store.getPhoto(id)).toBe('data:image/jpeg;base64,AAAA');
    await store.startDemo('rahman');
    expect(await store.getPhoto(id)).toBeNull();
  });
});
