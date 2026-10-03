import {
  applyEvent,
  emptyState,
  nextOrderNumber,
  replay,
  staffById,
  todayInDhaka,
  verifyPin,
  type ApplyOutcome,
  type DomainEvent,
  type EventBody,
  type ShopConfig,
  type ShopState,
} from '@darzikhata/domain';
import { generateShop } from '../seed/generate';
import type { SeedShopKey } from '../seed/shops';
import type { DarziDb } from './db';

export interface Session {
  shopKey: SeedShopKey;
  /** Null after "switch user" until someone enters their PIN. */
  staffId: string | null;
}

export type StoreStatus = 'loading' | 'empty' | 'ready';

export interface StoreSnapshot {
  status: StoreStatus;
  config: ShopConfig | null;
  state: ShopState;
  session: Session | null;
  deviceId: string | null;
}

export interface StoreDeps {
  db: DarziDb;
  now?: () => Date;
  newId?: () => string;
}

/** Result of saving several changes together: all were saved, or none were. */
export type BatchOutcome =
  | { ok: true; outcomes: ApplyOutcome[] }
  | { ok: false; failedIndex: number; outcome: ApplyOutcome };

const LOADING: StoreSnapshot = { status: 'loading', config: null, state: emptyState(), session: null, deviceId: null };

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
  private readonly now: () => Date;
  private readonly newId: () => string;

  constructor(deps: StoreDeps) {
    this.db = deps.db;
    this.now = deps.now ?? (() => new Date());
    this.newId = deps.newId ?? (() => crypto.randomUUID());
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

  private async meta<T>(key: 'config' | 'session' | 'deviceId'): Promise<T | null> {
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
    const rows = await this.db.events.orderBy('seq').toArray();
    const { state } = replay(rows.map((r) => r.event));
    this.publish({ status: 'ready', config, state, session, deviceId });
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
    const { config, events } = generateShop(shopKey, todayInDhaka(this.now()));
    const owner = config.staff.find((s) => s.roleId === 'owner')!;
    const session: Session = { shopKey, staffId: owner.id };
    await this.db.transaction('rw', this.db.events, this.db.meta, this.db.photos, async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
      await this.db.photos.clear();
      await this.db.events.bulkAdd(events.map((event) => ({ id: event.id, event })));
      await this.db.meta.bulkPut([
        { key: 'config', value: config },
        { key: 'session', value: session },
        { key: 'deviceId', value: config.devices[0]!.id },
      ]);
    });
    await this.load();
  }

  /** Removes all demo data from this device. */
  clear(): Promise<void> {
    return this.enqueue(() => this.doClear());
  }

  private async doClear(): Promise<void> {
    await this.db.transaction('rw', this.db.events, this.db.meta, this.db.photos, async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
      await this.db.photos.clear();
    });
    await this.load();
  }

  /**
   * Records a change made by the signed-in person. Only applied events are saved;
   * rejected ones are returned so the screen can explain what went wrong.
   */
  dispatch(body: EventBody): Promise<ApplyOutcome> {
    return this.enqueue(() => this.save(body));
  }

  private async save(body: EventBody): Promise<ApplyOutcome> {
    const event = this.stamp(body);
    const outcome = applyEvent(this.snapshot.state, event);
    if (outcome.kind === 'applied') {
      await this.db.events.add({ id: event.id, event });
      this.publish({ ...this.snapshot, state: outcome.state });
    }
    return outcome;
  }

  /**
   * Records several changes as one action, such as a new customer, their measurements, the order
   * and its advance. Each is checked against the state left by the ones before it. If any is not
   * applied, nothing is saved and the first failure is returned.
   */
  dispatchBatch(bodies: EventBody[]): Promise<BatchOutcome> {
    return this.enqueue(() => this.saveBatch(bodies));
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
    await this.db.events.bulkAdd(events.map((event) => ({ id: event.id, event })));
    this.publish({ ...this.snapshot, state });
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
