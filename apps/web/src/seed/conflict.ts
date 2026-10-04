import { replay, type DomainEvent, type ShopConfig } from '@darzikhata/domain';
import { addDays, dhakaTime } from './generate';
import type { SeedShopKey } from './shops';

/** The device id used for changes that "another device" sends to the demo server. */
export const OTHER_DEVICE_ID = 'device-other';

/** Who wrote the two clashing notes in each sample shop. */
const AUTHORS: Record<SeedShopKey, { mine: string; theirs: string }> = {
  rahman: { mine: 'rahman-owner', theirs: 'rahman-owner' },
  nakshi: { mine: 'nakshi-counter', theirs: 'nakshi-owner' },
  uniform: { mine: 'uniform-counter', theirs: 'uniform-owner' },
};

export interface SeedConflict {
  /** Applied on the server: the other device changed the customer's notes. */
  theirs: DomainEvent;
  /** Waiting for review: this device changed the phone and notes from the same starting version. */
  mine: DomainEvent;
}

/**
 * The sample review-queue conflict every demo shop starts with. Both edits are based on
 * the fourth customer's version after the seed events; the other device's edit got to
 * the server first, so this device's edit is stale.
 */
export function seedConflict(key: SeedShopKey, config: ShopConfig, events: DomainEvent[], today: string): SeedConflict {
  const customerId = `${key}-c4`;
  const customer = replay(events).state.customers[customerId];
  if (!customer) throw new Error(`Sample customer ${customerId} is missing`);
  const yesterday = addDays(today, -1);
  const author = AUTHORS[key];
  const own = config.devices[0]!.id;
  return {
    theirs: {
      id: `${key}-conflict-theirs`,
      at: dhakaTime(yesterday, 18),
      deviceId: OTHER_DEVICE_ID,
      staffId: author.theirs,
      type: 'customer.updated',
      customerId,
      baseVersion: customer.version,
      changes: { notes: 'কলার একটু ঢিলা পছন্দ করেন' },
    },
    mine: {
      id: `${key}-conflict-mine`,
      at: dhakaTime(yesterday, 18, 30),
      deviceId: own,
      staffId: author.mine,
      type: 'customer.updated',
      customerId,
      baseVersion: customer.version,
      changes: { phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' },
    },
  };
}
