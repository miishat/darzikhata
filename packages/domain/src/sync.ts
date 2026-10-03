import { applyEvent, replay } from './apply';
import { isEditEvent, type DomainEvent, type EditEvent } from './events';
import { emptyState, type ShopState } from './model';

/** An event the server could not apply, waiting for a person to decide. */
export interface ReviewItem {
  event: DomainEvent;
  outcome: 'conflict' | 'rejected';
  /** 'stale-edit' for conflicts, otherwise the rejection reason. */
  reason: string;
  currentVersion: number | null;
}

/** The shared copy every device syncs with. In the demo it lives in the same browser. */
export interface SyncServer {
  log: DomainEvent[];
  state: ShopState;
  review: ReviewItem[];
}

export interface PushOutcome {
  eventId: string;
  outcome: 'applied' | 'duplicate' | 'conflict' | 'rejected';
  reason?: string;
}

export function createServer(events: DomainEvent[] = []): SyncServer {
  return pushEvents({ log: [], state: emptyState(), review: [] }, events).server;
}

/**
 * Applies events sent by a device. Re-sending is safe for events already applied (they
 * come back as 'duplicate') and for events still waiting in the review queue (they are
 * not queued twice). It is not safe for events already resolved from the review queue:
 * once resolved they leave the queue, so re-pushing the original pending event queues it again.
 */
export function pushEvents(server: SyncServer, events: DomainEvent[]): { server: SyncServer; results: PushOutcome[] } {
  let { state } = server;
  const log = [...server.log];
  const review = [...server.review];
  const results: PushOutcome[] = [];

  for (const event of events) {
    const waiting = review.find((r) => r.event.id === event.id);
    if (waiting) {
      results.push({ eventId: event.id, outcome: waiting.outcome, reason: waiting.reason });
      continue;
    }

    const result = applyEvent(state, event);
    switch (result.kind) {
      case 'applied':
        state = result.state;
        log.push(event);
        results.push({ eventId: event.id, outcome: 'applied' });
        break;
      case 'duplicate':
        results.push({ eventId: event.id, outcome: 'duplicate' });
        break;
      case 'conflict':
        review.push({ event, outcome: 'conflict', reason: 'stale-edit', currentVersion: result.currentVersion });
        results.push({ eventId: event.id, outcome: 'conflict', reason: 'stale-edit' });
        break;
      case 'rejected':
        review.push({ event, outcome: 'rejected', reason: result.reason, currentVersion: null });
        results.push({ eventId: event.id, outcome: 'rejected', reason: result.reason });
        break;
    }
  }

  return { server: { log, state, review }, results };
}

/** Events applied on the server after `cursor`, and the new cursor. */
export function pullEvents(server: SyncServer, cursor: number): { events: DomainEvent[]; cursor: number } {
  return { events: server.log.slice(cursor), cursor: server.log.length };
}

/** The version an edit event would need to be based on to apply now. */
export function currentVersionOf(state: ShopState, event: EditEvent): number | null {
  switch (event.type) {
    case 'customer.updated':
      return state.customers[event.customerId]?.version ?? null;
    case 'order.discountSet':
      return state.orders[event.orderId]?.version ?? null;
    case 'item.assigned':
    case 'item.updated':
      return state.orders[event.orderId]?.items.find((i) => i.id === event.itemId)?.version ?? null;
  }
}

export type Resolution = 'keepCurrent' | 'applyMine';

/**
 * Settles a review item. 'keepCurrent' drops the waiting change. 'applyMine' re-issues a
 * stale edit as a new event based on the current version, so it overwrites on purpose.
 */
export function resolveReview(
  server: SyncServer,
  eventId: string,
  resolution: Resolution,
  meta: { id: string; at: string },
): { server: SyncServer; result: PushOutcome | null } {
  const item = server.review.find((r) => r.event.id === eventId);
  if (!item) throw new Error(`No review item for event ${eventId}`);
  const remaining = { ...server, review: server.review.filter((r) => r.event.id !== eventId) };
  if (resolution === 'keepCurrent') return { server: remaining, result: null };

  const { event } = item;
  if (item.outcome !== 'conflict' || !isEditEvent(event)) {
    throw new Error('Only stale edits can be re-applied');
  }
  const baseVersion = currentVersionOf(remaining.state, event);
  if (baseVersion === null) throw new Error('The edited record no longer exists');
  const rebased = { ...event, ...meta, baseVersion };
  const pushed = pushEvents(remaining, [rebased]);
  return { server: pushed.server, result: pushed.results[0]! };
}

/** What a device keeps between syncs. */
export interface DeviceSyncState {
  /** Events made on this device that the server has not seen yet. */
  pending: DomainEvent[];
  /** How far into the server log this device has pulled. */
  cursor: number;
}

/** Sends pending events, then pulls everything new. Afterwards nothing is pending. */
export function syncDevice(
  server: SyncServer,
  device: DeviceSyncState,
): { server: SyncServer; device: DeviceSyncState; results: PushOutcome[]; pulled: DomainEvent[] } {
  const pushed = pushEvents(server, device.pending);
  const pulled = pullEvents(pushed.server, device.cursor);
  return {
    server: pushed.server,
    device: { pending: [], cursor: pulled.cursor },
    results: pushed.results,
    pulled: pulled.events,
  };
}

/** The state a device shows: synced events with its own pending events on top. */
export function deviceView(syncedEvents: DomainEvent[], pending: DomainEvent[]): ShopState {
  return replay([...syncedEvents, ...pending]).state;
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'needs-attention';

export function syncStatus(input: { online: boolean; syncing: boolean; reviewCount: number }): SyncStatus {
  if (!input.online) return 'offline';
  if (input.syncing) return 'syncing';
  if (input.reviewCount > 0) return 'needs-attention';
  return 'online';
}
