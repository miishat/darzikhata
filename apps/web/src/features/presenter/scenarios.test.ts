import {
  applyEvent,
  isOrderClosed,
  itemSummaryGroup,
  replay,
  type DomainEvent,
  type EventBody,
  type ReviewItem,
  type ShopConfig,
} from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import type { SyncInfo } from '../../data/store';
import { bn } from '../../i18n/bn';
import { generateShop } from '../../seed/generate';
import { advance, currentStep, markCurrent, startProgress, type Progress } from './progress';
import { SCENARIOS, scenarioById, type PresenterContext, type ScenarioId } from './scenarios';

const TODAY = '2026-10-03';
let n = 0;

/** Plays a scenario against a sample shop: change the page, the data or the sync state, and see which steps tick off. */
function play(id: ScenarioId) {
  const scenario = scenarioById(id);
  const seed = generateShop(scenario.shop, TODAY);
  const owner = seed.config.staff[0]!.id;
  let state = replay(seed.events).state;
  let config: ShopConfig = seed.config;
  let path = '/app/dashboard';
  let staffId: string | null = owner;
  // The sample conflict is the one review item; only its id matters here.
  const sample = { event: { id: 'sample-conflict' }, outcome: 'conflict', reason: 'stale-edit', currentVersion: 1 } as ReviewItem;
  let sync: SyncInfo = { online: true, syncing: false, pending: 0, review: [sample], lastSyncAt: null };
  const start = { state, config, reviewIds: ['sample-conflict'] };
  let progress: Progress = startProgress(id);

  const step = () => {
    const ctx: PresenterContext = { path, state, config, staffId, sync, start };
    progress = advance(scenario, progress, ctx);
    return currentStep(scenario, progress)?.id ?? 'finished';
  };
  return {
    state: () => state,
    config: () => config,
    go(next: string) {
      path = next;
      return step();
    },
    apply(...bodies: EventBody[]) {
      for (const body of bodies) {
        const event = { id: `play-${++n}`, at: '2026-10-03T06:00:00.000Z', deviceId: 'device-a', staffId: owner, ...body } as DomainEvent;
        const outcome = applyEvent(state, event);
        if (outcome.kind !== 'applied') throw new Error(`${body.type} was ${outcome.kind}`);
        state = outcome.state;
      }
      return step();
    },
    setConfig(next: ShopConfig) {
      config = next;
      return step();
    },
    setSync(next: Partial<SyncInfo>) {
      sync = { ...sync, ...next };
      return step();
    },
    signIn(next: string | null) {
      staffId = next;
      return step();
    },
    byHand() {
      progress = markCurrent(scenario, progress, 'done');
      return step();
    },
  };
}

function newOrder(config: ShopConfig, customerId: string, templateIds: string[]): Extract<EventBody, { type: 'order.created' }> {
  const orderId = `play-order-${++n}`;
  return {
    type: 'order.created',
    order: {
      id: orderId,
      number: `B-${String(n).padStart(4, '0')}`,
      customerId,
      branchId: config.branches[0]!.id,
      notes: '',
      discount: null,
      items: templateIds.map((templateId, i) => {
        const template = config.templates.find((t) => t.id === templateId)!;
        return {
          id: `${orderId}-i${i + 1}`,
          templateId,
          garmentName: template.name,
          price: template.defaultPrice,
          wearer: null,
          measurements: null,
          designNotes: '',
          fabricNote: '',
          photoIds: [],
          stages: template.stages,
          assignedTo: null,
          trialDate: null,
          deliveryDate: TODAY,
        };
      }),
    },
  };
}

const advancePayment = (orderId: string): EventBody => ({
  type: 'payment.recorded',
  orderId,
  payment: { id: `pay-${++n}`, amount: 100000, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
});

const newCustomer = (id: string): EventBody => ({
  type: 'customer.created',
  customer: { id, name: 'জসিম উদ্দিন', nameAlt: null, phone: null, householdId: null, gender: 'male', notes: '' },
});

describe('Presenter scenarios', () => {
  it('cover the seven scenarios in the spec, each with texts in Bangla', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'first-order',
      'repeat-order',
      'collect-one',
      'offline-sync',
      'status-link',
      'tailor-view',
      'customize-template',
    ]);
    for (const scenario of SCENARIOS) {
      expect(bn[scenario.title]).toBeTruthy();
      for (const step of scenario.steps) expect(bn[step.text]).toBeTruthy();
    }
  });

  it('1: first order', () => {
    const p = play('first-order');
    expect(p.go('/app/orders/new')).toBe('customer');
    p.byHand();
    p.byHand();
    expect(p.byHand()).toBe('save');
    expect(p.apply(newCustomer('play-c'), newOrder(p.config(), 'play-c', ['shirt', 'shirt', 'panjabi']))).toBe('receipt');
    expect(p.byHand()).toBe('finished');
  });

  it('2: repeat order counts only an order for a customer who ordered before', () => {
    const p = play('repeat-order');
    const regular = Object.values(p.state().orders)[0]!.customerId;
    expect(p.go('/app/customers/rahman-c1-none')).toBe('customer');
    expect(p.go(`/app/customers/${regular}`)).toBe('again');
    expect(p.go('/app/orders/new?repeat=rahman-o1')).toBe('confirm');
    expect(p.byHand()).toBe('save');
    expect(p.apply(newCustomer('play-new'), newOrder(p.config(), 'play-new', ['shirt']))).toBe('save');
    expect(p.apply(newOrder(p.config(), regular, ['shirt']))).toBe('finished');
  });

  it('3: hand over one garment and the order stays open', () => {
    const p = play('collect-one');
    const order = Object.values(p.state().orders).find(
      (o) => !isOrderClosed(o) && o.items.some((i) => itemSummaryGroup(i) === 'ready') && o.items.filter((i) => itemSummaryGroup(i) !== 'delivered' && !i.cancelled).length >= 2,
    )!;
    const ready = order.items.find((i) => itemSummaryGroup(i) === 'ready')!;
    expect(p.go(`/app/orders/${order.id}`)).toBe('hand-over');
    expect(p.apply({ type: 'item.stageChanged', orderId: order.id, itemId: ready.id, to: 'delivered', reason: '' })).toBe('still-open');
    expect(p.byHand()).toBe('finished');
  });

  it('4: offline, order and payment, back online, then settle the sample conflict', () => {
    const p = play('offline-sync');
    expect(p.go('/app/orders/new')).toBe('offline');
    expect(p.setSync({ online: false })).toBe('order');
    const customer = Object.values(p.state().customers)[0]!.id;
    const order = newOrder(p.config(), customer, ['shirt']);
    expect(p.apply(order)).toBe('payment');
    expect(p.apply(advancePayment(order.order.id))).toBe('online');
    expect(p.setSync({ online: true, pending: 2 })).toBe('online');
    expect(p.setSync({ pending: 0 })).toBe('review');
    expect(p.go('/app/review')).toBe('resolve');
    expect(p.setSync({ review: [] })).toBe('finished');
  });

  it('5: create a status link, view it, then turn it off', () => {
    const p = play('status-link');
    const order = Object.values(p.state().orders).find((o) => !isOrderClosed(o))!;
    expect(p.go(`/app/orders/${order.id}`)).toBe('create');
    expect(p.apply({ type: 'link.created', orderId: order.id, token: 'play-token-0000000000a' })).toBe('view');
    expect(p.byHand()).toBe('revoke');
    expect(p.apply({ type: 'link.revoked', orderId: order.id, token: 'play-token-0000000000a' })).toBe('finished');
  });

  it('6: switch to the tailor and back to the owner', () => {
    const p = play('tailor-view');
    expect(p.signIn(null)).toBe('tailor');
    expect(p.signIn('nakshi-owner')).toBe('tailor');
    expect(p.signIn('nakshi-tailor')).toBe('look');
    expect(p.byHand()).toBe('back');
    expect(p.signIn('nakshi-owner')).toBe('finished');
  });

  it('7: add a stage to the blouse, then a new blouse order carries it', () => {
    const p = play('customize-template');
    expect(p.go('/app/settings/templates')).toBe('blouse');
    expect(p.go('/app/settings/templates/blouse')).toBe('stage');
    const blouse = p.config().templates.find((t) => t.id === 'blouse')!;
    const stages = [...blouse.stages];
    stages.splice(2, 0, { key: 'embroidery', label: { bn: 'এমব্রয়ডারি', en: 'Embroidery' }, optional: false, group: 'unfinished' });
    const next = { ...p.config(), templates: p.config().templates.map((t) => (t.id === 'blouse' ? { ...t, stages } : t)) };
    expect(p.setConfig(next)).toBe('order');
    const customer = Object.values(p.state().customers)[0]!.id;
    expect(p.apply(newOrder(p.config(), customer, ['salwar-kameez']))).toBe('order');
    expect(p.apply(newOrder(p.config(), customer, ['blouse']))).toBe('finished');
  });
});
