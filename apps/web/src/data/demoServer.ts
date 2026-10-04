import { replay, type SyncServer } from '@darzikhata/domain';
import type { DarziDb } from './db';

/**
 * The in-browser stand-in for the shop's server. It keeps its own log and review queue in
 * separate tables; all decisions about what applies are made by the domain's sync functions.
 */
export class DemoServer {
  constructor(private readonly db: DarziDb) {}

  async load(): Promise<SyncServer> {
    const rows = await this.db.serverEvents.orderBy('seq').toArray();
    const log = rows.map((r) => r.event);
    const review = (await this.db.serverReview.orderBy('seq').toArray()).map((r) => r.item);
    return { log, state: replay(log).state, review };
  }

  /** Saves what changed between two copies of the server. Call it inside a transaction that includes both tables. */
  async save(before: SyncServer, after: SyncServer): Promise<void> {
    const added = after.log.slice(before.log.length);
    if (added.length > 0) await this.db.serverEvents.bulkAdd(added.map((event) => ({ id: event.id, event })));
    await this.db.serverReview.clear();
    if (after.review.length > 0) {
      await this.db.serverReview.bulkAdd(after.review.map((item) => ({ eventId: item.event.id, item })));
    }
  }

  /** Replaces the server with a fresh log and review queue. Call it inside a transaction. */
  async reset(server: SyncServer): Promise<void> {
    await this.db.serverEvents.clear();
    await this.db.serverReview.clear();
    await this.save({ log: [], state: server.state, review: [] }, server);
  }
}
