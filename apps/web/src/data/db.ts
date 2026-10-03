import type { DomainEvent } from '@darzikhata/domain';
import Dexie, { type EntityTable } from 'dexie';

/** One row per event, in the order they were saved on this device. */
export interface EventRow {
  seq: number;
  id: string;
  event: DomainEvent;
}

/** Small key-value records: shop setup, signed-in staff, this device's id. */
export interface MetaRow {
  key: 'config' | 'session' | 'deviceId';
  value: unknown;
}

export class DarziDb extends Dexie {
  events!: EntityTable<EventRow, 'seq'>;
  meta!: EntityTable<MetaRow, 'key'>;

  constructor(name = 'darzikhata') {
    super(name);
    this.version(1).stores({
      events: '++seq, &id',
      meta: 'key',
    });
  }
}
