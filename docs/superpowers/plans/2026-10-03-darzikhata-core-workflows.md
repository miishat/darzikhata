# DarziKhata Core Workflows Implementation Plan (Plan 3 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The daily work of a tailoring shop, end to end: find or add a customer, take and compare measurements, enter an order (step by step on a phone, in one three-column form on a desktop), follow each garment through its stages, take payments, refunds and corrections, and print receipts, job slips and fabric tags.

**Architecture:** Screens never build domain events by hand. Pure model modules (`draft.ts`, `customerInput.ts`, `orderList.ts`, `receipt.ts`, `globalSearch.ts`) turn what the person typed into events or rows, and screens save through `ShopStore`. A new order is saved with `dispatchBatch`, so the new customer, their measurements, the order and its advance are saved together or not at all. The app moves to a React Router data router so order entry can block navigation while it has unsaved changes. Print pages live outside the app shell so nothing but the document prints.

**Tech Stack:** Unchanged from Plan 2. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-10-03-darzikhata-demo-design.md](../specs/2026-10-03-darzikhata-demo-design.md) (sections 5.2 to 5.6, 6.1 to 6.3, 7.5, 8.2, 8.4)

**Builds on:** Plan 2, merged to `main` (domain `173` tests, web `76` tests).

## How this plan is written

Plans 3 to 5 are lighter than Plans 1 and 2. Each task gives:

- the files it touches;
- what it provides to later tasks (the interfaces they may rely on);
- the full test code, because the tests are the specification;
- the exact message text the tests look for;
- full code only for the tricky parts (the order draft, the receipt model, search ranking, the atomic batch save, the navigation guard, the shortcut rule);
- done-conditions for each screen.

Components, styling and route wiring are not spelled out. Write them test first, following the patterns already in `apps/web` (`ui/TextField.tsx`, `ui/Dialog.tsx`, `features/more/MorePage.tsx`, `shell/DesktopShell.tsx`). Where a done-condition and a test seem to disagree, the test wins.

## Plan series

1. Domain package (done).
2. App foundation (done).
3. **Core workflows** (this plan): customers and measurements, order entry, orders list and detail, payments, receipts and print layouts, global search with `/` and `N`, route-level code splitting.
4. Operations: dashboard, work lists with batch actions and their print layout, public status page (`/s/:token`) and link sharing, settings (template and stage editors, staff, branches), group-order view by wearer, branch scope.
5. Demo layer: simulated offline and sync with the full status indicator, review queue, presenter mode, Playwright end-to-end tests, deployment.

## Global Constraints

Everything in Plan 2's Global Constraints still applies. In particular: no new dependencies; `packages/domain` stays pure; only `data/store.ts` and `data/db.ts` touch IndexedDB; every visible string comes from `i18n/bn.ts` and `i18n/en.ts`; money stays integer poisha until display; colours come from the CSS variables; no em dashes; commit messages carry no AI attribution.

New in this plan:

- **Accessible names are the contract.** Tests find things by role and name: labels, button and link names, headings, `region` names (a `<section aria-labelledby>` or `aria-label`), table and list names. Use the exact text given in each task's messages block.
- **Messages.** Each task lists the keys it adds. Add the Bangla text to `bn.ts` and the English to `en.ts` (the existing key-parity test fails if one is missing). Keys used by several tasks are added by the first task that needs them.
- **Saving.** Screens save only through `store.dispatch` or `store.dispatchBatch`. When the result is not applied, show `problemText(outcome, language)` (Task 3) in a `role="alert"` element and keep what the person typed.
- **Stale edits.** Edit events (`customer.updated`, `order.discountSet`, `item.updated`, `item.assigned`) carry the version the form was opened with, not the version at save time, so a change made elsewhere in the meantime shows the conflict message instead of being overwritten.
- **Money visibility.** Amounts, prices, balances and money columns show only with `money.view`. Measurement values show only when `canViewMeasurementsOf(role, customer, restrictFemaleMeasurements)` allows.
- **Money is never recorded by the keyboard alone.** Payment, refund, correction, discount and price-adjustment dialogs are not `<form>`s with submit handlers: Enter in a field does nothing, and only a click (or Enter/Space on the focused save button) records money.
- **Dates.** Dates are typed with `<input type="date">` (YYYY-MM-DD). "Today" is `todayInDhaka(new Date())`.
- **Test helper.** Screen tests use `renderApp` from `src/test/renderApp.tsx` (Task 2). Tests that need a record look it up from `store.getSnapshot()` rather than hard-coding sample data, except for ids the seed generator fixes (`rahman-o40`, `rahman-c1`, `rahman-h1`, `uniform-o27` and the staff ids in `seed/shops.ts`).

## File structure

```
apps/web/src/
  data/db.ts, store.ts                 (modify) photos table, batches, order numbers
  data/store.batch.test.ts
  main.tsx                             (modify) data router
  test/renderApp.tsx                   shared screen-test helper
  app/AppRoutes.tsx, lazy.ts           (modify / create) route table, lazy pages
  lib/dates.ts                         addDays (moved from seed/generate.ts)
  lib/photos.ts                        photo sizing and compression
  ui/SelectField.tsx, TextAreaField.tsx, ChoiceGroup.tsx, Checkbox.tsx
  ui/useUnsavedGuard.tsx               navigation guard for unsaved changes
  features/common/
    hooks.ts                           useToday, useCan, useMeasurementAccess
    orderText.ts                       progressText, garmentSummary, itemTitle
    problemText.ts                     message for a rejected or stale save
  features/customers/
    CustomersPage.tsx, CustomerList.tsx, CustomerProfile.tsx
    customerInput.ts, CustomerForm.tsx
    measurementView.ts, MeasurementSection.tsx, MeasurementForm.tsx
  features/orders/
    draft.ts                           order draft model
    useOrderEntry.ts                   draft state and saving
    PhotoPicker.tsx, usePhoto.ts
    NewOrderPage.tsx, MobileOrderSteps.tsx, DesktopOrderForm.tsx
    entry/ CustomerPicker.tsx, ItemMeasurements.tsx, ItemDetails.tsx, MoneyFields.tsx, DraftSummary.tsx
    orderList.ts, OrdersPage.tsx, OrderTable.tsx, OrderCards.tsx, OrderFilters.tsx
    stageMoves.ts, OrderDetail.tsx, ItemCard.tsx, itemDialogs.tsx
  features/payments/
    OrderMoney.tsx, paymentDialogs.tsx, PaymentsPage.tsx
  features/print/
    receipt.ts, PrintLayout.tsx, ReceiptPage.tsx, JobSlipPage.tsx, FabricTagsPage.tsx
  features/search/globalSearch.ts
  shell/shortcuts.ts, useShortcuts.ts, GlobalSearch.tsx
```

## Routes after this plan

| Path | Page | Needs | Task |
| --- | --- | --- | --- |
| `/app/customers/:customerId?` | `CustomersPage` | `customers.view` | 4 |
| `/app/customers/new` | `CustomerForm` | `customers.edit` | 5 |
| `/app/customers/:customerId/edit` | `CustomerForm` | `customers.edit` | 5 |
| `/app/customers/:customerId/measure/:templateId` | `MeasurementForm` | `measurements.edit` | 6 |
| `/print/receipt/:orderId` | `ReceiptPage` (no shell) | `money.view` | 8 |
| `/print/job/:orderId` | `JobSlipPage` (no shell) | `orders.view` or `work.view.all` or `work.view.assigned` | 8 |
| `/print/tags/:orderId` | `FabricTagsPage` (no shell) | as job slip | 8 |
| `/app/orders/new` | `NewOrderPage` | `orders.create` | 10, 11 |
| `/app/orders/:orderId?` | `OrdersPage` | `orders.view` | 12, 13 |
| `/app/payments` | `PaymentsPage` | `money.view` | 14 |

Every page is loaded with `lazyPage` (Task 2). Print routes sit beside `/app` under `RequireStaff`, not inside the shell.

---

### Task 1: Store batches, order numbers and photos

A new order is several events (maybe a new customer, new measurements, the order, an advance). They must be saved together: if the order is rejected, the half-made customer must not be left behind. This task also gives screens ids and order numbers, and a place to keep photos.

**Files:**
- Modify: `apps/web/src/data/db.ts`
- Modify: `apps/web/src/data/store.ts`
- Test: `apps/web/src/data/store.batch.test.ts`

**Interfaces:**
- Consumes: `applyEvent`, `nextOrderNumber`, `ApplyOutcome`, `EventBody` from `@darzikhata/domain`.
- Produces:
  - `type BatchOutcome = { ok: true; outcomes: ApplyOutcome[] } | { ok: false; failedIndex: number; outcome: ApplyOutcome }`
  - `ShopStore.dispatchBatch(bodies: EventBody[]): Promise<BatchOutcome>`
  - `ShopStore.createId(): string` (arrow property, safe to pass around)
  - `ShopStore.nextOrderNumber(): string`, in this device's series
  - `ShopStore.savePhoto(dataUrl: string): Promise<string>` and `ShopStore.getPhoto(id): Promise<string | null>`
  - `interface PhotoRow { id; dataUrl; createdAt }`, Dexie version 2 with a `photos: 'id'` table. `startDemo` and `clear` also clear photos.

- [ ] **Step 1: Write the failing test**

`apps/web/src/data/store.batch.test.ts`:

```ts
import { STANDARD_STAGES, type EventBody } from '@darzikhata/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from './db';
import { ShopStore } from './store';

let dbCount = 0;
const dbs: DarziDb[] = [];

function freshStore(name = `batch-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const customer: EventBody = {
  type: 'customer.created',
  customer: { id: 'walk-in', name: 'করিম', nameAlt: 'Karim', phone: '01711000000', householdId: null, gender: 'male', notes: '' },
};

const order = (number: string): EventBody => ({
  type: 'order.created',
  order: {
    id: 'walk-in-order',
    number,
    customerId: 'walk-in',
    branchId: 'main',
    notes: '',
    discount: null,
    items: [
      {
        id: 'walk-in-i1',
        templateId: 'shirt',
        garmentName: { bn: 'শার্ট', en: 'Shirt' },
        price: 70000,
        wearer: null,
        measurements: null,
        designNotes: '',
        fabricNote: '',
        photoIds: [],
        stages: STANDARD_STAGES,
        assignedTo: null,
        trialDate: null,
        deliveryDate: '2026-10-10',
      },
    ],
  },
});

const advance = (amount: number): EventBody => ({
  type: 'payment.recorded',
  orderId: 'walk-in-order',
  payment: { id: 'walk-in-p1', amount, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
});

describe('ShopStore batches', () => {
  it('gives the next number in this device series', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    expect(store.nextOrderNumber()).toBe('A-0041');
  });

  it('saves a customer, order and advance together, each seeing the one before', async () => {
    const { store, db, name } = freshStore();
    await store.startDemo('rahman');
    const before = await db.events.count();

    const result = await store.dispatchBatch([customer, order(store.nextOrderNumber()), advance(30000)]);

    expect(result.ok).toBe(true);
    expect(await db.events.count()).toBe(before + 3);
    const saved = store.getSnapshot().state.orders['walk-in-order']!;
    expect(saved.number).toBe('A-0041');
    expect(saved.payments.map((p) => p.amount)).toEqual([30000]);

    const reloaded = new ShopStore({ db: new DarziDb(name) });
    await reloaded.load();
    expect(reloaded.getSnapshot().state.orders['walk-in-order']?.customerId).toBe('walk-in');
  });

  it('saves nothing when any change is rejected, and reports which one', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const before = await db.events.count();
    const stateBefore = store.getSnapshot().state;

    const result = await store.dispatchBatch([customer, order('A-0001'), advance(30000)]);

    expect(result).toMatchObject({ ok: false, failedIndex: 1, outcome: { kind: 'rejected', reason: 'number-taken' } });
    expect(await db.events.count()).toBe(before);
    expect(store.getSnapshot().state).toBe(stateBefore);
  });

  it('stores photos on the device and clears them with the demo', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    const id = await store.savePhoto('data:image/jpeg;base64,AAAA');
    expect(await store.getPhoto(id)).toBe('data:image/jpeg;base64,AAAA');
    await store.startDemo('rahman');
    expect(await store.getPhoto(id)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `apps/web`): `npx vitest run src/data/store.batch.test.ts`

Expected: FAIL with `TypeError: store.nextOrderNumber is not a function`.

- [ ] **Step 3: Write the implementation**

In `db.ts`, add `PhotoRow` and a second schema version (keep version 1 as it is, so existing browsers upgrade):

```ts
    this.version(2).stores({
      events: '++seq, &id',
      meta: 'key',
      photos: 'id',
    });
```

In `store.ts`, add `photos` to the transactions in `doStartDemo` and `doClear` (clearing it beside `events` and `meta`), add `createId` and `nextOrderNumber` beside `getSnapshot`, and split event stamping out of `save` so batches share it. The batch is the tricky part: every event is checked against the state left by the events before it, and nothing touches IndexedDB until all of them have applied.

```ts
/** Result of saving several changes together: all were saved, or none were. */
export type BatchOutcome =
  | { ok: true; outcomes: ApplyOutcome[] }
  | { ok: false; failedIndex: number; outcome: ApplyOutcome };

  /** A new id for a record a screen is about to create (customer, order, item, payment). */
  createId = (): string => this.newId();

  /** The next order number in this device's own series, e.g. "A-0042". */
  nextOrderNumber(): string {
    const { config, deviceId, state } = this.snapshot;
    const device = config?.devices.find((d) => d.id === deviceId);
    if (!device) throw new Error('This device is not set up for the shop');
    return nextOrderNumber(Object.values(state.orders).map((o) => o.number), device.series);
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
```

`save(body)` becomes `const event = this.stamp(body);` followed by its existing apply-and-save code. `savePhoto` runs through `enqueue` (so a reset cannot interleave with it), generates the id with `newId`, and adds a `PhotoRow`; `getPhoto` reads one row.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/data`

Expected: PASS, 16 tests (12 existing, 4 new).

- [ ] **Step 5: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (expected: exit 0), then:

```bash
git add apps/web/src/data/db.ts apps/web/src/data/store.ts apps/web/src/data/store.batch.test.ts
git commit -m "feat(web): save event batches atomically and store photos on the device"
```

### Task 2: Data router, lazy pages and the unsaved-changes guard

`useBlocker` only works inside a data router, so `main.tsx` and the tests move to `createBrowserRouter` / `createMemoryRouter` with one catch-all route that renders `App`; `App` keeps its own `<Routes>`. Pages become lazy-loaded so the first download stays small.

**Files:**
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/test/renderApp.tsx`
- Modify: `apps/web/src/app/App.test.tsx` (use `renderApp`)
- Create: `apps/web/src/app/lazy.ts`
- Modify: `apps/web/src/app/AppRoutes.tsx`, `apps/web/src/shell/DesktopShell.tsx`, `apps/web/src/shell/MobileShell.tsx`
- Create: `apps/web/src/ui/useUnsavedGuard.tsx`
- Test: `apps/web/src/ui/useUnsavedGuard.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Produces:
  - `renderApp({ layout, path?, shop?, as?, language? }): Promise<{ store: ShopStore; router }>`. `router.state.location` tells tests where the app navigated.
  - `lazyPage(load, exportName)`: a `React.lazy` component for a named export.
  - `useUnsavedGuard(dirty: boolean): { dialog: ReactNode; allowNextNavigation(): void }`. Render `dialog` somewhere in the page. Call `allowNextNavigation()` right before navigating away after a successful save.
  - Shells wrap `<Outlet />` in `<Suspense fallback={<Loading />}>`; print routes get their own `Suspense`.

**Messages:**

```ts
// bn.ts
'unsaved.title': 'না সেভ করে চলে যাবেন?',
'unsaved.body': 'এই পাতায় যা লিখেছেন তা সেভ হয়নি।',
'unsaved.stay': 'এখানেই থাকুন',
'unsaved.leave': 'সেভ না করে যান',
// en.ts
'unsaved.title': 'Leave without saving?',
'unsaved.body': 'What you entered on this page has not been saved.',
'unsaved.stay': 'Stay here',
'unsaved.leave': 'Leave without saving',
```

- [ ] **Step 1: Write the failing test**

`apps/web/src/ui/useUnsavedGuard.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { createMemoryRouter, Link, Route, RouterProvider, Routes, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { useUnsavedGuard } from './useUnsavedGuard';

function Form() {
  const [text, setText] = useState('');
  const { dialog, allowNextNavigation } = useUnsavedGuard(text !== '');
  const navigate = useNavigate();
  return (
    <>
      <input aria-label="নাম" value={text} onChange={(e) => setText(e.target.value)} />
      <Link to="/elsewhere">অন্য পাতা</Link>
      <button
        type="button"
        onClick={() => {
          allowNextNavigation();
          navigate('/elsewhere');
        }}
      >
        সেভ
      </button>
      {dialog}
    </>
  );
}

function setup() {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <I18nProvider>
            <Routes>
              <Route path="/form" element={<Form />} />
              <Route path="/elsewhere" element={<h1>অন্য পাতা</h1>} />
            </Routes>
          </I18nProvider>
        ),
      },
    ],
    { initialEntries: ['/form'] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

describe('useUnsavedGuard', () => {
  it('lets people leave freely when nothing was typed', async () => {
    const router = setup();
    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('asks before leaving unsaved changes, and can stay or leave', async () => {
    const router = setup();
    await userEvent.type(screen.getByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'এখানেই থাকুন' }));
    expect(router.state.location.pathname).toBe('/form');
    expect((screen.getByLabelText('নাম') as HTMLInputElement).value).toBe('ক');

    await userEvent.click(screen.getByRole('link', { name: 'অন্য পাতা' }));
    await userEvent.click(await screen.findByRole('button', { name: 'সেভ না করে যান' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
  });

  it('does not ask when leaving right after a save', async () => {
    const router = setup();
    await userEvent.type(screen.getByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ' }));
    expect(router.state.location.pathname).toBe('/elsewhere');
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/useUnsavedGuard.test.tsx`

Expected: FAIL with `Error: Cannot find module './useUnsavedGuard'`.

- [ ] **Step 3: Write the guard and the messages**

The subtle part: after a save, the page navigates in the same click handler, before React re-renders with `dirty = false`, so the blocker would still see unsaved changes. A ref that the save sets first lets that one navigation through.

`apps/web/src/ui/useUnsavedGuard.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Dialog } from './Dialog';

/**
 * Asks before leaving a screen with unsaved changes, for in-app navigation and for closing
 * or reloading the tab. Call allowNextNavigation() right before navigating away after a save,
 * because the save's own navigation happens before React re-renders with dirty = false.
 */
export function useUnsavedGuard(dirty: boolean) {
  const allowed = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && !allowed.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  const dialog = (
    <UnsavedDialog
      open={blocker.state === 'blocked'}
      onStay={() => blocker.reset?.()}
      onLeave={() => blocker.proceed?.()}
    />
  );
  return { dialog, allowNextNavigation: () => (allowed.current = true) };
}

function UnsavedDialog({ open, onStay, onLeave }: { open: boolean; onStay(): void; onLeave(): void }) {
  const { t } = useI18n();
  return (
    <Dialog
      open={open}
      title={t('unsaved.title')}
      onClose={onStay}
      actions={
        <>
          <Button variant="secondary" onClick={onStay}>
            {t('unsaved.stay')}
          </Button>
          <Button variant="danger" onClick={onLeave}>
            {t('unsaved.leave')}
          </Button>
        </>
      }
    >
      {t('unsaved.body')}
    </Dialog>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/useUnsavedGuard.test.tsx`

Expected: PASS, 3 tests.

- [ ] **Step 5: Move the app to a data router and the shared test helper**

`apps/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './app/App';
import { DarziDb } from './data/db';
import { ShopStore } from './data/store';
import './index.css';

const store = new ShopStore({ db: new DarziDb() });
void store.load();

// A data router, so screens with unsaved changes can block navigation. App keeps its own <Routes>.
const router = createBrowserRouter([{ path: '*', element: <App store={store} /> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
```

`apps/web/src/test/renderApp.tsx`:

```tsx
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach } from 'vitest';
import { App } from '../app/App';
import { DarziDb } from '../data/db';
import { ShopStore } from '../data/store';
import type { SeedShopKey } from '../seed/shops';

let count = 0;
const dbs: DarziDb[] = [];

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

export interface RenderAppOptions {
  layout: 'mobile' | 'desktop';
  path?: string;
  shop?: SeedShopKey;
  /** Sign in as this staff member instead of the owner. */
  as?: { staffId: string; pin: string };
  language?: 'bn' | 'en';
}

/**
 * Renders the whole app the way main.tsx does, inside a data router so navigation
 * blocking works, with its own fresh IndexedDB database.
 */
export async function renderApp({ layout, path = '/', shop, as, language }: RenderAppOptions) {
  window.localStorage.setItem('dk.layout', layout);
  if (language) window.localStorage.setItem('dk.language', language);
  const db = new DarziDb(`app-test-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  if (shop) await store.startDemo(shop);
  else await store.load();
  if (as) {
    await store.signOut();
    await store.signIn(as.staffId, as.pin);
  }
  const router = createMemoryRouter([{ path: '*', element: <App store={store} /> }], { initialEntries: [path] });
  render(<RouterProvider router={router} />);
  return { store, router };
}
```

In `App.test.tsx`, delete the local `renderApp`, its database bookkeeping and the now-unused imports, import `renderApp` from `../test/renderApp`, and change `const store = await renderApp(` to `const { store } = await renderApp(`.

- [ ] **Step 6: Lazy pages**

`apps/web/src/app/lazy.ts`:

```ts
import { lazy, type ComponentType } from 'react';

/** A lazily loaded page from a module's named export, so each section downloads only when opened. */
export function lazyPage<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return lazy(async () => ({ default: (await load())[name] }));
}
```

Load `MorePage` through `lazyPage(() => import('../features/more/MorePage'), 'MorePage')` and wrap each shell's `<Outlet />` in `<Suspense fallback={<Loading />}>`. Every page added by later tasks is loaded the same way. Keep `WelcomePage` and `SignInPage` eager: they are the first screens.

- [ ] **Step 7: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 83 tests (76 + 4 from Task 1 + 3 here); type check exits 0.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/main.tsx apps/web/src/test/renderApp.tsx apps/web/src/app apps/web/src/shell apps/web/src/ui/useUnsavedGuard.tsx apps/web/src/ui/useUnsavedGuard.test.tsx apps/web/src/i18n
git commit -m "feat(web): move to a data router with lazy pages and an unsaved-changes guard"
```

### Task 3: Form controls and shared helpers

The form controls every later screen needs, and small helpers for text that appears on many screens.

**Files:**
- Create: `apps/web/src/ui/SelectField.tsx`, `TextAreaField.tsx`, `ChoiceGroup.tsx`, `Checkbox.tsx`
- Modify: `apps/web/src/features/more/MorePage.tsx` (use `ChoiceGroup` instead of its local `Choice`)
- Create: `apps/web/src/lib/dates.ts`; modify `apps/web/src/seed/generate.ts` to import `addDays` from it and re-export it (its existing test keeps passing)
- Create: `apps/web/src/features/common/orderText.ts`, `problemText.ts`, `hooks.ts`
- Test: `apps/web/src/ui/forms.test.tsx`, `apps/web/src/features/common/orderText.test.ts`, `apps/web/src/features/common/common.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Produces:
  - `SelectField({ label, value, options: Array<{ value: string; label: string }>, onChange(value: string), error?, id? })`: a native `<select>` styled like `TextField`, with the same label, error and `aria-invalid` wiring.
  - `TextAreaField`: like `TextField` but a `<textarea>` (takes the native textarea props plus `label`, `error`, `hint`).
  - `ChoiceGroup<T extends string>({ legend, value: T | null, options: Array<{ value: T; label: string }>, onChange(value: T), error? })`: `MorePage`'s `Choice`, moved and exported. A `fieldset` (role `group`, named by its legend) of real radio inputs sharing one `name`.
  - `Checkbox({ label, checked, onChange(checked: boolean), error? })`: a real checkbox at least 40px tall, with the error linked by `aria-describedby`.
  - `addDays(date: string, days: number): string` in `lib/dates.ts`.
  - `progressText(progress, language)`, `garmentSummary(order, language)`, `itemTitle(order, item, language)`. **`itemTitle` is how garments are named everywhere** (regions on the order detail, job slip sections, entry cards): the garment label and its 1-based place, e.g. "শার্ট ২".
  - `problemText(outcome: ApplyOutcome, language): string | null`: null for applied or duplicate; `save.conflict` for a conflict; `save.rejected` with `{reason}` for a rejection.
  - Hooks: `useToday(): string`; `useCan(): (capability: Capability) => boolean` for the signed-in role (false when nobody is signed in); `useMeasurementAccess(): (customer: { gender: Gender | null }) => boolean` using the role and `config.settings.restrictFemaleMeasurements`.

**Messages:**

```ts
// bn.ts
'common.save': 'সেভ করুন',
'progress.total': 'মোট {n}টি',
'progress.unfinished': '{n}টি চলছে',
'progress.ready': '{n}টি রেডি',
'progress.delivered': '{n}টি ডেলিভারি হয়েছে',
'progress.cancelled': '{n}টি বাতিল',
'money.subtotal': 'দাম',
'money.discount': 'ছাড়',
'money.adjustments': 'সমন্বয়',
'money.total': 'মোট',
'money.advance': 'অগ্রিম',
'money.paid': 'জমা',
'money.balance': 'বাকি',
'money.creditDue': 'ফেরত পাওনা',
'method.cash': 'ক্যাশ',
'method.bkash': 'বিকাশ',
'method.nagad': 'নগদ',
'method.bank': 'ব্যাংক',
'save.conflict': 'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।',
'save.rejected': 'সেভ করা যায়নি ({reason})',
// en.ts
'common.save': 'Save',
'progress.total': '{n} garments',
'progress.unfinished': '{n} in progress',
'progress.ready': '{n} ready',
'progress.delivered': '{n} delivered',
'progress.cancelled': '{n} cancelled',
'money.subtotal': 'Price',
'money.discount': 'Discount',
'money.adjustments': 'Adjustments',
'money.total': 'Total',
'money.advance': 'Advance',
'money.paid': 'Paid',
'money.balance': 'Balance due',
'money.creditDue': 'Credit due',
'method.cash': 'Cash',
'method.bkash': 'bKash',
'method.nagad': 'Nagad',
'method.bank': 'Bank',
'save.conflict': 'Someone else changed this in the meantime. Check the latest details and try again.',
'save.rejected': 'Could not save ({reason})',
```

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/common/orderText.test.ts`:

```ts
import { spec54Order } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { garmentSummary, itemTitle, progressText } from './orderText';

describe('progressText', () => {
  it('counts garments by group in either language, leaving out empty groups', () => {
    const progress = { unfinished: 2, ready: 1, delivered: 0, cancelled: 0, total: 3 };
    expect(progressText(progress, 'bn')).toBe('মোট ৩টি: ২টি চলছে, ১টি রেডি');
    expect(progressText(progress, 'en')).toBe('3 garments: 2 in progress, 1 ready');
    expect(progressText({ unfinished: 0, ready: 0, delivered: 1, cancelled: 1, total: 2 }, 'bn')).toBe(
      'মোট ২টি: ১টি ডেলিভারি হয়েছে, ১টি বাতিল',
    );
  });
});

describe('garmentSummary', () => {
  it('groups garments by name and leaves out cancelled ones', () => {
    const order = spec54Order();
    expect(garmentSummary(order, 'bn')).toBe('শার্ট ×২, পাঞ্জাবি');
    expect(garmentSummary(order, 'en')).toBe('Shirt ×2, Panjabi');
    order.items[0] = { ...order.items[0]!, cancelled: { reason: 'x', at: '', by: '' } };
    expect(garmentSummary(order, 'bn')).toBe('শার্ট, পাঞ্জাবি');
  });
});

describe('itemTitle', () => {
  it('numbers garments by their place in the order', () => {
    const order = spec54Order();
    expect(itemTitle(order, order.items[2]!, 'bn')).toBe('পাঞ্জাবি ৩');
    expect(itemTitle(order, order.items[1]!, 'en')).toBe('Shirt 2');
  });
});
```

`apps/web/src/ui/forms.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';
import { ChoiceGroup } from './ChoiceGroup';
import { SelectField } from './SelectField';
import { TextAreaField } from './TextAreaField';

describe('SelectField', () => {
  it('links its label and reports the chosen value', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        label="পোশাক"
        value="shirt"
        options={[
          { value: 'shirt', label: 'শার্ট' },
          { value: 'pant', label: 'প্যান্ট' },
        ]}
        onChange={onChange}
      />,
    );
    await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'প্যান্ট');
    expect(onChange).toHaveBeenCalledWith('pant');
  });

  it('shows an error next to the field', () => {
    render(<SelectField label="পোশাক" value="" options={[]} onChange={() => {}} error="পোশাক বেছে নিন" />);
    const select = screen.getByLabelText('পোশাক');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe(screen.getByText('পোশাক বেছে নিন').id);
  });
});

describe('TextAreaField', () => {
  it('links its label and error', async () => {
    const onChange = vi.fn();
    render(<TextAreaField label="নোট" error="নোট লিখুন" onChange={(e) => onChange(e.target.value)} />);
    await userEvent.type(screen.getByLabelText('নোট'), 'ক');
    expect(onChange).toHaveBeenLastCalledWith('ক');
    expect(screen.getByLabelText('নোট').getAttribute('aria-describedby')).toBe(screen.getByText('নোট লিখুন').id);
  });
});

describe('ChoiceGroup', () => {
  function Harness() {
    const [value, setValue] = useState<'male' | 'female' | null>(null);
    return (
      <ChoiceGroup
        legend="লিঙ্গ"
        value={value}
        onChange={setValue}
        options={[
          { value: 'male', label: 'পুরুষ' },
          { value: 'female', label: 'মহিলা' },
        ]}
      />
    );
  }

  it('is a named group of radios with one choice', async () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'লিঙ্গ' })).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: 'মহিলা' }));
    expect(screen.getByRole('radio', { name: 'মহিলা' })).toHaveProperty('checked', true);
    expect(screen.getByRole('radio', { name: 'পুরুষ' })).toHaveProperty('checked', false);
  });
});

describe('Checkbox', () => {
  it('toggles and shows its error', async () => {
    const onChange = vi.fn();
    render(<Checkbox label="মাপ ঠিক আছে" checked={false} onChange={onChange} error="টিক দিন" />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'মাপ ঠিক আছে' }));
    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('checkbox').getAttribute('aria-describedby')).toBe(screen.getByText('টিক দিন').id);
  });
});
```

`apps/web/src/features/common/common.test.tsx`:

```tsx
import { emptyState } from '@darzikhata/domain';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { useCan, useMeasurementAccess } from './hooks';
import { problemText } from './problemText';

const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function signedIn(staffId: string, pin: string) {
  const db = new DarziDb(`common-${dbs.length}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo('nakshi');
  await store.signOut();
  await store.signIn(staffId, pin);
  const wrapper = ({ children }: { children: ReactNode }) => <StoreProvider store={store}>{children}</StoreProvider>;
  return wrapper;
}

describe('useCan and useMeasurementAccess', () => {
  it('follows the role and the women’s measurement restriction', async () => {
    const counter = await signedIn('nakshi-counter', '2222');
    const can = renderHook(() => useCan(), { wrapper: counter }).result.current;
    expect(can('payments.record')).toBe(true);
    expect(can('payments.refund')).toBe(false);
    const access = renderHook(() => useMeasurementAccess(), { wrapper: counter }).result.current;
    expect(access({ gender: 'female' })).toBe(false);
    expect(access({ gender: 'male' })).toBe(true);

    const cutting = await signedIn('nakshi-cutting', '3333');
    expect(renderHook(() => useMeasurementAccess(), { wrapper: cutting }).result.current({ gender: 'female' })).toBe(true);
  });
});

describe('problemText', () => {
  it('explains conflicts and rejections, and says nothing for saves that worked', () => {
    const state = emptyState();
    expect(problemText({ kind: 'applied', state }, 'bn')).toBeNull();
    expect(problemText({ kind: 'duplicate', state }, 'bn')).toBeNull();
    expect(problemText({ kind: 'conflict', state, currentVersion: 2 }, 'en')).toBe(
      'Someone else changed this in the meantime. Check the latest details and try again.',
    );
    expect(problemText({ kind: 'rejected', state, reason: 'refund-exceeds-paid' }, 'bn')).toBe('সেভ করা যায়নি (refund-exceeds-paid)');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/ui/forms.test.tsx src/features/common`

Expected: FAIL, the modules do not exist yet.

- [ ] **Step 3: Write the helpers**

`apps/web/src/features/common/orderText.ts`:

```ts
import { labelIn, type Language, type Order, type OrderItem, type OrderProgress } from '@darzikhata/domain';
import { formatNumber, translate } from '../../i18n/format';

/** "মোট ৩টি: ২টি চলছে, ১টি রেডি". Groups with no garments are left out. */
export function progressText(progress: OrderProgress, language: Language): string {
  const parts = (['unfinished', 'ready', 'delivered', 'cancelled'] as const)
    .filter((group) => progress[group] > 0)
    .map((group) => translate(language, `progress.${group}`, { n: formatNumber(progress[group], language) }));
  return `${translate(language, 'progress.total', { n: formatNumber(progress.total, language) })}: ${parts.join(', ')}`;
}

/** "শার্ট ×২, পাঞ্জাবি": garments that are not cancelled, in order of first appearance. */
export function garmentSummary(order: Order, language: Language): string {
  const counts = new Map<string, number>();
  for (const item of order.items) {
    if (item.cancelled) continue;
    const name = labelIn(item.garmentName, language);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${formatNumber(n, language)}` : name)).join(', ');
}

/** The name a garment goes by on screens and print-outs: "শার্ট ২" for the order's second item. */
export function itemTitle(order: Order, item: OrderItem, language: Language): string {
  return `${labelIn(item.garmentName, language)} ${formatNumber(order.items.indexOf(item) + 1, language)}`;
}
```

Then write the four controls, `problemText.ts`, `hooks.ts` and `lib/dates.ts`, switch `MorePage` to `ChoiceGroup`, and add the messages.

- [ ] **Step 4: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 93 tests (83 + 3 + 5 + 2); type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui apps/web/src/lib/dates.ts apps/web/src/seed/generate.ts apps/web/src/features/common apps/web/src/features/more/MorePage.tsx apps/web/src/i18n
git commit -m "feat(web): add form controls and shared order text helpers"
```

### Task 4: Customers list and profile

Find a customer by name in either script or by phone, and see who they are, their household and their orders. On desktop the list stays beside the profile; on mobile they are separate screens.

**Files:**
- Create: `apps/web/src/features/customers/CustomersPage.tsx`, `CustomerList.tsx`, `CustomerProfile.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (route `customers/:customerId?`, replacing the placeholder)
- Test: `apps/web/src/features/customers/CustomersPage.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `searchCustomers` (domain); `progressText`, `useCan` (Task 3); `formatMoney`.
- Produces: `CustomerProfile({ customerId })`, which Task 6 extends with the measurements section. Links later tasks rely on: `/app/orders/new?customer=<id>` and `/app/orders/new?repeat=<orderId>` (Task 9 reads them), `/app/orders/<orderId>` (Task 12), `/app/customers/<id>/edit` (Task 5).

**Done when:**
- The list (`<ul aria-label="কাস্টমার তালিকা">`) shows every customer sorted by name when the search box is empty, and `searchCustomers(customers, query, 50)` results otherwise. Each entry is one link to the profile whose text starts with the name, followed by the other-script name and the phone.
- The search box is labelled `কাস্টমার খুঁজুন`. A `নতুন কাস্টমার` link to `/app/customers/new` shows with `customers.edit`.
- Desktop: the list (its own scroll area) sits beside the profile; the open customer's link has `aria-current="page"`; the search text survives opening another profile. With no customer chosen, the right side says `বাম পাশ থেকে একজন কাস্টমার বেছে নিন`.
- Mobile: `/app/customers` shows only the list; `/app/customers/:id` shows only the profile, with a `সব কাস্টমার` link back.
- The profile heading is the customer's name, then the other-script name, the phone (or `ফোন নম্বর নেই`) and notes.
- Region `পরিবার` (only when the customer has a household) shows the household label and links to the other members, each link named exactly by the member's name.
- Region `অর্ডারের ইতিহাস` lists the customer's orders newest first. Each row: a link to `/app/orders/<id>` whose text starts with the order number, the date, `progressText`, and with `money.view` the balance as one text node `বাকি ৳…` when it is above zero. With `orders.create`, each row has an `আবার অর্ডার` link to `/app/orders/new?repeat=<id>`. With none, it says `এখনো কোনো অর্ডার নেই`.
- Profile actions: `এই কাস্টমারের নতুন অর্ডার` (`orders.create`) to `/app/orders/new?customer=<id>`, and `তথ্য বদলান` (`customers.edit`) to the edit route.
- An unknown id shows `role="alert"` with `কাস্টমার পাওয়া যায়নি`.

**Messages:**

```ts
// bn.ts
'customers.list': 'কাস্টমার তালিকা',
'customers.search': 'কাস্টমার খুঁজুন',
'customers.new': 'নতুন কাস্টমার',
'customers.none': 'কোনো কাস্টমার পাওয়া যায়নি',
'customers.choose': 'বাম পাশ থেকে একজন কাস্টমার বেছে নিন',
'customers.back': 'সব কাস্টমার',
'customers.notFound': 'কাস্টমার পাওয়া যায়নি',
'customer.noPhone': 'ফোন নম্বর নেই',
'customer.household': 'পরিবার',
'customer.orders': 'অর্ডারের ইতিহাস',
'customer.noOrders': 'এখনো কোনো অর্ডার নেই',
'customer.newOrder': 'এই কাস্টমারের নতুন অর্ডার',
'customer.orderAgain': 'আবার অর্ডার',
'customer.edit': 'তথ্য বদলান',
'customer.balance': 'বাকি {amount}',
// en.ts
'customers.list': 'Customer list',
'customers.search': 'Search customers',
'customers.new': 'New customer',
'customers.none': 'No customers found',
'customers.choose': 'Choose a customer from the list',
'customers.back': 'All customers',
'customers.notFound': 'Customer not found',
'customer.noPhone': 'No phone number',
'customer.household': 'Household',
'customer.orders': 'Order history',
'customer.noOrders': 'No orders yet',
'customer.newOrder': 'New order for this customer',
'customer.orderAgain': 'Order again',
'customer.edit': 'Edit details',
'customer.balance': 'Due {amount}',
```

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/customers/CustomersPage.test.tsx`:

```tsx
import { balanceDue, formatTaka } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const customerList = () => screen.getByRole('list', { name: 'কাস্টমার তালিকা' });
const startsWith = (text: string) => new RegExp(`^${text}`);

describe('Customers', () => {
  it('lists every customer and searches across Bangla and English names', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const customers = Object.values(store.getSnapshot().state.customers);
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    expect(within(customerList()).getAllByRole('link')).toHaveLength(customers.length);

    const target = customers.find((c) => c.nameAlt)!;
    await userEvent.type(screen.getByLabelText('কাস্টমার খুঁজুন'), target.nameAlt!);
    expect(within(customerList()).getByRole('link', { name: startsWith(target.name) })).toBeTruthy();
    expect(within(customerList()).getAllByRole('link').length).toBeLessThan(customers.length);
  });

  it('opens a profile beside the list on desktop and keeps the search', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const target = Object.values(store.getSnapshot().state.customers)[0]!;
    expect(await screen.findByText('বাম পাশ থেকে একজন কাস্টমার বেছে নিন')).toBeTruthy();

    await userEvent.type(screen.getByLabelText('কাস্টমার খুঁজুন'), target.name);
    await userEvent.click(within(customerList()).getByRole('link', { name: startsWith(target.name) }));

    expect(await screen.findByRole('heading', { name: target.name })).toBeTruthy();
    expect(screen.getByLabelText('কাস্টমার খুঁজুন')).toHaveProperty('value', target.name);
    const link = within(customerList()).getByRole('link', { name: startsWith(target.name) });
    expect(link.getAttribute('aria-current')).toBe('page');
  });

  it('shows the household and its other members', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c2' });
    const { state } = store.getSnapshot();
    const household = await screen.findByRole('region', { name: 'পরিবার' });
    expect(within(household).getByText(state.households['rahman-h1']!.label)).toBeTruthy();
    const member = within(household).getByRole('link', { name: state.customers['rahman-c3']!.name });
    expect(member.getAttribute('href')).toBe('/app/customers/rahman-c3');
  });

  it('lists orders newest first with balances and repeat links', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers' });
    const { state } = store.getSnapshot();
    const customerId = state.orders['rahman-o40']!.customerId;
    await act(() => router.navigate(`/app/customers/${customerId}`));

    const history = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    const orders = Object.values(state.orders)
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const orderLinks = within(history).getAllByRole('link', { name: /^[A-Z]-\d{4}/ });
    expect(orderLinks.map((l) => l.textContent!.slice(0, 6))).toEqual(orders.map((o) => o.number));
    expect(orderLinks[0]!.getAttribute('href')).toBe(`/app/orders/${orders[0]!.id}`);

    const repeat = within(history).getAllByRole('link', { name: 'আবার অর্ডার' });
    expect(repeat).toHaveLength(orders.length);
    expect(repeat[0]!.getAttribute('href')).toBe(`/app/orders/new?repeat=${orders[0]!.id}`);
    for (const order of orders.filter((o) => balanceDue(o) > 0)) {
      expect(within(history).getAllByText(`বাকি ${formatTaka(balanceDue(order), 'bn')}`).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole('link', { name: 'এই কাস্টমারের নতুন অর্ডার' }).getAttribute('href')).toBe(
      `/app/orders/new?customer=${customerId}`,
    );
  });

  it('hides balances and order actions from staff without those permissions', async () => {
    const { store, router } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    const order = Object.values(store.getSnapshot().state.orders)[0]!;
    await act(() => router.navigate(`/app/customers/${order.customerId}`));
    const history = await screen.findByRole('region', { name: 'অর্ডারের ইতিহাস' });
    expect(within(history).queryByText(/^বাকি/)).toBeNull();
    expect(within(history).queryByRole('link', { name: 'আবার অর্ডার' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'তথ্য বদলান' })).toBeNull();
  });

  it('shows the list, then the profile alone on mobile, with a way back', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/customers' });
    const target = Object.values(store.getSnapshot().state.customers)[0]!;
    await screen.findByRole('list', { name: 'কাস্টমার তালিকা' });
    await userEvent.click(within(customerList()).getByRole('link', { name: startsWith(target.name) }));

    expect(await screen.findByRole('heading', { name: target.name })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'কাস্টমার তালিকা' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'সব কাস্টমার' }));
    expect(await screen.findByRole('list', { name: 'কাস্টমার তালিকা' })).toBeTruthy();
  });

  it('says so when a customer does not exist', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/nobody' });
    expect((await screen.findByRole('alert')).textContent).toBe('কাস্টমার পাওয়া যায়নি');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/customers/CustomersPage.test.tsx`

Expected: FAIL. The placeholder page has no customer list.

- [ ] **Step 3: Build the screens**

Write `CustomersPage` (reads `customerId` from the route, picks the desktop or mobile arrangement with `useShell().kind`), `CustomerList` and `CustomerProfile` to the done-conditions. Keep the search text in `CustomersPage` state, which stays mounted while the `customerId` changes because both paths use the one route.

- [ ] **Step 4: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 100 tests (93 + 7); type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/customers apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add customer list and profile with household and order history"
```

### Task 5: Customer form

Add a customer, or correct their details, with households created on the spot. Edits are checked against the version the form opened with, so a change made elsewhere is never silently overwritten.

**Files:**
- Create: `apps/web/src/features/customers/customerInput.ts`
- Test: `apps/web/src/features/customers/customerInput.test.ts`
- Create: `apps/web/src/features/customers/CustomerForm.tsx`
- Test: `apps/web/src/features/customers/CustomerForm.test.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`customers/new`, `customers/:customerId/edit`)
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `normalizePhone` (domain); `useUnsavedGuard` (Task 2); `ChoiceGroup`, `SelectField`, `TextAreaField`, `problemText` (Task 3).
- Produces:
  - `NEW_HOUSEHOLD`, `CustomerInput`, `CustomerInputErrors`
  - `isValidPhone(input)`: Task 7's order draft uses it for new customers.
  - `emptyCustomerInput()`, `customerInputFrom(customer)`, `validateCustomerInput(input)`
  - `customerEvents(input, { existing, baseVersion, newId }): { customerId; events }`

**Done when:**
- Headings `নতুন কাস্টমার` (new) and `কাস্টমারের তথ্য বদলান` (edit). Fields: `নাম`, `অন্য ভাষায় নাম`, `ফোন`, gender `ChoiceGroup` legend `লিঙ্গ` (`পুরুষ`, `মহিলা`, `অন্যান্য`), `পরিবার` select (`কোনো পরিবার নয়`, each existing household label, `নতুন পরিবার`), `পরিবারের নাম` (shown only for a new household), `নোট`.
- `সেভ করুন` validates first and shows each error beside its field: `নাম লিখুন`, `ফোন নম্বর ঠিক নেই, ১১ সংখ্যার মোবাইল নম্বর দিন`, `পরিবারের নাম লিখুন`. Nothing is saved while there are errors.
- Saving uses `dispatchBatch(customerEvents(...).events)` with `baseVersion` captured when the form opened, then navigates (after `allowNextNavigation()`) to the profile. Saving with no changes just returns to the profile.
- A conflict or rejection shows `problemText` in `role="alert"` and keeps the typed values.
- A `বাতিল` link returns to the profile (or the list for a new customer). Leaving with changes asks first (`useUnsavedGuard`).
- Both routes need `customers.edit`.

**Messages:**

```ts
// bn.ts
'customerForm.newTitle': 'নতুন কাস্টমার',
'customerForm.editTitle': 'কাস্টমারের তথ্য বদলান',
'customerForm.name': 'নাম',
'customerForm.nameAlt': 'অন্য ভাষায় নাম',
'customerForm.phone': 'ফোন',
'customerForm.gender': 'লিঙ্গ',
'gender.male': 'পুরুষ',
'gender.female': 'মহিলা',
'gender.other': 'অন্যান্য',
'customerForm.household': 'পরিবার',
'customerForm.noHousehold': 'কোনো পরিবার নয়',
'customerForm.newHousehold': 'নতুন পরিবার',
'customerForm.householdName': 'পরিবারের নাম',
'customerForm.notes': 'নোট',
'customerForm.error.name': 'নাম লিখুন',
'customerForm.error.phone': 'ফোন নম্বর ঠিক নেই, ১১ সংখ্যার মোবাইল নম্বর দিন',
'customerForm.error.household': 'পরিবারের নাম লিখুন',
// en.ts
'customerForm.newTitle': 'New customer',
'customerForm.editTitle': 'Edit customer details',
'customerForm.name': 'Name',
'customerForm.nameAlt': 'Name in the other script',
'customerForm.phone': 'Phone',
'customerForm.gender': 'Gender',
'gender.male': 'Male',
'gender.female': 'Female',
'gender.other': 'Other',
'customerForm.household': 'Household',
'customerForm.noHousehold': 'No household',
'customerForm.newHousehold': 'New household',
'customerForm.householdName': 'Household name',
'customerForm.notes': 'Notes',
'customerForm.error.name': 'Enter a name',
'customerForm.error.phone': 'Phone number is not valid. Enter an 11-digit mobile number',
'customerForm.error.household': 'Enter a household name',
```

The cancel link reuses `common.cancel` (`বাতিল`) and the save button `common.save` (`সেভ করুন`).

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/customers/customerInput.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  customerEvents,
  customerInputFrom,
  emptyCustomerInput,
  isValidPhone,
  NEW_HOUSEHOLD,
  validateCustomerInput,
  type CustomerInput,
} from './customerInput';

const existing = {
  id: 'c1', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678', householdId: null,
  gender: 'male' as const, notes: '', createdAt: '', version: 3,
};

let n = 0;
const newId = () => `id-${++n}`;

describe('isValidPhone', () => {
  it('accepts an empty phone or an 11-digit mobile number in either script', () => {
    expect(isValidPhone('')).toBe(true);
    expect(isValidPhone('01712345678')).toBe(true);
    expect(isValidPhone('০১৭১২-৩৪৫৬৭৮')).toBe(true);
    expect(isValidPhone('+880 1712 345678')).toBe(true);
    expect(isValidPhone('1712345678')).toBe(false);
    expect(isValidPhone('0171234')).toBe(false);
  });
});

describe('validateCustomerInput', () => {
  it('needs a name, a readable phone and a label for a new household', () => {
    const input: CustomerInput = { ...emptyCustomerInput(), phone: '123', householdId: NEW_HOUSEHOLD };
    expect(validateCustomerInput(input)).toEqual({ name: 'required', phone: 'invalid', newHousehold: 'required' });
    expect(validateCustomerInput({ ...emptyCustomerInput(), name: 'করিম' })).toEqual({});
  });
});

describe('customerEvents', () => {
  it('creates a customer with a new household, storing the phone in plain digits', () => {
    n = 0;
    const input: CustomerInput = {
      ...emptyCustomerInput(),
      name: ' সুমি ',
      phone: '০১৮১১ ০০০০০০',
      gender: 'female',
      householdId: NEW_HOUSEHOLD,
      newHousehold: ' রহমান পরিবার ',
    };
    expect(customerEvents(input, { existing: null, baseVersion: null, newId })).toEqual({
      customerId: 'id-2',
      events: [
        { type: 'household.created', household: { id: 'id-1', label: 'রহমান পরিবার' } },
        {
          type: 'customer.created',
          customer: { id: 'id-2', name: 'সুমি', nameAlt: null, phone: '01811000000', householdId: 'id-1', gender: 'female', notes: '' },
        },
      ],
    });
  });

  it('sends only changed fields, based on the version the form was opened with', () => {
    const input = { ...customerInputFrom(existing), phone: '01799999999', notes: 'ঢিলা পছন্দ করেন' };
    expect(customerEvents(input, { existing, baseVersion: 2, newId }).events).toEqual([
      { type: 'customer.updated', customerId: 'c1', baseVersion: 2, changes: { phone: '01799999999', notes: 'ঢিলা পছন্দ করেন' } },
    ]);
  });

  it('sends nothing when nothing changed', () => {
    expect(customerEvents(customerInputFrom(existing), { existing, baseVersion: 3, newId }).events).toEqual([]);
  });

  it('can clear optional fields', () => {
    const input = { ...customerInputFrom(existing), nameAlt: ' ', phone: '' };
    expect(customerEvents(input, { existing, baseVersion: 3, newId }).events[0]).toMatchObject({
      changes: { nameAlt: null, phone: null },
    });
  });
});
```

`apps/web/src/features/customers/CustomerForm.test.tsx`:

```tsx
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Customer form', () => {
  it('adds a customer with a new household and opens their profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    expect(await screen.findByRole('heading', { name: 'নতুন কাস্টমার' })).toBeTruthy();
    await userEvent.type(screen.getByLabelText('নাম'), 'সুমি আক্তার');
    await userEvent.type(screen.getByLabelText('ফোন'), '০১৮১১০০০০০০');
    await userEvent.click(screen.getByRole('radio', { name: 'মহিলা' }));
    await userEvent.selectOptions(screen.getByLabelText('পরিবার'), 'নতুন পরিবার');
    await userEvent.type(screen.getByLabelText('পরিবারের নাম'), 'আক্তার পরিবার');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByRole('heading', { name: 'সুমি আক্তার' })).toBeTruthy();
    const { state } = store.getSnapshot();
    const saved = Object.values(state.customers).find((c) => c.name === 'সুমি আক্তার')!;
    expect(saved).toMatchObject({ phone: '01811000000', gender: 'female' });
    expect(state.households[saved.householdId!]!.label).toBe('আক্তার পরিবার');
  });

  it('shows problems beside the fields and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    const before = Object.keys(store.getSnapshot().state.customers).length;
    await userEvent.type(await screen.findByLabelText('ফোন'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(screen.getByText('নাম লিখুন')).toBeTruthy();
    expect(screen.getByLabelText('ফোন').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText('ফোন নম্বর ঠিক নেই, ১১ সংখ্যার মোবাইল নম্বর দিন')).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.customers)).toHaveLength(before);
  });

  it('edits details and returns to the profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    expect(await screen.findByRole('heading', { name: 'কাস্টমারের তথ্য বদলান' })).toBeTruthy();
    expect(screen.getByLabelText('নাম')).toHaveProperty('value', customer.name);

    await userEvent.type(screen.getByLabelText('নোট'), 'ঢিলা ফিটিং পছন্দ করেন');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('ঢিলা ফিটিং পছন্দ করেন')).toBeTruthy();
    expect(store.getSnapshot().state.customers['rahman-c1']).toMatchObject({ notes: 'ঢিলা ফিটিং পছন্দ করেন', version: 2 });
  });

  it('does not overwrite a change made elsewhere after the form opened', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/rahman-c1/edit' });
    const phone = store.getSnapshot().state.customers['rahman-c1']!.phone;
    await screen.findByRole('heading', { name: 'কাস্টমারের তথ্য বদলান' });
    await act(() =>
      store.dispatch({ type: 'customer.updated', customerId: 'rahman-c1', baseVersion: 1, changes: { notes: 'অন্য ডিভাইস থেকে' } }),
    );

    await userEvent.clear(screen.getByLabelText('ফোন'));
    await userEvent.type(screen.getByLabelText('ফোন'), '01799999999');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।',
    );
    expect(store.getSnapshot().state.customers['rahman-c1']).toMatchObject({ phone, notes: 'অন্য ডিভাইস থেকে' });
    expect(screen.getByLabelText('ফোন')).toHaveProperty('value', '01799999999');
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/customers/new' });
    await userEvent.type(await screen.findByLabelText('নাম'), 'ক');
    await userEvent.click(screen.getByRole('link', { name: 'অর্ডার' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });

  it('is only for staff who may edit customers', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers/new',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/customers`

Expected: FAIL. `customerInput` does not exist and the routes show no form.

- [ ] **Step 3: Write the input model**

Only the changed fields are sent, so two people editing different fields still conflict (the version moved), but the event never carries values the person did not touch.

`apps/web/src/features/customers/customerInput.ts`:

```ts
import { normalizePhone, type Customer, type CustomerChanges, type EventBody, type Gender } from '@darzikhata/domain';

/** Select value meaning "create a new household with the typed label". */
export const NEW_HOUSEHOLD = '__new';

export interface CustomerInput {
  name: string;
  nameAlt: string;
  phone: string;
  gender: Gender | null;
  /** An existing household id, NEW_HOUSEHOLD, or null for none. */
  householdId: string | null;
  newHousehold: string;
  notes: string;
}

export type CustomerInputErrors = Partial<Record<'name' | 'phone' | 'newHousehold', 'required' | 'invalid'>>;

/** Empty is fine (the phone is optional); otherwise an 11-digit Bangladeshi mobile number in either script. */
export function isValidPhone(input: string): boolean {
  return !input.trim() || /^01\d{9}$/.test(normalizePhone(input));
}

export function emptyCustomerInput(): CustomerInput {
  return { name: '', nameAlt: '', phone: '', gender: null, householdId: null, newHousehold: '', notes: '' };
}

export function customerInputFrom(customer: Customer): CustomerInput {
  return {
    name: customer.name,
    nameAlt: customer.nameAlt ?? '',
    phone: customer.phone ?? '',
    gender: customer.gender,
    householdId: customer.householdId,
    newHousehold: '',
    notes: customer.notes,
  };
}

export function validateCustomerInput(input: CustomerInput): CustomerInputErrors {
  const errors: CustomerInputErrors = {};
  if (!input.name.trim()) errors.name = 'required';
  if (!isValidPhone(input.phone)) errors.phone = 'invalid';
  if (input.householdId === NEW_HOUSEHOLD && !input.newHousehold.trim()) errors.newHousehold = 'required';
  return errors;
}

/**
 * Events that save the form: an optional new household, then the customer. Editing sends only
 * the fields that changed, based on the version the form was opened with, so a change made
 * elsewhere in the meantime is detected instead of overwritten. No changes means no events.
 */
export function customerEvents(
  input: CustomerInput,
  ctx: { existing: Customer | null; baseVersion: number | null; newId(): string },
): { customerId: string; events: EventBody[] } {
  const events: EventBody[] = [];
  let householdId = input.householdId;
  if (householdId === NEW_HOUSEHOLD) {
    householdId = ctx.newId();
    events.push({ type: 'household.created', household: { id: householdId, label: input.newHousehold.trim() } });
  }
  const values = {
    name: input.name.trim(),
    nameAlt: input.nameAlt.trim() || null,
    phone: input.phone.trim() ? normalizePhone(input.phone) : null,
    householdId,
    gender: input.gender,
    notes: input.notes.trim(),
  };

  if (!ctx.existing) {
    const customerId = ctx.newId();
    events.push({ type: 'customer.created', customer: { id: customerId, ...values } });
    return { customerId, events };
  }

  const existing = ctx.existing;
  const changes: CustomerChanges = {};
  for (const key of Object.keys(values) as Array<keyof typeof values>) {
    if (values[key] !== existing[key]) (changes as Record<string, unknown>)[key] = values[key];
  }
  if (Object.keys(changes).length > 0) {
    events.push({ type: 'customer.updated', customerId: existing.id, baseVersion: ctx.baseVersion ?? existing.version, changes });
  }
  return { customerId: existing.id, events };
}
```

- [ ] **Step 4: Build the form**

Write `CustomerForm` to the done-conditions. One component serves both routes: with a `customerId` it starts from `customerInputFrom(customer)` and remembers `customer.version` as `baseVersion`; otherwise it starts from `emptyCustomerInput()`.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 112 tests (100 + 6 + 6); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/customers apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add customer form with households and stale-edit protection"
```

### Task 6: Measurements

A customer's measurements per garment: the current version, older versions, and the frozen copies on their orders, side by side. Taking new measurements adds a version and never changes an order.

**Files:**
- Create: `apps/web/src/features/customers/measurementView.ts`
- Test: `apps/web/src/features/customers/measurementView.test.ts`
- Create: `apps/web/src/features/customers/MeasurementSection.tsx`, `MeasurementForm.tsx`, `MeasurementTable.tsx`
- Modify: `apps/web/src/features/customers/CustomerProfile.tsx` (add the section above the order history)
- Modify: `apps/web/src/app/AppRoutes.tsx` (`customers/:customerId/measure/:templateId`)
- Test: `apps/web/src/features/customers/Measurements.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `currentVersion`, `formatMeasurement`, `profileKey`, `canViewMeasurementsOf` (domain); `NumberField` (Plan 2); `useMeasurementAccess` (Task 3).
- Produces:
  - `fieldGroups(fields): FieldGroup[]` and `compareValues(fields, current, other): ComparedValue[]`
  - `groupLabel(group: string, t): string`: the `mgroup.<group>` message when one exists, otherwise the group key as typed (shops may invent their own).
  - `MeasurementTable({ template, values: Record<string, MeasurementValue> })`: a table of `<tr><th>{field label}</th><td>{formatMeasurement(value)} {unit}</td></tr>` rows, grouped. Task 8's job slip and Task 13's garment cards reuse it.
  - `MeasurementInputs({ template, values: Record<string, number>, errors?: Record<string, string>, onChange(values) })`: grouped `NumberField`s (one `fieldset` per group, legend `groupLabel`), each labelled with the field label and suffixed with its unit. Task 10 reuses it inside order entry.

**Done when:**
- Region `মাপ` on the profile holds a tab list (`aria-label="পোশাক অনুযায়ী মাপ"`) with one tab per active template that has fields, named by the template label. Arrow keys move between tabs. The selected tab comes from `?tab=<templateId>`, else the first template the customer has measurements for, else the first tab.
- A tab with no versions says `এখনো মাপ নেওয়া হয়নি`. With versions, the panel shows the current version's `MeasurementTable`, the line `{date} তারিখে, {source}` (`শরীর থেকে` or `নমুনা পোশাক থেকে`), who took it (`নিয়েছেন: {name}`), and its notes.
- A `তুলনা করুন` select lists `তুলনা নয়`, each older version (`মাপ: {date}`) and each order snapshot of this garment (`অর্ডার {number}`). Choosing one adds a column beside the current values, and every row where `compareValues` reports a change shows `বদলেছে`.
- With `measurements.edit`, `নতুন মাপ নিন` links to the measure route.
- Without access (`useMeasurementAccess` false), the region shows only `এই কাস্টমারের মাপ দেখার অনুমতি আপনার নেই।`: no tabs, no values.
- The measure route has heading `{garment}: নতুন মাপ`, `MeasurementInputs` prefilled with the current version (if any), a source `ChoiceGroup` (legend `মাপ কোথা থেকে`, default body), `নোট`, and `মাপ সেভ করুন`. Missing required fields show `এই মাপটি লাগবে` beside them and nothing is saved. Saving dispatches `measurement.recorded` (new version id from `store.createId()`, values with each field's unit, `takenBy` the signed-in staff) and returns to `/app/customers/<id>?tab=<templateId>`. Leaving with changes asks first.

**Messages:**

```ts
// bn.ts
'measure.section': 'মাপ',
'measure.tabs': 'পোশাক অনুযায়ী মাপ',
'measure.none': 'এখনো মাপ নেওয়া হয়নি',
'measure.take': 'নতুন মাপ নিন',
'measure.takenOn': '{date} তারিখে, {source}',
'measure.takenBy': 'নিয়েছেন: {name}',
'measure.compare': 'তুলনা করুন',
'measure.compareNone': 'তুলনা নয়',
'measure.version': 'মাপ: {date}',
'measure.snapshot': 'অর্ডার {number}',
'measure.current': 'এখনকার',
'measure.changed': 'বদলেছে',
'measure.hidden': 'এই কাস্টমারের মাপ দেখার অনুমতি আপনার নেই।',
'measure.title': '{garment}: নতুন মাপ',
'measure.source': 'মাপ কোথা থেকে',
'measure.notes': 'নোট',
'measure.save': 'মাপ সেভ করুন',
'measure.required': 'এই মাপটি লাগবে',
'source.body': 'শরীর থেকে',
'source.sample': 'নমুনা পোশাক থেকে',
'unit.inch': 'ইঞ্চি',
'unit.cm': 'সেমি',
'mgroup.body': 'শরীর',
'mgroup.sleeve': 'হাতা',
'mgroup.neck': 'গলা',
'mgroup.leg': 'পা',
'mgroup.kameez': 'কামিজ',
'mgroup.salwar': 'সালোয়ার',
'mgroup.blouse': 'ব্লাউজ',
'mgroup.skirt': 'লেহেঙ্গা',
// en.ts
'measure.section': 'Measurements',
'measure.tabs': 'Measurements by garment',
'measure.none': 'No measurements taken yet',
'measure.take': 'Take new measurements',
'measure.takenOn': 'On {date}, {source}',
'measure.takenBy': 'Taken by {name}',
'measure.compare': 'Compare with',
'measure.compareNone': 'Nothing',
'measure.version': 'Measurements: {date}',
'measure.snapshot': 'Order {number}',
'measure.current': 'Current',
'measure.changed': 'Changed',
'measure.hidden': 'You do not have permission to see this customer’s measurements.',
'measure.title': '{garment}: new measurements',
'measure.source': 'Measured from',
'measure.notes': 'Notes',
'measure.save': 'Save measurements',
'measure.required': 'This measurement is needed',
'source.body': 'the body',
'source.sample': 'a sample garment',
'unit.inch': 'in',
'unit.cm': 'cm',
'mgroup.body': 'Body',
'mgroup.sleeve': 'Sleeve',
'mgroup.neck': 'Neck',
'mgroup.leg': 'Leg',
'mgroup.kameez': 'Kameez',
'mgroup.salwar': 'Salwar',
'mgroup.blouse': 'Blouse',
'mgroup.skirt': 'Lehenga',
```

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/customers/measurementView.test.ts`:

```ts
import { STARTER_TEMPLATES } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { compareValues, fieldGroups } from './measurementView';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

describe('fieldGroups', () => {
  it('groups fields in the order groups first appear', () => {
    expect(fieldGroups(shirt.fields).map((g) => [g.group, g.fields.map((f) => f.key)])).toEqual([
      ['body', ['length', 'chest', 'waist', 'hip', 'shoulder']],
      ['sleeve', ['sleeve', 'cuff']],
      ['neck', ['collar']],
    ]);
  });
});

describe('compareValues', () => {
  it('marks fields whose value or unit differs', () => {
    const fields = shirt.fields.slice(0, 3);
    const current = { versionId: 'v2', takenAt: '', source: 'body' as const, values: { length: { value: 29, unit: 'inch' as const }, chest: { value: 39, unit: 'inch' as const } } };
    const older = { versionId: 'v1', takenAt: '', source: 'body' as const, values: { length: { value: 29, unit: 'cm' as const }, chest: { value: 38, unit: 'inch' as const }, waist: { value: 34, unit: 'inch' as const } } };
    expect(compareValues(fields, current, older)).toEqual([
      { key: 'length', current: 29, other: 29, changed: true },
      { key: 'chest', current: 39, other: 38, changed: true },
      { key: 'waist', current: null, other: 34, changed: true },
    ]);
    expect(compareValues(fields, current, current).every((c) => !c.changed)).toBe(true);
    expect(compareValues(fields, null, null).map((c) => c.current)).toEqual([null, null, null]);
  });
});
```

`apps/web/src/features/customers/Measurements.test.tsx`:

```tsx
import { formatMeasurement, profileKey } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

/** A Rahman Tailors customer with saved shirt measurements and at least one shirt order. */
async function shirtCustomer(layout: 'desktop' | 'mobile' = 'desktop') {
  const app = await renderApp({ layout, shop: 'rahman', path: '/app/customers' });
  const { state } = app.store.getSnapshot();
  const order = Object.values(state.orders).find((o) =>
    o.items.some((i) => i.templateId === 'shirt' && i.measurements && state.profiles[profileKey(o.customerId, 'shirt')]),
  )!;
  const customerId = order.customerId;
  await act(() => app.router.navigate(`/app/customers/${customerId}?tab=shirt`));
  const profile = state.profiles[profileKey(customerId, 'shirt')]!;
  return { ...app, customerId, order, profile };
}

const row = (scope: HTMLElement, label: string) => within(scope).getByRole('row', { name: new RegExp(`^${label}`) });

describe('Measurements', () => {
  it('shows the current version with units, source and date', async () => {
    const { profile } = await shirtCustomer();
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getByRole('tab', { name: 'শার্ট' }).getAttribute('aria-selected')).toBe('true');
    const panel = within(section).getByRole('tabpanel');
    const current = profile.versions.at(-1)!;
    const chest = current.values['chest']!.value;
    expect(within(row(panel, 'বুক')).getByText(`${formatMeasurement(chest, 'bn')} ইঞ্চি`)).toBeTruthy();
    expect(within(panel).getByText(/তারিখে, (শরীর থেকে|নমুনা পোশাক থেকে)$/)).toBeTruthy();
    expect(within(section).queryByRole('tab', { name: 'অল্টারেশন' })).toBeNull();
  });

  it('records a new version without changing measurements frozen on orders', async () => {
    const { store, customerId, profile, order } = await shirtCustomer();
    const versionsBefore = profile.versions.length;
    const frozen = order.items.find((i) => i.templateId === 'shirt')!.measurements;

    const section = await screen.findByRole('region', { name: 'মাপ' });
    await userEvent.click(within(section).getByRole('link', { name: 'নতুন মাপ নিন' }));
    expect(await screen.findByRole('heading', { name: 'শার্ট: নতুন মাপ' })).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('বুক'));
    await userEvent.type(screen.getByLabelText('বুক'), '৪০½');
    await userEvent.click(screen.getByRole('radio', { name: 'নমুনা পোশাক থেকে' }));
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    const panel = within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('tabpanel');
    expect(within(row(panel, 'বুক')).getByText('৪০½ ইঞ্চি')).toBeTruthy();
    expect(within(panel).getByText(/তারিখে, নমুনা পোশাক থেকে$/)).toBeTruthy();

    const { state } = store.getSnapshot();
    const versions = state.profiles[profileKey(customerId, 'shirt')]!.versions;
    expect(versions).toHaveLength(versionsBefore + 1);
    expect(versions.at(-1)).toMatchObject({ source: 'sample', takenBy: 'rahman-owner', values: { chest: { value: 40.5, unit: 'inch' } } });
    expect(state.orders[order.id]!.items.find((i) => i.templateId === 'shirt')!.measurements).toEqual(frozen);
  });

  it('compares the current values with an order’s frozen copy', async () => {
    const { order } = await shirtCustomer();
    const section = await screen.findByRole('region', { name: 'মাপ' });
    await userEvent.click(within(section).getByRole('link', { name: 'নতুন মাপ নিন' }));
    await userEvent.clear(await screen.findByLabelText('বুক'));
    await userEvent.type(screen.getByLabelText('বুক'), '৪০½');
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));

    const panel = within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('tabpanel');
    await userEvent.selectOptions(within(panel).getByLabelText('তুলনা করুন'), `অর্ডার ${order.number}`);
    expect(within(row(panel, 'বুক')).getByText('বদলেছে')).toBeTruthy();
  });

  it('requires every required measurement', async () => {
    const { store, customerId, profile } = await shirtCustomer();
    await userEvent.click(within(await screen.findByRole('region', { name: 'মাপ' })).getByRole('link', { name: 'নতুন মাপ নিন' }));
    await userEvent.clear(await screen.findByLabelText('বুক'));
    await userEvent.click(screen.getByRole('button', { name: 'মাপ সেভ করুন' }));
    expect(screen.getByText('এই মাপটি লাগবে')).toBeTruthy();
    expect(store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions).toHaveLength(profile.versions.length);
  });

  it('hides women’s measurements from staff without that permission', async () => {
    const counter = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-counter', pin: '2222' },
    });
    const profileKeyWithVersions = Object.keys(counter.store.getSnapshot().state.profiles)[0]!;
    const customerId = profileKeyWithVersions.split(':')[0]!;
    await act(() => counter.router.navigate(`/app/customers/${customerId}`));
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getByText('এই কাস্টমারের মাপ দেখার অনুমতি আপনার নেই।')).toBeTruthy();
    expect(within(section).queryByRole('tab')).toBeNull();
    expect(within(section).queryByText(/ইঞ্চি/)).toBeNull();
  });

  it('shows them to cutting staff who have the permission', async () => {
    const cutting = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/customers',
      as: { staffId: 'nakshi-cutting', pin: '3333' },
    });
    const customerId = Object.keys(cutting.store.getSnapshot().state.profiles)[0]!.split(':')[0]!;
    await act(() => cutting.router.navigate(`/app/customers/${customerId}`));
    const section = await screen.findByRole('region', { name: 'মাপ' });
    expect(within(section).getAllByText(/ইঞ্চি$/).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/customers`

Expected: FAIL. `measurementView` does not exist and the profile has no measurements region.

- [ ] **Step 3: Write the view helpers**

`apps/web/src/features/customers/measurementView.ts`:

```ts
import type { MeasurementField, MeasurementSnapshot, MeasurementVersion } from '@darzikhata/domain';

export interface FieldGroup {
  group: string;
  fields: MeasurementField[];
}

/** Fields grouped for display, groups in the order they first appear in the template. */
export function fieldGroups(fields: MeasurementField[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  for (const field of fields) {
    const existing = groups.find((g) => g.group === field.group);
    if (existing) existing.fields.push(field);
    else groups.push({ group: field.group, fields: [field] });
  }
  return groups;
}

export interface ComparedValue {
  key: string;
  current: number | null;
  other: number | null;
  changed: boolean;
}

/**
 * Lines up two sets of values field by field, for showing the current version beside an older
 * version or an order's frozen snapshot. Values saved in a different unit count as changed.
 */
export function compareValues(
  fields: MeasurementField[],
  current: MeasurementVersion | MeasurementSnapshot | null,
  other: MeasurementVersion | MeasurementSnapshot | null,
): ComparedValue[] {
  return fields.map((field) => {
    const a = current?.values[field.key];
    const b = other?.values[field.key];
    return {
      key: field.key,
      current: a?.value ?? null,
      other: b?.value ?? null,
      changed: (a?.value ?? null) !== (b?.value ?? null) || (a !== undefined && b !== undefined && a.unit !== b.unit),
    };
  });
}
```

Add `groupLabel` beside them (it needs `t`, so it takes the translate function as an argument).

- [ ] **Step 4: Build the section and the form**

Write `MeasurementTable`, `MeasurementInputs`, `MeasurementSection` and `MeasurementForm` to the done-conditions. Order snapshots for the compare list come from the customer's orders: every non-cancelled item of this template with `measurements !== null`, labelled by the order number.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 120 tests (112 + 2 + 6); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/customers apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): show, compare and record measurement versions per garment"
```

### Task 7: The order draft

Everything order entry needs that is not a screen: what a half-entered order looks like, what is wrong with it, what it costs, and how it becomes events. Mobile steps and the desktop form (Tasks 10 and 11) are two layouts over this one model, so they cannot disagree about the rules.

The rules that are easy to get wrong:

- **Quantity.** "2 shirts" is one draft line with quantity 2, but it becomes two order items, each with its own id, because each garment is cut, tracked and handed over on its own. Both share one measurement snapshot.
- **Measurements.** Saved measurements are used only after someone ticks that they are still right (spec section 3, step 8). New measurements are saved to the customer's profile as a new version first, and the order item freezes a copy of that version. Someone who may not see this customer's measurements (a Nakshi counter clerk and a female customer) can still take the order: the latest saved version is attached unseen, after the same confirmation, or none if nothing is saved.
- **Event order.** Customer, then measurements, then order, then advance. Each must apply against the state left by the ones before it; `dispatchBatch` checks exactly that.
- **Repeat orders.** Copy garments, prices, wearers and notes, never cancelled items. Saved measurements need confirming again. A group order's measurements were never saved to a profile, so they come back as new values for the person to check.

**Files:**
- Create: `apps/web/src/features/orders/draft.ts`
- Test: `apps/web/src/features/orders/draft.test.ts`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `isValidPhone` (Task 5); domain `snapshotOf`, `currentVersion`, `profileKey`, `templateById`, `normalizePhone`.
- Produces: `OrderDraft`, `DraftItem`, `DraftCustomer`, `DraftMeasurements`, `DraftErrors`, `DraftErrorCode`, `DraftContext`, `DraftTotals`, `DraftStep`, `DRAFT_STEPS`, `emptyDraft()`, `latestVersion()`, `initialMeasurements()`, `newDraftItem()`, `draftTotals()`, `validateDraft()`, `draftErrorKey()`, `stepOf()`, `errorsForStep()`, `buildOrderEvents()`, `draftFromOrder()`.

**Messages:**

```ts
// bn.ts
'draft.error.customer': 'কাস্টমার বেছে নিন বা নতুন কাস্টমার যোগ করুন',
'draft.error.items': 'অন্তত একটি পোশাক যোগ করুন',
'draft.error.template': 'এই পোশাক আর পাওয়া যাচ্ছে না',
'draft.error.quantity': 'সংখ্যা ১ থেকে ৫০ এর মধ্যে দিন',
'draft.error.price': 'দাম লিখুন',
'draft.error.measurements': 'মাপ দিন',
'draft.error.confirm': 'মাপ এখনো ঠিক আছে কিনা কাস্টমারের কাছে জেনে টিক দিন',
'draft.error.measurementsUnknown': 'এই মাপ আর পাওয়া যাচ্ছে না, নতুন মাপ নিন',
'draft.error.deliveryDate': 'ডেলিভারির তারিখ দিন',
'draft.error.past': 'আজকের আগের তারিখ দেওয়া যাবে না',
'draft.error.trialAfterDelivery': 'ট্রায়াল ডেলিভারির আগে হতে হবে',
'draft.error.discount': 'ছাড় মোট দামের বেশি হতে পারে না',
'draft.error.advance': 'অগ্রিম মোট দামের বেশি হতে পারে না',
// en.ts
'draft.error.customer': 'Choose a customer or add a new one',
'draft.error.items': 'Add at least one garment',
'draft.error.template': 'This garment is no longer available',
'draft.error.quantity': 'Enter a quantity from 1 to 50',
'draft.error.price': 'Enter a price',
'draft.error.measurements': 'Enter measurements',
'draft.error.confirm': 'Check with the customer that these measurements are still right, then tick',
'draft.error.measurementsUnknown': 'These measurements are no longer available. Take new ones',
'draft.error.deliveryDate': 'Enter a delivery date',
'draft.error.past': 'Dates before today are not allowed',
'draft.error.trialAfterDelivery': 'The trial must be before delivery',
'draft.error.discount': 'The discount cannot be more than the price',
'draft.error.advance': 'The advance cannot be more than the total',
```

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/orders/draft.test.ts`:

```ts
import { moneySummary, replay, type DomainEvent, type EventBody, type ShopState } from '@darzikhata/domain';
import { eventFactory, makeItem, makeOrder, newCustomer } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import {
  buildOrderEvents,
  draftErrorKey,
  draftFromOrder,
  draftTotals,
  emptyDraft,
  errorsForStep,
  newDraftItem,
  validateDraft,
  type DraftContext,
  type OrderDraft,
} from './draft';

const config = shopConfig('rahman');
const template = (id: string) => config.templates.find((t) => t.id === id)!;
const TODAY = '2026-10-03';

/** Customer c1 with one saved shirt measurement version. */
function baseState(): ShopState {
  const e = eventFactory();
  return replay([
    e({ type: 'customer.created', customer: newCustomer() }),
    e({
      type: 'measurement.recorded',
      customerId: 'c1',
      templateId: 'shirt',
      version: {
        id: 'c1-shirt-v1',
        takenAt: '2026-09-01T04:00:00.000Z',
        takenBy: 'rahman-owner',
        source: 'body',
        notes: '',
        values: { length: { value: 29, unit: 'inch' }, chest: { value: 38.5, unit: 'inch' } },
      },
    }),
  ]).state;
}

function ctx(state = baseState(), canSee = true): DraftContext {
  return { config, state, today: TODAY, canSeeMeasurements: () => canSee };
}

let keyCount = 0;
const item = (templateId: string, state: ShopState, customerId: string | null = 'c1', canSee = true) =>
  newDraftItem(template(templateId), `k${++keyCount}`, { customerId, state, canSee, deliveryDate: '2026-10-12' });

const allShirtValues = { length: 29, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15.5 };

describe('draftTotals', () => {
  it('matches the spec example: 2 shirts and a panjabi for ৳2,400 with ৳1,000 paid', () => {
    const state = baseState();
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'existing', customerId: 'c1' },
      items: [{ ...item('shirt', state), quantity: 2 }, item('panjabi', state)],
      advance: { amount: 100000, method: 'cash', reference: '' },
    };
    expect(draftTotals(draft)).toEqual({
      garments: 3,
      subtotal: 240000,
      discount: 0,
      total: 240000,
      advance: 100000,
      balance: 140000,
    });
  });
});

describe('newDraftItem', () => {
  it('starts from the template price and the latest saved measurements, unconfirmed', () => {
    const state = baseState();
    const shirt = item('shirt', state);
    expect(shirt.price).toBe(70000);
    expect(shirt.measurements).toEqual({ kind: 'saved', versionId: 'c1-shirt-v1', confirmed: false });
    expect(item('panjabi', state).measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });
    expect(item('alteration', state).measurements).toEqual({ kind: 'none' });
  });

  it('leaves measurements out when the person may not see them and none are saved', () => {
    expect(item('panjabi', baseState(), 'c1', false).measurements).toEqual({ kind: 'none' });
  });
});

describe('validateDraft', () => {
  it('needs a customer and at least one garment', () => {
    expect(validateDraft(emptyDraft(), ctx())).toEqual({ customer: 'required', items: 'required' });
  });

  it('checks a new customer’s name and phone, accepting Bangla digits', () => {
    const draft = (name: string, phone: string): OrderDraft => ({
      ...emptyDraft(),
      customer: { kind: 'new', name, nameAlt: '', phone, gender: 'male' },
      items: [{ ...item('alteration', baseState(), null), price: 20000 }],
    });
    expect(validateDraft(draft(' ', '12345'), ctx())).toEqual({ 'customer.name': 'required', 'customer.phone': 'invalid' });
    expect(validateDraft(draft('করিম', '০১৭১১-০০০০০০'), ctx())).toEqual({});
    expect(validateDraft(draft('করিম', ''), ctx())).toEqual({});
  });

  it('asks for saved measurements to be confirmed before they are used', () => {
    const state = baseState();
    const shirt = item('shirt', state);
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt] };
    expect(validateDraft(draft, ctx(state))).toEqual({ [`items.${shirt.key}.measurements`]: 'confirm' });

    const confirmed = { ...shirt, measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    expect(validateDraft({ ...draft, items: [confirmed] }, ctx(state))).toEqual({});
  });

  it('lists each missing required measurement, but not optional ones', () => {
    const state = baseState();
    const panjabi = item('panjabi', state);
    panjabi.measurements = { kind: 'new', values: { length: 42, chest: 38 }, source: 'body', notes: '' };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [panjabi] };
    expect(validateDraft(draft, ctx(state))).toEqual({
      [`items.${panjabi.key}.measure.waist`]: 'required',
      [`items.${panjabi.key}.measure.shoulder`]: 'required',
      [`items.${panjabi.key}.measure.sleeve`]: 'required',
      [`items.${panjabi.key}.measure.collar`]: 'required',
    });
  });

  it('requires measurements only from people who may see them', () => {
    const state = baseState();
    const panjabi = { ...item('panjabi', state), measurements: { kind: 'none' as const } };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [panjabi] };
    expect(validateDraft(draft, ctx(state, true))).toEqual({ [`items.${panjabi.key}.measurements`]: 'required' });
    expect(validateDraft(draft, ctx(state, false))).toEqual({});
  });

  it('checks quantity, price and dates', () => {
    const state = baseState();
    const alt = { ...item('alteration', state), quantity: 0, price: null, deliveryDate: '2026-10-02', trialDate: '2026-10-01' };
    const later = { ...item('alteration', state), deliveryDate: '2026-10-05', trialDate: '2026-10-06' };
    const noDate = { ...item('alteration', state), deliveryDate: '' };
    const draft: OrderDraft = { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [alt, later, noDate] };
    expect(validateDraft(draft, ctx(state))).toEqual({
      [`items.${alt.key}.quantity`]: 'invalid',
      [`items.${alt.key}.price`]: 'required',
      [`items.${alt.key}.deliveryDate`]: 'past',
      [`items.${alt.key}.trialDate`]: 'past',
      [`items.${later.key}.trialDate`]: 'after-delivery',
      [`items.${noDate.key}.deliveryDate`]: 'required',
    });
  });

  it('keeps the discount within the subtotal and the advance within the total', () => {
    const state = baseState();
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'existing', customerId: 'c1' },
      items: [item('alteration', state)],
      discount: { amount: 30000, reason: '' },
      advance: { amount: 100, method: 'cash', reference: '' },
    };
    expect(validateDraft(draft, ctx(state))).toEqual({ 'discount.amount': 'exceeds', 'advance.amount': 'exceeds' });
  });
});

describe('errorsForStep', () => {
  it('shows each problem on the mobile step that holds its field', () => {
    const errors = {
      customer: 'required',
      'items.k1.measure.chest': 'required',
      'items.k1.measurements': 'confirm',
      'items.k1.price': 'required',
      'items.k1.deliveryDate': 'past',
      'advance.amount': 'exceeds',
    } as const;
    expect(errorsForStep(errors, 'customer')).toEqual({ customer: 'required' });
    expect(Object.keys(errorsForStep(errors, 'garments'))).toEqual(['items.k1.measure.chest', 'items.k1.measurements']);
    expect(errorsForStep(errors, 'details')).toEqual({});
    expect(Object.keys(errorsForStep(errors, 'money'))).toEqual(['items.k1.price', 'items.k1.deliveryDate', 'advance.amount']);
    expect(errorsForStep(errors, 'review')).toBe(errors);
  });
});

/** Applies built event bodies as if this device had saved them. */
function applyBodies(bodies: EventBody[], state: ShopState) {
  return replay(
    bodies.map((body, i) => ({ id: `e${i}`, at: '2026-10-03T06:00:00.000Z', deviceId: 'device-a', staffId: 'rahman-owner', ...body }) as DomainEvent),
    state,
  );
}

describe('draftErrorKey', () => {
  it('picks the message for each kind of problem', () => {
    expect(draftErrorKey('customer', 'required')).toBe('draft.error.customer');
    expect(draftErrorKey('customer.phone', 'invalid')).toBe('customerForm.error.phone');
    expect(draftErrorKey('items.k1.measure.chest', 'required')).toBe('measure.required');
    expect(draftErrorKey('items.k1.measurements', 'confirm')).toBe('draft.error.confirm');
    expect(draftErrorKey('items.k1.measurements', 'required')).toBe('draft.error.measurements');
    expect(draftErrorKey('items.k1.deliveryDate', 'past')).toBe('draft.error.past');
    expect(draftErrorKey('items.k1.deliveryDate', 'required')).toBe('draft.error.deliveryDate');
    expect(draftErrorKey('items.k1.trialDate', 'after-delivery')).toBe('draft.error.trialAfterDelivery');
    expect(draftErrorKey('advance.amount', 'exceeds')).toBe('draft.error.advance');
  });
});

describe('buildOrderEvents', () => {
  function build(draft: OrderDraft, state: ShopState) {
    let n = 0;
    return buildOrderEvents(draft, {
      config,
      state,
      newId: () => `id-${++n}`,
      number: 'A-0041',
      branchId: 'main',
      staffId: 'rahman-owner',
      now: '2026-10-03T06:00:00.000Z',
    });
  }

  it('creates a new customer, their measurements, one item per garment and the advance, in applying order', () => {
    const state = baseState();
    const shirts = { ...item('shirt', state, null), quantity: 2, wearer: ' ', designNotes: ' দুই পকেট ' };
    shirts.measurements = { kind: 'new', values: allShirtValues, source: 'sample', notes: '' };
    const draft: OrderDraft = {
      ...emptyDraft(),
      customer: { kind: 'new', name: ' করিম ', nameAlt: 'Karim', phone: '+880 1711-000000', gender: 'male' },
      items: [shirts, { ...item('alteration', state, null), price: 100000 }],
      advance: { amount: 100000, method: 'bkash', reference: ' TX1 ' },
    };
    expect(validateDraft(draft, ctx(state))).toEqual({});

    const { orderId, events } = build(draft, state);

    expect(events.map((e) => e.type)).toEqual(['customer.created', 'measurement.recorded', 'order.created', 'payment.recorded']);
    expect(events[0]).toMatchObject({ customer: { id: 'id-1', name: 'করিম', phone: '01711000000', nameAlt: 'Karim' } });
    expect(events[1]).toMatchObject({
      customerId: 'id-1',
      templateId: 'shirt',
      version: { id: 'id-2', source: 'sample', takenBy: 'rahman-owner', values: { chest: { value: 38, unit: 'inch' } } },
    });
    const created = events[2]!;
    if (created.type !== 'order.created') throw new Error('expected order.created');
    expect(orderId).toBe(created.order.id);
    expect(created.order.items.map((i) => i.id)).toEqual(['id-3', 'id-4', 'id-5']);
    expect(created.order.items[0]!.measurements?.versionId).toBe('id-2');
    expect(created.order.items[1]!.measurements?.versionId).toBe('id-2');
    expect(created.order.items[0]).toMatchObject({ wearer: null, designNotes: 'দুই পকেট', deliveryDate: '2026-10-12', trialDate: null });
    expect(created.order.items[2]!.measurements).toBeNull();
    expect(events[3]).toMatchObject({ orderId, payment: { amount: 100000, method: 'bkash', reference: 'TX1', kind: 'advance' } });

    const after = applyBodies(events, state);
    expect(after.outcomes.map((o) => o.outcome)).toEqual(['applied', 'applied', 'applied', 'applied']);
    expect(moneySummary(after.state.orders[orderId]!)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
  });

  it('freezes a copy of a confirmed saved version and skips an empty advance', () => {
    const state = baseState();
    const shirt = { ...item('shirt', state), measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    const { events } = build({ ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt] }, state);
    expect(events.map((e) => e.type)).toEqual(['order.created']);
    const created = events[0]!;
    if (created.type !== 'order.created') throw new Error('expected order.created');
    expect(created.order.items[0]!.measurements).toEqual({
      versionId: 'c1-shirt-v1',
      takenAt: '2026-09-01T04:00:00.000Z',
      source: 'body',
      values: { length: { value: 29, unit: 'inch' }, chest: { value: 38.5, unit: 'inch' } },
    });
    expect(created.order.items[0]!.measurements!.values).not.toBe(
      state.profiles['c1:shirt']!.versions[0]!.values,
    );
  });
});

describe('draftFromOrder', () => {
  it('copies garments for a repeat order, asking again about saved measurements', () => {
    const state = baseState();
    const shirt = { ...item('shirt', state), measurements: { kind: 'saved' as const, versionId: 'c1-shirt-v1', confirmed: true } };
    const panjabi = { ...item('panjabi', state), wearer: 'ছেলে', price: 110000 };
    panjabi.measurements = { kind: 'new', values: { length: 42, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15 }, source: 'body', notes: '' };
    let n = 0;
    const built = buildOrderEvents(
      { ...emptyDraft(), customer: { kind: 'existing', customerId: 'c1' }, items: [shirt, panjabi, item('alteration', state)] },
      { config, state, newId: () => `id-${++n}`, number: 'A-0041', branchId: 'main', staffId: 'rahman-owner', now: '2026-10-03T06:00:00.000Z' },
    );
    const applied = applyBodies(built.events, state).state;
    const order = applied.orders[built.orderId]!;
    const withCancel = { ...order, items: order.items.map((i) => (i.templateId === 'alteration' ? { ...i, cancelled: { reason: 'x', at: '', by: '' } } : i)) };

    let k = 0;
    const draft = draftFromOrder(withCancel, { config, state: applied, canSee: true, newKey: () => `r${++k}`, deliveryDate: '2026-10-20' });

    expect(draft.customer).toEqual({ kind: 'existing', customerId: 'c1' });
    expect(draft.items.map((i) => [i.key, i.templateId, i.price, i.wearer, i.deliveryDate])).toEqual([
      ['r1', 'shirt', 70000, '', '2026-10-20'],
      ['r2', 'panjabi', 110000, 'ছেলে', '2026-10-20'],
    ]);
    expect(draft.items[0]!.measurements).toEqual({ kind: 'saved', versionId: 'c1-shirt-v1', confirmed: false });
    expect(draft.items[1]!.measurements).toMatchObject({ kind: 'saved', confirmed: false });
  });

  it('copies snapshot values that were never saved to a profile, for the person to check', () => {
    const state = baseState();
    const groupOrder = makeOrder({
      customerId: 'c1',
      items: [
        makeItem({
          templateId: 'pant',
          garmentName: template('pant').name,
          price: 50000,
          wearer: 'ক্লাস ৭ - রাফি',
          measurements: { versionId: 'snap', takenAt: '', source: 'body', values: { waist: { value: 26, unit: 'inch' } } },
        }),
      ],
    });
    const draft = draftFromOrder(groupOrder, { config, state, canSee: true, newKey: () => 'g', deliveryDate: '2026-10-20' });
    expect(draft.items[0]!.measurements).toEqual({ kind: 'new', values: { waist: 26 }, source: 'body', notes: '' });
    expect(draft.items[0]!.wearer).toBe('ক্লাস ৭ - রাফি');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/orders/draft.test.ts`

Expected: FAIL with `Error: Cannot find module './draft'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/features/orders/draft.ts`:

```ts
import {
  currentVersion,
  normalizePhone,
  profileKey,
  snapshotOf,
  templateById,
  type Customer,
  type EventBody,
  type GarmentTemplate,
  type Gender,
  type MeasurementSnapshot,
  type MeasurementSource,
  type MeasurementValue,
  type MeasurementVersion,
  type NewOrderItem,
  type Order,
  type PaymentMethod,
  type Poisha,
  type ShopConfig,
  type ShopState,
} from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { isValidPhone } from '../customers/customerInput';

export type DraftCustomer =
  | { kind: 'existing'; customerId: string }
  | { kind: 'new'; name: string; nameAlt: string; phone: string; gender: Gender | null };

/**
 * Where an item's measurements come from:
 * - 'none': the garment has no measurement fields (alterations), or the person entering the
 *   order may not see this customer's measurements and none are saved yet.
 * - 'saved': a saved version, which someone must confirm is still right before it is used.
 * - 'new': values typed now; saved to the customer's profile as a new version.
 */
export type DraftMeasurements =
  | { kind: 'none' }
  | { kind: 'saved'; versionId: string; confirmed: boolean }
  | { kind: 'new'; values: Record<string, number>; source: MeasurementSource; notes: string };

export interface DraftItem {
  /** Local key for lists and error paths. Not saved. */
  key: string;
  templateId: string;
  /** How many identical garments; each becomes its own order item. */
  quantity: number;
  /** Price of one garment. */
  price: Poisha | null;
  wearer: string;
  measurements: DraftMeasurements;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  /** YYYY-MM-DD, or '' for none. */
  trialDate: string;
  deliveryDate: string;
}

export interface OrderDraft {
  customer: DraftCustomer | null;
  items: DraftItem[];
  discount: { amount: Poisha | null; reason: string };
  advance: { amount: Poisha | null; method: PaymentMethod; reference: string };
  notes: string;
}

export type DraftErrorCode = 'required' | 'invalid' | 'past' | 'after-delivery' | 'exceeds' | 'confirm' | 'unknown';

/**
 * Problems keyed by path: 'customer', 'customer.name', 'customer.phone', 'items',
 * 'items.<key>.quantity|price|measurements|deliveryDate|trialDate', 'items.<key>.measure.<field>',
 * 'discount.amount', 'advance.amount'.
 */
export type DraftErrors = Record<string, DraftErrorCode>;

export interface DraftContext {
  config: ShopConfig;
  state: ShopState;
  /** Today in Dhaka, YYYY-MM-DD. */
  today: string;
  /** Whether the person entering the order may see measurements of a customer with this gender. */
  canSeeMeasurements(gender: Gender | null): boolean;
}

export function emptyDraft(): OrderDraft {
  return {
    customer: null,
    items: [],
    discount: { amount: null, reason: '' },
    advance: { amount: null, method: 'cash', reference: '' },
    notes: '',
  };
}

export function latestVersion(state: ShopState, customerId: string, templateId: string): MeasurementVersion | null {
  const profile = state.profiles[profileKey(customerId, templateId)];
  return profile ? currentVersion(profile) : null;
}

function customerGender(draft: OrderDraft, state: ShopState): Gender | null {
  if (!draft.customer) return null;
  if (draft.customer.kind === 'new') return draft.customer.gender;
  return state.customers[draft.customer.customerId]?.gender ?? null;
}

/** The measurement source a new item starts with for this customer. */
export function initialMeasurements(
  template: GarmentTemplate,
  customerId: string | null,
  state: ShopState,
  canSee: boolean,
): DraftMeasurements {
  if (template.fields.length === 0) return { kind: 'none' };
  const saved = customerId ? latestVersion(state, customerId, template.id) : null;
  if (saved) return { kind: 'saved', versionId: saved.id, confirmed: false };
  if (!canSee) return { kind: 'none' };
  return { kind: 'new', values: {}, source: 'body', notes: '' };
}

export function newDraftItem(
  template: GarmentTemplate,
  key: string,
  options: { customerId: string | null; state: ShopState; canSee: boolean; deliveryDate: string },
): DraftItem {
  return {
    key,
    templateId: template.id,
    quantity: 1,
    price: template.defaultPrice,
    wearer: '',
    measurements: initialMeasurements(template, options.customerId, options.state, options.canSee),
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    trialDate: '',
    deliveryDate: options.deliveryDate,
  };
}

export interface DraftTotals {
  garments: number;
  subtotal: Poisha;
  discount: Poisha;
  total: Poisha;
  advance: Poisha;
  balance: Poisha;
}

export function draftTotals(draft: OrderDraft): DraftTotals {
  const garments = draft.items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = draft.items.reduce((sum, i) => sum + (i.price ?? 0) * i.quantity, 0);
  const discount = draft.discount.amount ?? 0;
  const total = Math.max(0, subtotal - discount);
  const advance = draft.advance.amount ?? 0;
  return { garments, subtotal, discount, total, advance, balance: total - advance };
}

const MAX_QUANTITY = 50;

export function validateDraft(draft: OrderDraft, ctx: DraftContext): DraftErrors {
  const errors: DraftErrors = {};
  const { customer } = draft;

  if (!customer) errors['customer'] = 'required';
  else if (customer.kind === 'existing' && !ctx.state.customers[customer.customerId]) errors['customer'] = 'unknown';
  else if (customer.kind === 'new') {
    if (!customer.name.trim()) errors['customer.name'] = 'required';
    if (!isValidPhone(customer.phone)) errors['customer.phone'] = 'invalid';
  }

  if (draft.items.length === 0) errors['items'] = 'required';
  const canSee = ctx.canSeeMeasurements(customerGender(draft, ctx.state));
  const customerId = customer?.kind === 'existing' ? customer.customerId : null;

  for (const item of draft.items) {
    const at = `items.${item.key}`;
    const template = templateById(ctx.config, item.templateId);
    if (!template) {
      errors[`${at}.template`] = 'unknown';
      continue;
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
      errors[`${at}.quantity`] = 'invalid';
    }
    if (item.price === null) errors[`${at}.price`] = 'required';

    const m = item.measurements;
    if (m.kind === 'none') {
      if (template.fields.length > 0 && canSee) errors[`${at}.measurements`] = 'required';
    } else if (m.kind === 'saved') {
      const exists = customerId
        ? ctx.state.profiles[profileKey(customerId, template.id)]?.versions.some((v) => v.id === m.versionId)
        : false;
      if (!exists) errors[`${at}.measurements`] = 'unknown';
      else if (!m.confirmed) errors[`${at}.measurements`] = 'confirm';
    } else {
      for (const field of template.fields) {
        if (field.required && m.values[field.key] === undefined) errors[`${at}.measure.${field.key}`] = 'required';
      }
    }

    if (!item.deliveryDate) errors[`${at}.deliveryDate`] = 'required';
    else if (item.deliveryDate < ctx.today) errors[`${at}.deliveryDate`] = 'past';
    if (item.trialDate && item.trialDate < ctx.today) errors[`${at}.trialDate`] = 'past';
    else if (item.trialDate && item.deliveryDate && item.trialDate > item.deliveryDate) {
      errors[`${at}.trialDate`] = 'after-delivery';
    }
  }

  const totals = draftTotals(draft);
  if (totals.discount > totals.subtotal) errors['discount.amount'] = 'exceeds';
  if (totals.advance > totals.total) errors['advance.amount'] = 'exceeds';
  return errors;
}

/** The message shown beside the field an error path points at. */
export function draftErrorKey(path: string, code: DraftErrorCode): MessageKey {
  if (path === 'customer') return 'draft.error.customer';
  if (path === 'customer.name') return 'customerForm.error.name';
  if (path === 'customer.phone') return 'customerForm.error.phone';
  if (path === 'items') return 'draft.error.items';
  if (path === 'discount.amount') return 'draft.error.discount';
  if (path === 'advance.amount') return 'draft.error.advance';
  if (/\.measure\./.test(path)) return 'measure.required';
  const field = path.split('.')[2];
  switch (field) {
    case 'template':
      return 'draft.error.template';
    case 'quantity':
      return 'draft.error.quantity';
    case 'price':
      return 'draft.error.price';
    case 'measurements':
      return code === 'confirm' ? 'draft.error.confirm' : code === 'unknown' ? 'draft.error.measurementsUnknown' : 'draft.error.measurements';
    case 'deliveryDate':
      return code === 'past' ? 'draft.error.past' : 'draft.error.deliveryDate';
    default:
      return code === 'past' ? 'draft.error.past' : 'draft.error.trialAfterDelivery';
  }
}

export type DraftStep = 'customer' | 'garments' | 'details' | 'money' | 'review';

export const DRAFT_STEPS: DraftStep[] = ['customer', 'garments', 'details', 'money', 'review'];

/** Which mobile step shows the field an error path points at. */
export function stepOf(path: string): DraftStep {
  if (path.startsWith('customer')) return 'customer';
  if (path === 'items' || /^items\.[^.]+\.(template|quantity|measurements|measure)/.test(path)) return 'garments';
  return 'money';
}

export function errorsForStep(errors: DraftErrors, step: DraftStep): DraftErrors {
  if (step === 'review') return errors;
  return Object.fromEntries(Object.entries(errors).filter(([path]) => stepOf(path) === step));
}

export interface BuildContext {
  config: ShopConfig;
  state: ShopState;
  newId(): string;
  number: string;
  branchId: string;
  staffId: string;
  /** ISO timestamp used as the time new measurements were taken. */
  now: string;
}

/**
 * Turns a valid draft into the events that create it, in the order they must apply:
 * a new customer, new measurement versions, the order (one item per garment, each with its own
 * frozen measurement snapshot), then the advance. Throws if the draft refers to unknown data.
 */
export function buildOrderEvents(draft: OrderDraft, ctx: BuildContext): { orderId: string; events: EventBody[] } {
  if (!draft.customer) throw new Error('Order draft has no customer');
  const events: EventBody[] = [];

  let customerId: string;
  if (draft.customer.kind === 'new') {
    const c = draft.customer;
    customerId = ctx.newId();
    const phone = c.phone.trim() ? normalizePhone(c.phone) : null;
    const created: Omit<Customer, 'createdAt' | 'version'> = {
      id: customerId,
      name: c.name.trim(),
      nameAlt: c.nameAlt.trim() || null,
      phone,
      householdId: null,
      gender: c.gender,
      notes: '',
    };
    events.push({ type: 'customer.created', customer: created });
  } else {
    customerId = draft.customer.customerId;
  }

  const items: NewOrderItem[] = [];
  for (const item of draft.items) {
    const template = templateById(ctx.config, item.templateId);
    if (!template) throw new Error(`Unknown template: ${item.templateId}`);

    let snapshot: MeasurementSnapshot | null = null;
    const m = item.measurements;
    if (m.kind === 'saved') {
      const version = ctx.state.profiles[profileKey(customerId, template.id)]?.versions.find((v) => v.id === m.versionId);
      if (!version) throw new Error(`Unknown measurement version: ${m.versionId}`);
      snapshot = snapshotOf(version);
    } else if (m.kind === 'new') {
      const values: Record<string, MeasurementValue> = {};
      for (const field of template.fields) {
        const value = m.values[field.key];
        if (value !== undefined) values[field.key] = { value, unit: field.unit };
      }
      const version: MeasurementVersion = {
        id: ctx.newId(),
        takenAt: ctx.now,
        takenBy: ctx.staffId,
        source: m.source,
        notes: m.notes.trim(),
        values,
      };
      events.push({ type: 'measurement.recorded', customerId, templateId: template.id, version });
      snapshot = snapshotOf(version);
    }

    for (let n = 0; n < item.quantity; n++) {
      items.push({
        id: ctx.newId(),
        templateId: template.id,
        garmentName: template.name,
        price: item.price ?? 0,
        wearer: item.wearer.trim() || null,
        measurements: snapshot,
        designNotes: item.designNotes.trim(),
        fabricNote: item.fabricNote.trim(),
        photoIds: [...item.photoIds],
        stages: template.stages,
        assignedTo: null,
        trialDate: item.trialDate || null,
        deliveryDate: item.deliveryDate || null,
      });
    }
  }

  const orderId = ctx.newId();
  const discount = draft.discount.amount ? { amount: draft.discount.amount, reason: draft.discount.reason.trim() } : null;
  events.push({
    type: 'order.created',
    order: { id: orderId, number: ctx.number, customerId, branchId: ctx.branchId, notes: draft.notes.trim(), discount, items },
  });

  if (draft.advance.amount) {
    events.push({
      type: 'payment.recorded',
      orderId,
      payment: {
        id: ctx.newId(),
        amount: draft.advance.amount,
        method: draft.advance.method,
        reference: draft.advance.reference.trim(),
        kind: 'advance',
        corrects: null,
        reason: '',
      },
    });
  }
  return { orderId, events };
}

/**
 * Starts a repeat order from an earlier one: same customer, garments, prices, wearers and notes.
 * Cancelled items are left out. Saved measurements must be confirmed again; when the earlier
 * item's measurements were never saved to the profile (as in group orders), they are copied
 * in as new values for the person to check.
 */
export function draftFromOrder(
  order: Order,
  ctx: { config: ShopConfig; state: ShopState; canSee: boolean; newKey(): string; deliveryDate: string },
): OrderDraft {
  const items: DraftItem[] = [];
  for (const previous of order.items) {
    if (previous.cancelled) continue;
    const template = templateById(ctx.config, previous.templateId);
    if (!template || !template.active) continue;
    let measurements = initialMeasurements(template, order.customerId, ctx.state, ctx.canSee);
    if (measurements.kind === 'new' && previous.measurements) {
      const values: Record<string, number> = {};
      for (const [key, v] of Object.entries(previous.measurements.values)) values[key] = v.value;
      measurements = { kind: 'new', values, source: previous.measurements.source, notes: '' };
    }
    items.push({
      key: ctx.newKey(),
      templateId: template.id,
      quantity: 1,
      price: previous.price,
      wearer: previous.wearer ?? '',
      measurements,
      designNotes: previous.designNotes,
      fabricNote: previous.fabricNote,
      photoIds: [],
      trialDate: '',
      deliveryDate: ctx.deliveryDate,
    });
  }
  return { ...emptyDraft(), customer: { kind: 'existing', customerId: order.customerId }, items };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/features/orders/draft.test.ts`

Expected: PASS, 16 tests.

- [ ] **Step 5: Type check and commit**

Run: `npx tsc --noEmit -p tsconfig.json` (expected: exit 0), then:

```bash
git add apps/web/src/features/orders/draft.ts apps/web/src/features/orders/draft.test.ts apps/web/src/i18n
git commit -m "feat(web): add the order draft model with validation and event building"
```

### Task 8: Receipts and print layouts

How an order turns into a receipt, plus the job slip and fabric tags that travel with the work. Print pages render outside the app shell, so the browser prints only the document; a small toolbar (hidden in print) offers back, language, print and share.

The receipt rules that matter: cancelled garments stay on the receipt (struck through, marked cancelled) but out of the total; every payment line shows what it did to the money held, so refunds and corrections that lower a payment are negative and the lines add up to "paid"; when payments exceed the total the receipt shows credit due instead of a balance; it never says "profit".

**Files:**
- Create: `apps/web/src/features/print/receipt.ts`
- Test: `apps/web/src/features/print/receipt.test.ts`
- Create: `apps/web/src/features/print/PrintLayout.tsx`, `ReceiptPage.tsx`, `JobSlipPage.tsx`, `FabricTagsPage.tsx`
- Modify: `apps/web/src/index.css` (print rules), `apps/web/src/app/AppRoutes.tsx` (print routes)
- Test: `apps/web/src/features/print/PrintPages.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `MeasurementTable` (Task 6); `itemTitle` (Task 3); domain `moneySummary`, `shopContact`, `orderProgress`.
- Produces:
  - `receiptModel(order, customer, config, language): ReceiptModel` and `receiptShareText(model, language): string`. Task 14 reuses `ReceiptModel.payments` (with `effect`) for the payment history table, so the order page and the receipt agree.
  - `PrintLayout({ orderId, title, language, onLanguage, children })`: the toolbar (class `no-print`) with `অর্ডারে ফিরে যান` (link to `/app/orders/<id>`), a language toggle for the document only (`বাংলা` / `English` buttons), `প্রিন্ট করুন` (`window.print()`), and on the receipt `শেয়ার করুন`.
  - `MoneyTable({ model, language })`: the totals table (`aria-label` `হিসাব`). Task 14 reuses it on the order page.

**Done when:**
- `/print/receipt/:orderId` (needs `money.view`): heading `রসিদ`; shop name, phone and address; order number; order date; customer name and phone; a `পোশাক` table with one row per item (garment, wearer, delivery date, price; cancelled rows marked `বাতিল`); a `হিসাব` table with rows `দাম` (subtotal), `ছাড়` (with reason, only when set), `সমন্বয়` (only when there are adjustments), `মোট`, `জমা`, then `বাকি` or, when the shop owes the customer, `ফেরত পাওনা`; a `পেমেন্ট` table (date, kind, method, reference, amount) when there are payments.
- The document language follows the toolbar toggle (default: the app language) without changing the app language. All text, dates, digits and money in the document use it.
- `শেয়ার করুন` calls `navigator.share({ title, text: receiptShareText(...) })` when available; otherwise it copies the text with `navigator.clipboard.writeText` and shows `role="status"` `কপি হয়েছে`.
- `/print/job/:orderId` (needs `orders.view`, `work.view.all` or `work.view.assigned`): heading `কাজের স্লিপ`; per non-cancelled item a region named by `itemTitle`, holding wearer, trial and delivery dates, design and fabric notes, fitting adjustments, and the `MeasurementTable` of its snapshot, or `মাপ দেখার অনুমতি নেই` when the viewer may not see this customer's measurements. Everything except the measurements is plain text, not tables. No prices or money anywhere.
- `/print/tags/:orderId` (same permission as the job slip): heading `কাপড়ের ট্যাগ`; a list (`aria-label` `কাপড়ের ট্যাগ`) with one item per non-cancelled garment showing the order number, garment, wearer (if any) and delivery date, laid out as cut-out tags (each `print-block`).
- Print rules in `index.css`:

```css
@page {
  size: A4;
  margin: 12mm;
}

@media print {
  .no-print {
    display: none !important;
  }
  body {
    background: white;
    color: black;
  }
  thead {
    display: table-header-group;
  }
  tr,
  .print-block {
    break-inside: avoid;
  }
}
```

**Messages:**

```ts
// bn.ts
'receipt.title': 'রসিদ',
'receipt.orderNumber': 'অর্ডার {number}',
'receipt.date': 'তারিখ',
'receipt.garments': 'পোশাক',
'receipt.garment': 'পোশাক',
'receipt.wearer': 'কে পরবেন',
'receipt.delivery': 'ডেলিভারি',
'receipt.price': 'দাম',
'receipt.cancelled': 'বাতিল',
'receipt.money': 'হিসাব',
'receipt.payments': 'পেমেন্ট',
'receipt.kind.advance': 'অগ্রিম',
'receipt.kind.payment': 'পেমেন্ট',
'receipt.kind.refund': 'ফেরত',
'receipt.kind.correction': 'সংশোধন',
'print.back': 'অর্ডারে ফিরে যান',
'print.print': 'প্রিন্ট করুন',
'print.share': 'শেয়ার করুন',
'print.copied': 'কপি হয়েছে',
'print.jobSlip': 'কাজের স্লিপ',
'print.tags': 'কাপড়ের ট্যাগ',
'print.trial': 'ট্রায়াল',
'print.designNotes': 'ডিজাইন',
'print.fabricNote': 'কাপড়',
'print.adjustments': 'ফিটিংয়ের পরিবর্তন',
'print.measurementsHidden': 'মাপ দেখার অনুমতি নেই',
// en.ts
'receipt.title': 'Receipt',
'receipt.orderNumber': 'Order {number}',
'receipt.date': 'Date',
'receipt.garments': 'Garments',
'receipt.garment': 'Garment',
'receipt.wearer': 'Wearer',
'receipt.delivery': 'Delivery',
'receipt.price': 'Price',
'receipt.cancelled': 'Cancelled',
'receipt.money': 'Amounts',
'receipt.payments': 'Payments',
'receipt.kind.advance': 'Advance',
'receipt.kind.payment': 'Payment',
'receipt.kind.refund': 'Refund',
'receipt.kind.correction': 'Correction',
'print.back': 'Back to the order',
'print.print': 'Print',
'print.share': 'Share',
'print.copied': 'Copied',
'print.jobSlip': 'Job slip',
'print.tags': 'Fabric tags',
'print.trial': 'Trial',
'print.designNotes': 'Design',
'print.fabricNote': 'Fabric',
'print.adjustments': 'Fitting changes',
'print.measurementsHidden': 'No permission to see measurements',
```

Tables are named by `aria-label`: `receipt.garments`, `receipt.money`, `receipt.payments`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/print/receipt.test.ts`:

```ts
import { makeItem, makeOrder, makePayment, spec54Order } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { receiptModel, receiptShareText } from './receipt';

const config = shopConfig('rahman');
const customer = {
  id: 'c1', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678', householdId: null,
  gender: 'male' as const, notes: '', createdAt: '', version: 1,
};

describe('receiptModel', () => {
  it('shows the spec example: ৳2,400 order, ৳1,000 paid, ৳1,400 due', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 100000 })] });
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.shop).toEqual({ name: 'রহমান টেইলার্স', phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' });
    expect(model.customer).toEqual({ name: 'রহিম উদ্দিন', phone: '01712345678' });
    expect(model.lines.map((l) => [l.garment, l.price, l.stage])).toEqual([
      ['শার্ট', 70000, 'বুকড'],
      ['শার্ট', 70000, 'বুকড'],
      ['পাঞ্জাবি', 100000, 'বুকড'],
    ]);
    expect([model.subtotal, model.total, model.paid, model.balance, model.creditDue]).toEqual([240000, 240000, 100000, 140000, 0]);
  });

  it('uses the chosen language for the shop and garments', () => {
    const model = receiptModel(spec54Order(), customer, config, 'en');
    expect(model.shop.name).toBe('Rahman Tailors');
    expect(model.lines[2]!.garment).toBe('Panjabi');
    expect(model.lines[0]!.stage).toBe('Booked');
  });

  it('keeps cancelled garments on the receipt but out of the total, with discount and adjustments', () => {
    const order = spec54Order({
      discount: { amount: 10000, reason: 'নিয়মিত কাস্টমার' },
      priceAdjustments: [{ id: 'a1', amount: 5000, reason: 'বাড়তি লাইনিং', at: '', by: '' }],
    });
    order.items[1] = { ...order.items[1]!, cancelled: { reason: 'বাদ', at: '', by: '' } };
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.lines.map((l) => l.cancelled)).toEqual([false, true, false]);
    expect(model.subtotal).toBe(170000);
    expect(model.discount).toEqual({ amount: 10000, reason: 'নিয়মিত কাস্টমার' });
    expect(model.adjustments).toEqual([{ amount: 5000, reason: 'বাড়তি লাইনিং' }]);
    expect(model.adjustmentsTotal).toBe(5000);
    expect(model.total).toBe(165000);
  });

  it('lists each payment by what it did to the money held, adding up to the amount paid', () => {
    const order = spec54Order({
      payments: [
        makePayment({ id: 'p1', amount: 150000, kind: 'advance' }),
        makePayment({ id: 'p2', amount: -50000, kind: 'correction', corrects: 'p1', reason: 'ভুল অঙ্ক' }),
        makePayment({ id: 'p3', amount: 20000, kind: 'refund', reason: 'ফেরত' }),
        makePayment({ id: 'p4', amount: -5000, kind: 'correction', corrects: 'p3', reason: 'ফেরত কম ছিল' }),
      ],
    });
    const model = receiptModel(order, customer, config, 'bn');
    expect(model.payments.map((p) => p.effect)).toEqual([150000, -50000, -20000, 5000]);
    expect(model.payments.reduce((sum, p) => sum + p.effect, 0)).toBe(model.paid);
    expect(model.paid).toBe(85000);
  });

  it('shows credit due instead of a balance when payments exceed the total', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 240000 })] });
    order.items[2] = { ...order.items[2]!, cancelled: { reason: 'বাদ', at: '', by: '' } };
    const model = receiptModel(order, customer, config, 'bn');
    expect([model.total, model.balance, model.creditDue]).toEqual([140000, 0, 100000]);
  });

  it('finds the next promised date among garments not yet handed over', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', deliveryDate: '2026-10-05', stageKey: 'delivered' }),
        makeItem({ id: 'b', deliveryDate: '2026-10-09', stageKey: 'ready' }),
        makeItem({ id: 'c', deliveryDate: '2026-10-07', cancelled: { reason: 'x', at: '', by: '' } }),
        makeItem({ id: 'd', deliveryDate: '2026-10-12' }),
      ],
    });
    const model = receiptModel(order, null, config, 'bn');
    expect(model.nextDelivery).toBe('2026-10-09');
    expect(model.progress).toEqual({ unfinished: 1, ready: 1, delivered: 1, cancelled: 1, total: 4 });
    expect(model.customer).toEqual({ name: '', phone: null });
  });
});

describe('receiptShareText', () => {
  it('writes a short message in Bangla digits', () => {
    const order = spec54Order({
      payments: [makePayment({ amount: 100000 })],
      items: spec54Order().items.map((i) => ({ ...i, deliveryDate: '2026-10-12' })),
    });
    expect(receiptShareText(receiptModel(order, customer, config, 'bn'), 'bn')).toBe(
      ['রহমান টেইলার্স', 'অর্ডার A-0001', 'মোট: ৳২,৪০০', 'জমা: ৳১,০০০', 'বাকি: ৳১,৪০০', 'ডেলিভারি: ১২ অক্টোবর ২০২৬', '01755123456'].join('\n'),
    );
  });

  it('mentions credit due in English when the shop owes the customer', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 300000 })] });
    const text = receiptShareText(receiptModel(order, customer, config, 'en'), 'en');
    expect(text).toContain('Credit due: ৳600');
    expect(text).not.toContain('Balance due');
  });
});
```

`apps/web/src/features/print/PrintPages.test.tsx`:

```tsx
import { formatMeasurement, formatTaka, moneySummary, toBanglaDigits } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { receiptModel, receiptShareText } from './receipt';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
});

const row = (table: HTMLElement, label: RegExp) => within(table).getByRole('row', { name: label });

describe('Receipt page', () => {
  it('prints outside the app shell with garments, totals, payments and the balance', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    const order = store.getSnapshot().state.orders['rahman-o40']!;
    const money = moneySummary(order);

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();
    expect(screen.getByText('রহমান টেইলার্স')).toBeTruthy();
    expect(screen.getAllByText(new RegExp(order.number)).length).toBeGreaterThan(0);

    const garments = screen.getByRole('table', { name: 'পোশাক' });
    expect(within(garments).getAllByRole('row')).toHaveLength(order.items.length + 1);
    const totals = screen.getByRole('table', { name: 'হিসাব' });
    expect(within(row(totals, /^মোট/)).getByText(formatTaka(money.total, 'bn'))).toBeTruthy();
    expect(within(row(totals, /^জমা/)).getByText(formatTaka(money.paid, 'bn'))).toBeTruthy();
    expect(within(row(totals, /^বাকি/)).getByText(formatTaka(money.balance, 'bn'))).toBeTruthy();
    if (order.payments.length > 0) {
      expect(within(screen.getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row')).toHaveLength(order.payments.length + 1);
    }
    expect(screen.getByRole('button', { name: 'প্রিন্ট করুন' }).closest('.no-print')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'অর্ডারে ফিরে যান' }).getAttribute('href')).toBe('/app/orders/rahman-o40');
  });

  it('prints in English without changing the app language', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'Receipt' })).toBeTruthy();
    expect(screen.getByText('Rahman Tailors')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'প্রিন্ট করুন' })).toBeTruthy();
    expect(window.localStorage.getItem('dk.language')).not.toBe('en');
  });

  it('opens the print dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    await userEvent.click(await screen.findByRole('button', { name: 'প্রিন্ট করুন' }));
    expect(print).toHaveBeenCalledOnce();
  });

  it('shares the receipt text, or copies it when sharing is not available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/receipt/rahman-o40' });
    const { config, state } = store.getSnapshot();
    const order = state.orders['rahman-o40']!;
    const text = receiptShareText(receiptModel(order, state.customers[order.customerId]!, config!, 'bn'), 'bn');

    await userEvent.click(await screen.findByRole('button', { name: 'শেয়ার করুন' }));
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text }));

    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(screen.getByRole('button', { name: 'শেয়ার করুন' }));
    expect(writeText).toHaveBeenCalledWith(text);
    expect((await screen.findByRole('status')).textContent).toBe('কপি হয়েছে');
  });

  it('is only for staff who may see money', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/print/receipt/nakshi-o1', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });
});

describe('Job slip', () => {
  it('shows each garment’s measurements and notes but no money', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/job/rahman-o40' });
    const { state, config } = store.getSnapshot();
    const order = state.orders['rahman-o40']!;
    expect(await screen.findByRole('heading', { name: 'কাজের স্লিপ' })).toBeTruthy();

    const index = order.items.findIndex((i) => !i.cancelled && i.measurements);
    const item = order.items[index]!;
    const section = screen.getByRole('region', { name: `${item.garmentName.bn} ${toBanglaDigits(String(index + 1))}` });
    const field = config!.templates.find((t) => t.id === item.templateId)!.fields.find((f) => item.measurements!.values[f.key])!;
    const value = item.measurements!.values[field.key]!.value;
    const measurement = within(section).getByRole('row', { name: new RegExp(`^${field.label.bn}`) });
    expect(within(measurement).getByText(`${formatMeasurement(value, 'bn')} ইঞ্চি`)).toBeTruthy();
    expect(document.body.textContent).not.toContain('৳');
  });

  it('hides measurements from staff who may not see them', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/print/job/nakshi-o1', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect((await screen.findAllByText('মাপ দেখার অনুমতি নেই')).length).toBeGreaterThan(0);
    // Measurement tables are the slip's only tables. (Fitting notes may mention inches, so text is not checked.)
    expect(screen.queryAllByRole('table')).toHaveLength(0);
  });
});

describe('Fabric tags', () => {
  it('prints one tag per garment with the order number, wearer and delivery date', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/print/tags/uniform-o27' });
    const order = store.getSnapshot().state.orders['uniform-o27']!;
    expect(await screen.findByRole('heading', { name: 'কাপড়ের ট্যাগ' })).toBeTruthy();
    const tags = within(screen.getByRole('list', { name: 'কাপড়ের ট্যাগ' })).getAllByRole('listitem');
    expect(tags).toHaveLength(order.items.filter((i) => !i.cancelled).length);
    expect(tags).toHaveLength(24);
    const first = order.items[0]!;
    expect(tags[0]!.textContent).toContain(order.number);
    expect(tags[0]!.textContent).toContain(first.wearer!);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/print`

Expected: FAIL with `Error: Cannot find module './receipt'`.

- [ ] **Step 3: Write the receipt model**

`apps/web/src/features/print/receipt.ts`:

```ts
import {
  adjustmentsTotal,
  itemSummaryGroup,
  labelIn,
  moneySummary,
  orderProgress,
  shopContact,
  stageByKey,
  subtotal,
  type Customer,
  type Discount,
  type Language,
  type Order,
  type OrderProgress,
  type Payment,
  type Poisha,
  type ShopConfig,
  type ShopContact,
} from '@darzikhata/domain';
import { formatDate, formatMoney, translate } from '../../i18n/format';

export interface ReceiptLine {
  itemId: string;
  garment: string;
  wearer: string | null;
  price: Poisha;
  cancelled: boolean;
  stage: string;
  trialDate: string | null;
  deliveryDate: string | null;
}

export interface ReceiptPayment {
  id: string;
  at: string;
  kind: Payment['kind'];
  method: Payment['method'];
  reference: string;
  reason: string;
  /** What this record did to the money held: negative for refunds and for corrections that lowered a payment. */
  effect: Poisha;
}

/** Everything a receipt shows, already in one language. Money stays in poisha for the page to format. */
export interface ReceiptModel {
  shop: ShopContact;
  orderNumber: string;
  createdAt: string;
  customer: { name: string; phone: string | null };
  lines: ReceiptLine[];
  subtotal: Poisha;
  discount: Discount | null;
  adjustments: Array<{ amount: Poisha; reason: string }>;
  adjustmentsTotal: Poisha;
  total: Poisha;
  payments: ReceiptPayment[];
  paid: Poisha;
  balance: Poisha;
  creditDue: Poisha;
  progress: OrderProgress;
  /** Earliest promised date among garments not yet handed over. */
  nextDelivery: string | null;
}

function effectOf(payment: Payment, all: Payment[]): Poisha {
  if (payment.kind === 'refund') return -payment.amount;
  if (payment.kind === 'correction') {
    const target = all.find((p) => p.id === payment.corrects);
    return target?.kind === 'refund' ? -payment.amount : payment.amount;
  }
  return payment.amount;
}

export function receiptModel(order: Order, customer: Customer | null, config: ShopConfig, language: Language): ReceiptModel {
  const money = moneySummary(order);
  let nextDelivery: string | null = null;
  for (const item of order.items) {
    const group = itemSummaryGroup(item);
    if ((group === 'unfinished' || group === 'ready') && item.deliveryDate) {
      if (nextDelivery === null || item.deliveryDate < nextDelivery) nextDelivery = item.deliveryDate;
    }
  }
  return {
    shop: shopContact(config, language),
    orderNumber: order.number,
    createdAt: order.createdAt,
    customer: { name: customer?.name ?? '', phone: customer?.phone ?? null },
    lines: order.items.map((item) => ({
      itemId: item.id,
      garment: labelIn(item.garmentName, language),
      wearer: item.wearer,
      price: item.price,
      cancelled: item.cancelled !== null,
      stage: labelIn(stageByKey(item.stages, item.stageKey).label, language),
      trialDate: item.trialDate,
      deliveryDate: item.deliveryDate,
    })),
    subtotal: subtotal(order),
    discount: order.discount,
    adjustments: order.priceAdjustments.map((a) => ({ amount: a.amount, reason: a.reason })),
    adjustmentsTotal: adjustmentsTotal(order),
    total: money.total,
    payments: order.payments.map((p) => ({
      id: p.id,
      at: p.at,
      kind: p.kind,
      method: p.method,
      reference: p.reference,
      reason: p.reason,
      effect: effectOf(p, order.payments),
    })),
    paid: money.paid,
    balance: money.balance,
    creditDue: money.creditDue,
    progress: orderProgress(order),
    nextDelivery,
  };
}

/** Plain text for sharing a receipt through a messaging app. */
export function receiptShareText(model: ReceiptModel, language: Language): string {
  const t = (key: Parameters<typeof translate>[1], vars?: Record<string, string>) => translate(language, key, vars);
  const lines = [
    model.shop.name,
    t('receipt.orderNumber', { number: model.orderNumber }),
    `${t('money.total')}: ${formatMoney(model.total, language)}`,
    `${t('money.paid')}: ${formatMoney(model.paid, language)}`,
    model.creditDue > 0
      ? `${t('money.creditDue')}: ${formatMoney(model.creditDue, language)}`
      : `${t('money.balance')}: ${formatMoney(model.balance, language)}`,
  ];
  if (model.nextDelivery) lines.push(`${t('receipt.delivery')}: ${formatDate(model.nextDelivery, language)}`);
  if (model.shop.phone) lines.push(model.shop.phone);
  return lines.join('\n');
}
```

- [ ] **Step 4: Build the print pages**

Write `PrintLayout`, `MoneyTable`, `ReceiptPage`, `JobSlipPage`, `FabricTagsPage`, the print routes (beside `/app`, each wrapped in `RequireStaff`, `RequireCapability` and `Suspense`) and the print rules, to the done-conditions. The document's language is local state in `PrintLayout`, initialised from `useI18n().language`; the document's text uses `translate`, `formatDate` and `formatMoney` with that language rather than `useI18n().t`.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 152 tests (136 + 8 + 8); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/print apps/web/src/index.css apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add receipt, job slip and fabric tag print layouts with sharing"
```

### Task 9: Order entry state and photos

One hook holds an order being entered and saves it; both entry layouts use it. Photos are taken with the phone camera (or a file picker on desktop), shrunk, and kept on the device.

**Files:**
- Create: `apps/web/src/features/orders/useOrderEntry.ts`
- Test: `apps/web/src/features/orders/useOrderEntry.test.tsx`
- Create: `apps/web/src/lib/photos.ts`
- Test: `apps/web/src/lib/photos.test.ts`
- Create: `apps/web/src/features/orders/PhotoPicker.tsx`, `usePhoto.ts`
- Test: `apps/web/src/features/orders/PhotoPicker.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: everything in `draft.ts` (Task 7); `ShopStore.dispatchBatch`, `createId`, `nextOrderNumber`, `savePhoto`, `getPhoto` (Task 1); `useMeasurementAccess`, `useToday`, `problemText` (Task 3); `addDays` (Task 3).
- Produces:

```ts
export type SaveResult = { ok: true; orderId: string } | { ok: false; problem: string | null };

export interface OrderEntry {
  draft: OrderDraft;
  /** Every current problem, whether or not it is shown yet. */
  errors: DraftErrors;
  /** True after a save was attempted; layouts then show every error. */
  attempted: boolean;
  totals: DraftTotals;
  /** Something differs from the starting draft. */
  dirty: boolean;
  /** Whether the signed-in person may see the chosen customer's measurements. */
  canSeeMeasurements: boolean;
  saving: boolean;
  setCustomer(customer: DraftCustomer | null): void;
  addItem(templateId: string): void;
  updateItem(key: string, changes: Partial<DraftItem>): void;
  removeItem(key: string): void;
  update(changes: Partial<Pick<OrderDraft, 'discount' | 'advance' | 'notes'>>): void;
  save(): Promise<SaveResult>;
}

export function useOrderEntry(): OrderEntry;
```

  - `fitWithin(width, height, max)`, `compressPhoto(file): Promise<string>`, `PHOTO_MAX_SIDE`, `PHOTO_QUALITY`
  - `PhotoPicker({ photoIds, onChange(ids), compress? })` and `usePhoto(id): string | null`

**Behaviour the tests pin down:**
- The starting draft comes from the URL on first render: `?repeat=<orderId>` gives `draftFromOrder(order, ...)` (delivery date today + 7); `?customer=<id>` gives an empty draft with that customer; otherwise `emptyDraft()`. `dirty` compares against this starting draft, so an untouched repeat order is not dirty.
- `addItem(templateId)` appends `newDraftItem(template, store.createId(), { customerId, state, canSee, deliveryDate: addDays(today, 7) })`.
- `setCustomer` re-derives each item's measurements with `initialMeasurements` for the new customer, except items whose measurements are `new` with at least one value typed: those keep what was typed.
- `save()` validates first. With problems it sets `attempted`, saves nothing and returns `{ ok: false, problem: null }`. Otherwise it builds the events with `buildOrderEvents` (number from `store.nextOrderNumber()`, branch from this device, staff from the session, `now` the current ISO time), saves them with one `dispatchBatch`, and returns the order id; a failed batch returns `{ ok: false, problem: problemText(outcome) }`.

**Messages:**

```ts
// bn.ts
'photos.add': 'ছবি যোগ করুন',
'photos.photo': 'ছবি {n}',
'photos.remove': 'ছবি {n} সরান',
// en.ts
'photos.add': 'Add photos',
'photos.photo': 'Photo {n}',
'photos.remove': 'Remove photo {n}',
```

- [ ] **Step 1: Write the failing tests**

`apps/web/src/lib/photos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fitWithin } from './photos';

describe('fitWithin', () => {
  it('scales the longest side down to the limit, keeping the shape', () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(3000, 4000, 1280)).toEqual({ width: 960, height: 1280 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600, 1280)).toEqual({ width: 800, height: 600 });
  });
});
```

`apps/web/src/features/orders/useOrderEntry.test.tsx`:

```tsx
import { moneySummary, profileKey } from '@darzikhata/domain';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { I18nProvider } from '../../i18n/I18nProvider';
import { useOrderEntry, type SaveResult } from './useOrderEntry';

let count = 0;
const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function setup(path = '/app/orders/new') {
  const db = new DarziDb(`entry-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo('rahman');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <StoreProvider store={store}>
      <I18nProvider>
        <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
      </I18nProvider>
    </StoreProvider>
  );
  return { store, ...renderHook(() => useOrderEntry(), { wrapper }) };
}

const shirtValues = { length: 29, chest: 38, waist: 34, shoulder: 17, sleeve: 23, collar: 15.5 };

describe('useOrderEntry', () => {
  it('saves the spec example in one batch: 2 shirts and a panjabi, ৳2,400, ৳1,000 paid', async () => {
    const { store, result } = await setup();
    const eventsBefore = Object.keys(store.getSnapshot().state.appliedEventIds).length;
    act(() => result.current.setCustomer({ kind: 'new', name: 'জসিম উদ্দিন', nameAlt: '', phone: '', gender: 'male' }));
    act(() => result.current.addItem('shirt'));
    act(() => result.current.addItem('panjabi'));
    const [shirt, panjabi] = result.current.draft.items;
    act(() =>
      result.current.updateItem(shirt!.key, { quantity: 2, measurements: { kind: 'new', values: shirtValues, source: 'body', notes: '' } }),
    );
    act(() =>
      result.current.updateItem(panjabi!.key, {
        measurements: { kind: 'new', values: { ...shirtValues, length: 42 }, source: 'body', notes: '' },
      }),
    );
    act(() => result.current.update({ advance: { amount: 100000, method: 'cash', reference: '' } }));
    expect(result.current.totals).toMatchObject({ garments: 3, total: 240000, balance: 140000 });
    expect(result.current.errors).toEqual({});

    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await result.current.save();
    });

    if (!saved?.ok) throw new Error('expected the order to save');
    const { state } = store.getSnapshot();
    const order = state.orders[saved.orderId]!;
    expect(order).toMatchObject({ number: 'A-0041', branchId: 'main' });
    expect(order.items).toHaveLength(3);
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
    expect(state.customers[order.customerId]!.name).toBe('জসিম উদ্দিন');
    // customer, 2 measurement versions, order, advance
    expect(Object.keys(state.appliedEventIds).length).toBe(eventsBefore + 5);
  });

  it('saves nothing while there are problems, and marks the attempt', async () => {
    const { store, result } = await setup();
    const before = store.getSnapshot().state;
    let saved: SaveResult | undefined;
    await act(async () => {
      saved = await result.current.save();
    });
    expect(saved).toEqual({ ok: false, problem: null });
    expect(result.current.attempted).toBe(true);
    expect(result.current.errors).toEqual({ customer: 'required', items: 'required' });
    expect(store.getSnapshot().state).toBe(before);
  });

  it('switches to saved measurements when an existing customer is chosen', async () => {
    const { store, result } = await setup();
    const customerId = Object.values(store.getSnapshot().state.profiles).find((p) => p.templateId === 'shirt')!.customerId;
    act(() => result.current.addItem('shirt'));
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'new', values: {}, source: 'body', notes: '' });

    act(() => result.current.setCustomer({ kind: 'existing', customerId }));
    const latest = store.getSnapshot().state.profiles[profileKey(customerId, 'shirt')]!.versions.at(-1)!;
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'saved', versionId: latest.id, confirmed: false });
  });

  it('keeps measurements already typed when the customer changes', async () => {
    const { store, result } = await setup();
    const customerId = Object.values(store.getSnapshot().state.profiles).find((p) => p.templateId === 'shirt')!.customerId;
    act(() => result.current.addItem('shirt'));
    const key = result.current.draft.items[0]!.key;
    act(() => result.current.updateItem(key, { measurements: { kind: 'new', values: { chest: 40 }, source: 'body', notes: '' } }));
    act(() => result.current.setCustomer({ kind: 'existing', customerId }));
    expect(result.current.draft.items[0]!.measurements).toEqual({ kind: 'new', values: { chest: 40 }, source: 'body', notes: '' });
  });

  it('starts a repeat order from ?repeat= without counting it as a change', async () => {
    const { store, result } = await setup('/app/orders/new?repeat=rahman-o40');
    const order = store.getSnapshot().state.orders['rahman-o40']!;
    expect(result.current.draft.customer).toEqual({ kind: 'existing', customerId: order.customerId });
    expect(result.current.draft.items.map((i) => i.templateId)).toEqual(
      order.items.filter((i) => !i.cancelled).map((i) => i.templateId),
    );
    expect(result.current.dirty).toBe(false);
  });

  it('starts with a customer from ?customer= and becomes dirty once something changes', async () => {
    const { result } = await setup('/app/orders/new?customer=rahman-c1');
    expect(result.current.draft.customer).toEqual({ kind: 'existing', customerId: 'rahman-c1' });
    expect(result.current.dirty).toBe(false);
    act(() => result.current.addItem('pant'));
    expect(result.current.dirty).toBe(true);
  });
});
```

`apps/web/src/features/orders/PhotoPicker.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../../data/db';
import { StoreProvider } from '../../data/StoreContext';
import { ShopStore } from '../../data/store';
import { I18nProvider } from '../../i18n/I18nProvider';
import { PhotoPicker } from './PhotoPicker';

const dbs: DarziDb[] = [];
afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const PHOTO = 'data:image/jpeg;base64,AAAA';

function Harness({ onIds }: { onIds(ids: string[]): void }) {
  const [ids, setIds] = useState<string[]>([]);
  return (
    <PhotoPicker
      photoIds={ids}
      compress={async () => PHOTO}
      onChange={(next) => {
        setIds(next);
        onIds(next);
      }}
    />
  );
}

describe('PhotoPicker', () => {
  it('shrinks, stores and shows photos, and can remove them', async () => {
    const db = new DarziDb('photos-test');
    dbs.push(db);
    const store = new ShopStore({ db });
    await store.startDemo('rahman');
    let latest: string[] = [];
    render(
      <StoreProvider store={store}>
        <I18nProvider>
          <Harness onIds={(ids) => (latest = ids)} />
        </I18nProvider>
      </StoreProvider>,
    );

    const input = screen.getByLabelText('ছবি যোগ করুন') as HTMLInputElement;
    expect(input.accept).toBe('image/*');
    expect(input.getAttribute('capture')).toBe('environment');
    await userEvent.upload(input, new File(['x'], 'a.jpg', { type: 'image/jpeg' }));

    const image = await screen.findByRole('img', { name: 'ছবি ১' });
    expect(image.getAttribute('src')).toBe(PHOTO);
    expect(latest).toHaveLength(1);
    expect(await store.getPhoto(latest[0]!)).toBe(PHOTO);

    await userEvent.click(screen.getByRole('button', { name: 'ছবি ১ সরান' }));
    expect(screen.queryByRole('img', { name: 'ছবি ১' })).toBeNull();
    expect(latest).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/photos.test.ts src/features/orders/useOrderEntry.test.tsx src/features/orders/PhotoPicker.test.tsx`

Expected: FAIL, the modules do not exist yet.

- [ ] **Step 3: Write the photo helpers**

`compressPhoto` needs a real browser (`createImageBitmap`, canvas), so only `fitWithin` is unit-tested; `PhotoPicker` takes `compress` as a prop so its test can pass a fake.

`apps/web/src/lib/photos.ts`:

```ts
/** The size a photo is scaled to so its longest side is at most `max` pixels. Never enlarges. */
export function fitWithin(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export const PHOTO_MAX_SIDE = 1280;
export const PHOTO_QUALITY = 0.7;

/** Shrinks a camera photo to a JPEG data URL before it is stored on the device. Browser only. */
export async function compressPhoto(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_SIDE);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', PHOTO_QUALITY);
}
```

- [ ] **Step 4: Write `useOrderEntry`, `PhotoPicker` and `usePhoto`**

`PhotoPicker` renders a file input (`accept="image/*"`, `capture="environment"`, `multiple`) labelled `ছবি যোগ করুন`, compresses each chosen file, stores it with `store.savePhoto`, and calls `onChange` with the ids added. Each photo shows as a thumbnail (`alt` `ছবি {n}`) with a `ছবি {n} সরান` button. `usePhoto(id)` loads the data URL with `store.getPhoto` and returns null until it arrives.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 161 tests (152 + 2 + 6 + 1); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/photos.ts apps/web/src/lib/photos.test.ts apps/web/src/features/orders apps/web/src/i18n
git commit -m "feat(web): add order entry state with atomic save, and device photos"
```

### Task 10: Order entry on mobile

A phone-sized flow, one step at a time: customer, garments and measurements, design and photos, prices, dates and advance, then review and save. Saving opens the receipt.

**Files:**
- Create: `apps/web/src/features/orders/NewOrderPage.tsx` (picks the layout with `useShell().kind`)
- Create: `apps/web/src/features/orders/MobileOrderSteps.tsx`
- Create: `apps/web/src/features/orders/entry/CustomerPicker.tsx`, `ItemMeasurements.tsx`, `ItemDetails.tsx`, `MoneyFields.tsx`, `DraftSummary.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`orders/new` loads `NewOrderPage`)
- Test: `apps/web/src/features/orders/MobileOrderSteps.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `useOrderEntry` (Task 9); `errorsForStep`, `draftErrorKey`, `DRAFT_STEPS` (Task 7); `MeasurementInputs` (Task 6); `PhotoPicker` (Task 9); `useUnsavedGuard` (Task 2).
- Produces, for Task 11 to reuse: `CustomerPicker({ entry, errors })`, `ItemMeasurements({ entry, item, errors })`, `ItemDetails({ entry, item })`, `MoneyFields({ entry, errors })` (per-item price and dates come from `ItemMoney({ entry, item, errors })` in the same file), `DraftSummary({ totals })`. Each shows the errors it is given beside the matching fields, using `draftErrorKey`.

**Done when:**
- The page heading is `নতুন অর্ডার`; each step has an `h2` (`কাস্টমার`, `পোশাক ও মাপ`, `ডিজাইন ও ছবি`, `দাম, তারিখ ও অগ্রিম`, `যাচাই করুন`) and the text `ধাপ {n}/৫`.
- `পরের ধাপ` checks only the current step's errors (`errorsForStep`). If there are any it stays, shows `role="alert"` `নিচের ভুলগুলো ঠিক করুন`, shows each error beside its field, and moves focus to the first invalid field. `আগের ধাপ` goes back without checking and keeps everything typed.
- Customer step (`CustomerPicker`): the `কাস্টমার খুঁজুন` box lists matching customers as buttons (name, then phone); choosing one shows them with an `অন্য কাস্টমার` button. `নতুন কাস্টমার` shows `নাম`, `অন্য ভাষায় নাম`, `ফোন` and the `লিঙ্গ` choice instead. The customer error appears here.
- Garments step: a `পোশাক` select of active templates and `পোশাক যোগ করুন`. Each line is a region named `{garment} {n}` (its place in the draft, digits in the app language) with `সংখ্যা` (a text field reading Bangla or English digits), a remove button `{garment} {n} বাদ দিন`, and its measurements (`ItemMeasurements`):
  - saved: `আগের মাপ ({date})`, a read-only `MeasurementTable` (only when the person may see measurements), the checkbox `মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন`, and `নতুন মাপ নিন`, which switches to new values prefilled from the saved ones;
  - new: `MeasurementInputs` and the source choice `মাপ কোথা থেকে`;
  - hidden from this person: `এই কাস্টমারের মাপ আপনি দেখতে পারবেন না। আগের মাপ থাকলে সেটাই যাবে।` (plus the confirm checkbox when a saved version exists);
  - none (no fields): nothing.
- Details step: per line `কে পরবেন (ঐচ্ছিক)`, `ডিজাইনের নোট`, `কাপড়ের নোট` and the `PhotoPicker`.
- Money step: per line `দাম (প্রতিটি)` (money `NumberField`), `ডেলিভারির তারিখ` and `ট্রায়ালের তারিখ (ঐচ্ছিক)` (date inputs); then `ছাড়`, `ছাড়ের কারণ (ঐচ্ছিক)`, `অগ্রিম`, the method choice `কীভাবে দিলেন` (`ক্যাশ`, `বিকাশ`, `নগদ`, `ব্যাংক`), `রেফারেন্স / TrxID (ঐচ্ছিক)` and `অর্ডারের নোট (ঐচ্ছিক)`. `DraftSummary` (a table named `অর্ডারের হিসাব`) shows `দাম`, `ছাড়` (when set), `মোট`, `অগ্রিম`, `বাকি`, updating as amounts are typed.
- Review step: customer, each line (garment, quantity, wearer, delivery date, price) and `DraftSummary`, then `অর্ডার সেভ করুন` (disabled while saving, reading `সেভ হচ্ছে…`). If saving finds problems, the flow jumps to the first step with an error. A save problem from the store shows in `role="alert"`.
- After a successful save: `allowNextNavigation()`, then navigate to `/print/receipt/<orderId>`.
- Leaving with unsaved changes asks first.

**Messages:**

```ts
// bn.ts
'entry.step.customer': 'কাস্টমার',
'entry.step.garments': 'পোশাক ও মাপ',
'entry.step.details': 'ডিজাইন ও ছবি',
'entry.step.money': 'দাম, তারিখ ও অগ্রিম',
'entry.step.review': 'যাচাই করুন',
'entry.stepOf': 'ধাপ {n}/{total}',
'entry.next': 'পরের ধাপ',
'entry.back': 'আগের ধাপ',
'entry.fixErrors': 'নিচের ভুলগুলো ঠিক করুন',
'entry.changeCustomer': 'অন্য কাস্টমার',
'entry.garment': 'পোশাক',
'entry.addGarment': 'পোশাক যোগ করুন',
'entry.removeItem': '{item} বাদ দিন',
'entry.quantity': 'সংখ্যা',
'entry.savedMeasurements': 'আগের মাপ ({date})',
'entry.confirmMeasurements': 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন',
'entry.measurementsHidden': 'এই কাস্টমারের মাপ আপনি দেখতে পারবেন না। আগের মাপ থাকলে সেটাই যাবে।',
'entry.wearer': 'কে পরবেন (ঐচ্ছিক)',
'entry.designNotes': 'ডিজাইনের নোট',
'entry.fabricNote': 'কাপড়ের নোট',
'entry.price': 'দাম (প্রতিটি)',
'entry.deliveryDate': 'ডেলিভারির তারিখ',
'entry.trialDate': 'ট্রায়ালের তারিখ (ঐচ্ছিক)',
'entry.discount': 'ছাড়',
'entry.discountReason': 'ছাড়ের কারণ (ঐচ্ছিক)',
'entry.advance': 'অগ্রিম',
'entry.notes': 'অর্ডারের নোট (ঐচ্ছিক)',
'entry.summary': 'অর্ডারের হিসাব',
'entry.save': 'অর্ডার সেভ করুন',
'entry.saving': 'সেভ হচ্ছে…',
'payment.method': 'কীভাবে দিলেন',
'payment.reference': 'রেফারেন্স / TrxID (ঐচ্ছিক)',
// en.ts
'entry.step.customer': 'Customer',
'entry.step.garments': 'Garments and measurements',
'entry.step.details': 'Design and photos',
'entry.step.money': 'Prices, dates and advance',
'entry.step.review': 'Check and save',
'entry.stepOf': 'Step {n} of {total}',
'entry.next': 'Next step',
'entry.back': 'Previous step',
'entry.fixErrors': 'Please fix the problems below',
'entry.changeCustomer': 'Another customer',
'entry.garment': 'Garment',
'entry.addGarment': 'Add garment',
'entry.removeItem': 'Remove {item}',
'entry.quantity': 'Quantity',
'entry.savedMeasurements': 'Saved measurements ({date})',
'entry.confirmMeasurements': 'The customer confirmed these measurements are still right',
'entry.measurementsHidden': 'You cannot see this customer’s measurements. Saved measurements, if any, will be used.',
'entry.wearer': 'Wearer (optional)',
'entry.designNotes': 'Design notes',
'entry.fabricNote': 'Fabric note',
'entry.price': 'Price (each)',
'entry.deliveryDate': 'Delivery date',
'entry.trialDate': 'Trial date (optional)',
'entry.discount': 'Discount',
'entry.discountReason': 'Discount reason (optional)',
'entry.advance': 'Advance',
'entry.notes': 'Order notes (optional)',
'entry.summary': 'Order amounts',
'entry.save': 'Save order',
'entry.saving': 'Saving…',
'payment.method': 'Paid by',
'payment.reference': 'Reference / TrxID (optional)',
```

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/orders/MobileOrderSteps.test.tsx`:

```tsx
import { moneySummary } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const SHIRT = { 'ঝুল': '29', 'বুক': '38', 'পেট': '34', 'কাঁধ (পুট)': '17', 'হাতা': '23', 'গলা': '15½' };

async function fill(region: HTMLElement, values: Record<string, string>) {
  for (const [label, value] of Object.entries(values)) await userEvent.type(within(region).getByLabelText(label), value);
}

const next = () => userEvent.click(screen.getByRole('button', { name: 'পরের ধাপ' }));
const summaryRow = (label: RegExp) =>
  within(screen.getByRole('table', { name: 'অর্ডারের হিসাব' })).getByRole('row', { name: label });

describe('Order entry on mobile', () => {
  it('takes a new customer through every step and opens a receipt showing the balance', async () => {
    const { store } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    expect(await screen.findByRole('heading', { name: 'কাস্টমার' })).toBeTruthy();
    expect(screen.getByText('ধাপ ১/৫')).toBeTruthy();

    await next();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(screen.getByText('কাস্টমার বেছে নিন বা নতুন কাস্টমার যোগ করুন')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম উদ্দিন');
    await userEvent.type(screen.getByLabelText('ফোন'), '01799887766');
    await next();

    expect(await screen.findByRole('heading', { name: 'পোশাক ও মাপ' })).toBeTruthy();
    await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.selectOptions(screen.getByLabelText('পোশাক'), 'পাঞ্জাবি');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const shirt = screen.getByRole('region', { name: 'শার্ট ১' });
    await userEvent.clear(within(shirt).getByLabelText('সংখ্যা'));
    await userEvent.type(within(shirt).getByLabelText('সংখ্যা'), '২');
    await fill(shirt, SHIRT);
    await fill(screen.getByRole('region', { name: 'পাঞ্জাবি ২' }), { ...SHIRT, 'ঝুল': '42' });
    await next();

    expect(await screen.findByRole('heading', { name: 'ডিজাইন ও ছবি' })).toBeTruthy();
    await userEvent.type(within(screen.getByRole('region', { name: 'শার্ট ১' })).getByLabelText('ডিজাইনের নোট'), 'দুই পকেট');
    await next();

    expect(await screen.findByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(within(summaryRow(/^মোট/)).getByText('৳২,৪০০')).toBeTruthy();
    await userEvent.type(screen.getByLabelText('অগ্রিম'), '১০০০');
    expect(within(summaryRow(/^বাকি/)).getByText('৳১,৪০০')).toBeTruthy();
    await next();

    expect(await screen.findByRole('heading', { name: 'যাচাই করুন' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'অর্ডার সেভ করুন' }));

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const totals = screen.getByRole('table', { name: 'হিসাব' });
    expect(within(within(totals).getByRole('row', { name: /^বাকি/ })).getByText('৳১,৪০০')).toBeTruthy();

    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.items.map((i) => i.templateId)).toEqual(['shirt', 'shirt', 'panjabi']);
    expect(order.items[0]!.designNotes).toBe('দুই পকেট');
    expect(order.items[0]!.measurements?.values['collar']).toEqual({ value: 15.5, unit: 'inch' });
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
    expect(store.getSnapshot().state.customers[order.customerId]).toMatchObject({ name: 'জসিম উদ্দিন', phone: '01799887766' });
  });

  it('keeps what was typed when going back a step', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.click(await screen.findByRole('button', { name: 'আগের ধাপ' }));
    expect(await screen.findByLabelText('নাম')).toHaveProperty('value', 'জসিম');
  });

  it('shows missing measurements beside the fields and stays on the step', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.type(within(screen.getByRole('region', { name: 'শার্ট ১' })).getByLabelText('ঝুল'), '29');
    await next();

    expect(screen.getByRole('heading', { name: 'পোশাক ও মাপ' })).toBeTruthy();
    const shirt = screen.getByRole('region', { name: 'শার্ট ১' });
    expect(within(shirt).getAllByText('এই মাপটি লাগবে')).toHaveLength(5);
    expect(within(shirt).getByLabelText('বুক').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(within(shirt).getByLabelText('বুক'));
  });

  it('keeps the advance within the total', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জসিম');
    await next();
    await userEvent.selectOptions(await screen.findByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(screen.getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await next();
    await next();
    await userEvent.type(await screen.findByLabelText('অগ্রিম'), '500');
    await next();
    expect(screen.getByRole('heading', { name: 'দাম, তারিখ ও অগ্রিম' })).toBeTruthy();
    expect(screen.getByText('অগ্রিম মোট দামের বেশি হতে পারে না')).toBeTruthy();
  });

  it('asks before leaving a started order', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders/new' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন কাস্টমার' }));
    await userEvent.type(screen.getByLabelText('নাম'), 'জ');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'হোম' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/orders/MobileOrderSteps.test.tsx`

Expected: FAIL. `/app/orders/new` still shows the placeholder.

- [ ] **Step 3: Build the shared entry parts and the mobile steps**

Write the `entry/` components and `MobileOrderSteps` to the done-conditions. Keep the current step in component state. Error paths map to fields like this: `customer` and `customer.*` in `CustomerPicker`; `items` beside the add button; `items.<key>.<field>` and `items.<key>.measure.<field>` inside that line's region; `discount.amount` and `advance.amount` beside their fields.

- [ ] **Step 4: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 166 tests (161 + 5); type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/orders apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add step-by-step order entry for mobile"
```

### Task 11: Order entry on desktop

The same order in one screen with three columns: customer and garment lines on the left, the chosen line's measurements and design in the middle, and the money summary on the right, which stays in view. Repeat orders start here from a customer's history.

**Files:**
- Create: `apps/web/src/features/orders/DesktopOrderForm.tsx`
- Modify: `apps/web/src/features/orders/NewOrderPage.tsx`
- Test: `apps/web/src/features/orders/DesktopOrderForm.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `useOrderEntry` (Task 9); the `entry/` components (Task 10).

**Done when:**
- Three regions: `কাস্টমার ও পোশাক` (`CustomerPicker`, the `পোশাক` select with `পোশাক যোগ করুন`, and one button per line named `{garment} {n}` with `aria-pressed` on the chosen one; a line with errors also shows `ঠিক করতে হবে`), `মাপ ও ডিজাইন` (heading `{garment} {n}`, `সংখ্যা`, `ItemMeasurements` and `ItemDetails` for the chosen line; empty state `বাম পাশ থেকে একটি পোশাক বেছে নিন`), and `অর্ডারের হিসাব` (sticky: `ItemMoney` for the chosen line, `MoneyFields`, `DraftSummary`, and `অর্ডার সেভ করুন`).
- A newly added line becomes the chosen one.
- `অর্ডার সেভ করুন` validates everything. With problems: `role="alert"` `নিচের ভুলগুলো ঠিক করুন`, the first line with a problem becomes the chosen one, and every problem shows beside its field once its line is chosen.
- No `<form>` submit: Enter in any field never saves the order.
- After a successful save: `allowNextNavigation()`, then `/print/receipt/<orderId>`.
- Leaving with unsaved changes asks first.

**Messages:**

```ts
// bn.ts
'entry.left': 'কাস্টমার ও পোশাক',
'entry.middle': 'মাপ ও ডিজাইন',
'entry.chooseItem': 'বাম পাশ থেকে একটি পোশাক বেছে নিন',
'entry.itemHasErrors': 'ঠিক করতে হবে',
// en.ts
'entry.left': 'Customer and garments',
'entry.middle': 'Measurements and design',
'entry.chooseItem': 'Choose a garment on the left',
'entry.itemHasErrors': 'Needs fixing',
```

The right column is named by `entry.summary` (`অর্ডারের হিসাব`).

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/orders/DesktopOrderForm.test.tsx`:

```tsx
import { profileKey } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const region = (name: string) => screen.getByRole('region', { name });
const save = () => userEvent.click(within(region('অর্ডারের হিসাব')).getByRole('button', { name: 'অর্ডার সেভ করুন' }));
const CONFIRM = 'মাপ এখনো ঠিক আছে, কাস্টমার নিশ্চিত করেছেন';

describe('Order entry on desktop', () => {
  it('uses saved measurements only after they are confirmed, showing the problem beside them', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const { state } = store.getSnapshot();
    const profile = Object.values(state.profiles).find((p) => p.templateId === 'shirt')!;
    const customer = state.customers[profile.customerId]!;

    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expect(region('মাপ ও ডিজাইন')).toBeTruthy();
    await userEvent.type(within(left).getByLabelText('কাস্টমার খুঁজুন'), customer.name);
    await userEvent.click(within(left).getByRole('button', { name: new RegExp(`^${customer.name}`) }));
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    expect(within(left).getByRole('button', { name: 'শার্ট ১' }).getAttribute('aria-pressed')).toBe('true');

    await save();
    expect(screen.getByRole('alert').textContent).toBe('নিচের ভুলগুলো ঠিক করুন');
    expect(within(region('মাপ ও ডিজাইন')).getByText('মাপ এখনো ঠিক আছে কিনা কাস্টমারের কাছে জেনে টিক দিন')).toBeTruthy();

    await userEvent.click(within(region('মাপ ও ডিজাইন')).getByRole('checkbox', { name: CONFIRM }));
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(customer.id);
    expect(order.items[0]!.measurements?.versionId).toBe(state.profiles[profileKey(customer.id, 'shirt')]!.versions.at(-1)!.id);
  });

  it('repeats an earlier order after each garment’s measurements are confirmed', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?repeat=rahman-o40' });
    const previous = store.getSnapshot().state.orders['rahman-o40']!;
    const lines = previous.items.filter((i) => !i.cancelled);

    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    const lineButtons = within(left).getAllByRole('button', { name: /^\S+ [০-৯]+$/ });
    expect(lineButtons).toHaveLength(lines.length);

    for (const button of lineButtons) {
      await userEvent.click(button);
      const checkbox = within(region('মাপ ও ডিজাইন')).queryByRole('checkbox', { name: CONFIRM });
      if (checkbox) await userEvent.click(checkbox);
    }
    await save();

    expect(await screen.findByRole('heading', { name: 'রসিদ' })).toBeTruthy();
    const order = Object.values(store.getSnapshot().state.orders).find((o) => o.number === 'A-0041')!;
    expect(order.customerId).toBe(previous.customerId);
    expect(order.items.map((i) => [i.templateId, i.price])).toEqual(lines.map((i) => [i.templateId, i.price]));
  });

  it('starts with the customer chosen on their profile', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    expect(within(left).getByText(store.getSnapshot().state.customers['rahman-c1']!.name)).toBeTruthy();
    expect(within(left).getByRole('button', { name: 'অন্য কাস্টমার' })).toBeTruthy();
  });

  it('never saves when Enter is pressed in a field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new?customer=rahman-c1' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'অল্টারেশন');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    const before = Object.keys(store.getSnapshot().state.orders).length;

    await userEvent.type(within(region('অর্ডারের হিসাব')).getByLabelText('অগ্রিম'), '100{Enter}');

    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
    expect(screen.getByRole('region', { name: 'অর্ডারের হিসাব' })).toBeTruthy();
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders/new' });
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    await userEvent.selectOptions(within(left).getByLabelText('পোশাক'), 'শার্ট');
    await userEvent.click(within(left).getByRole('button', { name: 'পোশাক যোগ করুন' }));
    await userEvent.click(within(screen.getByRole('navigation', { name: 'প্রধান মেনু' })).getByRole('link', { name: 'অর্ডার' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'এখানেই থাকুন' }));
    expect(region('কাস্টমার ও পোশাক')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/orders/DesktopOrderForm.test.tsx`

Expected: FAIL. The desktop layout does not exist yet.

- [ ] **Step 3: Build the desktop form**

Write `DesktopOrderForm` to the done-conditions and make `NewOrderPage` render it when `useShell().kind === 'desktop'`. Keep the chosen line's key in component state; when a save finds problems, choose the first line whose key appears in an error path.

- [ ] **Step 4: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 171 tests (166 + 5); type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/orders apps/web/src/i18n
git commit -m "feat(web): add three-column desktop order entry with repeat orders"
```

### Task 12: Orders list and detail panel

Find any order by number, name or phone, narrow it with filters, and open it. On desktop the order opens in a panel beside the table, which keeps its filters and scroll position; on mobile it opens as its own screen. The list state lives in the URL, so closing an order returns to exactly the same list.

**Files:**
- Create: `apps/web/src/features/orders/orderList.ts`
- Test: `apps/web/src/features/orders/orderList.test.ts`
- Create: `apps/web/src/features/orders/OrdersPage.tsx`, `OrderFilters.tsx`, `OrderTable.tsx`, `OrderCards.tsx`, `OrderDetail.tsx` (header only here; Task 13 fills in the garments)
- Modify: `apps/web/src/app/AppRoutes.tsx` (`orders/:orderId?`)
- Test: `apps/web/src/features/orders/OrdersPage.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `garmentSummary`, `progressText`, `useCan`, `useToday` (Task 3); domain `orderNumberMatches`, `customerMatchScore`, `balanceDue`.
- Produces:
  - `OrderStatusFilter`, `OrderSort`, `OrderListQuery`, `DEFAULT_LIST_QUERY`, `PAGE_SIZE` (20), `OrderRow`, `OrderPage`
  - `orderRow(order, state, today)`, `queryOrders(state, query, today, pageSize?)`, `readListQuery(params)`, `writeListQuery(query)`
  - `OrderDetail({ orderId, onClose? })`: Task 13 adds the garments, Task 14 the money.

**Rules (`orderList.ts`):**
- Status: `open` = not every item delivered or cancelled; `ready` = at least one item ready; `overdue` = an unfinished item's delivery date is before today; `closed` = every item delivered or cancelled.
- Text matches the order number (`orderNumberMatches`, so `৪০`, `a40` and `A-0040` all work) or the customer (`customerMatchScore > 0`).
- `dueOnly` keeps orders whose balance is above zero.
- Sorts: `newest` (created, newest first), `oldest`, `delivery` (earliest promised date among garments not yet handed over; orders with nothing left to hand over go last), `balance` (largest first). Ties fall back to the order number.
- Pages are 1-based and clamped into range. The URL leaves defaults out (`q`, `status`, `due=1`, `sort`, `page`) and ignores values it does not know.

**Done when:**
- Heading `অর্ডার`. Filters: search `অর্ডার নম্বর, নাম বা ফোন`; `অবস্থা` select (`সব`, `চলমান`, `রেডি আছে`, `দেরি হয়েছে`, `শেষ`); with `money.view` the checkbox `শুধু বাকি আছে এমন`; `সাজান` select (`নতুন আগে`, `পুরনো আগে`, `ডেলিভারির তারিখ`, and with `money.view` `বাকি বেশি আগে`). Changing a filter resets to page 1. Every change is written to the URL with `setSearchParams` (replace, not push).
- Active filters show as a list `চালু ফিল্টার` of chips (`অবস্থা: দেরি হয়েছে`, `খোঁজা: {text}`, `শুধু বাকি আছে এমন`) with `সব ফিল্টার মুছুন`.
- `{n}টি অর্ডার`, and paging `আগের পাতা`, `পাতা {page}/{pages}`, `পরের পাতা`. With no matches: `এই ফিল্টারে কোনো অর্ডার নেই`.
- Desktop: a table `অর্ডার তালিকা` with columns `অর্ডার`, `কাস্টমার`, `পোশাক`, `ট্রায়াল / ডেলিভারি`, `অগ্রগতি`, `কারিগর`, and with `money.view` `মোট` and `বাকি` (credit due shows as `ফেরত পাওনা ৳…`). The table scrolls sideways inside its own box when narrow. The order number cell holds the row's only link, to `/app/orders/<id>` carrying the current search string. With an order open, a region `অর্ডারের বিস্তারিত` sits beside the table (the table and its scroll container stay mounted) with `বন্ধ করুন`, which returns to `/app/orders` with the same search string.
- Mobile: a list `অর্ডার তালিকা` of cards (number, customer, garments, next delivery, progress, and the balance with `money.view`), each one link. An open order shows alone, with `সব অর্ডার` back to the list with the same search string.
- `OrderDetail` header (this task): heading = order number, the customer as a link to their profile, created date, status `চলমান` or `শেষ`, and `progressText`. An unknown id shows `role="alert"` `অর্ডার পাওয়া যায়নি`.

**Messages:**

```ts
// bn.ts
'orders.search': 'অর্ডার নম্বর, নাম বা ফোন',
'orders.status': 'অবস্থা',
'orders.status.all': 'সব',
'orders.status.open': 'চলমান',
'orders.status.ready': 'রেডি আছে',
'orders.status.overdue': 'দেরি হয়েছে',
'orders.status.closed': 'শেষ',
'orders.dueOnly': 'শুধু বাকি আছে এমন',
'orders.sort': 'সাজান',
'orders.sort.newest': 'নতুন আগে',
'orders.sort.oldest': 'পুরনো আগে',
'orders.sort.delivery': 'ডেলিভারির তারিখ',
'orders.sort.balance': 'বাকি বেশি আগে',
'orders.activeFilters': 'চালু ফিল্টার',
'orders.filterStatus': 'অবস্থা: {status}',
'orders.filterText': 'খোঁজা: {text}',
'orders.clearFilters': 'সব ফিল্টার মুছুন',
'orders.count': '{n}টি অর্ডার',
'orders.page': 'পাতা {page}/{pages}',
'orders.prev': 'আগের পাতা',
'orders.next': 'পরের পাতা',
'orders.empty': 'এই ফিল্টারে কোনো অর্ডার নেই',
'orders.list': 'অর্ডার তালিকা',
'orders.col.order': 'অর্ডার',
'orders.col.customer': 'কাস্টমার',
'orders.col.garments': 'পোশাক',
'orders.col.dates': 'ট্রায়াল / ডেলিভারি',
'orders.col.progress': 'অগ্রগতি',
'orders.col.workers': 'কারিগর',
'orders.col.total': 'মোট',
'orders.col.balance': 'বাকি',
'orders.detail': 'অর্ডারের বিস্তারিত',
'orders.back': 'সব অর্ডার',
'orders.notFound': 'অর্ডার পাওয়া যায়নি',
'order.statusOpen': 'চলমান',
'order.statusClosed': 'শেষ',
'order.created': '{date} তারিখে নেওয়া',
// en.ts
'orders.search': 'Order number, name or phone',
'orders.status': 'Status',
'orders.status.all': 'All',
'orders.status.open': 'Open',
'orders.status.ready': 'Ready to collect',
'orders.status.overdue': 'Overdue',
'orders.status.closed': 'Closed',
'orders.dueOnly': 'Only with money due',
'orders.sort': 'Sort',
'orders.sort.newest': 'Newest first',
'orders.sort.oldest': 'Oldest first',
'orders.sort.delivery': 'Delivery date',
'orders.sort.balance': 'Largest balance first',
'orders.activeFilters': 'Active filters',
'orders.filterStatus': 'Status: {status}',
'orders.filterText': 'Search: {text}',
'orders.clearFilters': 'Clear all filters',
'orders.count': '{n} orders',
'orders.page': 'Page {page} of {pages}',
'orders.prev': 'Previous page',
'orders.next': 'Next page',
'orders.empty': 'No orders match these filters',
'orders.list': 'Order list',
'orders.col.order': 'Order',
'orders.col.customer': 'Customer',
'orders.col.garments': 'Garments',
'orders.col.dates': 'Trial / delivery',
'orders.col.progress': 'Progress',
'orders.col.workers': 'Workers',
'orders.col.total': 'Total',
'orders.col.balance': 'Balance',
'orders.detail': 'Order details',
'orders.back': 'All orders',
'orders.notFound': 'Order not found',
'order.statusOpen': 'Open',
'order.statusClosed': 'Closed',
'order.created': 'Taken on {date}',
```

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/orders/orderList.test.ts`:

```ts
import { emptyState, type ShopState } from '@darzikhata/domain';
import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { DEFAULT_LIST_QUERY, orderRow, queryOrders, readListQuery, writeListQuery, type OrderListQuery } from './orderList';

const TODAY = '2026-10-03';
const customer = (id: string, name: string, phone: string) => ({
  id, name, nameAlt: null, phone, householdId: null, gender: 'male' as const, notes: '', createdAt: '', version: 1,
});

function state(): ShopState {
  const orders = [
    // Open, overdue, owes ৳700.
    makeOrder({ id: 'o1', number: 'A-0001', customerId: 'rahim', createdAt: '2026-09-01T05:00:00.000Z', items: [makeItem({ id: 'a', deliveryDate: '2026-09-30', assignedTo: 'tailor-1' })] }),
    // One garment ready, one delivered; paid in full.
    makeOrder({
      id: 'o2', number: 'A-0002', customerId: 'karim', createdAt: '2026-09-20T05:00:00.000Z',
      items: [makeItem({ id: 'b', stageKey: 'ready', deliveryDate: '2026-10-04', assignedTo: 'tailor-2' }), makeItem({ id: 'c', stageKey: 'delivered', deliveryDate: '2026-10-01', assignedTo: 'tailor-1' })],
      payments: [makePayment({ amount: 140000 })],
    }),
    // Closed: delivered and cancelled; overpaid, so the shop owes credit.
    makeOrder({
      id: 'o3', number: 'A-0003', customerId: 'rahim', createdAt: '2026-09-25T05:00:00.000Z',
      items: [makeItem({ id: 'd', stageKey: 'delivered', deliveryDate: '2026-09-28' }), makeItem({ id: 'e', cancelled: { reason: 'x', at: '', by: '' }, assignedTo: 'tailor-2' })],
      payments: [makePayment({ amount: 100000 })],
    }),
    // Open, due later, owes ৳1,400.
    makeOrder({ id: 'o4', number: 'B-0001', customerId: 'karim', createdAt: '2026-10-02T05:00:00.000Z', items: [makeItem({ id: 'f', deliveryDate: '2026-10-10', price: 140000 })] }),
  ];
  return {
    ...emptyState(),
    customers: { rahim: customer('rahim', 'রহিম উদ্দিন', '01712345678'), karim: customer('karim', 'করিম', '01811000000') },
    orders: Object.fromEntries(orders.map((o) => [o.id, o])),
  };
}

const numbers = (query: Partial<OrderListQuery>, pageSize?: number) =>
  queryOrders(state(), { ...DEFAULT_LIST_QUERY, ...query }, TODAY, pageSize).rows.map((r) => r.order.number);

describe('orderRow', () => {
  it('derives progress, next delivery, overdue, money and workers', () => {
    const s = state();
    expect(orderRow(s.orders['o2']!, s, TODAY)).toMatchObject({
      customer: { id: 'karim' },
      progress: { unfinished: 0, ready: 1, delivered: 1, cancelled: 0, total: 2 },
      nextDelivery: '2026-10-04',
      overdue: false,
      total: 140000,
      balance: 0,
      workers: ['tailor-2', 'tailor-1'],
    });
    expect(orderRow(s.orders['o1']!, s, TODAY)).toMatchObject({ overdue: true, balance: 70000 });
    expect(orderRow(s.orders['o3']!, s, TODAY)).toMatchObject({ nextDelivery: null, balance: -30000, workers: [] });
  });
});

describe('queryOrders', () => {
  it('lists newest first by default', () => {
    expect(numbers({})).toEqual(['B-0001', 'A-0003', 'A-0002', 'A-0001']);
    expect(numbers({ sort: 'oldest' })).toEqual(['A-0001', 'A-0002', 'A-0003', 'B-0001']);
  });

  it('filters by status', () => {
    expect(numbers({ status: 'open' })).toEqual(['B-0001', 'A-0002', 'A-0001']);
    expect(numbers({ status: 'ready' })).toEqual(['A-0002']);
    expect(numbers({ status: 'overdue' })).toEqual(['A-0001']);
    expect(numbers({ status: 'closed' })).toEqual(['A-0003']);
  });

  it('searches order numbers, names and phones, combined with other filters', () => {
    expect(numbers({ text: '1' })).toEqual(['B-0001', 'A-0001']);
    expect(numbers({ text: 'রহিম' })).toEqual(['A-0003', 'A-0001']);
    expect(numbers({ text: '০১৮১১' })).toEqual(['B-0001', 'A-0002']);
    expect(numbers({ text: 'রহিম', status: 'open' })).toEqual(['A-0001']);
  });

  it('shows only orders with money owed, largest balance first when sorted by balance', () => {
    expect(numbers({ dueOnly: true, sort: 'balance' })).toEqual(['B-0001', 'A-0001']);
  });

  it('sorts by next delivery with finished orders last', () => {
    expect(numbers({ sort: 'delivery' })).toEqual(['A-0001', 'A-0002', 'B-0001', 'A-0003']);
  });

  it('pages results and keeps the page in range', () => {
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, page: 2 }, TODAY, 3)).toMatchObject({ total: 4, page: 2, pages: 2 });
    expect(numbers({ page: 2 }, 3)).toEqual(['A-0001']);
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, page: 9 }, TODAY, 3).page).toBe(2);
    expect(queryOrders(state(), { ...DEFAULT_LIST_QUERY, text: 'nobody' }, TODAY)).toMatchObject({ rows: [], total: 0, page: 1, pages: 1 });
  });
});

describe('list query in the URL', () => {
  it('round-trips and leaves defaults out', () => {
    const query: OrderListQuery = { text: 'রহিম', status: 'overdue', dueOnly: true, sort: 'delivery', page: 3 };
    const params = writeListQuery(query);
    expect(params.toString()).toBe('q=%E0%A6%B0%E0%A6%B9%E0%A6%BF%E0%A6%AE&status=overdue&due=1&sort=delivery&page=3');
    expect(readListQuery(params)).toEqual(query);
    expect(writeListQuery(DEFAULT_LIST_QUERY).toString()).toBe('');
  });

  it('ignores values it does not know', () => {
    expect(readListQuery(new URLSearchParams('status=lost&sort=random&page=-2&due=yes'))).toEqual(DEFAULT_LIST_QUERY);
  });
});
```

`apps/web/src/features/orders/OrdersPage.test.tsx`:

```tsx
import { toBanglaDigits, todayInDhaka } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { DEFAULT_LIST_QUERY, queryOrders } from './orderList';

const table = () => screen.getByRole('table', { name: 'অর্ডার তালিকা' });
const bodyRows = () => within(table()).getAllByRole('row').slice(1);

describe('Orders list', () => {
  it('shows 20 orders a page, newest first, with paging', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    expect(await screen.findByText('৪০টি অর্ডার')).toBeTruthy();
    expect(bodyRows()).toHaveLength(20);
    expect(within(bodyRows()[0]!).getByRole('link', { name: 'A-0040' })).toBeTruthy();
    expect(screen.getByText('পাতা ১/২')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'পরের পাতা' }));
    expect(await screen.findByText('পাতা ২/২')).toBeTruthy();
    expect(within(bodyRows()[19]!).getByRole('link', { name: 'A-0001' })).toBeTruthy();
  });

  it('filters by status, shows the active filter, and clears it', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const today = todayInDhaka(new Date());
    const overdue = queryOrders(store.getSnapshot().state, { ...DEFAULT_LIST_QUERY, status: 'overdue' }, today);
    expect(overdue.total).toBeGreaterThan(0);

    await userEvent.selectOptions(await screen.findByLabelText('অবস্থা'), 'দেরি হয়েছে');
    expect(await screen.findByText(`${toBanglaDigits(String(overdue.total))}টি অর্ডার`)).toBeTruthy();
    expect(bodyRows()).toHaveLength(overdue.rows.length);
    expect(within(screen.getByRole('list', { name: 'চালু ফিল্টার' })).getByText('অবস্থা: দেরি হয়েছে')).toBeTruthy();
    expect(router.state.location.search).toBe('?status=overdue');

    await userEvent.click(screen.getByRole('button', { name: 'সব ফিল্টার মুছুন' }));
    expect(await screen.findByText('৪০টি অর্ডার')).toBeTruthy();
  });

  it('finds an order by its number typed in Bangla digits', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    await userEvent.type(await screen.findByLabelText('অর্ডার নম্বর, নাম বা ফোন'), '৪০');
    expect(await screen.findByText('১টি অর্ডার')).toBeTruthy();
    expect(within(bodyRows()[0]!).getByRole('link', { name: 'A-0040' })).toBeTruthy();
  });

  it('opens an order beside the list and closes it back to the same filters', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders?status=open' });
    const first = within((await screen.findAllByRole('row'))[1]!).getByRole('link');
    const number = first.textContent!;
    await userEvent.click(first);

    const panel = await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
    expect(within(panel).getByRole('heading', { name: number })).toBeTruthy();
    expect(table()).toBeTruthy();
    expect(router.state.location.search).toBe('?status=open');
    expect(router.state.location.pathname).toMatch(/^\/app\/orders\/rahman-o\d+$/);

    await userEvent.click(within(panel).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('region', { name: 'অর্ডারের বিস্তারিত' })).toBeNull();
    expect(router.state.location.pathname).toBe('/app/orders');
    expect(screen.getByLabelText('অবস্থা')).toHaveProperty('value', 'open');
  });

  it('hides money columns and filters from staff without money access', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'uniform',
      path: '/app/orders',
      as: { staffId: 'uniform-supervisor', pin: '3333' },
    });
    const headers = within(await screen.findByRole('table', { name: 'অর্ডার তালিকা' }))
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['অর্ডার', 'কাস্টমার', 'পোশাক', 'ট্রায়াল / ডেলিভারি', 'অগ্রগতি', 'কারিগর']);
    expect(screen.queryByRole('checkbox', { name: 'শুধু বাকি আছে এমন' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'বাকি বেশি আগে' })).toBeNull();
  });

  it('opens an order on its own screen on mobile, with a way back to the same list', async () => {
    const { router } = await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app/orders?status=ready' });
    const list = await screen.findByRole('list', { name: 'অর্ডার তালিকা' });
    await userEvent.click(within(list).getAllByRole('link')[0]!);

    expect(await screen.findByRole('heading', { name: /^[A-Z]-\d{4}$/ })).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'অর্ডার তালিকা' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: 'সব অর্ডার' }));
    expect(await screen.findByRole('list', { name: 'অর্ডার তালিকা' })).toBeTruthy();
    expect(router.state.location.search).toBe('?status=ready');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/orders/orderList.test.ts src/features/orders/OrdersPage.test.tsx`

Expected: FAIL with `Error: Cannot find module './orderList'`.

- [ ] **Step 3: Write `orderList.ts` to the rules above**

- [ ] **Step 4: Build the page**

Write `OrdersPage`, `OrderFilters`, `OrderTable`, `OrderCards` and the `OrderDetail` header to the done-conditions. One route serves both `/app/orders` and `/app/orders/:orderId`, so `OrdersPage` (and the table's scroll box) stays mounted when an order opens or closes. Format counts with the app language's digits (`useI18n().number`).

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 186 tests (171 + 9 + 6); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/orders apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add the orders list with filters, paging and a detail panel"
```

### Task 13: Order detail: garments

Each garment of an order on its own card: its stage, who is making it, its dates, notes, photos, frozen measurements, fitting changes and history, and the actions the signed-in person may take. Handing over one garment never closes the whole order.

**Files:**
- Create: `apps/web/src/features/orders/stageMoves.ts`
- Test: `apps/web/src/features/orders/stageMoves.test.ts`
- Create: `apps/web/src/features/orders/ItemCard.tsx`, `itemDialogs.tsx`
- Modify: `apps/web/src/features/orders/OrderDetail.tsx`
- Test: `apps/web/src/features/orders/OrderDetail.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `itemTitle`, `useCan`, `useMeasurementAccess`, `problemText` (Task 3); `MeasurementTable` (Task 6); `usePhoto` (Task 9).
- Produces: `StageMove`, `stageMoves(item)`, `nextMove(item)`.

**Done when:**
- Header actions (added beside Task 12's header): `রসিদ প্রিন্ট` (`money.view`) to `/print/receipt/<id>`, `কাজের স্লিপ` to `/print/job/<id>`, `কাপড়ের ট্যাগ` to `/print/tags/<id>`, and `আবার অর্ডার` (`orders.create`) to `/app/orders/new?repeat=<id>`.
- One region per garment named by `itemTitle`. It shows the stage label (`ধাপ: {stage}`), wearer, assigned worker's name (`কারিগর: {name}`, or `কারিগর ঠিক হয়নি`), trial and delivery dates, design and fabric notes, photo thumbnails, the frozen measurements (`MeasurementTable` of the snapshot, or `মাপ দেখার অনুমতি নেই`), fitting changes, and the stage history (rework entries show `আবার কাজ: {reason}`). Fitting changes and history are lists; the measurement table is the card's only table. A cancelled garment shows `বাতিল: {reason}` and no actions.
- With `work.updateStage`, for a garment that can move: the next move as one button, `{stage} এ নিন` for an ordinary stage or `হস্তান্তর করুন` when the next stage is the delivered one; and `অন্য ধাপ…`, a dialog `ধাপ বদলান` with a `নতুন ধাপ` select of every allowed move. A backward move needs `আবার কাজের কারণ` (error `কারণ লিখুন`).
- Handing over asks first: dialog `হস্তান্তর নিশ্চিত করুন` naming the garment (and, with `money.view`, `এই অর্ডারে এখনো বাকি {amount}` when the balance is above zero), confirmed with `নিশ্চিত করুন`.
- With `orders.edit`: `ফিটিংয়ের পরিবর্তন লিখুন` (dialog with `কী বদলাতে হবে`, required), and `আইটেম বদলান` (dialog with `দাম` (only with `money.view`), `ট্রায়ালের তারিখ (ঐচ্ছিক)`, `ডেলিভারির তারিখ`, `ডিজাইনের নোট`, `কাপড়ের নোট`), which sends `item.updated` with only the changed fields and the item's version from when the dialog opened.
- With `orders.cancel`: `আইটেম বাতিল`, a dialog with `বাতিলের কারণ` (required). Delivered garments cannot be cancelled.
- Every dialog saves with `সেভ করুন` (hand-over: `নিশ্চিত করুন`), shows `problemText` on failure, and stays open with the typed values.

**Messages:**

```ts
// bn.ts
'order.printReceipt': 'রসিদ প্রিন্ট',
'order.jobSlip': 'কাজের স্লিপ',
'order.tags': 'কাপড়ের ট্যাগ',
'order.orderAgain': 'আবার অর্ডার',
'item.stage': 'ধাপ: {stage}',
'item.worker': 'কারিগর: {name}',
'item.noWorker': 'কারিগর ঠিক হয়নি',
'item.trial': 'ট্রায়াল: {date}',
'item.delivery': 'ডেলিভারি: {date}',
'item.cancelled': 'বাতিল: {reason}',
'item.history': 'ধাপের ইতিহাস',
'item.rework': 'আবার কাজ: {reason}',
'item.adjustments': 'ফিটিংয়ের পরিবর্তন',
'item.moveTo': '{stage} এ নিন',
'item.handOver': 'হস্তান্তর করুন',
'item.handOverTitle': 'হস্তান্তর নিশ্চিত করুন',
'item.handOverBody': '{item} কাস্টমারকে দেওয়া হচ্ছে।',
'item.balanceDue': 'এই অর্ডারে এখনো বাকি {amount}',
'item.otherStage': 'অন্য ধাপ…',
'item.changeStage': 'ধাপ বদলান',
'item.newStage': 'নতুন ধাপ',
'item.reworkReason': 'আবার কাজের কারণ',
'item.reasonRequired': 'কারণ লিখুন',
'item.addAdjustment': 'ফিটিংয়ের পরিবর্তন লিখুন',
'item.adjustmentNote': 'কী বদলাতে হবে',
'item.edit': 'আইটেম বদলান',
'item.price': 'দাম',
'item.cancel': 'আইটেম বাতিল',
'item.cancelReason': 'বাতিলের কারণ',
// en.ts
'order.printReceipt': 'Print receipt',
'order.jobSlip': 'Job slip',
'order.tags': 'Fabric tags',
'order.orderAgain': 'Order again',
'item.stage': 'Stage: {stage}',
'item.worker': 'Worker: {name}',
'item.noWorker': 'No worker assigned',
'item.trial': 'Trial: {date}',
'item.delivery': 'Delivery: {date}',
'item.cancelled': 'Cancelled: {reason}',
'item.history': 'Stage history',
'item.rework': 'Rework: {reason}',
'item.adjustments': 'Fitting changes',
'item.moveTo': 'Move to {stage}',
'item.handOver': 'Hand over',
'item.handOverTitle': 'Confirm hand-over',
'item.handOverBody': '{item} is being handed to the customer.',
'item.balanceDue': 'This order still has {amount} due',
'item.otherStage': 'Other stage…',
'item.changeStage': 'Change stage',
'item.newStage': 'New stage',
'item.reworkReason': 'Reason for rework',
'item.reasonRequired': 'Enter a reason',
'item.addAdjustment': 'Note a fitting change',
'item.adjustmentNote': 'What needs changing',
'item.edit': 'Edit item',
'item.price': 'Price',
'item.cancel': 'Cancel item',
'item.cancelReason': 'Reason for cancelling',
```

The dates dialog reuses `entry.trialDate`, `entry.deliveryDate`, `entry.designNotes` and `entry.fabricNote`; the measurement-hidden text reuses `print.measurementsHidden`.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/orders/stageMoves.test.ts`:

```ts
import { makeItem } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { nextMove, stageMoves } from './stageMoves';

const keys = (moves: ReturnType<typeof stageMoves>) => moves.map((m) => `${m.kind}:${m.stage.key}`);

describe('stageMoves', () => {
  it('offers the next stages, skipping optional trial, and earlier stages as rework', () => {
    expect(keys(stageMoves(makeItem({ stageKey: 'stitching' })))).toEqual([
      'rework:booked',
      'rework:cutting',
      'forward:trial',
      'forward:ready',
    ]);
    expect(stageMoves(makeItem({ stageKey: 'stitching' })).find((m) => m.stage.key === 'ready')?.skipped).toEqual(['trial']);
  });

  it('lets a ready garment be handed over', () => {
    expect(keys(stageMoves(makeItem({ stageKey: 'ready' })))).toContain('forward:delivered');
    expect(nextMove(makeItem({ stageKey: 'ready' }))?.stage.key).toBe('delivered');
  });

  it('offers nothing for delivered or cancelled garments', () => {
    expect(stageMoves(makeItem({ stageKey: 'delivered' }))).toEqual([]);
    expect(stageMoves(makeItem({ cancelled: { reason: 'x', at: '', by: '' } }))).toEqual([]);
    expect(nextMove(makeItem({ stageKey: 'delivered' }))).toBeNull();
  });

  it('suggests the immediate next stage, even when it is optional', () => {
    expect(nextMove(makeItem({ stageKey: 'booked' }))?.stage.key).toBe('cutting');
    expect(nextMove(makeItem({ stageKey: 'stitching' }))?.stage.key).toBe('trial');
  });
});
```

`apps/web/src/features/orders/OrderDetail.test.tsx`:

```tsx
import {
  formatMeasurement,
  isOrderClosed,
  itemSummaryGroup,
  moneySummary,
  toBanglaDigits,
  type Order,
  type OrderItem,
} from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

const title = (order: Order, item: OrderItem) => `${item.garmentName.bn} ${toBanglaDigits(String(order.items.indexOf(item) + 1))}`;

function find(store: ShopStore, keep: (order: Order) => boolean): Order {
  const order = Object.values(store.getSnapshot().state.orders).find(keep);
  if (!order) throw new Error('No sample order fits this test');
  return order;
}

async function openOrder(shop: 'rahman' | 'nakshi' | 'uniform', keep: (order: Order) => boolean, as?: { staffId: string; pin: string }) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = find(app.store, keep);
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  return { ...app, order };
}

const latest = (store: ShopStore, id: string) => store.getSnapshot().state.orders[id]!;

describe('Order detail', () => {
  it('hands over one garment and keeps the order open', async () => {
    const { store, order } = await openOrder('rahman', (o) => {
      const groups = o.items.map(itemSummaryGroup);
      return groups.includes('ready') && groups.filter((g) => g === 'ready' || g === 'unfinished').length >= 2;
    });
    const item = order.items.find((i) => itemSummaryGroup(i) === 'ready')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'হস্তান্তর করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'হস্তান্তর নিশ্চিত করুন' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));

    expect(await within(card).findByText('ধাপ: ডেলিভারি হয়েছে')).toBeTruthy();
    const after = latest(store, order.id);
    expect(after.items.find((i) => i.id === item.id)!.stageKey).toBe('delivered');
    expect(isOrderClosed(after)).toBe(false);
    expect(within(screen.getByRole('region', { name: 'অর্ডারের বিস্তারিত' })).getByText('চলমান')).toBeTruthy();
  });

  it('moves a garment on, then back for rework with a reason', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => !i.cancelled && i.stageKey === 'cutting'));
    const item = order.items.find((i) => !i.cancelled && i.stageKey === 'cutting')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'সেলাই এ নিন' }));
    expect(await within(card).findByText('ধাপ: সেলাই')).toBeTruthy();

    await userEvent.click(within(card).getByRole('button', { name: 'অন্য ধাপ…' }));
    const dialog = await screen.findByRole('dialog', { name: 'ধাপ বদলান' });
    await userEvent.selectOptions(within(dialog).getByLabelText('নতুন ধাপ'), 'কাটিং');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    await userEvent.type(within(dialog).getByLabelText('আবার কাজের কারণ'), 'কাঁধ ভুল কাটা হয়েছে');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('আবার কাজ: কাঁধ ভুল কাটা হয়েছে')).toBeTruthy();
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.stageKey).toBe('cutting');
  });

  it('cancels a garment with a reason and drops it from the total', async () => {
    const { store, order } = await openOrder(
      'rahman',
      (o) => o.items.filter((i) => itemSummaryGroup(i) === 'unfinished').length >= 2,
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const before = moneySummary(order).total;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'আইটেম বাতিল' }));
    const dialog = await screen.findByRole('dialog', { name: 'আইটেম বাতিল' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    await userEvent.type(within(dialog).getByLabelText('বাতিলের কারণ'), 'কাস্টমার চান না');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('বাতিল: কাস্টমার চান না')).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'আইটেম বাতিল' })).toBeNull();
    expect(moneySummary(latest(store, order.id)).total).toBe(Math.max(0, before - item.price));
  });

  it('records a fitting change without touching the frozen measurements', async () => {
    const { store, order } = await openOrder('rahman', (o) =>
      o.items.some((i) => itemSummaryGroup(i) === 'unfinished' && i.measurements),
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished' && i.measurements)!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'ফিটিংয়ের পরিবর্তন লিখুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'ফিটিংয়ের পরিবর্তন লিখুন' });
    await userEvent.type(within(dialog).getByLabelText('কী বদলাতে হবে'), 'হাতা ½ ইঞ্চি ছোট');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(await within(card).findByText('হাতা ½ ইঞ্চি ছোট')).toBeTruthy();
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.measurements).toEqual(item.measurements);
  });

  it('shows frozen measurements only to people allowed to see them', async () => {
    const keep = (o: Order) => o.items.some((i) => !i.cancelled && i.measurements);
    const counter = await openOrder('nakshi', keep, { staffId: 'nakshi-counter', pin: '2222' });
    const item = counter.order.items.find((i) => !i.cancelled && i.measurements)!;
    const card = screen.getByRole('region', { name: title(counter.order, item) });
    expect(within(card).getByText('মাপ দেখার অনুমতি নেই')).toBeTruthy();
    expect(within(card).queryByRole('table')).toBeNull();
  });

  it('shows them to cutting staff', async () => {
    const keep = (o: Order) => o.items.some((i) => !i.cancelled && i.measurements);
    const cutting = await openOrder('nakshi', keep, { staffId: 'nakshi-cutting', pin: '3333' });
    const item = cutting.order.items.find((i) => !i.cancelled && i.measurements)!;
    const card = screen.getByRole('region', { name: title(cutting.order, item) });
    const value = Object.values(item.measurements!.values)[0]!;
    expect(within(card).getAllByText(`${formatMeasurement(value.value, 'bn')} ইঞ্চি`).length).toBeGreaterThan(0);
  });

  it('offers only the actions a production supervisor may take', async () => {
    const { order } = await openOrder(
      'uniform',
      (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished'),
      { staffId: 'uniform-supervisor', pin: '3333' },
    );
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const card = screen.getByRole('region', { name: title(order, item) });
    expect(within(card).getByRole('button', { name: 'অন্য ধাপ…' })).toBeTruthy();
    expect(within(card).queryByRole('button', { name: 'আইটেম বাতিল' })).toBeNull();
    expect(within(card).queryByRole('button', { name: 'আইটেম বদলান' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'রসিদ প্রিন্ট' })).toBeNull();
    expect(screen.getByRole('link', { name: 'কাজের স্লিপ' })).toBeTruthy();
  });

  it('does not overwrite an item changed elsewhere while its dialog was open', async () => {
    const { store, order } = await openOrder('rahman', (o) => o.items.some((i) => itemSummaryGroup(i) === 'unfinished'));
    const item = order.items.find((i) => itemSummaryGroup(i) === 'unfinished')!;
    const card = screen.getByRole('region', { name: title(order, item) });

    await userEvent.click(within(card).getByRole('button', { name: 'আইটেম বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'আইটেম বদলান' });
    await act(() =>
      store.dispatch({ type: 'item.updated', orderId: order.id, itemId: item.id, baseVersion: item.version, changes: { fabricNote: 'অন্য ডিভাইস' } }),
    );
    await userEvent.type(within(dialog).getByLabelText('ডিজাইনের নোট'), ' বোতাম কালো');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।',
    );
    expect(latest(store, order.id).items.find((i) => i.id === item.id)!.fabricNote).toBe('অন্য ডিভাইস');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/orders/stageMoves.test.ts src/features/orders/OrderDetail.test.tsx`

Expected: FAIL with `Error: Cannot find module './stageMoves'`.

- [ ] **Step 3: Write the stage moves**

`apps/web/src/features/orders/stageMoves.ts`:

```ts
import { checkTransition, type OrderItem, type Stage } from '@darzikhata/domain';

export interface StageMove {
  stage: Stage;
  kind: 'forward' | 'rework';
  /** Optional stages passed over by a forward move, e.g. ['trial']. */
  skipped: string[];
}

/**
 * Stages this garment may move to now, in stage order. Forward moves may skip optional
 * stages only; earlier stages are rework and need a reason. Cancelled or delivered garments
 * cannot move.
 */
export function stageMoves(item: OrderItem): StageMove[] {
  if (item.cancelled) return [];
  const moves: StageMove[] = [];
  for (const stage of item.stages) {
    const check = checkTransition(item.stages, item.stageKey, stage.key);
    if (check.ok) moves.push({ stage, kind: check.kind, skipped: check.skipped });
  }
  return moves;
}

/** The first forward stage, offered as the one-tap "move on" action. */
export function nextMove(item: OrderItem): StageMove | null {
  return stageMoves(item).find((m) => m.kind === 'forward') ?? null;
}
```

- [ ] **Step 4: Build the garment cards and dialogs**

Write `ItemCard` and `itemDialogs` to the done-conditions and render one card per item in `OrderDetail`. A forward move dispatches `item.stageChanged` with an empty reason; a rework move sends the typed reason.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 198 tests (186 + 4 + 8); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/orders apps/web/src/i18n
git commit -m "feat(web): add garment cards with stage moves, hand-over, cancellation and fitting changes"
```

### Task 14: Payments

Money on the order page (payments, refunds, corrections, discount and price adjustments) and a Payments page listing who still owes and whom the shop owes. Every financial change needs an explicit click; nothing is ever edited or deleted, and corrections and refunds are new records with reasons.

**Files:**
- Create: `apps/web/src/features/payments/OrderMoney.tsx`, `paymentDialogs.tsx`, `PaymentsPage.tsx`
- Modify: `apps/web/src/features/orders/OrderDetail.tsx` (add `OrderMoney` with `money.view`)
- Modify: `apps/web/src/app/AppRoutes.tsx` (`payments`)
- Test: `apps/web/src/features/payments/payments.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Consumes: `receiptModel` and `MoneyTable` (Task 8); domain `correctedAmount`, `netPaid`, `outstandingBalances`, `moneySummary`; `useCan`, `problemText` (Task 3).

**Done when:**
- Region `টাকার হিসাব` on the order page (`money.view` only) holds the `হিসাব` totals table (Task 8's `MoneyTable`) and a `পেমেন্ট` table (date, kind, method, reference, amount as its effect, reason). With credit due it also says `ফেরত দিন, অথবা কাস্টমারের ক্রেডিট হিসেবে রেখে দিন। নিজে থেকে কিছু হবে না।`
- Buttons by permission: `টাকা নিন` (`payments.record`), `টাকা ফেরত দিন` (`payments.refund`, shown when anything has been paid), `ভুল ঠিক করুন` on each advance, payment or refund row (`payments.correct`), `ছাড় বদলান` and `দাম সমন্বয়` (`orders.edit`).
- `টাকা জমা` dialog: `টাকার অঙ্ক` (prefilled with the balance), `কীভাবে দিলেন`, `রেফারেন্স / TrxID (ঐচ্ছিক)`; `জমা করুন` records a `payment` (an `advance` if the order has no payments yet).
- `টাকা ফেরত` dialog: `টাকার অঙ্ক` (prefilled with the credit due, if any), method, `ফেরতের কারণ` (required); `ফেরত দিন`. More than the net paid shows `যত টাকা জমা আছে তার বেশি ফেরত দেওয়া যাবে না` and saves nothing.
- `ভুল ঠিক করুন` dialog (saved with `সেভ করুন`): says `এখন লেখা আছে {amount}` (the corrected amount so far), asks `সঠিক অঙ্ক` and `সংশোধনের কারণ` (required), and records a `correction` whose amount is the difference; the same amount shows `অঙ্ক একই আছে`. The original row stays in the history.
- `ছাড় বদলান` dialog: `ছাড়` and `ছাড়ের কারণ (ঐচ্ছিক)`, sent as `order.discountSet` with the order version from when it opened (0 clears the discount).
- `দাম সমন্বয়` dialog (saved with `সেভ করুন`): `ধরন` (`দাম বাড়ান`, `দাম কমান`), `টাকার অঙ্ক`, `কারণ` (required); sent as `order.priceAdjusted` with a signed amount.
- Every money dialog: an empty amount shows `টাকার অঙ্ক লিখুন`; Enter in a field does nothing; saving is only the button; failures show `problemText` and keep the dialog open.
- `/app/payments` (heading `পেমেন্ট`): search `অর্ডার নম্বর, নাম বা ফোন`; table `বাকি টাকা` (columns `অর্ডার`, `কাস্টমার`, `মোট`, `জমা`, `বাকি`) from `outstandingBalances`, largest first, each order number a link to `/app/orders/<id>`, with a footer row `মোট বাকি` and the sum; a second table `ফেরত পাওনা` lists orders with credit due, when there are any. The page records nothing itself.

**Messages:**

```ts
// bn.ts
'payments.section': 'টাকার হিসাব',
'payments.creditNote': 'ফেরত দিন, অথবা কাস্টমারের ক্রেডিট হিসেবে রেখে দিন। নিজে থেকে কিছু হবে না।',
'payments.take': 'টাকা নিন',
'payments.refund': 'টাকা ফেরত দিন',
'payments.correct': 'ভুল ঠিক করুন',
'payments.discount': 'ছাড় বদলান',
'payments.adjust': 'দাম সমন্বয়',
'payments.takeTitle': 'টাকা জমা',
'payments.refundTitle': 'টাকা ফেরত',
'payments.amount': 'টাকার অঙ্ক',
'payments.record': 'জমা করুন',
'payments.refundReason': 'ফেরতের কারণ',
'payments.doRefund': 'ফেরত দিন',
'payments.nowRecorded': 'এখন লেখা আছে {amount}',
'payments.correctAmount': 'সঠিক অঙ্ক',
'payments.correctReason': 'সংশোধনের কারণ',
'payments.adjustKind': 'ধরন',
'payments.adjustUp': 'দাম বাড়ান',
'payments.adjustDown': 'দাম কমান',
'payments.reason': 'কারণ',
'payments.error.amount': 'টাকার অঙ্ক লিখুন',
'payments.error.refundTooMuch': 'যত টাকা জমা আছে তার বেশি ফেরত দেওয়া যাবে না',
'payments.error.noChange': 'অঙ্ক একই আছে',
'payments.title': 'পেমেন্ট',
'payments.due': 'বাকি টাকা',
'payments.dueTotal': 'মোট বাকি',
'payments.credit': 'ফেরত পাওনা',
// en.ts
'payments.section': 'Money',
'payments.creditNote': 'Refund it, or keep it as the customer’s credit. Nothing happens automatically.',
'payments.take': 'Take payment',
'payments.refund': 'Refund',
'payments.correct': 'Correct a mistake',
'payments.discount': 'Change discount',
'payments.adjust': 'Adjust price',
'payments.takeTitle': 'Payment',
'payments.refundTitle': 'Refund',
'payments.amount': 'Amount',
'payments.record': 'Record payment',
'payments.refundReason': 'Reason for refund',
'payments.doRefund': 'Record refund',
'payments.nowRecorded': 'Currently recorded as {amount}',
'payments.correctAmount': 'Correct amount',
'payments.correctReason': 'Reason for correction',
'payments.adjustKind': 'Kind',
'payments.adjustUp': 'Increase price',
'payments.adjustDown': 'Reduce price',
'payments.reason': 'Reason',
'payments.error.amount': 'Enter an amount',
'payments.error.refundTooMuch': 'You cannot refund more than has been paid',
'payments.error.noChange': 'The amount is the same',
'payments.title': 'Payments',
'payments.due': 'Money due',
'payments.dueTotal': 'Total due',
'payments.credit': 'Credit due',
```

Required reasons reuse `item.reasonRequired` (`কারণ লিখুন`).

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/payments/payments.test.tsx`:

```tsx
import { balanceDue, formatTaka, moneySummary, netPaid, outstandingBalances, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

function find(store: ShopStore, keep: (order: Order) => boolean): Order {
  const order = Object.values(store.getSnapshot().state.orders)
    .sort((a, b) => a.number.localeCompare(b.number))
    .find(keep);
  if (!order) throw new Error('No sample order fits this test');
  return order;
}

async function openOrder(keep: (order: Order) => boolean, as?: { staffId: string; pin: string }, shop: 'rahman' | 'nakshi' = 'rahman') {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = find(app.store, keep);
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  const money = await screen.findByRole('region', { name: 'টাকার হিসাব' });
  return { ...app, order, money };
}

const latest = (store: ShopStore, id: string) => store.getSnapshot().state.orders[id]!;
const totalsRow = (scope: HTMLElement, label: RegExp) =>
  within(within(scope).getByRole('table', { name: 'হিসাব' })).getByRole('row', { name: label });

describe('Payments on an order', () => {
  it('records a payment only when the button is pressed, never on Enter', async () => {
    const { store, order, money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 20000);
    const balance = balanceDue(order);

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা নিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা জমা' });
    const amount = within(dialog).getByLabelText('টাকার অঙ্ক');
    expect(amount).toHaveProperty('value', formatTaka(balance, 'bn').replace('৳', '').replace(/,/g, ''));
    await userEvent.clear(amount);
    await userEvent.type(amount, '১০০{Enter}');
    expect(screen.getByRole('dialog', { name: 'টাকা জমা' })).toBeTruthy();
    expect(latest(store, order.id).payments).toHaveLength(order.payments.length);

    await userEvent.click(within(dialog).getByRole('radio', { name: 'বিকাশ' }));
    await userEvent.type(within(dialog).getByLabelText('রেফারেন্স / TrxID (ঐচ্ছিক)'), 'TX99');
    await userEvent.click(within(dialog).getByRole('button', { name: 'জমা করুন' }));

    expect(screen.queryByRole('dialog', { name: 'টাকা জমা' })).toBeNull();
    const after = latest(store, order.id);
    expect(after.payments.at(-1)).toMatchObject({ amount: 10000, method: 'bkash', reference: 'TX99', kind: 'payment' });
    expect(within(totalsRow(money, /^বাকি/)).getByText(formatTaka(balance - 10000, 'bn'))).toBeTruthy();
  });

  it('needs a reason for a refund and never refunds more than was paid', async () => {
    const { store, order, money } = await openOrder((o) => netPaid(o.payments) > 10000);
    const paid = netPaid(order.payments);

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা ফেরত দিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা ফেরত' });
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), String(paid / 100 + 1));
    await userEvent.click(within(dialog).getByRole('button', { name: 'ফেরত দিন' }));
    expect(within(dialog).getByText('কারণ লিখুন')).toBeTruthy();
    expect(within(dialog).getByText('যত টাকা জমা আছে তার বেশি ফেরত দেওয়া যাবে না')).toBeTruthy();

    await userEvent.clear(within(dialog).getByLabelText('টাকার অঙ্ক'));
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), '100');
    await userEvent.type(within(dialog).getByLabelText('ফেরতের কারণ'), 'কাপড় কম লেগেছে');
    await userEvent.click(within(dialog).getByRole('button', { name: 'ফেরত দিন' }));

    expect(screen.queryByRole('dialog', { name: 'টাকা ফেরত' })).toBeNull();
    expect(netPaid(latest(store, order.id).payments)).toBe(paid - 10000);
    expect(within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getByText('কাপড় কম লেগেছে')).toBeTruthy();
  });

  it('corrects a mistyped payment with a new record, keeping the original', async () => {
    const { store, order, money } = await openOrder(
      (o) => o.payments.some((p) => p.kind === 'advance' && p.amount > 20000) && !o.payments.some((p) => p.kind === 'correction'),
    );
    const advance = order.payments.find((p) => p.kind === 'advance')!;
    const rowsBefore = within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row').length;

    await userEvent.click(within(money).getAllByRole('button', { name: 'ভুল ঠিক করুন' })[order.payments.indexOf(advance)]!);
    const dialog = await screen.findByRole('dialog', { name: 'ভুল ঠিক করুন' });
    await userEvent.type(within(dialog).getByLabelText('সঠিক অঙ্ক'), String((advance.amount - 10000) / 100));
    await userEvent.type(within(dialog).getByLabelText('সংশোধনের কারণ'), 'ভুল অঙ্ক লেখা হয়েছিল');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const after = latest(store, order.id);
    expect(after.payments.at(-1)).toMatchObject({ kind: 'correction', corrects: advance.id, amount: -10000 });
    expect(after.payments.find((p) => p.id === advance.id)).toEqual(advance);
    expect(within(within(money).getByRole('table', { name: 'পেমেন্ট' })).getAllByRole('row')).toHaveLength(rowsBefore + 1);
  });

  it('offers to refund credit due after a cancellation, and does nothing on its own', async () => {
    const app = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/orders' });
    const order = find(app.store, (o) => o.items.filter((i) => !i.cancelled && i.stageKey !== 'delivered').length >= 2);
    const item = order.items.find((i) => !i.cancelled && i.stageKey !== 'delivered')!;
    await act(async () => {
      const due = balanceDue(order);
      if (due > 0) {
        await app.store.dispatch({
          type: 'payment.recorded',
          orderId: order.id,
          payment: { id: 'pay-all', amount: due, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
        });
      }
      await app.store.dispatch({ type: 'item.cancelled', orderId: order.id, itemId: item.id, reason: 'বাদ' });
    });
    const credit = moneySummary(latest(app.store, order.id)).creditDue;
    expect(credit).toBe(item.price);

    await act(() => app.router.navigate(`/app/orders/${order.id}`));
    const money = await screen.findByRole('region', { name: 'টাকার হিসাব' });
    expect(within(totalsRow(money, /^ফেরত পাওনা/)).getByText(formatTaka(credit, 'bn'))).toBeTruthy();
    expect(within(money).getByText('ফেরত দিন, অথবা কাস্টমারের ক্রেডিট হিসেবে রেখে দিন। নিজে থেকে কিছু হবে না।')).toBeTruthy();

    await userEvent.click(within(money).getByRole('button', { name: 'টাকা ফেরত দিন' }));
    const dialog = await screen.findByRole('dialog', { name: 'টাকা ফেরত' });
    await userEvent.type(within(dialog).getByLabelText('ফেরতের কারণ'), 'বাতিল আইটেমের টাকা');
    await userEvent.click(within(dialog).getByRole('button', { name: 'ফেরত দিন' }));
    expect(moneySummary(latest(app.store, order.id)).creditDue).toBe(0);
  });

  it('adds a price adjustment with a reason', async () => {
    const { store, order, money } = await openOrder((o) => o.items.some((i) => !i.cancelled));
    const before = moneySummary(order).total;
    await userEvent.click(within(money).getByRole('button', { name: 'দাম সমন্বয়' }));
    const dialog = await screen.findByRole('dialog', { name: 'দাম সমন্বয়' });
    await userEvent.click(within(dialog).getByRole('radio', { name: 'দাম বাড়ান' }));
    await userEvent.type(within(dialog).getByLabelText('টাকার অঙ্ক'), '50');
    await userEvent.type(within(dialog).getByLabelText('কারণ'), 'বাড়তি লাইনিং');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    expect(moneySummary(latest(store, order.id)).total).toBe(before + 5000);
    expect(within(totalsRow(money, /^সমন্বয়/)).getByText(formatTaka(5000, 'bn'))).toBeTruthy();
  });

  it('lets counter staff take payments but not refund or correct them', async () => {
    const { money } = await openOrder((o) => o.payments.length > 0 && balanceDue(o) > 0, { staffId: 'nakshi-counter', pin: '2222' }, 'nakshi');
    expect(within(money).getByRole('button', { name: 'টাকা নিন' })).toBeTruthy();
    expect(within(money).queryByRole('button', { name: 'টাকা ফেরত দিন' })).toBeNull();
    expect(within(money).queryByRole('button', { name: 'ভুল ঠিক করুন' })).toBeNull();
  });
});

describe('Payments page', () => {
  it('lists money due, largest first, with the total', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const due = outstandingBalances(Object.values(store.getSnapshot().state.orders));
    const table = await screen.findByRole('table', { name: 'বাকি টাকা' });
    const rows = within(table).getAllByRole('row');
    expect(rows).toHaveLength(due.length + 2);
    expect(within(rows[1]!).getByRole('link', { name: due[0]!.order.number }).getAttribute('href')).toBe(`/app/orders/${due[0]!.order.id}`);
    const sum = due.reduce((s, r) => s + r.balance, 0);
    expect(within(within(table).getByRole('row', { name: /^মোট বাকি/ })).getByText(formatTaka(sum, 'bn'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'টাকা নিন' })).toBeNull();
  });

  it('narrows the list by search', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/payments' });
    const first = outstandingBalances(Object.values(store.getSnapshot().state.orders))[0]!.order;
    await userEvent.type(await screen.findByLabelText('অর্ডার নম্বর, নাম বা ফোন'), first.number);
    const rows = within(screen.getByRole('table', { name: 'বাকি টাকা' })).getAllByRole('row');
    expect(rows).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/features/payments`

Expected: FAIL. The order page has no money region yet.

- [ ] **Step 3: Build the money region, dialogs and page**

Write `OrderMoney`, `paymentDialogs` and `PaymentsPage` to the done-conditions. Payment ids come from `store.createId()`. The `পেমেন্ট` table renders `receiptModel(...).payments` in order, and the `ভুল ঠিক করুন` buttons sit on the rows of correctable payments (advance, payment, refund) in that same order. Validate in the dialog before dispatching (amount present, reason present, refund within `netPaid`, correction not zero), so the domain's rejection is only a backstop.

- [ ] **Step 4: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 206 tests (198 + 8); type check exits 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/payments apps/web/src/features/orders/OrderDetail.tsx apps/web/src/app/AppRoutes.tsx apps/web/src/i18n
git commit -m "feat(web): add payments, refunds, corrections and the payments page"
```

### Task 15: Global search and keyboard shortcuts

One search box in the desktop top bar for orders and customers, and the two documented shortcuts: `/` to search and `N` for a new order. Neither shortcut fires while typing or overrides a browser or OS shortcut.

**Files:**
- Create: `apps/web/src/features/search/globalSearch.ts`
- Test: `apps/web/src/features/search/globalSearch.test.ts`
- Create: `apps/web/src/shell/shortcuts.ts`
- Test: `apps/web/src/shell/shortcuts.test.ts`
- Create: `apps/web/src/shell/useShortcuts.ts`, `apps/web/src/shell/GlobalSearch.tsx`
- Modify: `apps/web/src/shell/DesktopShell.tsx`
- Test: `apps/web/src/shell/GlobalSearch.test.tsx`
- Modify: `apps/web/src/i18n/bn.ts`, `en.ts`

**Interfaces:**
- Produces: `SearchHit`, `globalSearch(state, query, limit?)`, `Shortcut`, `ShortcutEvent`, `shortcutFor(event)`, `useShortcuts({ onSearch, onNewOrder })`.

**Ranking:** an order number match is the most precise hit, so orders come first (newest number first), then customers in the domain's order: phone match, then name text, then a sound-alike name across scripts, ties alphabetical. People without `orders.view` get no order hits; people without `customers.view` get no customer hits; with neither, there is no search box.

**Done when:**
- The top bar has a combobox `অর্ডার বা কাস্টমার খুঁজুন` (placeholder `খুঁজুন (/)`). Typing shows a listbox of at most 8 options: orders as `{number} · {customer}`, customers as `{name} · {phone}`; with no hits, `কিছু পাওয়া যায়নি`.
- Arrow keys move the active option (`aria-activedescendant`); Enter opens the active option; clicking opens it; Escape closes the list. Orders open `/app/orders/<id>`, customers `/app/customers/<id>`. Opening clears the box.
- `useShortcuts` listens on `document` for `keydown` and acts on `shortcutFor`: `search` focuses the box (preventing the `/` from being typed); `newOrder` navigates to `/app/orders/new`, only with `orders.create`. It is used by the desktop shell only.

**Messages:**

```ts
// bn.ts
'search.label': 'অর্ডার বা কাস্টমার খুঁজুন',
'search.placeholder': 'খুঁজুন (/)',
'search.none': 'কিছু পাওয়া যায়নি',
// en.ts
'search.label': 'Search orders or customers',
'search.placeholder': 'Search (/)',
'search.none': 'Nothing found',
```

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/search/globalSearch.test.ts`:

```ts
import { replay, type ShopState } from '@darzikhata/domain';
import { eventFactory, newCustomer, newOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { globalSearch } from './globalSearch';

function state(): ShopState {
  const e = eventFactory();
  return replay([
    e({ type: 'customer.created', customer: newCustomer({ id: 'rahim', name: 'রহিম উদ্দিন', nameAlt: 'Rahim Uddin', phone: '01712345678' }) }),
    e({ type: 'customer.created', customer: newCustomer({ id: 'karim', name: 'করিম', nameAlt: null, phone: '01811142000' }) }),
    e({ type: 'customer.created', customer: newCustomer({ id: 'rahima', name: 'Rahima Khatun', nameAlt: null, phone: null }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o1', number: 'A-0142', customerId: 'karim' }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o2', number: 'B-0142', customerId: 'rahim' }) }),
    e({ type: 'order.created', order: newOrder({ id: 'o3', number: 'A-0007', customerId: 'rahim' }) }),
  ]).state;
}

const ids = (hits: ReturnType<typeof globalSearch>) =>
  hits.map((h) => (h.kind === 'order' ? `order:${h.order.number}` : `customer:${h.customer.id}`));

describe('globalSearch', () => {
  it('returns nothing for an empty query', () => {
    expect(globalSearch(state(), '  ')).toEqual([]);
  });

  it('puts exact order numbers first, newest series first, then phone matches', () => {
    expect(ids(globalSearch(state(), '১৪২'))).toEqual(['order:B-0142', 'order:A-0142', 'customer:karim']);
  });

  it('matches a full order number in any case and carries its customer', () => {
    const hits = globalSearch(state(), 'a-142');
    expect(ids(hits)).toEqual(['order:A-0142']);
    expect(hits[0]).toMatchObject({ kind: 'order', customer: { id: 'karim' } });
  });

  it('ranks name text above sound-alike names across scripts', () => {
    // "রহিম" is in Rahim's Bangla name; "Rahima Khatun" only sounds alike.
    expect(ids(globalSearch(state(), 'রহিম'))).toEqual(['customer:rahim', 'customer:rahima']);
    // Equal matches fall back to alphabetical order by name.
    expect(ids(globalSearch(state(), 'rahim'))).toEqual(['customer:rahima', 'customer:rahim']);
  });

  it('finds customers by phone in Bangla digits', () => {
    expect(ids(globalSearch(state(), '০১৭১২'))).toEqual(['customer:rahim']);
  });

  it('stops at the limit', () => {
    expect(globalSearch(state(), '১৪২', 2)).toHaveLength(2);
  });
});
```

`apps/web/src/shell/shortcuts.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import { shortcutFor, type ShortcutEvent } from './shortcuts';

const press = (key: string, overrides: Partial<ShortcutEvent> = {}): ShortcutEvent => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  defaultPrevented: false,
  target: document.body,
  ...overrides,
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shortcutFor', () => {
  it('maps "/" to search and N to a new order', () => {
    expect(shortcutFor(press('/'))).toBe('search');
    expect(shortcutFor(press('n'))).toBe('newOrder');
    expect(shortcutFor(press('N'))).toBe('newOrder');
    expect(shortcutFor(press('x'))).toBeNull();
  });

  it('stays out of the way of browser and OS shortcuts', () => {
    expect(shortcutFor(press('n', { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(press('n', { metaKey: true }))).toBeNull();
    expect(shortcutFor(press('/', { altKey: true }))).toBeNull();
    expect(shortcutFor(press('/', { defaultPrevented: true }))).toBeNull();
  });

  it('never fires while typing', () => {
    document.body.innerHTML = '<input id="i" /><textarea id="t"></textarea><select id="s"></select><div id="e" contenteditable="true"><b id="b">x</b></div>';
    for (const id of ['i', 't', 's', 'b']) {
      expect(shortcutFor(press('n', { target: document.getElementById(id) }))).toBeNull();
    }
  });

  it('does nothing while a dialog is open', () => {
    document.body.innerHTML = '<div role="dialog"></div>';
    expect(shortcutFor(press('/'))).toBeNull();
  });
});
```

`apps/web/src/shell/GlobalSearch.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/renderApp';

const box = () => screen.getByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' });

describe('Global search', () => {
  it('finds an order by Bangla digits and opens it from the keyboard', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), '৪০');
    const options = within(screen.getByRole('listbox')).getAllByRole('option');
    expect(options[0]!.textContent).toMatch(/^A-0040/);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(router.state.location.pathname).toBe('/app/orders/rahman-o40');
    expect(box()).toHaveProperty('value', '');
  });

  it('finds a customer by name and opens the profile on click', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const customer = store.getSnapshot().state.customers['rahman-c1']!;
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), customer.name);
    await userEvent.click(screen.getByRole('option', { name: new RegExp(`^${customer.name}`) }));
    expect(router.state.location.pathname).toBe('/app/customers/rahman-c1');
  });

  it('says when nothing matches', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await userEvent.type(await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), 'zzzz');
    expect(screen.getByText('কিছু পাওয়া যায়নি')).toBeTruthy();
  });

  it('focuses search with "/" and opens a new order with N, but not while typing', async () => {
    const { router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' });
    await userEvent.keyboard('/');
    expect(document.activeElement).toBe(box());
    expect(box()).toHaveProperty('value', '');

    await userEvent.keyboard('n');
    expect(box()).toHaveProperty('value', 'n');
    expect(router.state.location.pathname).toBe('/app/dashboard');

    await userEvent.clear(box());
    box().blur();
    await userEvent.keyboard('n');
    expect(router.state.location.pathname).toBe('/app/orders/new');
  });

  it('gives a tailor neither search nor the new-order shortcut', async () => {
    const { router } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(screen.queryByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' })).toBeNull();
    await userEvent.keyboard('n');
    expect(router.state.location.pathname).toBe('/app/work');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/features/search src/shell/shortcuts.test.ts src/shell/GlobalSearch.test.tsx`

Expected: FAIL with `Error: Cannot find module './globalSearch'`.

- [ ] **Step 3: Write the ranking and the shortcut rule**

`apps/web/src/features/search/globalSearch.ts`:

```ts
import { orderNumberMatches, searchCustomers, type Customer, type Order, type ShopState } from '@darzikhata/domain';

export type SearchHit =
  | { kind: 'order'; order: Order; customer: Customer | null }
  | { kind: 'customer'; customer: Customer };

/**
 * One search box for customers and orders. An order whose number matches is the most precise
 * hit, so order hits come first, newest number first. Customers follow in the domain's ranking:
 * phone match, then name text, then a sound-alike name across Bangla and English.
 */
export function globalSearch(state: ShopState, query: string, limit = 8): SearchHit[] {
  if (!query.trim()) return [];
  const orders: SearchHit[] = Object.values(state.orders)
    .filter((order) => orderNumberMatches(order.number, query))
    .sort((a, b) => b.number.localeCompare(a.number))
    .map((order) => ({ kind: 'order', order, customer: state.customers[order.customerId] ?? null }));
  const customers: SearchHit[] = searchCustomers(Object.values(state.customers), query, limit).map((customer) => ({
    kind: 'customer',
    customer,
  }));
  return [...orders, ...customers].slice(0, limit);
}
```

`apps/web/src/shell/shortcuts.ts`:

```ts
export type Shortcut = 'search' | 'newOrder';

export interface ShortcutEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  target: EventTarget | null;
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

/**
 * Desktop shortcuts: "/" focuses search, "N" opens a new order. They never fire while typing,
 * with Ctrl, Cmd or Alt held (so browser and OS shortcuts keep working), or while a dialog is open.
 */
export function shortcutFor(event: ShortcutEvent): Shortcut | null {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTyping(event.target)) return null;
  if (document.querySelector('[role="dialog"]')) return null;
  if (event.key === '/') return 'search';
  if (event.key === 'n' || event.key === 'N') return 'newOrder';
  return null;
}
```

- [ ] **Step 4: Build the search box and wire the shortcuts**

Write `GlobalSearch` (an ARIA 1.2 combobox: the input has `role="combobox"`, `aria-expanded`, `aria-controls` and `aria-activedescendant`; options have `role="option"` and `aria-selected`) and `useShortcuts`, and add both to `DesktopShell`'s top bar. Filter hits by capability before showing them.

- [ ] **Step 5: Run every web test and type check**

Run: `npx vitest run` then `npx tsc --noEmit -p tsconfig.json`

Expected: PASS, 221 tests (206 + 6 + 4 + 5); type check exits 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/search apps/web/src/shell apps/web/src/i18n
git commit -m "feat(web): add global search with / and N shortcuts on desktop"
```

### Task 16: Size budget and checks by hand

**Files:** none, unless a check finds a problem.

- [ ] **Step 1: Run every test and type check (repo root)**

Run: `npm test`

Expected: domain `Tests  173 passed (173)`, web `Tests  221 passed (221)`.

Run: `npm run typecheck`

Expected: both workspaces exit 0.

Run: `git grep -n "—" -- apps packages`

Expected: no output.

- [ ] **Step 2: Check the first download stays small**

Run (from `apps/web`): `npx vite build`

Then:

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

Expected: the entry chunk is under 250 KB gzipped, and there are several JS files (the lazy pages are separate chunks). If the entry is over budget, check that no page is imported eagerly from `AppRoutes.tsx`.

- [ ] **Step 3: Check by hand**

Run `npx vite preview` and, signed in as the Rahman Tailors owner:

1. Phone width (375px in device mode): enter the spec example (new customer, 2 shirts and a panjabi, ৳1,000 advance). The receipt shows ৳২,৪০০, ৳১,০০০ and ৳১,৪০০ due. No step scrolls sideways (`document.documentElement.scrollWidth` is 375).
2. Desktop at 1366px, 1920px and 150% browser zoom: the three entry columns, the orders table with a detail panel open, and the payments page all fit; wide tables scroll inside their own box and the page itself does not scroll sideways.
3. Keyboard only, desktop: `/` to search, open a customer, start a new order with `N`, add two garments, confirm measurements, take an advance and save, without touching the mouse. Focus is always visible; Enter in a money field never records anything.
4. Print preview of a receipt (Bangla and English), a job slip and the fabric tags: no navigation or toolbar prints, Bangla text is correct, table headers repeat on a second page (try the 24-tag Uniform House group order, `uniform-o27`). Save as PDF and check the Bangla text in the PDF.
5. Take a photo on a real Android phone in the details step; reload: the thumbnail is still there.
6. Nakshi Boutique, counter staff (PIN 2222): a customer's measurements are hidden on the profile, the order page and the job slip, and an order can still be entered for them.

Stop the preview server when done.

- [ ] **Step 4: Commit any fixes**

If a check needed a fix, commit it with a message describing the fix.

---

## After this plan

When all 16 tasks are committed and the checks pass, write Plan 4 (operations) against the real exports of `apps/web`. Plan 4 can rely on `orderRow`, `itemTitle`, `progressText`, `stageMoves`, `MeasurementTable`, `PrintLayout` and the print rules for the work-list print layout.
