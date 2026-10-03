import { moneySummary, replay, type DomainEvent, type EventBody, type ShopState } from '@darzikhata/domain';
import { eventFactory, makeItem, makeOrder, newCustomer } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import {
  buildOrderEvents,
  draftErrorKey,
  draftFromOrder,
  draftTotals,
  emptyDraft,
  errorsForStep,
  newDraftItem,
  validateDraft,
  type DraftContext,
  type OrderDraft,
} from './draft';

const config = shopConfig('rahman');
const template = (id: string) => config.templates.find((t) => t.id === id)!;
const TODAY = '2026-10-03';

/** Customer c1 with one saved shirt measurement version. */
function baseState(): ShopState {
  const e = eventFactory();
  return replay([
    e({ type: 'customer.created', customer: newCustomer() }),
    e({
      type: 'measurement.recorded',
      customerId: 'c1',
      templateId: 'shirt',
      version: {
        id: 'c1-shirt-v1',
        takenAt: '2026-09-01T04:00:00.000Z',
        takenBy: 'rahman-owner',
        source: 'body',
        notes: '',
        values: { length: { value: 29, unit: 'inch' }, chest: { value: 38.5, unit: 'inch' } },
      },
    }),
  ]).state;
}

function ctx(state = baseState(), canSee = true): DraftContext {
  return { config, state, today: TODAY, canSeeMeasurements: () => canSee };
}

let keyCount = 0;
const item = (templateId: string, state: ShopState, customerId: string | null = 'c1', canSee = true) =>
  newDraftItem(template(templateId), `k${++keyCount}`, { customerId, state, canSee, deliveryDate: '2026-10-12' });

const allShirtValues = { length: 29, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15.5 };

describe('draftTotals', () => {
  it('matches the spec example: 2 shirts and a panjabi for ৳2,400 with ৳1,000 paid', () => {
    const state = baseState();
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'existing', customerId: 'c1' },
      items: [{ ...item('shirt', state), quantity: 2 }, item('panjabi', state)],
      advance: { amount: 100000, method: 'cash', reference: '' },
    };
    expect(draftTotals(draft)).toEqual({
      garments: 3,
      subtotal: 240000,
      discount: 0,
      total: 240000,
      advance: 100000,
      balance: 140000,
    });
  });
});

describe('newDraftItem', () => {
  it('starts from the template price and the latest saved measurements, unconfirmed', () => {
    const state = baseState();
    const shirt = item('shirt', state);
    expect(shirt.price).toBe(70000);
    expect(shirt.measurements).toEqual({ kind: 'saved', versionId: 'c1-shirt-v1', confirmed: false });
    expect(item('panjabi', state).measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });
    expect(item('alteration', state).measurements).toEqual({ kind: 'none' });
  });

  it('leaves measurements out when the person may not see them and none are saved', () => {
    expect(item('panjabi', baseState(), 'c1', false).measurements).toEqual({ kind: 'none' });
  });
});

describe('validateDraft', () => {
  it('needs a customer and at least one garment', () => {
    expect(validateDraft(emptyDraft(), ctx())).toEqual({ customer: 'required', items: 'required' });
  });

  it('checks a new customer’s name and phone, accepting Bangla digits', () => {
    const draft = (name: string, phone: string): OrderDraft => ({
      ...emptyDraft(),
      customer: { kind: 'new', name, nameAlt: '', phone, gender: 'male' },
      items: [{ ...item('alteration', baseState(), null), price: 20000 }],
    });
    expect(validateDraft(draft(' ', '12345'), ctx())).toEqual({ 'customer.name': 'required', 'customer.phone': 'invalid' });
    expect(validateDraft(draft('করিম', '০১৭১১-০০০০০০'), ctx())).toEqual({});
    expect(validateDraft(draft('করিম', ''), ctx())).toEqual({});
  });

  it('asks for saved measurements to be confirmed before they are used', () => {
    const state = baseState();
    const shirt = item('shirt', state);
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt] };
    expect(validateDraft(draft, ctx(state))).toEqual({ [`items.${shirt.key}.measurements`]: 'confirm' });

    const confirmed = { ...shirt, measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    expect(validateDraft({ ...draft, items: [confirmed] }, ctx(state))).toEqual({});
  });

  it('lists each missing required measurement, but not optional ones', () => {
    const state = baseState();
    const panjabi = item('panjabi', state);
    panjabi.measurements = { kind: 'new', values: { length: 42, chest: 38 }, source: 'body', notes: '' };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [panjabi] };
    expect(validateDraft(draft, ctx(state))).toEqual({
      [`items.${panjabi.key}.measure.waist`]: 'required',
      [`items.${panjabi.key}.measure.shoulder`]: 'required',
      [`items.${panjabi.key}.measure.sleeve`]: 'required',
      [`items.${panjabi.key}.measure.collar`]: 'required',
    });
  });

  it('requires measurements only from people who may see them', () => {
    const state = baseState();
    const panjabi = { ...item('panjabi', state), measurements: { kind: 'none' as const } };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [panjabi] };
    expect(validateDraft(draft, ctx(state, true))).toEqual({ [`items.${panjabi.key}.measurements`]: 'required' });
    expect(validateDraft(draft, ctx(state, false))).toEqual({});
  });

  it('checks quantity, price and dates', () => {
    const state = baseState();
    const alt = { ...item('alteration', state), quantity: 0, price: null, deliveryDate: '2026-10-02', trialDate: '2026-10-01' };
    const later = { ...item('alteration', state), deliveryDate: '2026-10-05', trialDate: '2026-10-06' };
    const noDate = { ...item('alteration', state), deliveryDate: '' };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [alt, later, noDate] };
    expect(validateDraft(draft, ctx(state))).toEqual({
      [`items.${alt.key}.quantity`]: 'invalid',
      [`items.${alt.key}.price`]: 'required',
      [`items.${alt.key}.deliveryDate`]: 'past',
      [`items.${alt.key}.trialDate`]: 'past',
      [`items.${later.key}.trialDate`]: 'after-delivery',
      [`items.${noDate.key}.deliveryDate`]: 'required',
    });
  });

  it('keeps the discount within the subtotal and the advance within the total', () => {
    const state = baseState();
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'existing', customerId: 'c1' },
      items: [item('alteration', state)],
      discount: { amount: 30000, reason: '' },
      advance: { amount: 100, method: 'cash', reference: '' },
    };
    expect(validateDraft(draft, ctx(state))).toEqual({ 'discount.amount': 'exceeds', 'advance.amount': 'exceeds' });
  });

  it('reports a discount or advance whose typed text could not be read', () => {
    const state = baseState();
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'existing', customerId: 'c1' },
      items: [item('alteration', state)],
      discount: { amount: null, reason: '', unreadable: true },
      advance: { amount: null, method: 'cash', reference: '', unreadable: true },
    };
    expect(validateDraft(draft, ctx(state))).toEqual({ 'discount.amount': 'invalid', 'advance.amount': 'invalid' });
    expect(draftErrorKey('advance.amount', 'invalid')).toBe('input.invalidMoney');
    expect(draftErrorKey('discount.amount', 'invalid')).toBe('input.invalidMoney');
    expect(Object.keys(errorsForStep(validateDraft(draft, ctx(state)), 'money'))).toEqual(['discount.amount', 'advance.amount']);
  });
});

describe('errorsForStep', () => {
  it('shows each problem on the mobile step that holds its field', () => {
    const errors = {
      customer: 'required',
      'items.k1.measure.chest': 'required',
      'items.k1.measurements': 'confirm',
      'items.k1.price': 'required',
      'items.k1.deliveryDate': 'past',
      'advance.amount': 'exceeds',
    } as const;
    expect(errorsForStep(errors, 'customer')).toEqual({ customer: 'required' });
    expect(Object.keys(errorsForStep(errors, 'garments'))).toEqual(['items.k1.measure.chest', 'items.k1.measurements']);
    expect(errorsForStep(errors, 'details')).toEqual({});
    expect(Object.keys(errorsForStep(errors, 'money'))).toEqual(['items.k1.price', 'items.k1.deliveryDate', 'advance.amount']);
    expect(errorsForStep(errors, 'review')).toBe(errors);
  });
});

/** Applies built event bodies as if this device had saved them. */
function applyBodies(bodies: EventBody[], state: ShopState) {
  return replay(
    bodies.map((body, i) => ({ id: `e${i}`, at: '2026-10-03T06:00:00.000Z', deviceId: 'device-a', staffId: 'rahman-owner', ...body }) as DomainEvent),
    state,
  );
}

describe('draftErrorKey', () => {
  it('picks the message for each kind of problem', () => {
    expect(draftErrorKey('customer', 'required')).toBe('draft.error.customer');
    expect(draftErrorKey('customer.phone', 'invalid')).toBe('customerForm.error.phone');
    expect(draftErrorKey('items.k1.measure.chest', 'required')).toBe('measure.required');
    expect(draftErrorKey('items.k1.measurements', 'confirm')).toBe('draft.error.confirm');
    expect(draftErrorKey('items.k1.measurements', 'required')).toBe('draft.error.measurements');
    expect(draftErrorKey('items.k1.deliveryDate', 'past')).toBe('draft.error.past');
    expect(draftErrorKey('items.k1.deliveryDate', 'required')).toBe('draft.error.deliveryDate');
    expect(draftErrorKey('items.k1.trialDate', 'after-delivery')).toBe('draft.error.trialAfterDelivery');
    expect(draftErrorKey('advance.amount', 'exceeds')).toBe('draft.error.advance');
  });
});

describe('buildOrderEvents', () => {
  function build(draft: OrderDraft, state: ShopState) {
    let n = 0;
    return buildOrderEvents(draft, {
      config,
      state,
      newId: () => `id-${++n}`,
      number: 'A-0041',
      branchId: 'main',
      staffId: 'rahman-owner',
      now: '2026-10-03T06:00:00.000Z',
    });
  }

  it('creates a new customer, their measurements, one item per garment and the advance, in applying order', () => {
    const state = baseState();
    const shirts = { ...item('shirt', state, null), quantity: 2, wearer: ' ', designNotes: ' দুই পকেট ' };
    shirts.measurements = { kind: 'new', values: allShirtValues, source: 'sample', notes: '' };
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'new', name: ' করিম ', nameAlt: 'Karim', phone: '+880 1711-000000', gender: 'male' },
      items: [shirts, { ...item('alteration', state, null), price: 100000 }],
      advance: { amount: 100000, method: 'bkash', reference: ' TX1 ' },
    };
    expect(validateDraft(draft, ctx(state))).toEqual({});

    const { orderId, events } = build(draft, state);

    expect(events.map((e) => e.type)).toEqual(['customer.created', 'measurement.recorded', 'order.created', 'payment.recorded']);
    expect(events[0]).toMatchObject({ customer: { id: 'id-1', name: 'করিম', phone: '01711000000', nameAlt: 'Karim' } });
    expect(events[1]).toMatchObject({
      customerId: 'id-1',
      templateId: 'shirt',
      version: { id: 'id-2', source: 'sample', takenBy: 'rahman-owner', values: { chest: { value: 38, unit: 'inch' } } },
    });
    const created = events[2]!;
    if (created.type !== 'order.created') throw new Error('expected order.created');
    expect(orderId).toBe(created.order.id);
    expect(created.order.items.map((i) => i.id)).toEqual(['id-3', 'id-4', 'id-5']);
    expect(created.order.items[0]!.measurements?.versionId).toBe('id-2');
    expect(created.order.items[1]!.measurements?.versionId).toBe('id-2');
    expect(created.order.items[0]).toMatchObject({ wearer: null, designNotes: 'দুই পকেট', deliveryDate: '2026-10-12', trialDate: null });
    expect(created.order.items[2]!.measurements).toBeNull();
    expect(events[3]).toMatchObject({ orderId, payment: { amount: 100000, method: 'bkash', reference: 'TX1', kind: 'advance' } });

    const after = applyBodies(events, state);
    expect(after.outcomes.map((o) => o.outcome)).toEqual(['applied', 'applied', 'applied', 'applied']);
    expect(moneySummary(after.state.orders[orderId]!)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
  });

  it('freezes a copy of a confirmed saved version and skips an empty advance', () => {
    const state = baseState();
    const shirt = { ...item('shirt', state), measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    const { events } = build({ ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt] }, state);
    expect(events.map((e) => e.type)).toEqual(['order.created']);
    const created = events[0]!;
    if (created.type !== 'order.created') throw new Error('expected order.created');
    expect(created.order.items[0]!.measurements).toEqual({
      versionId: 'c1-shirt-v1',
      takenAt: '2026-09-01T04:00:00.000Z',
      source: 'body',
      values: { length: { value: 29, unit: 'inch' }, chest: { value: 38.5, unit: 'inch' } },
    });
    expect(created.order.items[0]!.measurements!.values).not.toBe(
      state.profiles['c1:shirt']!.versions[0]!.values,
    );
  });
});

describe('draftFromOrder', () => {
  it('copies garments for a repeat order, asking again about saved measurements', () => {
    const state = baseState();
    const shirt = { ...item('shirt', state), measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    const panjabi = { ...item('panjabi', state), wearer: 'ছেলে', price: 110000 };
    panjabi.measurements = { kind: 'new', values: { length: 42, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15 }, source: 'body', notes: '' };
    let n = 0;
    const built = buildOrderEvents(
      { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt, panjabi, item('alteration', state)] },
      { config, state, newId: () => `id-${++n}`, number: 'A-0041', branchId: 'main', staffId: 'rahman-owner', now: '2026-10-03T06:00:00.000Z' },
    );
    const applied = applyBodies(built.events, state).state;
    const order = applied.orders[built.orderId]!;
    const withCancel = { ...order, items: order.items.map((i) => (i.templateId === 'alteration' ? { ...i, cancelled: { reason: 'x', at: '', by: '' } } : i)) };

    let k = 0;
    const draft = draftFromOrder(withCancel, { config, state: applied, canSee: true, newKey: () => `r${++k}`, deliveryDate: '2026-10-20' });

    expect(draft.customer).toEqual({ kind: 'existing', customerId: 'c1' });
    expect(draft.items.map((i) => [i.key, i.templateId, i.price, i.wearer, i.deliveryDate])).toEqual([
      ['r1', 'shirt', 70000, '', '2026-10-20'],
      ['r2', 'panjabi', 110000, 'ছেলে', '2026-10-20'],
    ]);
    expect(draft.items[0]!.measurements).toEqual({ kind: 'saved', versionId: 'c1-shirt-v1', confirmed: false });
    expect(draft.items[1]!.measurements).toMatchObject({ kind: 'saved', confirmed: false });
  });

  it('copies snapshot values that were never saved to a profile, for the person to check', () => {
    const state = baseState();
    const groupOrder = makeOrder({
      customerId: 'c1',
      items: [
        makeItem({
          templateId: 'pant',
          garmentName: template('pant').name,
          price: 50000,
          wearer: 'ক্লাস ৭ - রাফি',
          measurements: { versionId: 'snap', takenAt: '', source: 'body', values: { waist: { value: 26, unit: 'inch' } } },
        }),
      ],
    });
    const draft = draftFromOrder(groupOrder, { config, state, canSee: true, newKey: () => 'g', deliveryDate: '2026-10-20' });
    expect(draft.items[0]!.measurements).toEqual({ kind: 'new', values: { waist: 26 }, source: 'body', notes: '' });
    expect(draft.items[0]!.wearer).toBe('ক্লাস ৭ - রাফি');
  });
});
