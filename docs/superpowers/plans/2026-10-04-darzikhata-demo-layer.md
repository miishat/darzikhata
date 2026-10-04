# DarziKhata Demo Layer Implementation Plan (Plan 5 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Everything that makes the prototype work as a demo: simulated offline and sync against an in-browser server, a sync status everyone can see, a review queue for changes that clashed, a presenter mode that walks through the seven scenarios in the spec, end-to-end tests of scenarios 1, 3 and 4 at phone and laptop widths, and deployment.

**Architecture:** The demo server lives in two Dexie tables of its own (`serverEvents`, `serverReview`). Every decision about what applies is made by the domain's existing sync functions (`pushEvents`, `resolveReview`, `currentVersionOf`); `data/demoServer.ts` only loads and saves. The device keeps one log, as before: what the server has accepted, then its own changes not yet sent (marked `pending: 1`). After every sync the device shows exactly the server's log, so a stale edit that went to review disappears from the device until someone settles it. The online switch, pending count, review queue and last sync time live on the store snapshot (`snapshot.sync`). Every sample shop starts with one waiting change, so "Needs attention" and the review queue can be shown straight away. Presenter mode is a pure step engine (`scenarios.ts`, `progress.ts`) that reads the app's state and address; the panel highlights the next control by its `data-tour` name and ticks steps off as they happen.

**Tech Stack:** Unchanged, plus two dev dependencies in `apps/web`: `@playwright/test` (end-to-end tests) and `@types/node` (so the Playwright config and tests type-check). Hosting on Netlify.

**Spec:** [docs/superpowers/specs/2026-10-03-darzikhata-demo-design.md](../specs/2026-10-03-darzikhata-demo-design.md) (sections 2.13, 5.7, 6.3 review queue, 7.1 pending conflict, 7.3, 7.4, 8.2 Playwright, 8.3, 8.4, 9)

**Builds on:** Plan 4, merged to `main` (domain `173` tests, web `332` tests).

## How this plan is written

Like Plans 3 and 4, this plan is light. Each task gives:

- the files it touches;
- what it provides to later tasks;
- the full test code, because the tests are the specification;
- the exact message text the tests look for;
- full code only for the tricky parts: the sync engine in the store and its sample conflict, the review model, the other device's edit, the presenter's scenarios and step engine, and the Playwright setup;
- done-conditions for each screen.

Components, styling and route wiring are not spelled out. Write them test first, following the patterns already in `apps/web` (`features/links/StatusLinkSection.tsx` for a section with its own messages, `ui/Dialog.tsx` for dialogs, `features/settings/ShopSettings.tsx` for `role="status"` and `role="alert"` messages, `features/more/MorePage.tsx` for per-device settings). Where a done-condition and a test seem to disagree, the test wins.

The tricky modules (`seed/conflict.ts`, `data/db.ts`, `data/demoServer.ts`, the store changes, `features/sync/reviewView.ts`, `features/sync/otherDevice.ts`, `features/sync/useSync.ts`, `features/presenter/scenarios.ts`, `features/presenter/progress.ts`, `formatDateTime`) were built and their tests run against `main` while writing this plan: their 40 new tests pass, the existing 332 still pass, and the type check is clean. The end-to-end tests for scenarios 1 and 3 were run against `main` in Chromium at both widths and pass. The screen tests and the scenario 4 end-to-end test have only been type-checked, because their screens do not exist yet.

## Plan series

1. Domain package (done).
2. App foundation (done).
3. Core workflows (done).
4. Operations (done).
5. **Demo layer** (this plan): simulated offline and sync with the full status indicator, the review queue, presenter mode, Playwright end-to-end tests, deployment.

## Global Constraints

Everything in the earlier plans' Global Constraints still applies: `packages/domain` stays pure and unchanged in this plan; only `data/store.ts`, `data/db.ts` and `data/demoServer.ts` touch IndexedDB; every visible string comes from `i18n/bn.ts` and `i18n/en.ts`; money stays integer poisha until display; colours come from the CSS variables; no em dashes; commit messages carry no AI attribution; accessible names are the contract; screens save only through the store; money is never recorded by the keyboard alone; lists of orders read `useScopedState()`.

New in this plan:

- **New dependencies.** Only `@playwright/test` and `@types/node`, both dev dependencies of `apps/web`. Nothing new ships to the browser.
- **The server decides.** Screens never decide whether a change applies. They call `store.setOnline`, `store.syncNow`, `store.pushFromOtherDevice` and `store.resolveReview`, and show the result.
- **Review needs the connection.** Settling a review item talks to the server, so the review queue's buttons are disabled while offline, with `সমাধান করতে অনলাইনে যান।` shown.
- **Who sees a waiting change.** A review item shows only to someone who could make that kind of change (`canReview`, Task 2), and changes to orders outside the chosen branches stay hidden. "Needs attention" counts only the items the signed-in person sees.
- **The demo says it is a demo.** The sync dialog says the server lives in this browser. The other device's edit is a demo action in the sync dialog, never on a record's own screen.
- **Presenter targets are names, not selectors.** A control the presenter points at carries `data-tour="<name>"` from the `TourTarget` list (Task 5). Never highlight by CSS class or text.

## File structure

```
apps/web/
  package.json                           (modify) dev dependencies, e2e and typecheck scripts
  vite.config.ts                         (modify) Vitest runs src/ only
  playwright.config.ts                   end-to-end setup: phone and laptop projects, preview server
  tsconfig.e2e.json                      type check for e2e/ and the Playwright config
  e2e/
    helpers.ts                           open a sample shop, take the scenario 1 order
    first-order.spec.ts                  scenario 1
    collect-one.spec.ts                  scenario 3
    offline-sync.spec.ts                 scenario 4
  src/
    main.tsx                             (modify) sync pause and auto-sync delay
    seed/conflict.ts                     the sample conflict every shop starts with
    data/db.ts                           (modify) version 3: pending mark, server tables
    data/demoServer.ts                   load and save the in-browser server
    data/store.ts                        (modify) sync, other device, review decisions
    data/store.sync.test.ts
    i18n/format.ts                       (modify) formatDateTime
    i18n/format.test.ts
    i18n/I18nProvider.tsx                (modify) dateTime
    shell/SyncStatus.tsx                 status button and sync dialog
    shell/ShellParts.tsx                 (modify) ConnectionBadge and useOnline removed
    shell/DesktopShell.tsx, MobileShell.tsx  (modify) SyncButton, data-tour names
    features/sync/
      reviewView.ts                      review entries, who sees them, merging (pure)
      otherDevice.ts                     the open record and the other device's edit (pure)
      useSync.ts                         visible review items and the sync status
      ReviewPage.tsx                     /app/review
    features/presenter/
      scenarios.ts                       the seven scenarios and their checks (pure)
      progress.ts                        step engine (pure)
      PresenterSetting.tsx               on/off per device, and the root that loads the panel
      PresenterPanel.tsx                 the floating panel (lazy)
      usePresenterRun.ts                 scenario start, context and auto-advance
    app/App.tsx                          (modify) PresenterProvider and PresenterRoot
    app/AppRoutes.tsx                    (modify) /app/review
    features/more/MorePage.tsx           (modify) presenter switch, data-tour on section links
    (several screens)                    (modify) data-tour names, Task 6
netlify.toml                             build, single-page fallback, cache headers
.github/workflows/ci.yml                 type check, unit tests, end-to-end tests
README.md                                what this is, how to run, test and deploy
```

## Routes after this plan

| Path | Page | Needs | Task |
| --- | --- | --- | --- |
| `/app/review` | `ReviewPage` | any of `REVIEW_CAPABILITIES` (`customers.edit`, `measurements.edit`, `orders.edit`, `work.assign`) | 4 |

It is loaded with `lazyPage`, like every other page. It is not in the sidebar or tab bar: people reach it from the sync dialog.

## Test counts

| After task | Web tests |
| --- | --- |
| Start | 332 |
| 1 | 346 |
| 2 | 357 |
| 3 | 364 |
| 4 | 370 |
| 5 | 383 |
| 6 | 388 |
| 7 | 393 |

Domain tests stay at `173`. Tasks 8 to 10 add no unit tests; Task 8 adds 3 end-to-end tests, each run at phone and laptop width (6 runs). Run web tests from `apps/web` with `npx vitest run <path>`, end-to-end tests with `npm run e2e`, and everything else from the repo root with `npm test` and `npm run typecheck`.

## Sample data facts this plan relies on

These come from the seed and do not depend on the date:

- Every shop's sample conflict is about its fourth customer, `<shop>-c4`. In Rahman Tailors that is `সুমন দাস` (phone `01347594519`), and both edits were made by the owner, `আব্দুর রহমান`. The other device set his notes to `কলার একটু ঢিলা পছন্দ করেন`; the waiting change sets his phone to `01712345678` and notes to `বুক পকেট ছাড়া শার্ট`.
- Rahman Tailors' order `A-0032` (`rahman-o32`, customer `rahman-c22`) has three garments, all ready to collect: a shirt and two panjabis, each with measurements. Its first line therefore asks for measurement confirmation when repeated.
- Uniform House's group order `uniform-o27` has its first wearers' garments delivered and its last wearers' garments in work.

---
### Task 1: Sync with the demo server

The store learns to keep changes on the device while offline, send them to the in-browser server, take other devices' changes back, and hold clashing edits for review. Every sample shop starts with one such clash.

**Files:**
- Create: `apps/web/src/seed/conflict.ts`, `apps/web/src/data/demoServer.ts`, `apps/web/src/data/store.sync.test.ts`
- Modify: `apps/web/src/data/db.ts`, `apps/web/src/data/store.ts`, `apps/web/src/main.tsx`

**Provides:**
- `StoreSnapshot.sync: SyncInfo` (`online`, `syncing`, `pending`, `review`, `lastSyncAt`).
- `store.setOnline(online)`, `store.syncNow()`, `store.pushFromOtherDevice(body)`, `store.resolveReview(eventId, decision)`.
- Types `EditBody`, `ReviewDecision`, `ServerOutcome` from `data/store.ts`.
- `OTHER_DEVICE_ID` and `seedConflict` from `seed/conflict.ts`.
- Dexie version 3. A device saved before this plan treats everything it has as already on the server.

How sync works, in one place:

1. A change made on the device is applied locally and saved with `pending: 1`, as before plus the mark.
2. When online, the store syncs a moment after a change (`autoSyncAfterMs`, so a burst of changes such as a batch of stage moves goes in one sync). `syncNow` first shows "Syncing…" and waits `syncDelay`. This pause is outside the store's queue, so changes made during it are not held up; they go in the same sync.
3. The sync itself runs in the queue. It pushes the pending events with the domain's `pushEvents`, saves the server's new log and review queue, then makes the device show exactly the server's log. When the device already holds that log in that order, only the pending marks are cleared and the state object is kept. Otherwise (another device's changes arrived, or one of ours went to review) the device log is rewritten from the server's.
4. The other device's edit and review decisions are made on the server, then the same sync runs.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/data/store.sync.test.ts`:

```ts
import { replay, type EventBody } from '@darzikhata/domain';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { generateShop } from '../seed/generate';
import { DarziDb } from './db';
import { ShopStore, type EditBody } from './store';

let dbCount = 0;
const dbs: Dexie[] = [];

function freshStore(name = `sync-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

function reopen(name: string) {
  const db = new DarziDb(name);
  dbs.push(db);
  return new ShopStore({ db });
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const pay = (id: string): EventBody => ({
  type: 'payment.recorded',
  orderId: 'rahman-o40',
  payment: { id, amount: 10000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
});

const editNotes = (store: ShopStore, customerId: string, notes: string): EditBody => ({
  type: 'customer.updated',
  customerId,
  baseVersion: store.getSnapshot().state.customers[customerId]!.version,
  changes: { notes },
});

const serverIds = async (db: DarziDb) => (await db.serverEvents.orderBy('seq').toArray()).map((r) => r.id);
const deviceIds = async (db: DarziDb) => (await db.events.orderBy('seq').toArray()).map((r) => r.id);

describe('Sync with the demo server', () => {
  it('starts every demo shop online, with nothing pending and the sample conflict waiting', async () => {
    for (const key of ['rahman', 'nakshi', 'uniform'] as const) {
      const { store, db } = freshStore();
      await store.startDemo(key);
      const { sync, state } = store.getSnapshot();
      expect(sync).toMatchObject({ online: true, syncing: false, pending: 0, lastSyncAt: '2026-10-03T06:00:00.000Z' });
      expect(sync.review).toHaveLength(1);
      expect(sync.review[0]).toMatchObject({ outcome: 'conflict', reason: 'stale-edit', event: { id: `${key}-conflict-mine` } });
      expect(state.customers[`${key}-c4`]!.notes).toBe('কলার একটু ঢিলা পছন্দ করেন');
      expect(await deviceIds(db)).toEqual(await serverIds(db));
    }
  });

  it('sends a change to the server straight away when online', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.dispatch(pay('p-online'));
    await store.syncNow();
    expect(store.getSnapshot().sync.pending).toBe(0);
    expect((await serverIds(db)).at(-1)).toBe('new-1');
    expect(await db.events.where('pending').equals(1).count()).toBe(0);
  });

  it('keeps changes on the device while offline, remembers them after a reload, and sends them once back online', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(pay('p-1'));
    await store.dispatch(pay('p-2'));
    expect(await store.syncNow()).toBeNull();
    expect(store.getSnapshot().sync.pending).toBe(2);
    expect(store.getSnapshot().state.orders['rahman-o40']!.payments.map((p) => p.id)).toContain('p-2');
    expect(await serverIds(db)).not.toContain('new-1');

    const reloaded = reopen(name);
    await reloaded.load();
    expect(reloaded.getSnapshot().sync).toMatchObject({ online: false, pending: 2 });

    await reloaded.setOnline(true);
    expect(reloaded.getSnapshot().sync).toMatchObject({ online: true, syncing: false, pending: 0 });
    expect((await serverIds(db)).slice(-2)).toEqual(['new-1', 'new-2']);
  });

  it('keeps taking changes while a sync is starting, and sends them in that sync', async () => {
    const db = new DarziDb(`sync-${++dbCount}`);
    dbs.push(db);
    let open = () => {};
    const gate = new Promise<void>((resolve) => (open = resolve));
    let n = 0;
    const store = new ShopStore({ db, newId: () => `new-${++n}`, syncDelay: () => gate });
    await store.startDemo('rahman');
    const syncing = store.syncNow();
    expect(store.getSnapshot().sync.syncing).toBe(true);
    await store.dispatch(pay('p-during'));
    expect(store.getSnapshot().sync.pending).toBe(1);
    open();
    await syncing;
    expect(store.getSnapshot().sync).toMatchObject({ syncing: false, pending: 0 });
    expect(await serverIds(db)).toContain('new-1');
  });

  it('applies the same events only once, however often they are sent', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(pay('p-once'));
    await store.setOnline(true);
    await store.syncNow();
    await store.syncNow();
    const ids = await serverIds(db);
    expect(ids.filter((id) => id === 'new-1')).toHaveLength(1);
    expect(store.getSnapshot().state.orders['rahman-o40']!.payments.filter((p) => p.id === 'p-once')).toHaveLength(1);
  });

  it('holds a stale offline edit for review and shows the other device’s version instead', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch(editNotes(store, 'rahman-c7', 'এই ডিভাইসের নোট'));
    expect(store.getSnapshot().state.customers['rahman-c7']!.notes).toBe('এই ডিভাইসের নোট');

    // Another device changes the same customer while this one is offline.
    expect(await store.pushFromOtherDevice(editNotes(store, 'rahman-c7', 'অন্য ডিভাইসের নোট'))).toEqual({ ok: true });
    expect(store.getSnapshot().state.customers['rahman-c7']!.notes).toBe('এই ডিভাইসের নোট');

    await store.setOnline(true);
    const results = store.getSnapshot();
    expect(results.state.customers['rahman-c7']!.notes).toBe('অন্য ডিভাইসের নোট');
    expect(results.sync.pending).toBe(0);
    expect(results.sync.review.map((r) => r.event.id)).toEqual(['rahman-conflict-mine', 'new-1']);
    expect(await deviceIds(db)).toEqual(await serverIds(db));

    const reloaded = reopen(name);
    await reloaded.load();
    expect(reloaded.getSnapshot().state).toEqual(store.getSnapshot().state);
    expect(reloaded.getSnapshot().sync.review).toHaveLength(2);
  });

  it('shows another device’s edit straight away when online', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.pushFromOtherDevice(editNotes(store, 'rahman-c7', 'অন্য ডিভাইসের নোট'));
    const customer = store.getSnapshot().state.customers['rahman-c7']!;
    expect(customer.notes).toBe('অন্য ডিভাইসের নোট');
    expect(customer.version).toBe(2);
  });

  it('cannot change from another device a record the server has not seen yet', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    await store.dispatch({
      type: 'customer.created',
      customer: { id: 'walk-in', name: 'করিম', nameAlt: null, phone: null, householdId: null, gender: 'male', notes: '' },
    });
    expect(await store.pushFromOtherDevice(editNotes(store, 'walk-in', 'x'))).toEqual({ ok: false, reason: 'not-on-server' });
  });

  it('keeps the current version, dropping the waiting change', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const before = store.getSnapshot().state;
    expect(await store.resolveReview('rahman-conflict-mine', { kind: 'keepCurrent' })).toEqual({ ok: true });
    expect(store.getSnapshot().sync.review).toEqual([]);
    expect(store.getSnapshot().state).toEqual(before);
    expect(await db.serverReview.count()).toBe(0);
  });

  it('applies the waiting change on top of the current version', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.resolveReview('rahman-conflict-mine', { kind: 'applyMine' });
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' });
    expect(store.getSnapshot().sync.review).toEqual([]);
  });

  it('merges by sending only the parts chosen, as the signed-in person', async () => {
    const { store, db } = freshStore();
    await store.startDemo('nakshi');
    await store.signOut();
    await store.signIn('nakshi-counter', '2222');
    const current = store.getSnapshot().state.customers['nakshi-c4']!;
    const outcome = await store.resolveReview('nakshi-conflict-mine', {
      kind: 'merge',
      body: { type: 'customer.updated', customerId: 'nakshi-c4', baseVersion: current.version, changes: { phone: '01712345678' } },
    });
    expect(outcome).toEqual({ ok: true });
    expect(store.getSnapshot().state.customers['nakshi-c4']).toMatchObject({ phone: '01712345678', notes: 'কলার একটু ঢিলা পছন্দ করেন' });
    const last = (await db.serverEvents.orderBy('seq').last())!.event;
    expect(last).toMatchObject({ type: 'customer.updated', staffId: 'nakshi-counter', deviceId: 'device-a' });
  });

  it('needs the connection to settle a review item', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.setOnline(false);
    expect(await store.resolveReview('rahman-conflict-mine', { kind: 'keepCurrent' })).toEqual({ ok: false, reason: 'offline' });
    await store.setOnline(true);
    expect(await store.resolveReview('missing', { kind: 'keepCurrent' })).toEqual({ ok: false, reason: 'gone' });
  });

  it('clears the demo server with the rest of the demo', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await store.clear();
    expect(await db.serverEvents.count()).toBe(0);
    expect(await db.serverReview.count()).toBe(0);
  });

  it('treats everything on a device saved before sync existed as already on the server', async () => {
    const name = `sync-upgrade-${++dbCount}`;
    const old = new Dexie(name);
    dbs.push(old);
    old.version(2).stores({ events: '++seq, &id', meta: 'key', photos: 'id' });
    const { config, events } = generateShop('rahman', '2026-10-03');
    await old.table('events').bulkAdd(events.map((event) => ({ id: event.id, event })));
    await old.table('meta').bulkPut([
      { key: 'config', value: config },
      { key: 'session', value: { shopKey: 'rahman', staffId: 'rahman-owner' } },
      { key: 'deviceId', value: 'device-a' },
    ]);
    old.close();

    const store = reopen(name);
    await store.load();
    expect(store.getSnapshot().sync).toMatchObject({ online: true, pending: 0, review: [], lastSyncAt: null });
    expect(await store.syncNow()).toEqual([]);
    expect(store.getSnapshot().state).toEqual(replay(events).state);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run (from `apps/web`): `npx vitest run src/data/store.sync.test.ts`
Expected: FAIL. `store.setOnline` is not a function, and `snapshot.sync` is undefined.

- [ ] **Step 3: Add the sample conflict**

Create `apps/web/src/seed/conflict.ts`:

```ts
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
```

- [ ] **Step 4: Add the server tables and the server**

Replace `apps/web/src/data/db.ts`:

```ts
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
```

Create `apps/web/src/data/demoServer.ts`:

```ts
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
```

- [ ] **Step 5: Teach the store to sync**

Make these changes to `apps/web/src/data/store.ts`. Everything not shown stays as it is.

The imports become:

```ts
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
```

Add `SyncInfo` and the `sync` field to the snapshot, and the two new options to `StoreDeps`:

```ts
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
```

Below `ConfigOutcome`, add the new types and replace `LOADING`:

```ts
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
```

The class gets the server, the two options and the auto-sync timer:

```ts
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
```

`meta` accepts the new `'sync'` key: `private async meta<T>(key: 'config' | 'session' | 'deviceId' | 'sync')`.

`load` reads the saved online switch, the pending count and the server's review queue:

```ts
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
```

`doStartDemo` builds the server with the sample conflict, and `doClear` clears the server too:

```ts
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
```

`dispatch` and `dispatchBatch` mark what they save as pending and ask for a sync:

```ts
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
```

and at the end of `saveBatch`:

```ts
    await this.db.events.bulkAdd(events.map((event) => ({ id: event.id, event, pending: 1 as const })));
    this.publish({ ...this.snapshot, state, sync: { ...this.snapshot.sync, pending: this.snapshot.sync.pending + events.length } });
    return { ok: true, outcomes };
```

Add the sync methods after `updateConfig`, before `signOut`:

```ts
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
```

- [ ] **Step 6: Give the real app a visible pause**

In `apps/web/src/main.tsx`, create the store with:

```ts
// A short pause makes "Syncing…" visible, and auto-sync waits for a burst of changes to finish.
const store = new ShopStore({
  db: new DarziDb(),
  syncDelay: () => new Promise((resolve) => setTimeout(resolve, 600)),
  autoSyncAfterMs: 400,
});
```

Tests and `renderApp` leave both out, so syncs there run at once.

- [ ] **Step 7: Run the tests and watch them pass**

Run: `npx vitest run src/data`
Expected: PASS, including the existing store tests, which do not change.

Run: `npx vitest run`
Expected: `346` tests pass. Every shop now has the sample conflict's other-device edit applied to its fourth customer's notes; no existing test depends on those notes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/seed/conflict.ts apps/web/src/data apps/web/src/main.tsx
git commit -m "feat(web): sync with an in-browser demo server, with a sample conflict in every shop"
```

---
### Task 2: Review entries and the other device's edit

Two pure modules the screens build on: one describes a waiting change against what the record holds now and decides who may settle it; the other finds the record open on screen and writes the edit "another device" sends.

**Files:**
- Create: `apps/web/src/features/sync/reviewView.ts`, `reviewView.test.ts`, `otherDevice.ts`, `otherDevice.test.ts`, `useSync.ts`

**Provides:**
- `reviewEntry(item, state)`: the record (`subject`), who and when, the rows that differ (`field`, `current`, `waiting`, each a tagged value), and whether the waiting change can be applied (`canApplyMine`) or merged field by field (`canMerge`).
- `canReview(item, scopedState, role)` and `REVIEW_CAPABILITIES`.
- `mergeBody(item, state, take)`: the edit that takes only the chosen fields from the waiting change.
- `otherDeviceTarget(pathname, state)` and `otherDeviceEdit(target, state, note)`.
- `useVisibleReview()` and `useSyncStatus()`.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/sync/reviewView.test.ts`:

```ts
import { createServer, pushEvents, roleOf, type DomainEvent, type ReviewItem, type ShopState } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { seedConflict } from '../../seed/conflict';
import { generateShop } from '../../seed/generate';
import type { SeedShopKey } from '../../seed/shops';
import { scopeState } from '../branches/branchScope';
import { canReview, mergeBody, reviewEntry } from './reviewView';

const TODAY = '2026-10-03';

/** A demo shop's server after the sample conflict, plus any further stale edits pushed to it. */
function shop(key: SeedShopKey, extra: (state: ShopState) => DomainEvent[] = () => []) {
  const { config, events } = generateShop(key, TODAY);
  const conflict = seedConflict(key, config, events, TODAY);
  let server = pushEvents(createServer([...events, conflict.theirs]), [conflict.mine]).server;
  server = pushEvents(server, extra(server.state)).server;
  return { config, state: server.state, review: server.review };
}

const meta = (id: string) => ({ id, at: '2026-10-02T12:00:00.000Z', deviceId: 'device-a', staffId: 'uniform-counter' });

describe('Review entries', () => {
  it('shows the sample conflict field by field, current against waiting', () => {
    const { state, review } = shop('rahman');
    const before = state.customers['rahman-c4']!;
    const entry = reviewEntry(review[0]!, state);
    expect(entry).toMatchObject({
      eventId: 'rahman-conflict-mine',
      outcome: 'conflict',
      reason: 'stale-edit',
      subject: { kind: 'customer', customerId: 'rahman-c4', name: before.name },
      staffId: 'rahman-owner',
      canApplyMine: true,
      canMerge: true,
    });
    expect(entry.rows).toEqual([
      { field: 'phone', current: { kind: 'text', value: before.phone }, waiting: { kind: 'text', value: '01712345678' } },
      {
        field: 'notes',
        current: { kind: 'text', value: 'কলার একটু ঢিলা পছন্দ করেন' },
        waiting: { kind: 'text', value: 'বুক পকেট ছাড়া শার্ট' },
      },
    ]);
  });

  it('leaves out fields that already match and only merges when two or more differ', () => {
    const { state, review } = shop('rahman', (s) => [
      {
        ...meta('same-notes'),
        type: 'customer.updated',
        customerId: 'rahman-c4',
        baseVersion: s.customers['rahman-c4']!.version - 1,
        changes: { notes: 'কলার একটু ঢিলা পছন্দ করেন', phone: '01999999999' },
      },
    ]);
    const entry = reviewEntry(review[1]!, state);
    expect(entry.rows.map((r) => r.field)).toEqual(['phone']);
    expect(entry.canApplyMine).toBe(true);
    expect(entry.canMerge).toBe(false);
  });

  it('describes a stale garment edit and assignment with the order number and garment', () => {
    const { state, review } = shop('uniform', (s) => {
      const order = s.orders['uniform-o27']!;
      const garment = order.items[0]!;
      return [
        { ...meta('price'), type: 'item.updated', orderId: order.id, itemId: garment.id, baseVersion: garment.version - 1, changes: { price: 99900 } },
        { ...meta('assign'), type: 'item.assigned', orderId: order.id, itemId: garment.id, baseVersion: garment.version - 1, assigneeId: null },
      ];
    });
    const garment = state.orders['uniform-o27']!.items[0]!;
    const [price, assign] = review.slice(1).map((item) => reviewEntry(item, state));
    expect(price!.subject).toEqual({ kind: 'order', orderId: 'uniform-o27', number: state.orders['uniform-o27']!.number, garment: garment.garmentName });
    expect(price!.rows).toEqual([{ field: 'price', current: { kind: 'money', value: garment.price }, waiting: { kind: 'money', value: 99900 } }]);
    expect(assign!.rows).toEqual([
      { field: 'assignee', current: { kind: 'staff', value: garment.assignedTo }, waiting: { kind: 'staff', value: null } },
    ]);
  });

  it('offers only dismissal for a change the server refused', () => {
    const { state } = shop('rahman');
    const refused: ReviewItem = {
      event: { ...meta('gone'), type: 'item.stageChanged', orderId: 'missing', itemId: 'x', to: 'ready', reason: '' },
      outcome: 'rejected',
      reason: 'unknown-order',
      currentVersion: null,
    };
    expect(reviewEntry(refused, state)).toMatchObject({ subject: null, rows: [], canApplyMine: false, canMerge: false, reason: 'unknown-order' });
  });
});

describe('Who sees a review item', () => {
  it('needs the right to edit what the change is about', () => {
    const { config, state, review } = shop('nakshi');
    expect(canReview(review[0]!, state, roleOf(config, 'nakshi-counter')!)).toBe(true);
    expect(canReview(review[0]!, state, roleOf(config, 'nakshi-tailor')!)).toBe(false);
  });

  it('hides changes to orders outside the chosen branches, but never customers', () => {
    const { config, state, review } = shop('uniform', (s) => {
      const garment = s.orders['uniform-o27']!.items[0]!;
      return [{ ...meta('workshop'), type: 'item.updated', orderId: 'uniform-o27', itemId: garment.id, baseVersion: garment.version - 1, changes: { price: 1 } }];
    });
    const owner = roleOf(config, 'uniform-owner')!;
    const shopOnly = scopeState(state, ['shop']);
    expect(canReview(review[1]!, state, owner)).toBe(true);
    expect(canReview(review[1]!, shopOnly, owner)).toBe(false);
    expect(canReview(review[0]!, shopOnly, owner)).toBe(true);
  });
});

describe('Merging', () => {
  it('takes only the chosen fields, based on the current version', () => {
    const { state, review } = shop('rahman');
    const current = state.customers['rahman-c4']!;
    expect(mergeBody(review[0]!, state, ['phone'])).toEqual({
      type: 'customer.updated',
      customerId: 'rahman-c4',
      baseVersion: current.version,
      changes: { phone: '01712345678' },
    });
    expect(mergeBody(review[0]!, state, [])).toBeNull();
  });
});
```

Create `apps/web/src/features/sync/otherDevice.test.ts`:

```ts
import { itemSummaryGroup, replay } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { generateShop } from '../../seed/generate';
import { otherDeviceEdit, otherDeviceTarget } from './otherDevice';

const { state } = replay(generateShop('rahman', '2026-10-03').events);

describe('Another device’s edit', () => {
  it('targets the customer open on a profile, edit or measurement screen', () => {
    for (const path of ['/app/customers/rahman-c2', '/app/customers/rahman-c2/edit', '/app/customers/rahman-c2/measure/shirt']) {
      expect(otherDeviceTarget(path, state)).toEqual({ kind: 'customer', customerId: 'rahman-c2' });
    }
  });

  it('targets the first garment still in work on an open order', () => {
    // In Uniform House's group order the first wearers' garments are delivered and the last are in work.
    const uniform = replay(generateShop('uniform', '2026-10-03').events).state;
    const order = uniform.orders['uniform-o27']!;
    expect(itemSummaryGroup(order.items[0]!)).toBe('delivered');
    const garment = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    expect(otherDeviceTarget('/app/orders/uniform-o27', uniform)).toEqual({ kind: 'item', orderId: 'uniform-o27', itemId: garment.id });
  });

  it('has nothing to change elsewhere', () => {
    for (const path of ['/app/orders', '/app/orders/new', '/app/customers', '/app/customers/new', '/app/customers/nobody', '/app/work']) {
      expect(otherDeviceTarget(path, state)).toBeNull();
    }
  });

  it('writes a note based on the version this device shows', () => {
    const customer = state.customers['rahman-c2']!;
    expect(otherDeviceEdit({ kind: 'customer', customerId: 'rahman-c2' }, state, 'নোট')).toEqual({
      type: 'customer.updated',
      customerId: 'rahman-c2',
      baseVersion: customer.version,
      changes: { notes: 'নোট' },
    });
    const order = Object.values(state.orders)[0]!;
    const garment = order.items[0]!;
    expect(otherDeviceEdit({ kind: 'item', orderId: order.id, itemId: garment.id }, state, 'নোট')).toEqual({
      type: 'item.updated',
      orderId: order.id,
      itemId: garment.id,
      baseVersion: garment.version,
      changes: { designNotes: 'নোট' },
    });
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/sync`
Expected: FAIL, the modules do not exist.

- [ ] **Step 3: Write the review model**

Create `apps/web/src/features/sync/reviewView.ts`:

```ts
import {
  can,
  currentVersionOf,
  isEditEvent,
  type Capability,
  type Discount,
  type Gender,
  type Label,
  type Poisha,
  type ReviewItem,
  type Role,
  type ShopState,
} from '@darzikhata/domain';
import type { EditBody } from '../../data/store';

export type ReviewField =
  | 'name'
  | 'nameAlt'
  | 'phone'
  | 'householdId'
  | 'gender'
  | 'notes'
  | 'price'
  | 'designNotes'
  | 'fabricNote'
  | 'trialDate'
  | 'deliveryDate'
  | 'wearer'
  | 'assignee'
  | 'discount';

/** A value as stored, tagged with how to show it. */
export type ReviewValue =
  | { kind: 'text'; value: string | null }
  | { kind: 'date'; value: string | null }
  | { kind: 'money'; value: Poisha }
  | { kind: 'staff'; value: string | null }
  | { kind: 'gender'; value: Gender | null }
  | { kind: 'household'; value: string | null }
  | { kind: 'discount'; value: Discount | null };

/** One field the waiting change touches: what the record holds now, and what the change wanted. */
export interface ReviewRow {
  field: ReviewField;
  current: ReviewValue;
  waiting: ReviewValue;
}

export type ReviewSubject =
  | { kind: 'customer'; customerId: string; name: string }
  | { kind: 'order'; orderId: string; number: string; garment: Label | null };

export interface ReviewEntry {
  eventId: string;
  outcome: ReviewItem['outcome'];
  /** 'stale-edit' for conflicts, otherwise why the server refused the change. */
  reason: string;
  /** The record the change is about, or null when it no longer exists. */
  subject: ReviewSubject | null;
  staffId: string;
  at: string;
  /** Only the fields whose waiting value differs from the current one. */
  rows: ReviewRow[];
  /** A stale edit whose record still exists can be applied on top of the current version. */
  canApplyMine: boolean;
  /** Parts can be chosen one by one when the change touches two or more differing fields. */
  canMerge: boolean;
}

const CUSTOMER_FIELDS = ['name', 'nameAlt', 'phone', 'householdId', 'gender', 'notes'] as const;
const ITEM_FIELDS = ['price', 'designNotes', 'fabricNote', 'trialDate', 'deliveryDate', 'wearer'] as const;

function customerValue(field: (typeof CUSTOMER_FIELDS)[number], value: unknown): ReviewValue {
  if (field === 'gender') return { kind: 'gender', value: (value as Gender | null) ?? null };
  if (field === 'householdId') return { kind: 'household', value: (value as string | null) ?? null };
  return { kind: 'text', value: (value as string | null) ?? null };
}

function itemValue(field: (typeof ITEM_FIELDS)[number], value: unknown): ReviewValue {
  if (field === 'price') return { kind: 'money', value: value as Poisha };
  if (field === 'trialDate' || field === 'deliveryDate') return { kind: 'date', value: (value as string | null) ?? null };
  return { kind: 'text', value: (value as string | null) ?? null };
}

const differs = (row: ReviewRow) => JSON.stringify(row.current.value) !== JSON.stringify(row.waiting.value);

function rowsFor(item: ReviewItem, state: ShopState): ReviewRow[] {
  const { event } = item;
  switch (event.type) {
    case 'customer.updated': {
      const customer = state.customers[event.customerId];
      if (!customer) return [];
      return CUSTOMER_FIELDS.filter((f) => event.changes[f] !== undefined)
        .map((f) => ({ field: f, current: customerValue(f, customer[f]), waiting: customerValue(f, event.changes[f]) }))
        .filter(differs);
    }
    case 'item.updated': {
      const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
      if (!garment) return [];
      return ITEM_FIELDS.filter((f) => event.changes[f] !== undefined)
        .map((f) => ({ field: f, current: itemValue(f, garment[f]), waiting: itemValue(f, event.changes[f]) }))
        .filter(differs);
    }
    case 'item.assigned': {
      const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
      if (!garment) return [];
      const row: ReviewRow = {
        field: 'assignee',
        current: { kind: 'staff', value: garment.assignedTo },
        waiting: { kind: 'staff', value: event.assigneeId },
      };
      return [row].filter(differs);
    }
    case 'order.discountSet': {
      const order = state.orders[event.orderId];
      if (!order) return [];
      const row: ReviewRow = {
        field: 'discount',
        current: { kind: 'discount', value: order.discount },
        waiting: { kind: 'discount', value: event.discount },
      };
      return [row].filter(differs);
    }
    default:
      return [];
  }
}

function subjectFor(item: ReviewItem, state: ShopState): ReviewSubject | null {
  const { event } = item;
  if ('customerId' in event && event.type !== 'measurement.recorded') {
    const customer = state.customers[event.customerId];
    return customer ? { kind: 'customer', customerId: customer.id, name: customer.name } : null;
  }
  if ('orderId' in event) {
    const order = state.orders[event.orderId];
    if (!order) return null;
    const garment = 'itemId' in event ? (order.items.find((i) => i.id === event.itemId)?.garmentName ?? null) : null;
    return { kind: 'order', orderId: order.id, number: order.number, garment };
  }
  return null;
}

/** Describes a review item against the device's current state. */
export function reviewEntry(item: ReviewItem, state: ShopState): ReviewEntry {
  const rows = rowsFor(item, state);
  const canApplyMine = item.outcome === 'conflict' && isEditEvent(item.event) && currentVersionOf(state, item.event) !== null;
  return {
    eventId: item.event.id,
    outcome: item.outcome,
    reason: item.reason,
    subject: subjectFor(item, state),
    staffId: item.event.staffId,
    at: item.event.at,
    rows,
    canApplyMine,
    canMerge: canApplyMine && (item.event.type === 'customer.updated' || item.event.type === 'item.updated') && rows.length >= 2,
  };
}

/** Anyone with one of these may open the review queue. */
export const REVIEW_CAPABILITIES: Capability[] = ['customers.edit', 'measurements.edit', 'orders.edit', 'work.assign'];

/** What a person needs to settle a review item about this kind of change. */
function capabilityFor(item: ReviewItem): Capability {
  switch (item.event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
      return 'customers.edit';
    case 'measurement.recorded':
      return 'measurements.edit';
    case 'item.assigned':
      return 'work.assign';
    default:
      return 'orders.edit';
  }
}

/**
 * Whether this person sees a review item. `state` is the branch-scoped state, so changes to
 * orders outside the chosen branches stay hidden. Customers belong to the whole shop.
 */
export function canReview(item: ReviewItem, state: ShopState, role: Role): boolean {
  if (!can(role, capabilityFor(item))) return false;
  const { event } = item;
  return 'orderId' in event ? Boolean(state.orders[event.orderId]) : true;
}

/**
 * The edit to send when merging: only the fields the person chose to take from the waiting
 * change, based on the record's current version. Null when nothing was chosen.
 */
export function mergeBody(item: ReviewItem, state: ShopState, take: ReviewField[]): EditBody | null {
  const { event } = item;
  if (take.length === 0) return null;
  if (event.type === 'customer.updated') {
    const customer = state.customers[event.customerId];
    if (!customer) return null;
    const changes = Object.fromEntries(CUSTOMER_FIELDS.filter((f) => take.includes(f)).map((f) => [f, event.changes[f]]));
    return { type: 'customer.updated', customerId: event.customerId, baseVersion: customer.version, changes };
  }
  if (event.type === 'item.updated') {
    const garment = state.orders[event.orderId]?.items.find((i) => i.id === event.itemId);
    if (!garment) return null;
    const changes = Object.fromEntries(ITEM_FIELDS.filter((f) => take.includes(f)).map((f) => [f, event.changes[f]]));
    return { type: 'item.updated', orderId: event.orderId, itemId: event.itemId, baseVersion: garment.version, changes };
  }
  return null;
}
```

- [ ] **Step 4: Write the other device's edit**

Create `apps/web/src/features/sync/otherDevice.ts`:

```ts
import { itemSummaryGroup, type ShopState } from '@darzikhata/domain';
import type { EditBody } from '../../data/store';

/** The record open on screen that "another device" can change in the demo. */
export type OtherDeviceTarget =
  | { kind: 'customer'; customerId: string }
  | { kind: 'item'; orderId: string; itemId: string };

/**
 * Finds the open record from the address: a customer's profile, edit or measurement screen, or
 * an order's detail (its first garment still in work, or else its first garment not cancelled).
 */
export function otherDeviceTarget(pathname: string, state: ShopState): OtherDeviceTarget | null {
  const customer = /^\/app\/customers\/([^/]+)/.exec(pathname)?.[1];
  if (customer && customer !== 'new' && state.customers[customer]) return { kind: 'customer', customerId: customer };
  const orderId = /^\/app\/orders\/([^/]+)$/.exec(pathname)?.[1];
  const order = orderId && orderId !== 'new' ? state.orders[orderId] : undefined;
  if (!order) return null;
  const live = order.items.filter((i) => !i.cancelled);
  const garment = live.find((i) => itemSummaryGroup(i) === 'unfinished') ?? live[0];
  return garment ? { kind: 'item', orderId: order.id, itemId: garment.id } : null;
}

/** The edit the other device sends: a note that is easy to spot, based on the version this device shows. */
export function otherDeviceEdit(target: OtherDeviceTarget, state: ShopState, note: string): EditBody | null {
  if (target.kind === 'customer') {
    const customer = state.customers[target.customerId];
    if (!customer) return null;
    return { type: 'customer.updated', customerId: customer.id, baseVersion: customer.version, changes: { notes: note } };
  }
  const garment = state.orders[target.orderId]?.items.find((i) => i.id === target.itemId);
  if (!garment) return null;
  return {
    type: 'item.updated',
    orderId: target.orderId,
    itemId: garment.id,
    baseVersion: garment.version,
    changes: { designNotes: note },
  };
}
```

- [ ] **Step 5: Add the hooks the screens use**

Create `apps/web/src/features/sync/useSync.ts`:

```ts
import { syncStatus, type ReviewItem, type SyncStatus } from '@darzikhata/domain';
import { useMemo } from 'react';
import { useCurrentStaff, useSnapshot } from '../../data/StoreContext';
import { useScopedState } from '../branches/BranchScopeProvider';
import { canReview } from './reviewView';

/** The review items the signed-in person may settle, within the chosen branches. */
export function useVisibleReview(): ReviewItem[] {
  const { sync } = useSnapshot();
  const scoped = useScopedState();
  const role = useCurrentStaff()?.role ?? null;
  return useMemo(() => (role ? sync.review.filter((item) => canReview(item, scoped, role)) : []), [sync.review, scoped, role]);
}

/** Online, offline, syncing, or needs attention when something here waits for this person. */
export function useSyncStatus(): SyncStatus {
  const { sync } = useSnapshot();
  const review = useVisibleReview();
  return syncStatus({ online: sync.online, syncing: sync.syncing, reviewCount: review.length });
}
```

- [ ] **Step 6: Run the tests and watch them pass**

Run: `npx vitest run src/features/sync`
Expected: PASS (11 tests). Then `npx vitest run`: `357`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/sync
git commit -m "feat(web): describe waiting changes and the demo's other-device edit"
```

---
### Task 3: Sync status in the shell

The header's online badge becomes a button that shows the full sync status and opens a dialog with the online switch, the pending count, the last sync time, a way into the review queue, and the demo's other-device edit.

**Files:**
- Create: `apps/web/src/shell/SyncStatus.tsx`, `apps/web/src/shell/SyncStatus.test.tsx`, `apps/web/src/i18n/format.test.ts`
- Modify: `apps/web/src/i18n/format.ts`, `apps/web/src/i18n/I18nProvider.tsx`, `apps/web/src/shell/ShellParts.tsx`, `apps/web/src/shell/DesktopShell.tsx`, `apps/web/src/shell/MobileShell.tsx`, `apps/web/src/i18n/bn.ts`, `apps/web/src/i18n/en.ts`

**Provides:** `SyncButton` (with `data-tour="sync-status"`), and `dateTime(value)` on the `I18n` object.

Messages (add to `bn.ts` and `en.ts`; remove `shell.online` and `shell.offline`):

| Key | Bangla | English |
| --- | --- | --- |
| `sync.online` | অনলাইন | Online |
| `sync.offline` | অফলাইন | Offline |
| `sync.syncing` | সিঙ্ক হচ্ছে… | Syncing… |
| `sync.needsAttention` | দেখতে হবে | Needs attention |
| `sync.waiting` | সিঙ্ক বাকি {count} | {count} to sync |
| `sync.title` | সিঙ্ক | Sync |
| `sync.pending` | এই ডিভাইসে সিঙ্ক বাকি: {count}টি পরিবর্তন | Waiting on this device: {count} changes |
| `sync.allSent` | সব পরিবর্তন সিঙ্ক হয়েছে | All changes are synced |
| `sync.last` | শেষ সিঙ্ক: {time} | Last synced: {time} |
| `sync.never` | এখনো সিঙ্ক হয়নি | Not synced yet |
| `sync.goOffline` | অফলাইনে যান | Go offline |
| `sync.goOnline` | অনলাইনে যান | Go online |
| `sync.now` | এখনই সিঙ্ক করুন | Sync now |
| `sync.reviewCount` | যাচাই করতে হবে: {count}টি পরিবর্তন | To review: {count} changes |
| `sync.openReview` | যাচাই করুন | Review |
| `sync.demoNote` | ডেমোতে সার্ভারটি এই ব্রাউজারের ভেতরেই থাকে, তাই ইন্টারনেট লাগে না। | In the demo the server lives inside this browser, so no internet is needed. |
| `sync.other` | অন্য ডিভাইস থেকে বদলান | Change from another device |
| `sync.otherHint` | খোলা কাস্টমার বা অর্ডারে অন্য একটি ডিভাইস একটি নোট লিখবে। | Another device writes a note on the customer or order open on screen. |
| `sync.otherNone` | আগে একটি কাস্টমার বা অর্ডার খুলুন। | Open a customer or an order first. |
| `sync.otherDone` | অন্য ডিভাইসের পরিবর্তন এসেছে। | The other device's change has arrived. |
| `sync.otherQueued` | অন্য ডিভাইস পরিবর্তনটি সার্ভারে পাঠিয়েছে। অনলাইনে গেলে এখানে আসবে। | The other device has sent its change to the server. It arrives here when you go online. |
| `sync.otherNotOnServer` | এটি এখনো সার্ভারে যায়নি। আগে সিঙ্ক করুন। | This has not reached the server yet. Sync first. |
| `sync.otherCustomerNote` | অন্য ডিভাইস থেকে লেখা নোট | Note written on another device |
| `sync.otherItemNote` | অন্য ডিভাইস থেকে লেখা ডিজাইনের নোট | Design note written on another device |

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/i18n/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatDateTime } from './format';

describe('Date and time', () => {
  it('shows a timestamp in Dhaka time, in either script', () => {
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'bn')).toBe('৩ অক্টোবর, ১২:০৫');
    expect(formatDateTime('2026-10-03T06:05:00.000Z', 'en')).toBe('3 Oct, 12:05');
  });

  it('moves to the next day after 6 pm UTC', () => {
    expect(formatDateTime('2026-10-03T18:30:00.000Z', 'en')).toBe('4 Oct, 00:30');
  });
});
```

Create `apps/web/src/shell/SyncStatus.test.tsx`:

```tsx
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const openSync = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /^(অনলাইন|অফলাইন|সিঙ্ক হচ্ছে…|দেখতে হবে)/ }));
  return screen.findByRole('dialog', { name: 'সিঙ্ক' });
};

const payment = {
  type: 'payment.recorded',
  orderId: 'rahman-o40',
  payment: { id: 'p-offline', amount: 10000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
} as const;

describe('Sync status', () => {
  it('says the sample change needs attention to someone who can settle it', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/orders' });
    const button = await screen.findByRole('button', { name: 'দেখতে হবে' });
    expect(button.getAttribute('data-tour')).toBe('sync-status');
    const dialog = await openSync();
    expect(within(dialog).getByText('যাচাই করতে হবে: ১টি পরিবর্তন')).toBeTruthy();
    const link = within(dialog).getByRole('link', { name: 'যাচাই করুন' });
    expect(link.getAttribute('href')).toBe('/app/review');
    expect(link.getAttribute('data-tour')).toBe('review-link');
  });

  it('shows the tailor plain online, since the waiting change is not theirs to settle', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/work', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect(await screen.findByRole('button', { name: 'অনলাইন' })).toBeTruthy();
    const dialog = await openSync();
    expect(within(dialog).queryByRole('link', { name: 'যাচাই করুন' })).toBeNull();
  });

  it('goes offline, counts waiting changes, and sends them when back online', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    let dialog = await openSync();
    expect(within(dialog).getByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeTruthy();
    expect(within(dialog).getByText(/^শেষ সিঙ্ক: /)).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'অফলাইনে যান' }));
    expect(await within(dialog).findByRole('button', { name: 'অনলাইনে যান' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'এখনই সিঙ্ক করুন' })).toHaveProperty('disabled', true);
    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));

    await act(() => store.dispatch(payment));
    expect(await screen.findByRole('button', { name: 'অফলাইন · সিঙ্ক বাকি ১' })).toBeTruthy();
    dialog = await openSync();
    expect(within(dialog).getByText('এই ডিভাইসে সিঙ্ক বাকি: ১টি পরিবর্তন')).toBeTruthy();
    await userEvent.click(within(dialog).getByRole('button', { name: 'অনলাইনে যান' }));
    expect(await within(dialog).findByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().sync).toMatchObject({ online: true, pending: 0 });
    expect(screen.getByRole('button', { name: 'দেখতে হবে' })).toBeTruthy();
  });

  it('lets another device change the open customer, at once when online and after a sync when offline', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    const dialog = await openSync();
    await userEvent.click(within(dialog).getByRole('button', { name: 'অন্য ডিভাইস থেকে বদলান' }));
    expect(await within(dialog).findByText('অন্য ডিভাইসের পরিবর্তন এসেছে।')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c2']).toMatchObject({ notes: 'অন্য ডিভাইস থেকে লেখা নোট', version: 2 });

    await userEvent.click(within(dialog).getByRole('button', { name: 'অফলাইনে যান' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'অন্য ডিভাইস থেকে বদলান' }));
    expect(await within(dialog).findByText('অন্য ডিভাইস পরিবর্তনটি সার্ভারে পাঠিয়েছে। অনলাইনে গেলে এখানে আসবে।')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c2']!.version).toBe(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'অনলাইনে যান' }));
    await within(dialog).findByRole('button', { name: 'অফলাইনে যান' });
    expect(store.getSnapshot().state.customers['rahman-c2']!.version).toBe(3);
  });

  it('has nothing for another device to change until a customer or order is open', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/work' });
    const dialog = await openSync();
    expect(within(dialog).getByRole('button', { name: 'অন্য ডিভাইস থেকে বদলান' })).toHaveProperty('disabled', true);
    expect(within(dialog).getByText('আগে একটি কাস্টমার বা অর্ডার খুলুন।')).toBeTruthy();
    expect(within(dialog).getByText('ডেমোতে সার্ভারটি এই ব্রাউজারের ভেতরেই থাকে, তাই ইন্টারনেট লাগে না।')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/i18n/format.test.ts src/shell/SyncStatus.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Add the date and time format**

Add to `apps/web/src/i18n/format.ts`:

```ts
/** An ISO timestamp as Dhaka date and 24-hour time: "৩ অক্টোবর, ১২:০৫" / "3 Oct, 12:05". */
export function formatDateTime(value: string, language: Language): string {
  const dhaka = new Date(new Date(value).getTime() + 6 * 60 * 60 * 1000);
  const time = `${String(dhaka.getUTCHours()).padStart(2, '0')}:${String(dhaka.getUTCMinutes()).padStart(2, '0')}`;
  return `${formatDate(value, language, { year: false })}, ${toScript(time, language)}`;
}
```

Add `dateTime(value: string): string` to the `I18n` interface and `dateTime: (v) => formatDateTime(v, language)` to its value in `I18nProvider.tsx`.

- [ ] **Step 4: Build the status button and dialog**

Done when:

- `SyncButton` replaces `ConnectionBadge` in both headers. It is a `<button type="button" data-tour="sync-status">` with a coloured dot (`aria-hidden`): brand colour when online, accent when offline or needing attention, muted while syncing. Its text and accessible name are the status from `useSyncStatus()` (`sync.online`, `sync.offline`, `sync.syncing`, `sync.needsAttention`), followed by ` · ` and `sync.waiting` when `pending > 0`, with the count in the person's digits (`অফলাইন · সিঙ্ক বাকি ১`).
- Clicking it opens a `Dialog` titled `sync.title` (`সিঙ্ক`). In order, the dialog shows:
  1. `sync.pending` with the count, or `sync.allSent` when nothing waits.
  2. `sync.last` with `dateTime(lastSyncAt)`, or `sync.never`.
  3. One button that switches the connection: `sync.goOffline` while online, `sync.goOnline` while offline. It calls `store.setOnline`.
  4. `sync.now`, disabled while offline or syncing. It calls `store.syncNow()`.
  5. When `useVisibleReview()` is not empty: `sync.reviewCount` with the count, and a link `sync.openReview` to `/app/review` with `data-tour="review-link"`. Following it closes the dialog.
  6. A demo part under the heading `more.demo`: `sync.demoNote`, then the button `sync.other`. Under the button, `sync.otherHint` when `otherDeviceTarget(location.pathname, state)` finds a record; otherwise the button is disabled and `sync.otherNone` shows instead. Clicking builds `otherDeviceEdit(target, state, t('sync.otherCustomerNote' or 'sync.otherItemNote'))` and calls `store.pushFromOtherDevice`. The outcome shows in a `role="status"` element inside the dialog: `sync.otherDone` when online, `sync.otherQueued` when offline, `sync.otherNotOnServer` for `not-on-server`.
  7. The action `common.close`.
- `useOnline` and `ConnectionBadge` are deleted from `ShellParts.tsx`.
- On a phone the button fits the header beside the shop name and the switch-user button at 375px.

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run src/i18n src/shell`
Expected: PASS. Then `npx vitest run`: `364`. If an existing test looked for the old badge's `role="status"`, it now finds the button instead; change only the query, not what it checks.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shell apps/web/src/i18n
git commit -m "feat(web): show sync status in the header with an online switch and the other-device edit"
```

---

### Task 4: Review queue

`/app/review` lists the changes the server could not apply, each beside what the record holds now, and lets a person keep the current version, use the waiting change, or merge field by field.

**Files:**
- Create: `apps/web/src/features/sync/ReviewPage.tsx`, `apps/web/src/features/sync/ReviewPage.test.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx`, `apps/web/src/i18n/bn.ts`, `apps/web/src/i18n/en.ts`

**Provides:** the route `/app/review`, and `data-tour="review-item"` on each entry.

Messages:

| Key | Bangla | English |
| --- | --- | --- |
| `review.title` | যাচাইয়ের তালিকা | Review queue |
| `review.intro` | এই পরিবর্তনগুলো সার্ভারে পৌঁছানোর আগেই রেকর্ডগুলো অন্য কোথাও বদলেছে। কোনটা থাকবে বেছে নিন। | These records changed somewhere else before these changes reached the server. Choose what to keep. |
| `review.empty` | যাচাই করার মতো কিছু নেই | Nothing to review |
| `review.customer` | কাস্টমার: {name} | Customer: {name} |
| `review.order` | অর্ডার {number} | Order {number} |
| `review.by` | {name}, {time} | {name}, {time} |
| `review.field` | ঘর | Field |
| `review.current` | এখন যা আছে | Current |
| `review.waiting` | অপেক্ষমাণ পরিবর্তন | Waiting change |
| `review.blank` | (খালি) | (blank) |
| `review.sameNow` | ঘরগুলো এখন একই রকম, শুধু সংস্করণ আলাদা। | The fields now match; only the version differs. |
| `review.keepCurrent` | এখন যা আছে রাখুন | Keep current |
| `review.applyMine` | অপেক্ষমাণ পরিবর্তন রাখুন | Use waiting change |
| `review.merge` | মিলিয়ে নিন | Merge by hand |
| `review.mergeTitle` | প্রতিটি ঘরে কোনটা থাকবে | Choose for each field |
| `review.saveMerge` | মিলিয়ে সেভ করুন | Save merged |
| `review.dismiss` | সরিয়ে দিন | Dismiss |
| `review.refused` | সার্ভার এই পরিবর্তন নেয়নি ({reason})। | The server refused this change ({reason}). |
| `review.gone` | রেকর্ডটি আর নেই। | The record no longer exists. |
| `review.offline` | সমাধান করতে অনলাইনে যান। | Go online to settle these. |
| `review.settled` | সমাধান হয়েছে | Settled |
| `review.field.name` | নাম | Name |
| `review.field.nameAlt` | অন্য ভাষায় নাম | Name in the other script |
| `review.field.phone` | ফোন | Phone |
| `review.field.householdId` | পরিবার | Household |
| `review.field.gender` | লিঙ্গ | Gender |
| `review.field.notes` | নোট | Notes |
| `review.field.price` | দাম | Price |
| `review.field.designNotes` | ডিজাইনের নোট | Design notes |
| `review.field.fabricNote` | কাপড়ের নোট | Fabric note |
| `review.field.trialDate` | ট্রায়ালের তারিখ | Trial date |
| `review.field.deliveryDate` | ডেলিভারির তারিখ | Delivery date |
| `review.field.wearer` | যিনি পরবেন | Wearer |
| `review.field.assignee` | কারিগর | Worker |
| `review.field.discount` | ছাড় | Discount |

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/sync/ReviewPage.test.tsx`:

```tsx
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

// Every sample shop starts with one waiting change. In Rahman Tailors it is about সুমন দাস
// (rahman-c4): this device changed his phone and notes while another device changed his notes.
const entry = () => screen.findByRole('region', { name: 'কাস্টমার: সুমন দাস' });

describe('Review queue', () => {
  it('shows the waiting change field by field, beside what the record holds now', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/review' });
    expect(await screen.findByRole('heading', { name: 'যাচাইয়ের তালিকা' })).toBeTruthy();
    const section = await entry();
    expect(section.getAttribute('data-tour')).toBe('review-item');
    expect(within(section).getByText(/^আব্দুর রহমান, /)).toBeTruthy();

    const phone = within(section).getByRole('row', { name: /^ফোন/ });
    expect(within(phone).getByText('01347594519')).toBeTruthy();
    expect(within(phone).getByText('01712345678')).toBeTruthy();
    const notes = within(section).getByRole('row', { name: /^নোট/ });
    expect(within(notes).getByText('কলার একটু ঢিলা পছন্দ করেন')).toBeTruthy();
    expect(within(notes).getByText('বুক পকেট ছাড়া শার্ট')).toBeTruthy();
    for (const name of ['এখন যা আছে রাখুন', 'অপেক্ষমাণ পরিবর্তন রাখুন', 'মিলিয়ে নিন']) {
      expect(within(section).getByRole('button', { name })).toBeTruthy();
    }
  });

  it('keeps what the record holds now', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/review' });
    const before = store.getSnapshot().state.customers['rahman-c4'];
    await userEvent.click(within(await entry()).getByRole('button', { name: 'এখন যা আছে রাখুন' }));
    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(screen.getByText('যাচাই করার মতো কিছু নেই')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c4']).toEqual(before);
    expect(screen.getByRole('button', { name: 'অনলাইন' })).toBeTruthy();
  });

  it('uses the waiting change on top of the current version', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/review' });
    await userEvent.click(within(await entry()).getByRole('button', { name: 'অপেক্ষমাণ পরিবর্তন রাখুন' }));
    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'বুক পকেট ছাড়া শার্ট' });
  });

  it('merges by hand, field by field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/review' });
    const section = await entry();
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে নিন' }));
    const phone = within(section).getByRole('group', { name: 'ফোন' });
    expect(within(phone).getByRole('radio', { name: 'এখন যা আছে: 01347594519' })).toHaveProperty('checked', true);
    await userEvent.click(within(phone).getByRole('radio', { name: 'অপেক্ষমাণ পরিবর্তন: 01712345678' }));
    await userEvent.click(within(section).getByRole('button', { name: 'মিলিয়ে সেভ করুন' }));

    expect((await screen.findByRole('status')).textContent).toBe('সমাধান হয়েছে');
    expect(store.getSnapshot().state.customers['rahman-c4']).toMatchObject({ phone: '01712345678', notes: 'কলার একটু ঢিলা পছন্দ করেন' });
  });

  it('needs the connection to settle anything', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/review' });
    const section = await entry();
    await act(() => store.setOnline(false));
    expect(await screen.findByText('সমাধান করতে অনলাইনে যান।')).toBeTruthy();
    for (const button of within(section).getAllByRole('button')) expect(button).toHaveProperty('disabled', true);
  });

  it('is closed to people who cannot settle any change', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/review', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/sync/ReviewPage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Build the page**

Done when:

- `/app/review` is a child of `/app`, loaded with `lazyPage`, inside `RequireCapability anyOf={REVIEW_CAPABILITIES}`.
- The page has the heading `review.title` and the text `review.intro`. While offline it also shows `review.offline`, and every button in every entry is disabled. With nothing to show it says `review.empty`.
- Each item from `useVisibleReview()` is described with `reviewEntry(item, snapshot.state)` (the full state, so names and numbers are found) and shown as a `<section data-tour="review-item">` whose accessible name is `review.customer` with the customer's name, or `review.order` with the order number followed by ` · ` and the garment's label when there is one, or `review.gone` when the record no longer exists.
- Under the name: `review.by` with the staff member's name (their id if unknown) and `dateTime(at)`.
- For a conflict with rows: a table with the column headers `review.field`, `review.current` and `review.waiting`. Each row starts with a row header naming the field (`review.field.<field>`). Values are shown by kind: text as stored, or `review.blank` when null or empty; dates with `date`; money with `money`; staff by name; gender with `gender.*`; household by its label; a discount as its amount, plus its reason when there is one.
- A conflict with no differing rows says `review.sameNow`. A refused change says `review.refused` with the reason code.
- Buttons: for a conflict, `review.keepCurrent`, then `review.applyMine` when `canApplyMine`, then `review.merge` when `canMerge`. For a refused change, only `review.dismiss`, which keeps the current version.
- `review.merge` swaps the buttons for one `ChoiceGroup` per row, with the field name as its legend and two options, `এখন যা আছে: <value>` (chosen at first) and `অপেক্ষমাণ পরিবর্তন: <value>` (the `review.current` and `review.waiting` labels, a colon and the shown value), followed by `review.saveMerge` and `common.cancel`. Saving calls `mergeBody(item, state, fieldsTakenFromTheWaitingChange)`; when that is null it sends `{ kind: 'keepCurrent' }`, otherwise `{ kind: 'merge', body }`.
- After `{ ok: true }` the page shows `review.settled` in a `role="status"` element. `{ ok: false, reason: 'gone' }` shows `review.gone` in a `role="alert"` element.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/features/sync`
Expected: PASS. Then `npx vitest run`: `370`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/sync apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add the review queue for changes that clashed"
```

---
### Task 5: Presenter scenarios and step engine

The seven scenarios from spec section 7.3 as data, each step with the control it points at and, where the app can see it happen, a check that ticks it off. The engine checks only the current step, so steps go in order, and a step stays done once ticked.

**Files:**
- Create: `apps/web/src/features/presenter/scenarios.ts`, `scenarios.test.ts`, `progress.ts`, `progress.test.ts`
- Modify: `apps/web/src/i18n/bn.ts`, `apps/web/src/i18n/en.ts`

**Provides:** `SCENARIOS`, `scenarioById`, the `TourTarget` names, `PresenterContext`; `startProgress`, `currentStep`, `advance`, `markCurrent`.

Messages (all of them, including those the panel uses in Task 7):

| Key | Bangla | English |
| --- | --- | --- |
| `presenter.title` | উপস্থাপনা | Presenter |
| `presenter.toggle` | উপস্থাপনা মোড | Presenter mode |
| `presenter.toggleHint` | গ্রাহকের সামনে ডেমো দেখাতে ধাপে ধাপে দৃশ্য। | Step-by-step scenarios for showing the demo in person. |
| `presenter.choose` | একটি দৃশ্য বেছে নিন | Choose a scenario |
| `presenter.start` | শুরু করুন | Start |
| `presenter.startConfirm` | {shop} এর ডেমো ডেটা নতুন করে শুরু হবে, তারপর দৃশ্যটি চলবে। | {shop}'s demo data will be reset, then the scenario starts. |
| `presenter.step` | ধাপ {n}/{total} | Step {n} of {total} |
| `presenter.markDone` | হয়েছে | Done |
| `presenter.skip` | বাদ দিন | Skip |
| `presenter.finished` | দৃশ্য শেষ | Scenario finished |
| `presenter.stop` | দৃশ্য বন্ধ করুন | End scenario |
| `presenter.collapse` | ছোট করুন | Minimise |
| `presenter.expand` | উপস্থাপনা খুলুন | Open presenter |
| `presenter.marked.done` | (হয়েছে) | (done) |
| `presenter.marked.skipped` | (বাদ দেওয়া) | (skipped) |
| `presenter.firstOrder.title` | নতুন কাস্টমারের প্রথম অর্ডার | A new customer's first order |
| `presenter.firstOrder.open` | নতুন অর্ডার খুলুন | Open New Order |
| `presenter.firstOrder.customer` | নতুন কাস্টমার যোগ করুন: নাম আর ফোন | Add a new customer: name and phone |
| `presenter.firstOrder.garments` | ২টি শার্ট আর ১টি পাঞ্জাবি যোগ করে মাপ লিখুন | Add 2 shirts and 1 panjabi and enter the measurements |
| `presenter.firstOrder.advance` | মোট ৳২,৪০০; অগ্রিম ৳১,০০০ লিখুন | The total is ৳2,400; enter a ৳1,000 advance |
| `presenter.firstOrder.save` | অর্ডার সেভ করুন | Save the order |
| `presenter.firstOrder.receipt` | রসিদে বাকি ৳১,৪০০ দেখান | Show the ৳1,400 balance on the receipt |
| `presenter.repeatOrder.title` | আবার অর্ডার, মাপ নিশ্চিত করে | Repeat order, confirming measurements |
| `presenter.repeatOrder.customer` | আগে অর্ডার দিয়েছেন এমন একজন কাস্টমার খুলুন | Open a customer who has ordered before |
| `presenter.repeatOrder.again` | পুরোনো অর্ডারের পাশে ‘আবার অর্ডার’ চাপুন | Press ‘Order again’ beside an earlier order |
| `presenter.repeatOrder.confirm` | কাস্টমারকে জিজ্ঞেস করে মাপ এখনো ঠিক আছে তাতে টিক দিন | Ask the customer, then tick that the measurements are still right |
| `presenter.repeatOrder.save` | অর্ডার সেভ করুন | Save the order |
| `presenter.collectOne.title` | একটি পোশাক ডেলিভারি, অর্ডার চলমান | Hand over one garment; the order stays open |
| `presenter.collectOne.open` | হোমের ‘নেওয়ার জন্য রেডি’ তালিকা থেকে একটি অর্ডার খুলুন | Open an order from ‘Ready to collect’ on the home screen |
| `presenter.collectOne.handOver` | একটি রেডি পোশাক হস্তান্তর করুন | Hand over one ready garment |
| `presenter.collectOne.stillOpen` | দেখান: বাকি পোশাকের জন্য অর্ডারটি এখনো চলমান | Show that the order is still open for the other garments |
| `presenter.offlineSync.title` | অফলাইনে কাজ, তারপর সিঙ্ক | Work offline, then sync |
| `presenter.offlineSync.offline` | সিঙ্কের বোতাম থেকে অফলাইনে যান | Go offline from the sync button |
| `presenter.offlineSync.order` | অফলাইনে একটি অর্ডার নিন | Take an order while offline |
| `presenter.offlineSync.payment` | একটি পেমেন্ট নিন (অগ্রিমও চলবে) | Take a payment (an advance counts) |
| `presenter.offlineSync.online` | অনলাইনে যান: অপেক্ষমাণ পরিবর্তন সার্ভারে যাবে | Go online: the waiting changes go to the server |
| `presenter.offlineSync.review` | সিঙ্কের বোতাম থেকে যাচাইয়ের তালিকা খুলুন | Open the review queue from the sync button |
| `presenter.offlineSync.resolve` | দুই সংস্করণ দেখে একটি সমাধান বেছে নিন | Compare the two versions and settle one |
| `presenter.statusLink.title` | স্ট্যাটাস লিংক শেয়ার ও বন্ধ | Share and turn off a status link |
| `presenter.statusLink.open` | একটি চলমান অর্ডার খুলুন | Open an order that is still open |
| `presenter.statusLink.create` | স্ট্যাটাস লিংক তৈরি করুন | Create a status link |
| `presenter.statusLink.view` | ‘খুলে দেখুন’ চেপে কাস্টমারের চোখে দেখুন: দাম বা মাপ নেই | Press ‘Open’ to see what the customer sees: no prices or measurements |
| `presenter.statusLink.revoke` | লিংক বন্ধ করুন | Turn the link off |
| `presenter.tailorView.title` | দর্জির চোখে: টাকার হিসাব নেই | The tailor's view: no money |
| `presenter.tailorView.switch` | ইউজার বদলান | Switch user |
| `presenter.tailorView.tailor` | জামাল উদ্দিন (দর্জি) বেছে পিন ৪৪৪৪ দিন | Choose Jamal Uddin (tailor) and enter PIN 4444 |
| `presenter.tailorView.look` | কাজের তালিকা আর অর্ডার দেখুন: কোথাও দাম বা পেমেন্ট নেই | Look at the work list and orders: no prices or payments anywhere |
| `presenter.tailorView.back` | মালিক হিসেবে আবার ঢুকুন (পিন ১১১১) | Sign back in as the owner (PIN 1111) |
| `presenter.customize.title` | পোশাক আর ধাপ সাজানো | Customise a garment and its stages |
| `presenter.customize.settings` | সেটিংসে ‘পোশাক ও ধাপ’ খুলুন | Open ‘Garments and stages’ in Settings |
| `presenter.customize.blouse` | ব্লাউজ খুলুন | Open the blouse |
| `presenter.customize.stage` | ‘কাটিং’ এর পরে ‘এমব্রয়ডারি’ ধাপ যোগ করে সেভ করুন | Add an ‘Embroidery’ stage after ‘Cutting’ and save |
| `presenter.customize.order` | নতুন একটি ব্লাউজ অর্ডার নিন: তাতে নতুন ধাপটি আছে | Take a new blouse order: it has the new stage |

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/features/presenter/progress.test.ts`:

```ts
import { emptyState } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import type { SyncInfo } from '../../data/store';
import { shopConfig } from '../../seed/shops';
import { advance, currentStep, markCurrent, startProgress } from './progress';
import type { PresenterContext, Scenario } from './scenarios';

const sync: SyncInfo = { online: true, syncing: false, pending: 0, review: [], lastSyncAt: null };
const config = shopConfig('rahman');
const ctx = (path: string, online = true): PresenterContext => ({
  path,
  state: emptyState(),
  config,
  staffId: 'rahman-owner',
  sync: { ...sync, online },
  start: { state: emptyState(), config, reviewIds: [] },
});

const scenario: Scenario = {
  id: 'offline-sync',
  title: 'presenter.offlineSync.title',
  shop: 'rahman',
  steps: [
    { id: 'offline', text: 'presenter.offlineSync.offline', done: (c) => !c.sync.online },
    { id: 'orders', text: 'presenter.offlineSync.order', done: (c) => c.path === '/app/orders' },
    { id: 'look', text: 'presenter.offlineSync.payment' },
    { id: 'online', text: 'presenter.offlineSync.online', done: (c) => c.sync.online },
  ],
};

describe('Presenter progress', () => {
  it('starts at the first step', () => {
    expect(currentStep(scenario, startProgress('offline-sync'))?.id).toBe('offline');
  });

  it('ticks off steps in order while their checks hold, and stops at a step done by hand', () => {
    const progress = advance(scenario, startProgress('offline-sync'), ctx('/app/orders', false));
    expect(progress.marks).toEqual({ offline: 'done', orders: 'done' });
    expect(currentStep(scenario, progress)?.id).toBe('look');
  });

  it('never ticks a later step before the ones ahead of it', () => {
    const progress = advance(scenario, startProgress('offline-sync'), ctx('/app/orders', true));
    expect(progress.marks).toEqual({});
  });

  it('keeps a step done after its condition stops holding', () => {
    let progress = advance(scenario, startProgress('offline-sync'), ctx('/app/dashboard', false));
    progress = advance(scenario, progress, ctx('/app/dashboard', true));
    expect(progress.marks).toEqual({ offline: 'done' });
    expect(currentStep(scenario, progress)?.id).toBe('orders');
  });

  it('lets the presenter mark the current step done or skip it, and finishes after the last', () => {
    let progress = markCurrent(scenario, startProgress('offline-sync'), 'skipped');
    progress = markCurrent(scenario, progress, 'done');
    progress = markCurrent(scenario, progress, 'done');
    progress = advance(scenario, progress, ctx('/app/dashboard', true));
    expect(progress.marks).toEqual({ offline: 'skipped', orders: 'done', look: 'done', online: 'done' });
    expect(currentStep(scenario, progress)).toBeNull();
    expect(markCurrent(scenario, progress, 'done')).toBe(progress);
  });
});
```

Create `apps/web/src/features/presenter/scenarios.test.ts`:

```ts
import {
  applyEvent,
  isOrderClosed,
  itemSummaryGroup,
  replay,
  type DomainEvent,
  type EventBody,
  type ReviewItem,
  type ShopConfig,
} from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import type { SyncInfo } from '../../data/store';
import { bn } from '../../i18n/bn';
import { generateShop } from '../../seed/generate';
import { advance, currentStep, markCurrent, startProgress, type Progress } from './progress';
import { SCENARIOS, scenarioById, type PresenterContext, type ScenarioId } from './scenarios';

const TODAY = '2026-10-03';
let n = 0;

/** Plays a scenario against a sample shop: change the page, the data or the sync state, and see which steps tick off. */
function play(id: ScenarioId) {
  const scenario = scenarioById(id);
  const seed = generateShop(scenario.shop, TODAY);
  const owner = seed.config.staff[0]!.id;
  let state = replay(seed.events).state;
  let config: ShopConfig = seed.config;
  let path = '/app/dashboard';
  let staffId: string | null = owner;
  // The sample conflict is the one review item; only its id matters here.
  const sample = { event: { id: 'sample-conflict' }, outcome: 'conflict', reason: 'stale-edit', currentVersion: 1 } as ReviewItem;
  let sync: SyncInfo = { online: true, syncing: false, pending: 0, review: [sample], lastSyncAt: null };
  const start = { state, config, reviewIds: ['sample-conflict'] };
  let progress: Progress = startProgress(id);

  const step = () => {
    const ctx: PresenterContext = { path, state, config, staffId, sync, start };
    progress = advance(scenario, progress, ctx);
    return currentStep(scenario, progress)?.id ?? 'finished';
  };
  return {
    state: () => state,
    config: () => config,
    go(next: string) {
      path = next;
      return step();
    },
    apply(...bodies: EventBody[]) {
      for (const body of bodies) {
        const event = { id: `play-${++n}`, at: '2026-10-03T06:00:00.000Z', deviceId: 'device-a', staffId: owner, ...body } as DomainEvent;
        const outcome = applyEvent(state, event);
        if (outcome.kind !== 'applied') throw new Error(`${body.type} was ${outcome.kind}`);
        state = outcome.state;
      }
      return step();
    },
    setConfig(next: ShopConfig) {
      config = next;
      return step();
    },
    setSync(next: Partial<SyncInfo>) {
      sync = { ...sync, ...next };
      return step();
    },
    signIn(next: string | null) {
      staffId = next;
      return step();
    },
    byHand() {
      progress = markCurrent(scenario, progress, 'done');
      return step();
    },
  };
}

function newOrder(config: ShopConfig, customerId: string, templateIds: string[]): Extract<EventBody, { type: 'order.created' }> {
  const orderId = `play-order-${++n}`;
  return {
    type: 'order.created',
    order: {
      id: orderId,
      number: `B-${String(n).padStart(4, '0')}`,
      customerId,
      branchId: config.branches[0]!.id,
      notes: '',
      discount: null,
      items: templateIds.map((templateId, i) => {
        const template = config.templates.find((t) => t.id === templateId)!;
        return {
          id: `${orderId}-i${i + 1}`,
          templateId,
          garmentName: template.name,
          price: template.defaultPrice,
          wearer: null,
          measurements: null,
          designNotes: '',
          fabricNote: '',
          photoIds: [],
          stages: template.stages,
          assignedTo: null,
          trialDate: null,
          deliveryDate: TODAY,
        };
      }),
    },
  };
}

const advancePayment = (orderId: string): EventBody => ({
  type: 'payment.recorded',
  orderId,
  payment: { id: `pay-${++n}`, amount: 100000, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
});

const newCustomer = (id: string): EventBody => ({
  type: 'customer.created',
  customer: { id, name: 'জসিম উদ্দিন', nameAlt: null, phone: null, householdId: null, gender: 'male', notes: '' },
});

describe('Presenter scenarios', () => {
  it('cover the seven scenarios in the spec, each with texts in Bangla', () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      'first-order',
      'repeat-order',
      'collect-one',
      'offline-sync',
      'status-link',
      'tailor-view',
      'customize-template',
    ]);
    for (const scenario of SCENARIOS) {
      expect(bn[scenario.title]).toBeTruthy();
      for (const step of scenario.steps) expect(bn[step.text]).toBeTruthy();
    }
  });

  it('1: first order', () => {
    const p = play('first-order');
    expect(p.go('/app/orders/new')).toBe('customer');
    p.byHand();
    p.byHand();
    expect(p.byHand()).toBe('save');
    expect(p.apply(newCustomer('play-c'), newOrder(p.config(), 'play-c', ['shirt', 'shirt', 'panjabi']))).toBe('receipt');
    expect(p.byHand()).toBe('finished');
  });

  it('2: repeat order counts only an order for a customer who ordered before', () => {
    const p = play('repeat-order');
    const regular = Object.values(p.state().orders)[0]!.customerId;
    expect(p.go('/app/customers/rahman-c1-none')).toBe('customer');
    expect(p.go(`/app/customers/${regular}`)).toBe('again');
    expect(p.go('/app/orders/new?repeat=rahman-o1')).toBe('confirm');
    expect(p.byHand()).toBe('save');
    expect(p.apply(newCustomer('play-new'), newOrder(p.config(), 'play-new', ['shirt']))).toBe('save');
    expect(p.apply(newOrder(p.config(), regular, ['shirt']))).toBe('finished');
  });

  it('3: hand over one garment and the order stays open', () => {
    const p = play('collect-one');
    const order = Object.values(p.state().orders).find(
      (o) => !isOrderClosed(o) && o.items.some((i) => itemSummaryGroup(i) === 'ready') && o.items.filter((i) => itemSummaryGroup(i) !== 'delivered' && !i.cancelled).length >= 2,
    )!;
    const ready = order.items.find((i) => itemSummaryGroup(i) === 'ready')!;
    expect(p.go(`/app/orders/${order.id}`)).toBe('hand-over');
    expect(p.apply({ type: 'item.stageChanged', orderId: order.id, itemId: ready.id, to: 'delivered', reason: '' })).toBe('still-open');
    expect(p.byHand()).toBe('finished');
  });

  it('4: offline, order and payment, back online, then settle the sample conflict', () => {
    const p = play('offline-sync');
    expect(p.go('/app/orders/new')).toBe('offline');
    expect(p.setSync({ online: false })).toBe('order');
    const customer = Object.values(p.state().customers)[0]!.id;
    const order = newOrder(p.config(), customer, ['shirt']);
    expect(p.apply(order)).toBe('payment');
    expect(p.apply(advancePayment(order.order.id))).toBe('online');
    expect(p.setSync({ online: true, pending: 2 })).toBe('online');
    expect(p.setSync({ pending: 0 })).toBe('review');
    expect(p.go('/app/review')).toBe('resolve');
    expect(p.setSync({ review: [] })).toBe('finished');
  });

  it('5: create a status link, view it, then turn it off', () => {
    const p = play('status-link');
    const order = Object.values(p.state().orders).find((o) => !isOrderClosed(o))!;
    expect(p.go(`/app/orders/${order.id}`)).toBe('create');
    expect(p.apply({ type: 'link.created', orderId: order.id, token: 'play-token-0000000000a' })).toBe('view');
    expect(p.byHand()).toBe('revoke');
    expect(p.apply({ type: 'link.revoked', orderId: order.id, token: 'play-token-0000000000a' })).toBe('finished');
  });

  it('6: switch to the tailor and back to the owner', () => {
    const p = play('tailor-view');
    expect(p.signIn(null)).toBe('tailor');
    expect(p.signIn('nakshi-owner')).toBe('tailor');
    expect(p.signIn('nakshi-tailor')).toBe('look');
    expect(p.byHand()).toBe('back');
    expect(p.signIn('nakshi-owner')).toBe('finished');
  });

  it('7: add a stage to the blouse, then a new blouse order carries it', () => {
    const p = play('customize-template');
    expect(p.go('/app/settings/templates')).toBe('blouse');
    expect(p.go('/app/settings/templates/blouse')).toBe('stage');
    const blouse = p.config().templates.find((t) => t.id === 'blouse')!;
    const stages = [...blouse.stages];
    stages.splice(2, 0, { key: 'embroidery', label: { bn: 'এমব্রয়ডারি', en: 'Embroidery' }, optional: false, group: 'unfinished' });
    const next = { ...p.config(), templates: p.config().templates.map((t) => (t.id === 'blouse' ? { ...t, stages } : t)) };
    expect(p.setConfig(next)).toBe('order');
    const customer = Object.values(p.state().customers)[0]!.id;
    expect(p.apply(newOrder(p.config(), customer, ['salwar-kameez']))).toBe('order');
    expect(p.apply(newOrder(p.config(), customer, ['blouse']))).toBe('finished');
  });
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `npx vitest run src/features/presenter`
Expected: FAIL, the modules do not exist.

- [ ] **Step 3: Write the scenarios**

Create `apps/web/src/features/presenter/scenarios.ts`:

```ts
import { isOrderClosed, itemSummaryGroup, type Order, type ShopConfig, type ShopState } from '@darzikhata/domain';
import type { SyncInfo } from '../../data/store';
import type { MessageKey } from '../../i18n/bn';
import type { SeedShopKey } from '../../seed/shops';

/** What a step can look at to decide whether it has happened. */
export interface PresenterContext {
  /** Path and query of the page, e.g. "/app/orders/new?repeat=rahman-o3". */
  path: string;
  /** The whole shop, not narrowed to a branch. */
  state: ShopState;
  config: ShopConfig;
  staffId: string | null;
  sync: SyncInfo;
  /** The shop as it was when the scenario started. */
  start: { state: ShopState; config: ShopConfig; reviewIds: string[] };
}

/** Names given to controls with `data-tour`, so a step can point at them. */
export type TourTarget =
  | 'new-order'
  | 'new-customer'
  | 'add-garment'
  | 'advance'
  | 'save-order'
  | 'receipt-balance'
  | 'nav-customers'
  | 'order-again'
  | 'confirm-measurements'
  | 'ready-list'
  | 'hand-over'
  | 'order-status'
  | 'sync-status'
  | 'review-link'
  | 'review-item'
  | 'nav-orders'
  | 'create-link'
  | 'open-link'
  | 'revoke-link'
  | 'switch-user'
  | 'nav-work'
  | 'nav-settings'
  | 'add-stage';

export interface ScenarioStep {
  id: string;
  text: MessageKey;
  target?: TourTarget;
  /** When given, the step ticks itself off once this holds while it is the current step. */
  done?: (ctx: PresenterContext) => boolean;
}

export type ScenarioId =
  | 'first-order'
  | 'repeat-order'
  | 'collect-one'
  | 'offline-sync'
  | 'status-link'
  | 'tailor-view'
  | 'customize-template';

export interface Scenario {
  id: ScenarioId;
  title: MessageKey;
  /** The sample shop the scenario starts from, freshly reset. */
  shop: SeedShopKey;
  steps: ScenarioStep[];
}

const newOrders = (ctx: PresenterContext): Order[] =>
  Object.values(ctx.state.orders).filter((o) => !ctx.start.state.orders[o.id]);

const openOrderId = (ctx: PresenterContext): string | null => /^\/app\/orders\/([^/?]+)$/.exec(ctx.path)?.[1] ?? null;

const startStageKeys = (ctx: PresenterContext, templateId: string) =>
  ctx.start.config.templates.find((t) => t.id === templateId)?.stages.map((s) => s.key) ?? [];

const newLinks = (ctx: PresenterContext) =>
  Object.values(ctx.state.orders).flatMap((o) => {
    const before = new Set(ctx.start.state.orders[o.id]?.links.map((l) => l.token) ?? []);
    return o.links.filter((l) => !before.has(l.token));
  });

export const SCENARIOS: Scenario[] = [
  {
    id: 'first-order',
    title: 'presenter.firstOrder.title',
    shop: 'rahman',
    steps: [
      { id: 'open', text: 'presenter.firstOrder.open', target: 'new-order', done: (c) => c.path.startsWith('/app/orders/new') },
      { id: 'customer', text: 'presenter.firstOrder.customer', target: 'new-customer' },
      { id: 'garments', text: 'presenter.firstOrder.garments', target: 'add-garment' },
      { id: 'advance', text: 'presenter.firstOrder.advance', target: 'advance' },
      { id: 'save', text: 'presenter.firstOrder.save', target: 'save-order', done: (c) => newOrders(c).length > 0 },
      { id: 'receipt', text: 'presenter.firstOrder.receipt', target: 'receipt-balance' },
    ],
  },
  {
    id: 'repeat-order',
    title: 'presenter.repeatOrder.title',
    shop: 'rahman',
    steps: [
      {
        id: 'customer',
        text: 'presenter.repeatOrder.customer',
        target: 'nav-customers',
        done: (c) => {
          const id = /^\/app\/customers\/([^/?]+)$/.exec(c.path)?.[1];
          return Boolean(id && Object.values(c.state.orders).some((o) => o.customerId === id));
        },
      },
      { id: 'again', text: 'presenter.repeatOrder.again', target: 'order-again', done: (c) => c.path.startsWith('/app/orders/new?repeat=') },
      { id: 'confirm', text: 'presenter.repeatOrder.confirm', target: 'confirm-measurements' },
      {
        id: 'save',
        text: 'presenter.repeatOrder.save',
        target: 'save-order',
        done: (c) => newOrders(c).some((o) => Object.values(c.start.state.orders).some((old) => old.customerId === o.customerId)),
      },
    ],
  },
  {
    id: 'collect-one',
    title: 'presenter.collectOne.title',
    shop: 'rahman',
    steps: [
      {
        id: 'open',
        text: 'presenter.collectOne.open',
        target: 'ready-list',
        done: (c) => {
          const order = c.state.orders[openOrderId(c) ?? ''];
          return Boolean(order && !isOrderClosed(order) && order.items.some((i) => itemSummaryGroup(i) === 'ready'));
        },
      },
      {
        id: 'hand-over',
        text: 'presenter.collectOne.handOver',
        target: 'hand-over',
        done: (c) =>
          Object.values(c.state.orders).some(
            (o) =>
              !isOrderClosed(o) &&
              o.items.some((i) => {
                const before = c.start.state.orders[o.id]?.items.find((b) => b.id === i.id);
                return before && itemSummaryGroup(before) !== 'delivered' && itemSummaryGroup(i) === 'delivered';
              }),
          ),
      },
      { id: 'still-open', text: 'presenter.collectOne.stillOpen', target: 'order-status' },
    ],
  },
  {
    id: 'offline-sync',
    title: 'presenter.offlineSync.title',
    shop: 'rahman',
    steps: [
      { id: 'offline', text: 'presenter.offlineSync.offline', target: 'sync-status', done: (c) => !c.sync.online },
      { id: 'order', text: 'presenter.offlineSync.order', target: 'new-order', done: (c) => newOrders(c).length > 0 },
      {
        id: 'payment',
        text: 'presenter.offlineSync.payment',
        done: (c) =>
          Object.values(c.state.orders).some((o) => o.payments.length > (c.start.state.orders[o.id]?.payments.length ?? 0)),
      },
      { id: 'online', text: 'presenter.offlineSync.online', target: 'sync-status', done: (c) => c.sync.online && c.sync.pending === 0 },
      { id: 'review', text: 'presenter.offlineSync.review', target: 'review-link', done: (c) => c.path.startsWith('/app/review') },
      {
        id: 'resolve',
        text: 'presenter.offlineSync.resolve',
        target: 'review-item',
        done: (c) => c.start.reviewIds.some((id) => !c.sync.review.some((r) => r.event.id === id)),
      },
    ],
  },
  {
    id: 'status-link',
    title: 'presenter.statusLink.title',
    shop: 'rahman',
    steps: [
      {
        id: 'open',
        text: 'presenter.statusLink.open',
        target: 'nav-orders',
        done: (c) => {
          const order = c.state.orders[openOrderId(c) ?? ''];
          return Boolean(order && !isOrderClosed(order));
        },
      },
      { id: 'create', text: 'presenter.statusLink.create', target: 'create-link', done: (c) => newLinks(c).length > 0 },
      { id: 'view', text: 'presenter.statusLink.view', target: 'open-link' },
      { id: 'revoke', text: 'presenter.statusLink.revoke', target: 'revoke-link', done: (c) => newLinks(c).some((l) => l.revokedAt !== null) },
    ],
  },
  {
    id: 'tailor-view',
    title: 'presenter.tailorView.title',
    shop: 'nakshi',
    steps: [
      { id: 'switch', text: 'presenter.tailorView.switch', target: 'switch-user', done: (c) => c.staffId === null },
      { id: 'tailor', text: 'presenter.tailorView.tailor', done: (c) => c.staffId === 'nakshi-tailor' },
      { id: 'look', text: 'presenter.tailorView.look', target: 'nav-work' },
      { id: 'back', text: 'presenter.tailorView.back', target: 'switch-user', done: (c) => c.staffId === 'nakshi-owner' },
    ],
  },
  {
    id: 'customize-template',
    title: 'presenter.customize.title',
    shop: 'nakshi',
    steps: [
      { id: 'settings', text: 'presenter.customize.settings', target: 'nav-settings', done: (c) => c.path.startsWith('/app/settings/templates') },
      { id: 'blouse', text: 'presenter.customize.blouse', done: (c) => c.path === '/app/settings/templates/blouse' },
      {
        id: 'stage',
        text: 'presenter.customize.stage',
        target: 'add-stage',
        done: (c) => (c.config.templates.find((t) => t.id === 'blouse')?.stages.length ?? 0) > startStageKeys(c, 'blouse').length,
      },
      {
        id: 'order',
        text: 'presenter.customize.order',
        target: 'new-order',
        done: (c) => {
          const before = startStageKeys(c, 'blouse');
          return newOrders(c).some((o) => o.items.some((i) => i.templateId === 'blouse' && i.stages.some((s) => !before.includes(s.key))));
        },
      },
    ],
  },
];

export function scenarioById(id: ScenarioId): Scenario {
  return SCENARIOS.find((s) => s.id === id)!;
}
```

- [ ] **Step 4: Write the step engine**

Create `apps/web/src/features/presenter/progress.ts`:

```ts
import type { PresenterContext, Scenario, ScenarioId, ScenarioStep } from './scenarios';

export type StepMark = 'done' | 'skipped';

/** How far the presenter is through one scenario. Steps are marked in order. */
export interface Progress {
  scenarioId: ScenarioId;
  marks: Record<string, StepMark>;
}

export function startProgress(scenarioId: ScenarioId): Progress {
  return { scenarioId, marks: {} };
}

/** The first step not yet marked, or null when the scenario is finished. */
export function currentStep(scenario: Scenario, progress: Progress): ScenarioStep | null {
  return scenario.steps.find((step) => !progress.marks[step.id]) ?? null;
}

/**
 * Ticks off the current step while its check holds, then the next, and so on. Only the current
 * step is checked, so a later step never counts before the ones ahead of it, and a step stays
 * done even if its condition stops holding (going back online after the "go offline" step).
 */
export function advance(scenario: Scenario, progress: Progress, ctx: PresenterContext): Progress {
  let next = progress;
  for (let step = currentStep(scenario, next); step?.done?.(ctx); step = currentStep(scenario, next)) {
    next = { ...next, marks: { ...next.marks, [step.id]: 'done' } };
  }
  return next;
}

/** Marks the current step by hand: done for steps the app cannot see, or skipped. */
export function markCurrent(scenario: Scenario, progress: Progress, mark: StepMark): Progress {
  const step = currentStep(scenario, progress);
  return step ? { ...progress, marks: { ...progress.marks, [step.id]: mark } } : progress;
}
```

- [ ] **Step 5: Run the tests and watch them pass**

Run: `npx vitest run src/features/presenter`
Expected: PASS (13 tests). Then `npx vitest run`: `383`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/presenter apps/web/src/i18n
git commit -m "feat(web): add the presenter's scenarios and step engine"
```

---

### Task 6: Names for the controls the presenter points at

The presenter highlights a control by its `data-tour` name. This task puts every name from `TourTarget` on its control.

**Files:**
- Create: `apps/web/src/features/presenter/tourTargets.test.tsx`
- Modify: the files in the table below

| Name | Put it on |
| --- | --- |
| `new-order` | the New Order link in `DesktopShell`'s top bar and the floating New Order link in `MobileShell` |
| `nav-<key>` | every section `NavLink` in both shells (`nav-dashboard`, `nav-orders`, `nav-customers`, `nav-work`, `nav-payments`, `nav-settings`), and the section links on `MorePage` |
| `switch-user` | `SwitchUserButton` |
| `sync-status`, `review-link`, `review-item` | already added in Tasks 3 and 4 |
| `ready-list` | the dashboard block `নেওয়ার জন্য রেডি` |
| `new-customer` | the `নতুন কাস্টমার` button in order entry (`entry/CustomerPicker.tsx`) |
| `add-garment` | the `পোশাক যোগ করুন` button |
| `advance` | the wrapper of the advance field (`entry/MoneyFields.tsx`), so the label is outlined too |
| `save-order` | `অর্ডার সেভ করুন`, on the laptop form and on the phone's last step |
| `confirm-measurements` | the measurement confirmation checkbox's wrapper (`entry/ItemMeasurements.tsx`) |
| `receipt-balance` | the balance row of the receipt's totals table |
| `order-again` | the `আবার অর্ডার` links on the customer profile and on order detail |
| `hand-over` | every `হস্তান্তর করুন` button (`ItemCard.tsx`) |
| `order-status` | the open or closed line on order detail |
| `create-link`, `open-link`, `revoke-link` | the three controls in `StatusLinkSection.tsx` |
| `add-stage` | the add-stage button in `TemplateEditor.tsx` |

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/presenter/tourTargets.test.tsx`:

```tsx
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import type { TourTarget } from './scenarios';

/** The presenter highlights controls by these names, so every scenario's targets must exist. */
const marked = () => new Set(Array.from(document.querySelectorAll('[data-tour]'), (e) => e.getAttribute('data-tour')));
const expectMarked = (targets: TourTarget[]) => {
  const found = marked();
  expect(targets.filter((t) => !found.has(t))).toEqual([]);
};

describe('Tour targets', () => {
  it('marks the laptop shell and the home screen', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/dashboard' });
    await screen.findByRole('region', { name: 'নেওয়ার জন্য রেডি' });
    expectMarked(['new-order', 'sync-status', 'switch-user', 'nav-orders', 'nav-customers', 'nav-work', 'nav-settings', 'ready-list']);
  });

  it('marks the phone shell, with settings under More', async () => {
    await renderApp({ layout: 'mobile', shop: 'nakshi', path: '/app/more' });
    await screen.findByRole('heading', { name: 'আরও' });
    expectMarked(['new-order', 'sync-status', 'switch-user', 'nav-orders', 'nav-customers', 'nav-work', 'nav-settings']);
  });

  it('marks order entry, including the repeat-order confirmation', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expectMarked(['new-customer', 'add-garment', 'advance', 'save-order']);
    await act(() => router.navigate('/app/orders/new?repeat=rahman-o32'));
    await screen.findByRole('checkbox', { name: 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন' });
    expectMarked(['confirm-measurements']);
  });

  it('marks the order detail, its status link and the receipt balance', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/rahman-o32' });
    const detail = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    expectMarked(['hand-over', 'order-status', 'create-link', 'order-again']);
    await userEvent.click(within(detail).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await within(detail).findByRole('button', { name: 'লিংক বন্ধ করুন' });
    expectMarked(['open-link', 'revoke-link']);
    await act(() => router.navigate('/print/receipt/rahman-o32'));
    await screen.findByRole('heading', { name: 'রসিদ' });
    expectMarked(['receipt-balance']);
  });

  it('marks the review item and the template editor’s add-stage button', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/review' });
    await screen.findByRole('heading', { name: 'যাচাইয়ের তালিকা' });
    expectMarked(['review-item']);
    await act(() => router.navigate('/app/settings/templates/blouse'));
    await screen.findByRole('table', { name: 'ধাপ' });
    expectMarked(['add-stage']);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/presenter/tourTargets.test.tsx`
Expected: FAIL, listing the missing names.

- [ ] **Step 3: Add the names**

Add `data-tour` attributes as in the table. Nothing else about these controls changes.

- [ ] **Step 4: Run the test and watch it pass**

Run: `npx vitest run src/features/presenter`
Expected: PASS. Then `npx vitest run`: `388`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): name the controls the presenter points at"
```

---

### Task 7: Presenter panel

A floating panel, turned on per device from More, that starts a scenario on a fresh copy of its shop, shows the steps, highlights the next control and ticks steps off as the presenter works through them.

**Files:**
- Create: `apps/web/src/features/presenter/PresenterSetting.tsx`, `usePresenterRun.ts`, `PresenterPanel.tsx`, `PresenterPanel.test.tsx`
- Modify: `apps/web/src/app/App.tsx`, `apps/web/src/features/more/MorePage.tsx`

**Provides:** `PresenterProvider`, `usePresenterSetting()` (`enabled`, `setEnabled`), `PresenterRoot`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/features/presenter/PresenterPanel.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const panel = () => screen.findByRole('complementary', { name: 'উপস্থাপনা' });
const highlight = () => document.querySelector('style[data-presenter-highlight]')?.textContent ?? '';

async function startFirstOrder() {
  const scenarios = await panel();
  expect(within(scenarios).getByRole('heading', { name: 'একটি দৃশ্য বেছে নিন' })).toBeTruthy();
  await userEvent.click(within(scenarios).getByRole('button', { name: 'নতুন কাস্টমারের প্রথম অর্ডার' }));
  const dialog = await screen.findByRole('dialog', { name: 'নতুন কাস্টমারের প্রথম অর্ডার' });
  expect(within(dialog).getByText('রহমান টেইলার্স এর ডেমো ডেটা নতুন করে শুরু হবে, তারপর দৃশ্যটি চলবে।')).toBeTruthy();
  await userEvent.click(within(dialog).getByRole('button', { name: 'শুরু করুন' }));
  return within(await panel()).findByText('ধাপ ১/৬');
}

const current = async () => (await panel()).querySelector('[aria-current="step"]')?.textContent;

describe('Presenter mode', () => {
  it('is turned on and off from More', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    await userEvent.click(await screen.findByRole('checkbox', { name: 'উপস্থাপনা মোড' }));
    expect(await panel()).toBeTruthy();
    expect(window.localStorage.getItem('dk.presenter')).toBe('on');
    await userEvent.click(screen.getByRole('checkbox', { name: 'উপস্থাপনা মোড' }));
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
  });

  it('starts a scenario on a fresh copy of its shop, highlights the next control and follows the app', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    const { store } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/dashboard' });
    await startFirstOrder();
    expect(store.getSnapshot().config?.id).toBe('rahman');
    expect(await current()).toBe('নতুন অর্ডার খুলুন');
    expect(highlight()).toContain('[data-tour="new-order"]');

    await userEvent.click(screen.getByRole('link', { name: '+ নতুন অর্ডার' }));
    expect(await within(await panel()).findByText('ধাপ ২/৬')).toBeTruthy();
    expect(await current()).toBe('নতুন কাস্টমার যোগ করুন: নাম আর ফোন');
    expect(highlight()).toContain('[data-tour="new-customer"]');
  });

  it('lets the presenter tick off or skip steps, then end the scenario', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/dashboard' });
    await startFirstOrder();
    const box = await panel();
    await userEvent.click(within(box).getByRole('button', { name: 'বাদ দিন' }));
    await userEvent.click(within(box).getByRole('button', { name: 'হয়েছে' }));
    expect(within(box).getByText('ধাপ ৩/৬')).toBeTruthy();
    const steps = within(within(box).getByRole('list')).getAllByRole('listitem');
    expect(steps[0]!.textContent).toBe('নতুন অর্ডার খুলুন (বাদ দেওয়া)');
    expect(steps[1]!.textContent).toBe('নতুন কাস্টমার যোগ করুন: নাম আর ফোন (হয়েছে)');

    for (let i = 0; i < 4; i++) await userEvent.click(within(box).getByRole('button', { name: 'হয়েছে' }));
    expect(within(box).getByText('দৃশ্য শেষ')).toBeTruthy();
    expect(highlight()).toBe('');
    await userEvent.click(within(box).getByRole('button', { name: 'দৃশ্য বন্ধ করুন' }));
    expect(within(await panel()).getByRole('heading', { name: 'একটি দৃশ্য বেছে নিন' })).toBeTruthy();
  });

  it('folds away without losing its place', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await startFirstOrder();
    await userEvent.click(within(await panel()).getByRole('button', { name: 'ছোট করুন' }));
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'উপস্থাপনা খুলুন' }));
    expect(within(await panel()).getByText('ধাপ ১/৬')).toBeTruthy();
  });

  it('stays off the customer’s status page', async () => {
    window.localStorage.setItem('dk.presenter', 'on');
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/s/not-a-real-token' });
    await screen.findByText(/^এই লিংকটি পাওয়া যায়নি/);
    expect(screen.queryByRole('complementary', { name: 'উপস্থাপনা' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'উপস্থাপনা খুলুন' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/features/presenter/PresenterPanel.test.tsx`
Expected: FAIL. ("stays off the customer's status page" already passes, because nothing renders yet. It guards the finished panel.)

- [ ] **Step 3: Add the scenario runner**

Create `apps/web/src/features/presenter/usePresenterRun.ts`:

```ts
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { advance, markCurrent, startProgress, type Progress, type StepMark } from './progress';
import { scenarioById, type PresenterContext, type Scenario, type ScenarioId } from './scenarios';

interface Run {
  progress: Progress;
  start: PresenterContext['start'];
}

export interface PresenterRun {
  scenario: Scenario | null;
  progress: Progress | null;
  /** Resets the scenario's shop, signed in as its owner, and starts at its first step. */
  start(id: ScenarioId): Promise<void>;
  /** Marks the current step done or skipped by hand. */
  mark(mark: StepMark): void;
  stop(): void;
}

/**
 * Runs one scenario at a time and ticks its steps off as the app changes. Keep it in a component
 * that stays mounted while presenter mode is on, so folding the panel away keeps the place.
 */
export function usePresenterRun(): PresenterRun {
  const store = useStore();
  const snapshot = useSnapshot();
  const location = useLocation();
  const navigate = useNavigate();
  const [run, setRun] = useState<Run | null>(null);
  const scenario = run ? scenarioById(run.progress.scenarioId) : null;
  const path = `${location.pathname}${location.search}`;

  useEffect(() => {
    if (!run || !scenario || !snapshot.config) return;
    const ctx: PresenterContext = {
      path,
      state: snapshot.state,
      config: snapshot.config,
      staffId: snapshot.session?.staffId ?? null,
      sync: snapshot.sync,
      start: run.start,
    };
    const next = advance(scenario, run.progress, ctx);
    if (next !== run.progress) setRun({ ...run, progress: next });
  }, [run, scenario, path, snapshot]);

  return {
    scenario,
    progress: run?.progress ?? null,
    async start(id) {
      await store.startDemo(scenarioById(id).shop);
      const fresh = store.getSnapshot();
      if (!fresh.config) return;
      setRun({
        progress: startProgress(id),
        start: { state: fresh.state, config: fresh.config, reviewIds: fresh.sync.review.map((r) => r.event.id) },
      });
      navigate('/app');
    },
    mark(mark) {
      if (run && scenario) setRun({ ...run, progress: markCurrent(scenario, run.progress, mark) });
    },
    stop() {
      setRun(null);
    },
  };
}
```

- [ ] **Step 4: Build the setting, the root and the panel**

Done when:

- `PresenterSetting.tsx` holds the per-device switch in a context: `enabled` starts from `readSetting('dk.presenter') === 'on'`, and `setEnabled` writes `'on'` or `'off'` with `writeSetting`. `App.tsx` wraps the routes in `PresenterProvider` and renders `<PresenterRoot />` after `<AppRoutes />`.
- `PresenterRoot` renders nothing unless the switch is on, the store is `ready`, and the address does not start with `/s/`. Otherwise it renders `PresenterPanel`, loaded with `lazyPage` inside `<Suspense fallback={null}>`, so presenter code downloads only when the mode is on.
- `PresenterPanel` calls `usePresenterRun()` and stays mounted while presenter mode is on. Folded away, it is only a floating button `presenter.expand`. Open, it is `<aside aria-label="উপস্থাপনা">` (`presenter.title`) with a `presenter.collapse` button. It floats at the bottom right on a laptop and above the tab bar and New Order button on a phone, never covers the header, scrolls inside itself when long, and is hidden in print (`print:hidden`).
- With no scenario running: the heading `presenter.choose`, then one button per scenario named by its title. A button opens a `Dialog` titled with the scenario's title, saying `presenter.startConfirm` with `{shop}` as the sample shop's name in the current language (from `SEED_SHOPS`), with the actions `common.cancel` and `presenter.start`. Starting calls `run.start(id)` and closes the dialog.
- With a scenario running: its title as the heading; `presenter.step` with `{n}` as the number of marked steps plus one (the total once finished) and `{total}`, both in the person's digits; then a list of the steps. A marked step's text is followed by a space and `presenter.marked.done` or `presenter.marked.skipped`. The current step has `aria-current="step"`, and its text is the step text alone. Under the list: `presenter.markDone` and `presenter.skip` for the current step, or `presenter.finished` once every step is marked; and always `presenter.stop`.
- While the current step has a target, the panel renders `<style data-presenter-highlight>` containing `[data-tour="<target>"]{outline:3px solid var(--color-accent);outline-offset:3px}`. With no target, or once finished, it renders no such element.
- `MorePage` shows, in its demo section, a `Checkbox` labelled `presenter.toggle` with the hint `presenter.toggleHint`, bound to `usePresenterSetting()`.

- [ ] **Step 5: Run the test and watch it pass**

Run: `npx vitest run src/features/presenter`
Expected: PASS. Then `npx vitest run`: `393`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add presenter mode with guided scenarios"
```

---
### Task 8: End-to-end tests with Playwright

Presenter scenarios 1, 3 and 4 run in a real Chromium against the built app, at 375px and 1366px, as spec section 8.2 asks.

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/tsconfig.e2e.json`, `apps/web/e2e/helpers.ts`, `apps/web/e2e/first-order.spec.ts`, `apps/web/e2e/collect-one.spec.ts`, `apps/web/e2e/offline-sync.spec.ts`
- Modify: `apps/web/package.json`, `apps/web/vite.config.ts`, `package-lock.json`

**Provides:** `npm run e2e` in `apps/web`, and the end-to-end files type-checked by `npm run typecheck`.

The tests for scenarios 1 and 3 were run against `main` before this plan and pass at both widths. Scenario 4's test uses the names fixed by Tasks 3 and 4's tests and has only been type-checked. If a locator in it does not match the finished screens, fix the locator; never weaken what it checks.

- [ ] **Step 1: Add the dependencies**

Run (from the repo root):

```bash
npm install -D -w @darzikhata/web @playwright/test @types/node@22
cd apps/web
npx playwright install chromium
```

The tests were written against Playwright 1.56; any later 1.x works.

- [ ] **Step 2: Keep Vitest out of the browser tests, and type-check them separately**

In `apps/web/vite.config.ts`, inside `test`, add:

```ts
    // Playwright's end-to-end tests in e2e/ run in a real browser, not here.
    include: ['src/**/*.test.{ts,tsx}'],
```

Create `apps/web/tsconfig.e2e.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM"],
    "types": ["node"]
  },
  "include": ["e2e", "playwright.config.ts"]
}
```

In `apps/web/package.json`, the scripts become:

```json
    "typecheck": "tsc --noEmit -p tsconfig.json && tsc --noEmit -p tsconfig.e2e.json",
    "e2e": "playwright test"
```

`.gitignore` already ignores `playwright-report/` and `test-results/`.

- [ ] **Step 3: Configure Playwright**

Create `apps/web/playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

/** End-to-end runs of presenter scenarios 1, 3 and 4 against the built app, at phone and laptop widths. */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    // Each test gets a fresh browser profile, so it starts on the welcome screen with nothing saved.
    serviceWorkers: 'block',
    timezoneId: 'Asia/Dhaka',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 375, height: 812 }, hasTouch: true } },
    { name: 'laptop', use: { browserName: 'chromium', viewport: { width: 1366, height: 768 } } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Service workers are blocked so every run uses the files just built, never a cached copy.

- [ ] **Step 4: Write the tests**

Create `apps/web/e2e/helpers.ts`:

```ts
import { expect, type Locator, type Page } from '@playwright/test';

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 1024;

/** Opens a sample shop from the welcome screen, signed in as its owner. */
export async function openShop(page: Page, name: 'রহমান টেইলার্স' | 'নকশী বুটিক' | 'ইউনিফর্ম হাউস') {
  await page.goto('/');
  await page.getByRole('button', { name: `এই দোকান খুলুন: ${name}` }).click();
  await expect(page.getByRole('navigation', { name: 'প্রধান মেনু' })).toBeVisible();
}

/** Fills measurement fields by their labels inside a region. */
export async function fill(scope: Locator, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await scope.getByLabel(label, { exact: true }).fill(value);
}

export const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

/**
 * From an open New Order page in Rahman Tailors: a new customer, 2 shirts and 1 panjabi for
 * ৳2,400 with ৳1,000 up front, checks the balance, then saves. The app then shows the receipt.
 */
export async function takeFirstOrder(page: Page) {
  if (isPhone(page)) {
    const next = () => page.getByRole('button', { name: 'পরের ধাপ' }).click();
    await page.getByRole('button', { name: 'নতুন কাস্টমার' }).click();
    await page.getByLabel('নাম', { exact: true }).fill('জসিম উদ্দিন');
    await page.getByLabel('ফোন', { exact: true }).fill('01799887766');
    await next();

    await page.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'শার্ট' });
    await page.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await page.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'পাঞ্জাবি' });
    await page.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    const shirt = page.getByRole('region', { name: 'শার্ট ১' });
    await shirt.getByLabel('সংখ্যা').fill('২');
    await fill(shirt, SHIRT);
    await fill(page.getByRole('region', { name: 'পাঞ্জাবি ২' }), { ...SHIRT, 'ঝুল': '42' });
    await next();
    await next();

    await page.getByLabel('অগ্রিম').fill('১০০০');
    const summary = page.getByRole('table', { name: 'অর্ডারের হিসাব' });
    await expect(summary.getByRole('row', { name: /^মোট/ })).toContainText('৳২,৪০০');
    await expect(summary.getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
    await next();
    await page.getByRole('button', { name: 'অর্ডার সেভ করুন' }).click();
  } else {
    const left = page.getByRole('region', { name: 'কাস্টমার ও পোশাক' });
    const middle = page.getByRole('region', { name: 'মাপ ও ডিজাইন' });
    const right = page.getByRole('region', { name: 'অর্ডারের হিসাব' });
    await left.getByRole('button', { name: 'নতুন কাস্টমার' }).click();
    await left.getByLabel('নাম', { exact: true }).fill('জসিম উদ্দিন');
    await left.getByLabel('ফোন', { exact: true }).fill('01799887766');

    await left.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'শার্ট' });
    await left.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await middle.getByLabel('সংখ্যা').fill('২');
    await fill(middle, SHIRT);
    await left.getByLabel('পোশাক', { exact: true }).selectOption({ label: 'পাঞ্জাবি' });
    await left.getByRole('button', { name: 'পোশাক যোগ করুন' }).click();
    await fill(middle, { ...SHIRT, 'ঝুল': '42' });

    await right.getByLabel('অগ্রিম').fill('১০০০');
    await expect(right.getByRole('row', { name: /^মোট/ })).toContainText('৳২,৪০০');
    await expect(right.getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
    await right.getByRole('button', { name: 'অর্ডার সেভ করুন' }).click();
  }

}
```

Create `apps/web/e2e/first-order.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openShop, takeFirstOrder } from './helpers';

// Presenter scenario 1: a new customer orders 2 shirts and 1 panjabi for ৳2,400 and pays ৳1,000
// up front; the receipt shows a ৳1,400 balance.
test('a new customer’s first order ends on a receipt with the balance', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  await page.getByRole('link', { name: '+ নতুন অর্ডার' }).click();

  await takeFirstOrder(page);

  await expect(page.getByRole('heading', { name: 'রসিদ' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'হিসাব' }).getByRole('row', { name: /^বাকি/ })).toContainText('৳১,৪০০');
});
```

Create `apps/web/e2e/collect-one.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { isPhone, openShop } from './helpers';

// Presenter scenario 3: hand over one garment; the order stays open. In Rahman Tailors the sample
// order A-0032 always has three garments ready to collect.
test('handing over one garment leaves the order open', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  const ready = page.getByRole('region', { name: 'নেওয়ার জন্য রেডি' });
  await ready.getByRole('link', { name: 'A-0032' }).click();

  // On a phone the order fills the page; on a laptop it opens in a panel beside the list.
  await expect(page.getByRole('heading', { name: 'A-0032' })).toBeVisible();
  const detail = isPhone(page) ? page.getByRole('main') : page.getByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  await expect(detail.getByText('চলমান', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: 'হস্তান্তর করুন' })).toHaveCount(3);

  await detail.getByRole('button', { name: 'হস্তান্তর করুন' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
  await dialog.getByRole('button', { name: 'নিশ্চিত করুন' }).click();
  await expect(dialog).toBeHidden();

  await expect(detail.getByText('ধাপ: ডেলিভারি হয়েছে')).toHaveCount(1);
  await expect(detail.getByRole('button', { name: 'হস্তান্তর করুন' })).toHaveCount(2);
  await expect(detail.getByText('চলমান', { exact: true })).toBeVisible();
});
```

Create `apps/web/e2e/offline-sync.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { openShop, takeFirstOrder } from './helpers';

// Presenter scenario 4: go offline, take an order and a payment, sync, and settle a conflict.
// Every sample shop starts with one waiting change: Sumon Das's phone and notes, edited here
// while another device changed his notes.
test('changes made offline sync later, and the waiting change is settled', async ({ page }) => {
  await openShop(page, 'রহমান টেইলার্স');
  const syncButton = page.locator('[data-tour="sync-status"]');
  const dialog = page.getByRole('dialog', { name: 'সিঙ্ক' });
  await expect(syncButton).toHaveAccessibleName('দেখতে হবে');

  await syncButton.click();
  await dialog.getByRole('button', { name: 'অফলাইনে যান' }).click();
  await dialog.getByRole('button', { name: 'বন্ধ করুন' }).click();
  await expect(syncButton).toHaveAccessibleName('অফলাইন');

  // The order and its advance stay on this device, even across a reload.
  await page.getByRole('link', { name: '+ নতুন অর্ডার' }).click();
  await takeFirstOrder(page);
  await expect(page.getByRole('heading', { name: 'রসিদ' })).toBeVisible();
  await page.goto('/app/orders');
  await expect(syncButton).toHaveAccessibleName(/^অফলাইন · সিঙ্ক বাকি [১-৯]/);

  await syncButton.click();
  await expect(dialog.getByText(/^এই ডিভাইসে সিঙ্ক বাকি: /)).toBeVisible();
  await dialog.getByRole('button', { name: 'অনলাইনে যান' }).click();
  await expect(dialog.getByText('সব পরিবর্তন সিঙ্ক হয়েছে')).toBeVisible();
  await expect(syncButton).toHaveAccessibleName('দেখতে হবে');

  await dialog.getByRole('link', { name: 'যাচাই করুন' }).click();
  await expect(page).toHaveURL(/\/app\/review$/);
  const entry = page.getByRole('region', { name: 'কাস্টমার: সুমন দাস' });
  await expect(entry.getByRole('row', { name: /^ফোন/ })).toContainText('01712345678');
  await entry.getByRole('button', { name: 'অপেক্ষমাণ পরিবর্তন রাখুন' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'সমাধান হয়েছে' })).toBeVisible();
  await expect(page.getByText('যাচাই করার মতো কিছু নেই')).toBeVisible();
  await expect(syncButton).toHaveAccessibleName('অনলাইন');
});
```

- [ ] **Step 5: Run them**

Run (from `apps/web`): `npm run e2e`
Expected: `6 passed` (three tests, each at `phone` and `laptop`). The first run builds the app and starts the preview server on port 4173; if one is already running there, it is reused.

Run (from the repo root): `npm test` and `npm run typecheck`
Expected: domain `173` and web `393` pass (Vitest no longer looks in `e2e/`); no type errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/vite.config.ts apps/web/tsconfig.e2e.json apps/web/playwright.config.ts apps/web/e2e
git commit -m "test(web): run presenter scenarios 1, 3 and 4 end to end at phone and laptop widths"
```

---

### Task 9: Deployment

The built app is a static site. Netlify serves it, with every app address falling back to `index.html` and the service worker never cached. GitHub Actions runs every check on each push and pull request.

**Files:**
- Create: `netlify.toml`, `.github/workflows/ci.yml`, `README.md`

- [ ] **Step 1: Add the Netlify settings**

Create `netlify.toml` at the repo root:

```toml
# Netlify builds the web app from the repo root. Connect the repository in Netlify and it reads this file.
[build]
  command = "npm run build -w @darzikhata/web"
  publish = "apps/web/dist"

[build.environment]
  NODE_VERSION = "22"

# The app has its own routes (/app/..., /s/<token>, /print/...): every unknown path serves the app.
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# The service worker and its manifest must be checked on every visit, or updates never arrive.
[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/manifest.webmanifest"
  [headers.values]
    Cache-Control = "no-cache"

# Built files have content hashes in their names, so they never change.
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

- [ ] **Step 2: Add the checks**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - name: Install Chromium for the end-to-end tests
        run: npx playwright install --with-deps chromium
        working-directory: apps/web
      - run: npm run e2e
        working-directory: apps/web
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-results
          path: apps/web/test-results
```

- [ ] **Step 3: Add the README**

Create `README.md` at the repo root:

````markdown
# DarziKhata (demo)

A clickable, installable prototype of DarziKhata, a record book for tailoring shops: customers and their measurements, orders garment by garment, money taken and owed, work lists, and status links for customers. It is in Bangla first, with English.

It is a demo. Everything is stored in your own browser, seeded with three sample shops, and can be reset at any time. There is no real server, sign-in or sync: an in-browser stand-in shows how offline work and sync behave.

## Run it

Node 22.12 or newer.

```bash
npm install
cd apps/web
npm run dev
```

Open the address it prints and choose a sample shop. Demo PINs follow the staff list order: 1111, 2222, 3333 and so on.

To show it to someone, turn on **Presenter mode** under More: it walks through seven scenarios step by step.

## Check it

From the repo root:

```bash
npm test            # unit tests for the domain package and the web app
npm run typecheck
```

End-to-end tests (presenter scenarios 1, 3 and 4, at phone and laptop widths), from `apps/web`:

```bash
npx playwright install chromium   # once
npm run e2e
```

## Layout

- `packages/domain`: the business rules in plain TypeScript (money, numbering, measurements, stages, permissions, search, sync, status links). No browser code.
- `apps/web`: the React app (PWA). `src/data` is the only code that touches storage.
- `docs/superpowers`: the design spec and the implementation plans.

## Deploy

The site is static. On Netlify, add the repository as a new site; `netlify.toml` sets the build command, the publish folder and the single-page fallback, so no settings need typing. Every push to `main` then deploys. The app is installable from the deployed address and works offline after the first visit.
````

- [ ] **Step 4: Check the build command from the root**

Run (from the repo root): `npm run build -w @darzikhata/web`
Expected: `apps/web/dist` holds `index.html`, `sw.js`, `manifest.webmanifest`, the icons and `assets/`.

- [ ] **Step 5: Commit**

```bash
git add netlify.toml .github/workflows/ci.yml README.md
git commit -m "chore: deploy to Netlify and run every check in CI"
```

- [ ] **Step 6: Connect the site (by hand, once)**

In Netlify: Add new site, Import an existing project, choose the GitHub repository, and accept the settings read from `netlify.toml`. When the first deploy finishes, open the site address and check that a deep link such as `<site>/app/orders` loads the app rather than a 404. This step needs the repository owner's Netlify account; if it is not done now, note it in the hand-over.

---

### Task 10: Size budget and checks by hand

**Files:** none, unless a check needs a fix.

- [ ] **Step 1: Run every automated check**

Run (from the repo root):

```bash
npm test
npm run typecheck
git grep -n "—" -- apps packages README.md
cd apps/web && npm run e2e
```

Expected: domain `173` and web `393` tests pass; no type errors; no em dashes; `6 passed` end to end.

- [ ] **Step 2: Check the first download stays small**

Run (from `apps/web`): `npx vite build`, then the same gzip check as Plan 4's Task 15:

```bash
node -e "
const fs = require('fs'), zlib = require('zlib');
const html = fs.readFileSync('dist/index.html', 'utf8');
const entry = /src=\"\/(assets\/index-[^\"]+\.js)\"/.exec(html)[1];
const kb = zlib.gzipSync(fs.readFileSync('dist/' + entry)).length / 1024;
const chunks = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.js')).length;
console.log(entry, kb.toFixed(1) + ' KB gzipped,', chunks, 'JS files');
"
```

Expected: the entry chunk is under 250 KB gzipped (it was about 120 KB with this plan's store changes in place). The review page and the presenter panel are separate chunks; `PresenterSetting.tsx`, `SyncStatus.tsx`, `useSync.ts`, `reviewView.ts` and `otherDevice.ts` load with the shell.

- [ ] **Step 3: Check by hand**

Run `npx vite preview` and check, in Bangla and then in English:

1. **Presenter run-through on a phone (375px) and a laptop (1366px):** turn on presenter mode in More and play all seven scenarios. Each starts on a fresh copy of its shop; each highlighted control is visible and outlined; steps the app can see tick off by themselves; the panel never hides the control it points at (fold it away if it does, and note where). The panel does not print.
2. **Offline across a reload:** go offline, take a payment, reload the page: the header still says `অফলাইন · সিঙ্ক বাকি ১`. Go online: the count clears after a visible `সিঙ্ক হচ্ছে…`.
3. **Batch stage moves while online** (Uniform House supervisor, PIN 3333): move a group of 6 garments. The results arrive without a pause per garment, and one sync follows.
4. **Other device on an open form:** open a customer's edit form, change the notes, then in the sync dialog choose `অন্য ডিভাইস থেকে বদলান` and close it. Save the form: it explains the record changed and keeps what you typed. Do the same while offline, then go online: the change appears in the review queue instead.
5. **Review queue by keyboard:** settle the sample conflict with `মিলিয়ে নিন` using only the keyboard; the radio groups work with arrow keys and focus is never lost after saving.
6. **Branch scope:** in Uniform House as the owner, open the workshop's group order, go offline and change the price of its first garment still in work; then use `অন্য ডিভাইস থেকে বদলান` (it changes that same garment) and go online. The owner sees it in the review queue; the counter (PIN 2222, shop branch only) does not, and their header does not say `দেখতে হবে` for it.
7. **Desktop at 1366px, 1920px and 150% zoom:** the header with the sync button, the sync dialog, the review queue's table and the presenter panel fit without the page scrolling sideways.
8. **Bangla in print:** print preview and Save as PDF of a receipt and the work list; the presenter panel and sync button never print.
9. **Installed PWA on a real Android phone** (spec 8.3), on the deployed site from Task 9 (or `npx vite preview --host` on the same network): install it from Chrome, open it, turn on aeroplane mode, close and reopen it: it opens offline with its data, and the Bangla font is used.
10. **Deployed site:** a deep link such as `/app/orders` loads; a status link opened in the same browser shows the public page.

Stop the preview server when done.

- [ ] **Step 4: Commit any fixes**

If a check needed a fix, commit it with a message describing the fix.

---

## After this plan

The demo is complete: every section of the design spec is built, tested and deployed. What carries forward into the pilot unchanged is `packages/domain`, including the sync rules this plan exercised end to end. The pilot replaces `data/demoServer.ts` and the online switch with a real server API behind the same store methods (`syncNow`, `resolveReview`), and the seed and presenter with real sign-in and real shops.
