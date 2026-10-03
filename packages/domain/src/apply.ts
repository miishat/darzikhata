import type { DomainEvent, Step } from './events';
import { emptyState, type ShopState } from './model';
import { reduceCustomerEvent } from './reduceCustomers';
import { reduceOrderEvent } from './reduceOrders';
import { reducePaymentEvent } from './reducePayments';

export type ApplyOutcome =
  | { kind: 'applied'; state: ShopState }
  | { kind: 'duplicate'; state: ShopState }
  | { kind: 'conflict'; state: ShopState; currentVersion: number }
  | { kind: 'rejected'; state: ShopState; reason: string };

function reduce(state: ShopState, event: DomainEvent): Step {
  switch (event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
    case 'measurement.recorded':
      return reduceCustomerEvent(state, event);
    case 'payment.recorded':
      return reducePaymentEvent(state, event);
    default:
      return reduceOrderEvent(state, event);
  }
}

/**
 * Applies one event. An event id that was already applied is a no-op, so
 * re-sending the same events never duplicates orders or payments.
 * On conflict or rejection the state is returned unchanged.
 */
export function applyEvent(state: ShopState, event: DomainEvent): ApplyOutcome {
  if (state.appliedEventIds[event.id]) return { kind: 'duplicate', state };
  const step = reduce(state, event);
  if (step.ok) {
    return { kind: 'applied', state: { ...step.state, appliedEventIds: { ...step.state.appliedEventIds, [event.id]: true } } };
  }
  if (step.conflict) return { kind: 'conflict', state, currentVersion: step.currentVersion };
  return { kind: 'rejected', state, reason: step.reason };
}

export interface ReplayResult {
  state: ShopState;
  outcomes: Array<{ eventId: string; outcome: ApplyOutcome['kind']; reason?: string }>;
}

/** Rebuilds state from a list of events, starting from an empty shop unless a state is given. */
export function replay(events: DomainEvent[], initial: ShopState = emptyState()): ReplayResult {
  let state = initial;
  const outcomes: ReplayResult['outcomes'] = [];
  for (const event of events) {
    const result = applyEvent(state, event);
    state = result.state;
    outcomes.push(
      result.kind === 'rejected'
        ? { eventId: event.id, outcome: result.kind, reason: result.reason }
        : { eventId: event.id, outcome: result.kind },
    );
  }
  return { state, outcomes };
}
