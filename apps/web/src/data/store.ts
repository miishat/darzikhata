import {
  applyEvent,
  createServer,
  currentVersionOf,
  emptyState,
  isEditEvent,
  nextOrderNumber,
  pushEvents,
  replay,
  resolveReview,
  staffById,
  todayInDhaka,
  verifyPin,
  type ApplyOutcome,
  type DomainEvent,
  type EditEvent,
  type EventBody,
  type PushOutcome,
  type ReviewItem,
  type ShopConfig,
  type ShopState,
  type SyncServer,
  validateShopConfig,
} from '@darzikhata/domain';
import { OTHER_DEVICE_ID, seedConflict } from '../seed/conflict';
import { generateShop } from '../seed/generate';
import type { SeedShopKey } from '../seed/shops';
import type { DarziDb, EventRow } from './db';
import { DemoServer } from './demoServer';

export interface Session {
  shopKey: SeedShopKey;
  /** Null after "switch user" until someone enters their PIN. */
  staffId: string | null;
}

export type StoreStatus = 'loading' | 'empty' | 'ready';

/** Where this device stands with the demo server. */
export interface SyncInfo {
  /** The demo's online switch. While off, changes wait on this device. */
  online: boolean;
  syncing: boolean;
  /** Changes made on this device that the server has not accepted yet. */
  pending: number;
  /** Changes the server could not apply, waiting for a person to decide, oldest first. */
  review: ReviewItem[];
  lastSyncAt: string | null;
}

export interface StoreSnapshot {
  status: StoreStatus;
  config: ShopConfig | null;
  state: ShopState;
  session: Session | null;
  deviceId: string | null;
  sync: SyncInfo;
}

export interface StoreDeps {
  db: DarziDb;
  now?: () => Date;
  newId?: () => string;
  /** How long a sync takes to start, so people can see it happen. Tests leave it out. */
  syncDelay?: () => Promise<void>;
  /** How long after a change to sync it, so a burst of changes goes in one sync. */
  autoSyncAfterMs?: number;
}

/** Result of saving several changes together: all were saved, or none were. */
export type BatchOutcome =
  | { ok: true; outcomes: ApplyOutcome[] }
  | { ok: false; failedIndex: number; outcome: ApplyOutcome };

/** Result of changing the shop setup: saved, or the problems that stopped it. */
export type ConfigOutcome = { ok: true } | { ok: false; problems: string[] };

/** An edit, without the meta the store adds when it is sent. */
export type EditBody = Extract<EventBody, { baseVersion: number }>;

/** How a person settles a review item. 'merge' sends a new edit with the parts they chose to keep. */
export type ReviewDecision = { kind: 'keepCurrent' } | { kind: 'applyMine' } | { kind: 'merge'; body: EditBody };

/** Result of an action that needs the server: done, or why not. */
export type ServerOutcome = { ok: true } | { ok: false; reason: 'offline' | 'not-on-server' | 'gone' };

interface SavedSync {
  online: boolean;
  lastSyncAt: string | null;
}

const NO_SYNC: SyncInfo = { online: true, syncing: false, pending: 0, review: [], lastSyncAt: null };

const LOADING: StoreSnapshot = {
  status: 'loading',
  config: null,
  state: emptyState(),
  session: null,
  deviceId: null,
  sync: NO_SYNC,
};

const sameIds = (rows: EventRow[], log: DomainEvent[]) =>
  rows.length === log.length && rows.every((row, i) => row.id === log[i]!.id);

/**
 * Holds the open shop in memory and keeps it in step with IndexedDB.
 * Every change is saved to the device before the screen is told about it.
 */
export class ShopStore {
  private snapshot: StoreSnapshot = LOADING;
  private readonly listeners = new Set<() => void>();
  /** Dispatches, sign-in/out, reset and clear run one at a time so memory, saved order and applied order agree. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly db: DarziDb;
  private readonly server: DemoServer;
  private readonly now: () => Date;
  private readonly newId: () => string;
  private readonly syncDelay: () => Promise<void>;
  private readonly autoSyncAfterMs: number;
  private autoSync: ReturnType<typeof setTimeout> | null = null;

  constructor(deps: StoreDeps) {
    this.db = deps.db;
    this.server = new DemoServer(deps.db);
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? (() => crypto.randomUUID());
    this.syncDelay = deps.syncDelay ?? (() => Promise.resolve());
    this.autoSyncAfterMs = deps.autoSyncAfterMs ?? 0;
  }

  getSnapshot = (): StoreSnapshot => this.snapshot;

  /** A new id for a record a screen is about to create (customer, order, item, payment). */
  createId = (): string => this.newId();

  /** The next order number in this device's own series, e.g. "A-0042". */
  nextOrderNumber(): string {
    const { config, deviceId, state } = this.snapshot;
    const device = config?.devices.find((d) => d.id === deviceId);
    if (!device) throw new Error('This device is not set up for the shop');
    return nextOrderNumber(Object.values(state.orders).map((o) => o.number), device.series);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(next: StoreSnapshot): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  private async meta<T>(key: 'config' | 'session' | 'deviceId' | 'sync'): Promise<T | null> {
    const row = await this.db.meta.get(key);
    return row ? (row.value as T) : null;
  }

  /** Reads the saved shop and rebuilds its state from the event log. */
  async load(): Promise<void> {
    const config = await this.meta<ShopConfig>('config');
    if (!config) {
      this.publish({ ...LOADING, status: 'empty' });
      return;
    }
    const session = await this.meta<Session>('session');
    const deviceId = await this.meta<string>('deviceId');
    const saved = (await this.meta<SavedSync>('sync')) ?? { online: true, lastSyncAt: null };
    const rows = await this.db.events.orderBy('seq').toArray();
    const { state } = replay(rows.map((r) => r.event));
    const review = (await this.db.serverReview.orderBy('seq').toArray()).map((r) => r.item);
    const pending = rows.filter((r) => r.pending === 1).length;
    this.publish({ status: 'ready', config, state, session, deviceId, sync: { ...saved, syncing: false, pending, review } });
  }

  /** Replaces everything on this device with a fresh demo shop, signed in as its owner. */
  startDemo(shopKey: SeedShopKey): Promise<void> {
    return this.enqueue(() => this.doStartDemo(shopKey));
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async doStartDemo(shopKey: SeedShopKey): Promise<void> {
    const today = todayInDhaka(this.now());
    const { config, events } = generateShop(shopKey, today);
    const owner = config.staff.find((s) => s.roleId === 'owner')!;
    const session: Session = { shopKey, staffId: owner.id };
    // The server already has the other device's edit and holds this device's clashing edit for review.
    const conflict = seedConflict(shopKey, config, events, today);
    const server = pushEvents(createServer([...events, conflict.theirs]), [conflict.mine]).server;
    const sync: SavedSync = { online: true, lastSyncAt: this.now().toISOString() };
    await this.db.transaction('rw', [this.db.events, this.db.meta, this.db.photos, this.db.serverEvents, this.db.serverReview], async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
      await this.db.photos.clear();
      await this.server.reset(server);
      await this.db.events.bulkAdd(server.log.map((event) => ({ id: event.id, event })));
      await this.db.meta.bulkPut([
        { key: 'config', value: config },
        { key: 'session', value: session },
        { key: 'deviceId', value: config.devices[0]!.id },
        { key: 'sync', value: sync },
      ]);
    });
    await this.load();
  }

  /** Removes all demo data from this device. */
  clear(): Promise<void> {
    return this.enqueue(() => this.doClear());
  }

  private async doClear(): Promise<void> {
    await this.db.transaction('rw', [this.db.events, this.db.meta, this.db.photos, this.db.serverEvents, this.db.serverReview], async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
      await this.db.photos.clear();
      await this.db.serverEvents.clear();
      await this.db.serverReview.clear();
    });
    await this.load();
  }

  /**
   * Records a change made by the signed-in person. Only applied events are saved;
   * rejected ones are returned so the screen can explain what went wrong.
   */
  dispatch(body: EventBody): Promise<ApplyOutcome> {
    const saved = this.enqueue(() => this.save(body));
    void saved.then((outcome) => outcome.kind === 'applied' && this.syncSoon(), () => undefined);
    return saved;
  }

  private async save(body: EventBody): Promise<ApplyOutcome> {
    const event = this.stamp(body);
    const outcome = applyEvent(this.snapshot.state, event);
    if (outcome.kind === 'applied') {
      await this.db.events.add({ id: event.id, event, pending: 1 });
      this.publish({ ...this.snapshot, state: outcome.state, sync: { ...this.snapshot.sync, pending: this.snapshot.sync.pending + 1 } });
    }
    return outcome;
  }

  /**
   * Records several changes as one action, such as a new customer, their measurements, the order
   * and its advance. Each is checked against the state left by the ones before it. If any is not
   * applied, nothing is saved and the first failure is returned.
   */
  dispatchBatch(bodies: EventBody[]): Promise<BatchOutcome> {
    const saved = this.enqueue(() => this.saveBatch(bodies));
    void saved.then((outcome) => outcome.ok && this.syncSoon(), () => undefined);
    return saved;
  }

  private stamp(body: EventBody): DomainEvent {
    const { status, session, deviceId } = this.snapshot;
    if (status !== 'ready' || !session?.staffId || !deviceId) throw new Error('No one is signed in to a shop');
    return { id: this.newId(), at: this.now().toISOString(), deviceId, staffId: session.staffId, ...body } as DomainEvent;
  }

  private async saveBatch(bodies: EventBody[]): Promise<BatchOutcome> {
    let state = this.snapshot.state;
    const events: DomainEvent[] = [];
    const outcomes: ApplyOutcome[] = [];
    for (const [index, body] of bodies.entries()) {
      const event = this.stamp(body);
      const outcome = applyEvent(state, event);
      if (outcome.kind !== 'applied') return { ok: false, failedIndex: index, outcome };
      state = outcome.state;
      events.push(event);
      outcomes.push(outcome);
    }
    await this.db.events.bulkAdd(events.map((event) => ({ id: event.id, event, pending: 1 as const })));
    this.publish({ ...this.snapshot, state, sync: { ...this.snapshot.sync, pending: this.snapshot.sync.pending + events.length } });
    return { ok: true, outcomes };
  }

  /** Keeps a photo (a data URL) on this device and returns its id. */
  savePhoto(dataUrl: string): Promise<string> {
    return this.enqueue(async () => {
      const id = this.newId();
      await this.db.photos.add({ id, dataUrl, createdAt: this.now().toISOString() });
      return id;
    });
  }

  async getPhoto(id: string): Promise<string | null> {
    return (await this.db.photos.get(id))?.dataUrl ?? null;
  }

  /**
   * Changes the shop setup (profile, settings, templates, staff, branches, devices). The change is
   * made to the latest setup, after any change already queued, and saved only when the result is
   * valid, the signed-in person stays active and this device still exists. The event log is untouched:
   * garments already ordered keep their own copies of stages and measurements.
   */
  updateConfig(change: (config: ShopConfig) => ShopConfig): Promise<ConfigOutcome> {
    return this.enqueue(async (): Promise<ConfigOutcome> => {
      const { status, config, session, deviceId } = this.snapshot;
      if (status !== 'ready' || !config || !session?.staffId) throw new Error('No one is signed in to a shop');
      const next = change(config);
      const problems = validateShopConfig(next);
      if (!staffById(next, session.staffId)?.active) problems.push('self-inactive');
      if (!next.devices.some((d) => d.id === deviceId)) problems.push('device-missing');
      if (problems.length > 0) return { ok: false, problems };
      await this.db.meta.put({ key: 'config', value: next });
      this.publish({ ...this.snapshot, config: next });
      return { ok: true };
    });
  }

  /** Turns the demo's connection on or off. Turning it on sends waiting changes straight away. */
  async setOnline(online: boolean): Promise<void> {
    await this.enqueue(async () => {
      if (this.snapshot.status !== 'ready') return;
      const sync = { ...this.snapshot.sync, online };
      await this.db.meta.put({ key: 'sync', value: { online, lastSyncAt: sync.lastSyncAt } satisfies SavedSync });
      this.publish({ ...this.snapshot, sync });
    });
    if (online) await this.syncNow();
  }

  /**
   * Sends this device's waiting changes and takes everything new from the server. Null while
   * offline. The pause before it runs does not hold up other changes: any made meanwhile go too.
   */
  async syncNow(): Promise<PushOutcome[] | null> {
    if (this.snapshot.status !== 'ready' || !this.snapshot.sync.online) return null;
    this.setSyncing(true);
    try {
      await this.syncDelay();
    } catch (error) {
      this.setSyncing(false);
      throw error;
    }
    return this.enqueue(() => this.doSync());
  }

  /** Syncs a moment after a change, when online. Failures wait for the next sync. */
  private syncSoon(): void {
    if (!this.snapshot.sync.online) return;
    if (this.autoSync) clearTimeout(this.autoSync);
    this.autoSync = setTimeout(() => {
      this.autoSync = null;
      this.syncNow().catch(() => undefined);
    }, this.autoSyncAfterMs);
  }

  private setSyncing(syncing: boolean): void {
    if (this.snapshot.sync.syncing !== syncing) this.publish({ ...this.snapshot, sync: { ...this.snapshot.sync, syncing } });
  }

  /** The sync itself, run in the queue. It reads, decides and saves without waiting on anything else. */
  private async doSync(): Promise<PushOutcome[] | null> {
    try {
      if (this.snapshot.status !== 'ready' || !this.snapshot.sync.online) return null;
      const rows = await this.db.events.orderBy('seq').toArray();
      const before = await this.server.load();
      const pushed = pushEvents(before, rows.filter((r) => r.pending === 1).map((r) => r.event));
      await this.adopt(rows, before, pushed.server);
      return pushed.results;
    } finally {
      this.setSyncing(false);
    }
  }

  /**
   * Saves the server's new copy and makes this device show exactly the server's log. When the
   * device already holds that log in that order, only the pending marks are cleared; otherwise
   * (another device's changes, or a change of ours held for review) the device log is rewritten.
   */
  private async adopt(rows: EventRow[], before: SyncServer, after: SyncServer): Promise<void> {
    const same = sameIds(rows, after.log);
    const lastSyncAt = this.now().toISOString();
    const tables = [this.db.events, this.db.meta, this.db.serverEvents, this.db.serverReview];
    await this.db.transaction('rw', tables, async () => {
      await this.server.save(before, after);
      if (same) {
        await this.db.events.where('pending').equals(1).modify((row) => {
          delete row.pending;
        });
      } else {
        await this.db.events.clear();
        await this.db.events.bulkAdd(after.log.map((event) => ({ id: event.id, event })));
      }
      await this.db.meta.put({ key: 'sync', value: { online: this.snapshot.sync.online, lastSyncAt } satisfies SavedSync });
    });
    this.publish({
      ...this.snapshot,
      state: same ? this.snapshot.state : after.state,
      sync: { ...this.snapshot.sync, pending: 0, review: after.review, lastSyncAt },
    });
  }

  /**
   * Demo only: another device sends an edit straight to the server, based on the server's
   * current copy of the record so it always applies there. This device sees it at its next sync,
   * which happens straight away when online.
   */
  pushFromOtherDevice(body: EditBody): Promise<ServerOutcome> {
    return this.enqueue(async (): Promise<ServerOutcome> => {
      const { config, session } = this.snapshot;
      if (!config || !session?.staffId) throw new Error('No one is signed in to a shop');
      const staffId = config.staff.find((s) => s.roleId === 'owner' && s.active)?.id ?? session.staffId;
      const before = await this.server.load();
      const sent = { id: this.newId(), at: this.now().toISOString(), deviceId: OTHER_DEVICE_ID, staffId, ...body } as EditEvent;
      const event = this.rebase(before.state, sent);
      if (!event) return { ok: false, reason: 'not-on-server' };
      const after = pushEvents(before, [event]).server;
      await this.db.transaction('rw', [this.db.serverEvents, this.db.serverReview], () => this.server.save(before, after));
      await this.doSync();
      return { ok: true };
    });
  }

  /**
   * Settles a review item on the server, then syncs. 'keepCurrent' drops the waiting change,
   * 'applyMine' re-sends it on top of the current version, and 'merge' drops it and sends a new
   * edit by the signed-in person with only the parts they chose.
   */
  resolveReview(eventId: string, decision: ReviewDecision): Promise<ServerOutcome> {
    return this.enqueue(async (): Promise<ServerOutcome> => {
      if (!this.snapshot.sync.online) return { ok: false, reason: 'offline' };
      const before = await this.server.load();
      const item = before.review.find((r) => r.event.id === eventId);
      if (!item) return { ok: false, reason: 'gone' };
      const canReapply = item.outcome === 'conflict' && isEditEvent(item.event) && currentVersionOf(before.state, item.event) !== null;
      if (decision.kind === 'applyMine' && !canReapply) return { ok: false, reason: 'gone' };
      const meta = { id: this.newId(), at: this.now().toISOString() };
      let after = resolveReview(before, eventId, decision.kind === 'applyMine' ? 'applyMine' : 'keepCurrent', meta).server;
      if (decision.kind === 'merge') {
        const event = this.rebase(after.state, this.stamp(decision.body) as EditEvent);
        if (!event) return { ok: false, reason: 'gone' };
        after = pushEvents(after, [event]).server;
      }
      await this.db.transaction('rw', [this.db.serverEvents, this.db.serverReview], () => this.server.save(before, after));
      await this.doSync();
      return { ok: true };
    });
  }

  /** The edit based on the record's current version in `state`, or null when the record is not there. */
  private rebase(state: ShopState, event: EditEvent): EditEvent | null {
    const baseVersion = currentVersionOf(state, event);
    return baseVersion === null ? null : { ...event, baseVersion };
  }

  /** Returns to the "who is using this device?" screen without touching shop data. */
  signOut(): Promise<void> {
    return this.enqueue(() => this.setSession(this.snapshot.session ? { ...this.snapshot.session, staffId: null } : null));
  }

  /** Signs a staff member in with their PIN. Returns false for a wrong PIN or inactive staff. */
  signIn(staffId: string, pin: string): Promise<boolean> {
    return this.enqueue(async () => {
      const { config, session } = this.snapshot;
      const staff = config ? staffById(config, staffId) : null;
      if (!session || !staff || !verifyPin(staff, pin)) return false;
      await this.setSession({ ...session, staffId });
      return true;
    });
  }

  private async setSession(session: Session | null): Promise<void> {
    await this.db.meta.put({ key: 'session', value: session });
    this.publish({ ...this.snapshot, session });
  }
}
