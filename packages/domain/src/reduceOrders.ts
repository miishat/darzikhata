import { applied, rejected, stale, type DomainEvent, type NewOrderItem, type Step } from './events';
import type { Order, OrderItem, ShopState } from './model';
import { isPoisha } from './money';
import { adjustmentsTotal, subtotal } from './orders';
import { checkTransition, stageGroup, validateStages } from './stages';

type OrderEvent = Extract<
  DomainEvent,
  {
    type:
      | 'order.created'
      | 'order.discountSet'
      | 'order.priceAdjusted'
      | 'item.stageChanged'
      | 'item.assigned'
      | 'item.updated'
      | 'item.adjustmentAdded'
      | 'item.cancelled'
      | 'link.created'
      | 'link.revoked';
  }
>;

type ItemEvent = Extract<OrderEvent, { itemId: string }>;

/** Stores an order, stamping updatedAt with the event time. */
function save(state: ShopState, order: Order, at: string): Step {
  return applied({ ...state, orders: { ...state.orders, [order.id]: { ...order, updatedAt: at } } });
}

function replaceItem(order: Order, item: OrderItem): Order {
  return { ...order, items: order.items.map((i) => (i.id === item.id ? item : i)) };
}

function newItem(input: NewOrderItem): OrderItem {
  return {
    ...input,
    stageKey: input.stages[0]!.key,
    stageHistory: [],
    adjustments: [],
    cancelled: null,
    version: 1,
  };
}

function validateNewItem(input: NewOrderItem): string | null {
  if (!isPoisha(input.price) || input.price < 0) return 'invalid-price';
  if (validateStages(input.stages).length > 0) return 'invalid-stages';
  return null;
}

export function reduceOrderEvent(state: ShopState, event: OrderEvent): Step {
  if (event.type === 'order.created') return createOrder(state, event);

  const order = state.orders[event.orderId];
  if (!order) return rejected('unknown-order');

  switch (event.type) {
    case 'order.discountSet': {
      if (order.version !== event.baseVersion) return stale(order.version);
      const amount = event.discount?.amount ?? 0;
      if (!isPoisha(amount) || amount < 0) return rejected('invalid-amount');
      if (amount > subtotal(order)) return rejected('discount-exceeds-subtotal');
      return save(state, { ...order, discount: event.discount, version: order.version + 1 }, event.at);
    }

    case 'order.priceAdjusted': {
      const { adjustment } = event;
      if (!isPoisha(adjustment.amount) || adjustment.amount === 0) return rejected('invalid-amount');
      if (!adjustment.reason.trim()) return rejected('reason-required');
      if (order.priceAdjustments.some((a) => a.id === adjustment.id)) return rejected('adjustment-exists');
      const totalAfter = subtotal(order) - (order.discount?.amount ?? 0) + adjustmentsTotal(order) + adjustment.amount;
      if (totalAfter < 0) return rejected('total-negative');
      const added = { ...adjustment, at: event.at, by: event.staffId };
      return save(state, { ...order, priceAdjustments: [...order.priceAdjustments, added] }, event.at);
    }

    case 'link.created': {
      if (!event.token.trim()) return rejected('token-required');
      if (order.links.some((l) => l.token === event.token)) return rejected('link-exists');
      const link = { token: event.token, createdAt: event.at, revokedAt: null };
      return save(state, { ...order, links: [...order.links, link] }, event.at);
    }

    case 'link.revoked': {
      const link = order.links.find((l) => l.token === event.token);
      if (!link) return rejected('unknown-link');
      if (link.revokedAt) return rejected('already-revoked');
      const links = order.links.map((l) => (l.token === event.token ? { ...l, revokedAt: event.at } : l));
      return save(state, { ...order, links }, event.at);
    }

    default:
      return reduceItemEvent(state, order, event);
  }
}

function createOrder(state: ShopState, event: Extract<OrderEvent, { type: 'order.created' }>): Step {
  const input = event.order;
  if (state.orders[input.id]) return rejected('order-exists');
  if (Object.values(state.orders).some((o) => o.number === input.number)) return rejected('number-taken');
  if (!state.customers[input.customerId]) return rejected('unknown-customer');
  if (input.items.length === 0) return rejected('no-items');
  if (new Set(input.items.map((i) => i.id)).size !== input.items.length) return rejected('duplicate-item');
  for (const item of input.items) {
    const problem = validateNewItem(item);
    if (problem) return rejected(problem);
  }

  const order: Order = {
    id: input.id,
    number: input.number,
    customerId: input.customerId,
    branchId: input.branchId,
    createdAt: event.at,
    createdBy: event.staffId,
    updatedAt: event.at,
    notes: input.notes,
    discount: input.discount,
    priceAdjustments: [],
    items: input.items.map(newItem),
    payments: [],
    links: [],
    version: 1,
  };
  const discount = input.discount?.amount ?? 0;
  if (!isPoisha(discount) || discount < 0) return rejected('invalid-amount');
  if (discount > subtotal(order)) return rejected('discount-exceeds-subtotal');
  return save(state, order, event.at);
}

function reduceItemEvent(state: ShopState, order: Order, event: ItemEvent): Step {
  const item = order.items.find((i) => i.id === event.itemId);
  if (!item) return rejected('unknown-item');

  if (event.type === 'item.assigned' || event.type === 'item.updated') {
    if (item.version !== event.baseVersion) return stale(item.version);
  }
  if (item.cancelled) return rejected('item-cancelled');

  switch (event.type) {
    case 'item.stageChanged': {
      const check = checkTransition(item.stages, item.stageKey, event.to);
      if (!check.ok) return rejected(check.reason);
      if (check.kind === 'rework' && !event.reason.trim()) return rejected('reason-required');
      const change = {
        from: item.stageKey,
        to: event.to,
        at: event.at,
        by: event.staffId,
        kind: check.kind,
        reason: event.reason,
      };
      const moved = { ...item, stageKey: event.to, stageHistory: [...item.stageHistory, change] };
      return save(state, replaceItem(order, moved), event.at);
    }

    case 'item.assigned': {
      const assigned = { ...item, assignedTo: event.assigneeId, version: item.version + 1 };
      return save(state, replaceItem(order, assigned), event.at);
    }

    case 'item.updated': {
      const { price } = event.changes;
      if (price !== undefined && (!isPoisha(price) || price < 0)) return rejected('invalid-price');
      const updated = { ...item, ...event.changes, version: item.version + 1 };
      const next = replaceItem(order, updated);
      if ((order.discount?.amount ?? 0) > subtotal(next)) return rejected('discount-exceeds-subtotal');
      return save(state, next, event.at);
    }

    case 'item.adjustmentAdded': {
      const { adjustment } = event;
      if (!adjustment.note.trim()) return rejected('note-required');
      if (item.adjustments.some((a) => a.id === adjustment.id)) return rejected('adjustment-exists');
      const added = { ...adjustment, at: event.at, by: event.staffId };
      return save(state, replaceItem(order, { ...item, adjustments: [...item.adjustments, added] }), event.at);
    }

    case 'item.cancelled': {
      if (!event.reason.trim()) return rejected('reason-required');
      if (stageGroup(item.stages, item.stageKey) === 'delivered') return rejected('already-delivered');
      const cancelled = { ...item, cancelled: { reason: event.reason, at: event.at, by: event.staffId } };
      return save(state, replaceItem(order, cancelled), event.at);
    }
  }
}
