import {
  applyEvent,
  emptyState,
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

const LOADING: StoreSnapshot = { status: 'loading', config: null, state: emptyState(), session: null, deviceId: null };

/**
 * Holds the open shop in memory and keeps it in step with IndexedDB.
 * Every change is saved to the device before the screen is told about it.
 */
export class ShopStore {
  private snapshot: StoreSnapshot = LOADING;
  private readonly listeners = new Set<() => void>();
  /** Dispatches run one at a time so the saved order always matches the applied order. */
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
  async startDemo(shopKey: SeedShopKey): Promise<void> {
    const { config, events } = generateShop(shopKey, todayInDhaka(this.now()));
    const owner = config.staff.find((s) => s.roleId === 'owner')!;
    const session: Session = { shopKey, staffId: owner.id };
    await this.db.transaction('rw', this.db.events, this.db.meta, async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
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
  async clear(): Promise<void> {
    await this.db.transaction('rw', this.db.events, this.db.meta, async () => {
      await this.db.events.clear();
      await this.db.meta.clear();
    });
    await this.load();
  }

  /**
   * Records a change made by the signed-in person. Only applied events are saved;
   * rejected ones are returned so the screen can explain what went wrong.
   */
  dispatch(body: EventBody): Promise<ApplyOutcome> {
    const run = this.queue.then(() => this.save(body));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async save(body: EventBody): Promise<ApplyOutcome> {
    const { status, session, deviceId } = this.snapshot;
    if (status !== 'ready' || !session?.staffId || !deviceId) throw new Error('No one is signed in to a shop');
    const event = { id: this.newId(), at: this.now().toISOString(), deviceId, staffId: session.staffId, ...body } as DomainEvent;
    const outcome = applyEvent(this.snapshot.state, event);
    if (outcome.kind === 'applied') {
      await this.db.events.add({ id: event.id, event });
      this.publish({ ...this.snapshot, state: outcome.state });
    }
    return outcome;
  }

  /** Returns to the "who is using this device?" screen without touching shop data. */
  async signOut(): Promise<void> {
    await this.setSession(this.snapshot.session ? { ...this.snapshot.session, staffId: null } : null);
  }

  /** Signs a staff member in with their PIN. Returns false for a wrong PIN or inactive staff. */
  async signIn(staffId: string, pin: string): Promise<boolean> {
    const { config, session } = this.snapshot;
    const staff = config ? staffById(config, staffId) : null;
    if (!session || !staff || !verifyPin(staff, pin)) return false;
    await this.setSession({ ...session, staffId });
    return true;
  }

  private async setSession(session: Session | null): Promise<void> {
    await this.db.meta.put({ key: 'session', value: session });
    this.publish({ ...this.snapshot, session });
  }
}
