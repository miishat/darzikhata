import type { DomainEvent, ReviewItem } from '@darzikhata/domain';
import Dexie, { type EntityTable } from 'dexie';

/**
 * One row per event this device shows, in the order it applies them: everything the
 * server has accepted, then this device's changes it has not sent yet (`pending: 1`).
 */
export interface EventRow {
  seq: number;
  id: string;
  event: DomainEvent;
  pending?: 1;
}

/** Small key-value records: shop setup, signed-in staff, this device's id, sync settings. */
export interface MetaRow {
  key: 'config' | 'session' | 'deviceId' | 'sync';
  value: unknown;
}

/** A photo kept on this device (a data URL), referenced from order items by id. */
export interface PhotoRow {
  id: string;
  dataUrl: string;
  createdAt: string;
}

/** The demo server's log: every event it accepted, in the order it applied them. */
export interface ServerEventRow {
  seq: number;
  id: string;
  event: DomainEvent;
}

/** The demo server's review queue, oldest first. */
export interface ServerReviewRow {
  seq: number;
  eventId: string;
  item: ReviewItem;
}

export class DarziDb extends Dexie {
  events!: EntityTable<EventRow, 'seq'>;
  meta!: EntityTable<MetaRow, 'key'>;
  photos!: EntityTable<PhotoRow, 'id'>;
  serverEvents!: EntityTable<ServerEventRow, 'seq'>;
  serverReview!: EntityTable<ServerReviewRow, 'seq'>;

  constructor(name = 'darzikhata') {
    super(name);
    this.version(1).stores({
      events: '++seq, &id',
      meta: 'key',
    });
    this.version(2).stores({
      events: '++seq, &id',
      meta: 'key',
      photos: 'id',
    });
    // The demo server lives in its own tables, so sync runs through the real domain code.
    this.version(3).stores({
      events: '++seq, &id, pending',
      meta: 'key',
      photos: 'id',
      serverEvents: '++seq, &id',
      serverReview: '++seq, &eventId',
    }).upgrade(async (tx) => {
      // A device saved before sync existed: treat everything it has as already on the server.
      const rows = await tx.table<EventRow, number>('events').orderBy('seq').toArray();
      await tx.table('serverEvents').bulkAdd(rows.map((r) => ({ id: r.id, event: r.event })));
    });
  }
}
