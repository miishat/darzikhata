import { isOrderClosed, itemSummaryGroup, type Order, type ShopConfig, type ShopState } from '@darzikhata/domain';
import type { SyncInfo } from '../../data/store';
import type { MessageKey } from '../../i18n/bn';
import type { SeedShopKey } from '../../seed/shops';

/** What a step can look at to decide whether it has happened. */
export interface PresenterContext {
  /** Path and query of the page, e.g. "/app/orders/new?repeat=rahman-o3". */
  path: string;
  /** The whole shop, not narrowed to a branch. */
  state: ShopState;
  config: ShopConfig;
  staffId: string | null;
  sync: SyncInfo;
  /** The shop as it was when the scenario started. */
  start: { state: ShopState; config: ShopConfig; reviewIds: string[] };
}

/** Names given to controls with `data-tour`, so a step can point at them. */
export type TourTarget =
  | 'new-order'
  | 'new-customer'
  | 'add-garment'
  | 'advance'
  | 'save-order'
  | 'receipt-balance'
  | 'nav-customers'
  | 'order-again'
  | 'confirm-measurements'
  | 'ready-list'
  | 'hand-over'
  | 'order-status'
  | 'sync-status'
  | 'review-link'
  | 'review-item'
  | 'nav-orders'
  | 'create-link'
  | 'open-link'
  | 'revoke-link'
  | 'switch-user'
  | 'nav-work'
  | 'nav-settings'
  | 'add-stage';

export interface ScenarioStep {
  id: string;
  text: MessageKey;
  target?: TourTarget;
  /** When given, the step ticks itself off once this holds while it is the current step. */
  done?: (ctx: PresenterContext) => boolean;
}

export type ScenarioId =
  | 'first-order'
  | 'repeat-order'
  | 'collect-one'
  | 'offline-sync'
  | 'status-link'
  | 'tailor-view'
  | 'customize-template';

export interface Scenario {
  id: ScenarioId;
  title: MessageKey;
  /** The sample shop the scenario starts from, freshly reset. */
  shop: SeedShopKey;
  steps: ScenarioStep[];
}

const newOrders = (ctx: PresenterContext): Order[] =>
  Object.values(ctx.state.orders).filter((o) => !ctx.start.state.orders[o.id]);

const openOrderId = (ctx: PresenterContext): string | null => /^\/app\/orders\/([^/?]+)$/.exec(ctx.path)?.[1] ?? null;

const startStageKeys = (ctx: PresenterContext, templateId: string) =>
  ctx.start.config.templates.find((t) => t.id === templateId)?.stages.map((s) => s.key) ?? [];

const newLinks = (ctx: PresenterContext) =>
  Object.values(ctx.state.orders).flatMap((o) => {
    const before = new Set(ctx.start.state.orders[o.id]?.links.map((l) => l.token) ?? []);
    return o.links.filter((l) => !before.has(l.token));
  });

export const SCENARIOS: Scenario[] = [
  {
    id: 'first-order',
    title: 'presenter.firstOrder.title',
    shop: 'rahman',
    steps: [
      { id: 'open', text: 'presenter.firstOrder.open', target: 'new-order', done: (c) => c.path.startsWith('/app/orders/new') },
      { id: 'customer', text: 'presenter.firstOrder.customer', target: 'new-customer' },
      { id: 'garments', text: 'presenter.firstOrder.garments', target: 'add-garment' },
      { id: 'advance', text: 'presenter.firstOrder.advance', target: 'advance' },
      { id: 'save', text: 'presenter.firstOrder.save', target: 'save-order', done: (c) => newOrders(c).length > 0 },
      { id: 'receipt', text: 'presenter.firstOrder.receipt', target: 'receipt-balance' },
    ],
  },
  {
    id: 'repeat-order',
    title: 'presenter.repeatOrder.title',
    shop: 'rahman',
    steps: [
      {
        id: 'customer',
        text: 'presenter.repeatOrder.customer',
        target: 'nav-customers',
        done: (c) => {
          const id = /^\/app\/customers\/([^/?]+)$/.exec(c.path)?.[1];
          return Boolean(id && Object.values(c.state.orders).some((o) => o.customerId === id));
        },
      },
      { id: 'again', text: 'presenter.repeatOrder.again', target: 'order-again', done: (c) => c.path.startsWith('/app/orders/new?repeat=') },
      { id: 'confirm', text: 'presenter.repeatOrder.confirm', target: 'confirm-measurements' },
      {
        id: 'save',
        text: 'presenter.repeatOrder.save',
        target: 'save-order',
        done: (c) => newOrders(c).some((o) => Object.values(c.start.state.orders).some((old) => old.customerId === o.customerId)),
      },
    ],
  },
  {
    id: 'collect-one',
    title: 'presenter.collectOne.title',
    shop: 'rahman',
    steps: [
      {
        id: 'open',
        text: 'presenter.collectOne.open',
        target: 'ready-list',
        done: (c) => {
          const order = c.state.orders[openOrderId(c) ?? ''];
          return Boolean(order && !isOrderClosed(order) && order.items.some((i) => itemSummaryGroup(i) === 'ready'));
        },
      },
      {
        id: 'hand-over',
        text: 'presenter.collectOne.handOver',
        target: 'hand-over',
        done: (c) =>
          Object.values(c.state.orders).some(
            (o) =>
              !isOrderClosed(o) &&
              o.items.some((i) => {
                const before = c.start.state.orders[o.id]?.items.find((b) => b.id === i.id);
                return before && itemSummaryGroup(before) !== 'delivered' && itemSummaryGroup(i) === 'delivered';
              }),
          ),
      },
      { id: 'still-open', text: 'presenter.collectOne.stillOpen', target: 'order-status' },
    ],
  },
  {
    id: 'offline-sync',
    title: 'presenter.offlineSync.title',
    shop: 'rahman',
    steps: [
      { id: 'offline', text: 'presenter.offlineSync.offline', target: 'sync-status', done: (c) => !c.sync.online },
      { id: 'order', text: 'presenter.offlineSync.order', target: 'new-order', done: (c) => newOrders(c).length > 0 },
      {
        id: 'payment',
        text: 'presenter.offlineSync.payment',
        done: (c) =>
          Object.values(c.state.orders).some((o) => o.payments.length > (c.start.state.orders[o.id]?.payments.length ?? 0)),
      },
      { id: 'online', text: 'presenter.offlineSync.online', target: 'sync-status', done: (c) => c.sync.online && c.sync.pending === 0 },
      { id: 'review', text: 'presenter.offlineSync.review', target: 'review-link', done: (c) => c.path.startsWith('/app/review') },
      {
        id: 'resolve',
        text: 'presenter.offlineSync.resolve',
        target: 'review-item',
        done: (c) => c.start.reviewIds.some((id) => !c.sync.review.some((r) => r.event.id === id)),
      },
    ],
  },
  {
    id: 'status-link',
    title: 'presenter.statusLink.title',
    shop: 'rahman',
    steps: [
      {
        id: 'open',
        text: 'presenter.statusLink.open',
        target: 'nav-orders',
        done: (c) => {
          const order = c.state.orders[openOrderId(c) ?? ''];
          return Boolean(order && !isOrderClosed(order));
        },
      },
      { id: 'create', text: 'presenter.statusLink.create', target: 'create-link', done: (c) => newLinks(c).length > 0 },
      { id: 'view', text: 'presenter.statusLink.view', target: 'open-link' },
      { id: 'revoke', text: 'presenter.statusLink.revoke', target: 'revoke-link', done: (c) => newLinks(c).some((l) => l.revokedAt !== null) },
    ],
  },
  {
    id: 'tailor-view',
    title: 'presenter.tailorView.title',
    shop: 'nakshi',
    steps: [
      { id: 'switch', text: 'presenter.tailorView.switch', target: 'switch-user', done: (c) => c.staffId === null },
      { id: 'tailor', text: 'presenter.tailorView.tailor', done: (c) => c.staffId === 'nakshi-tailor' },
      { id: 'look', text: 'presenter.tailorView.look', target: 'nav-work' },
      { id: 'back', text: 'presenter.tailorView.back', target: 'switch-user', done: (c) => c.staffId === 'nakshi-owner' },
    ],
  },
  {
    id: 'customize-template',
    title: 'presenter.customize.title',
    shop: 'nakshi',
    steps: [
      { id: 'settings', text: 'presenter.customize.settings', target: 'nav-settings', done: (c) => c.path.startsWith('/app/settings/templates') },
      { id: 'blouse', text: 'presenter.customize.blouse', done: (c) => c.path === '/app/settings/templates/blouse' },
      {
        id: 'stage',
        text: 'presenter.customize.stage',
        target: 'add-stage',
        done: (c) => (c.config.templates.find((t) => t.id === 'blouse')?.stages.length ?? 0) > startStageKeys(c, 'blouse').length,
      },
      {
        id: 'order',
        text: 'presenter.customize.order',
        target: 'new-order',
        done: (c) => {
          const before = startStageKeys(c, 'blouse');
          return newOrders(c).some((o) => o.items.some((i) => i.templateId === 'blouse' && i.stages.some((s) => !before.includes(s.key))));
        },
      },
    ],
  },
];

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id)!;
}
