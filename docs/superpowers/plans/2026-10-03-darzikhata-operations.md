# DarziKhata Operations Implementation Plan (Plan 4 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Running the shop: a home dashboard for today, work lists grouped by worker or stage with careful batch actions and a printable list, status links customers can open, a group order shown by wearer, branch scope for multi-branch shops, and settings for shop details, garment templates and stages, staff and branches.

**Architecture:** Shop setup (`ShopConfig`) stays outside the event log. Settings screens change it only through `ShopStore.updateConfig`, which validates the whole setup with the domain's `validateShopConfig` before saving. Garments already ordered keep their own copies of stages and measurements, so template edits affect new orders only. Branch scope is a per-device choice held in a React context: list screens read `useScopedState()`, a copy of the state with only the chosen branches' orders. Batch actions on the work list are planned by a pure module (`workList.ts`), previewed garment by garment, then saved one garment at a time so each garment gets its own result. The public status page (`/s/:token`) sits outside sign-in and shows only the domain's `publicOrderView`.

**Tech Stack:** Unchanged from Plan 3. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-10-03-darzikhata-demo-design.md](../specs/2026-10-03-darzikhata-demo-design.md) (sections 5.1, 5.3, 5.8, 6.2 dashboard and work lists, 6.3 settings and print, 6.4, 6.5, 6.6, 7.5)

**Builds on:** Plan 3, merged to `main` (domain `173` tests, web `240` tests).

## How this plan is written

Like Plan 3, this plan is light. Each task gives:

- the files it touches;
- what it provides to later tasks (the interfaces they may rely on);
- the full test code, because the tests are the specification;
- the exact message text the tests look for;
- full code only for the tricky parts: saving shop setup, branch scope, the dashboard's money for today, work-list grouping and batch planning, and the template editor model (keys, saved fields and stage rules);
- done-conditions for each screen.

Components, styling and route wiring are not spelled out. Write them test first, following the patterns already in `apps/web` (`features/orders/OrdersPage.tsx` for list pages with URL filters, `features/payments/paymentDialogs.tsx` for dialogs, `features/customers/CustomerForm.tsx` for forms with an unsaved-changes guard, `features/print/ReceiptPage.tsx` for print pages). Where a done-condition and a test seem to disagree, the test wins.

The tricky modules (`store.updateConfig`, `configProblems.ts`, `branchScope.ts`, `dashboard.ts`, `workList.ts`, `keys.ts`, `templateInput.ts`) were built and their tests run against `main` while writing this plan (60 tests passing, type check clean). The screen tests have not been run, because their screens do not exist yet.

## Plan series

1. Domain package (done).
2. App foundation (done).
3. Core workflows (done).
4. **Operations** (this plan): dashboard, work lists with batch actions and their print layout, status links and the public status page, group orders by wearer, branch scope, settings (shop, templates and stages, staff, branches and devices).
5. Demo layer: simulated offline and sync with the full status indicator, review queue, presenter mode, Playwright end-to-end tests, deployment.

## Global Constraints

Everything in Plan 2's and Plan 3's Global Constraints still applies: no new dependencies; `packages/domain` stays pure; only `data/store.ts` and `data/db.ts` touch IndexedDB; every visible string comes from `i18n/bn.ts` and `i18n/en.ts`; money stays integer poisha until display; colours come from the CSS variables; no em dashes; commit messages carry no AI attribution; accessible names are the contract; screens save only through the store; money is never recorded by the keyboard alone.

New in this plan:

- **Shop setup.** Settings screens change `ShopConfig` only with `store.updateConfig(change)` (Task 1). They check their own form first and show field errors beside the fields; when the store still refuses, show `configProblemText(problems, language)` in a `role="alert"` element and keep what the person typed. After a successful save show `সেভ হয়েছে` in a `role="status"` element.
- **Keys never change.** Template, field, stage, staff and branch ids are made once, when the record is first saved, and are never edited. Saved measurement fields cannot be removed, because earlier measurements keep their values under those keys.
- **Branch scope.** Lists of orders, garments and balances (dashboard, orders, work lists and their print, payments, global search) read `useScopedState()` (Task 2), never `useSnapshot().state` directly. Customers belong to the whole shop and are never filtered.
- **Batch actions.** Only assignment and forward stage moves are done in bulk. Payments and hand-over are never done in bulk. A batch always shows a preview listing every selected garment, needs an explicit click on `নিশ্চিত করুন`, and ends with one result per garment.
- **Public page.** `/s/:token` shows only what `publicOrderView` returns: no prices, payments, measurements, notes, customer name or phone, or staff names.

## File structure

```
apps/web/src/
  data/store.ts                          (modify) updateConfig, ConfigOutcome
  data/store.config.test.ts
  lib/share.ts                           share text, or copy it when sharing is not available
  app/App.tsx                            (modify) BranchScopeProvider
  app/AppRoutes.tsx                      (modify) dashboard, work, settings, /print/work, /s/:token
  shell/DesktopShell.tsx                 (modify) branch switcher in the top bar
  shell/GlobalSearch.tsx                 (modify) scoped state
  features/branches/
    branchScope.ts                       allowed branches, choice, scoped state (pure)
    BranchScope.tsx                      provider, useBranchScope, useScopedState, BranchSwitcher
  features/dashboard/
    dashboard.ts                         today's counts, money and lists (pure)
    DashboardPage.tsx
  features/work/
    workList.ts                          work items, grouping, URL filters, batch planning (pure)
    useWorkList.ts                       the viewer's work list and filters from the URL
    WorkPage.tsx, WorkGroupTable.tsx, batchDialogs.tsx
  features/print/
    PrintLayout.tsx                      (modify) back link given by the page
    WorkListPrintPage.tsx
  features/links/
    statusLink.ts                        token, address, share text
    StatusLinkSection.tsx                create, share, revoke (in order detail)
    StatusPage.tsx                       public page at /s/:token
  features/orders/
    wearers.ts                           garments grouped by wearer (pure)
    OrderDetail.tsx                      (modify) wearer groups, status link, other-branch message
  features/orders/OrdersPage.tsx         (modify) scoped state
  features/payments/PaymentsPage.tsx     (modify) scoped state
  features/more/MorePage.tsx             (modify) branch switcher on mobile
  features/settings/
    configProblems.ts                    message for a refused setup change
    keys.ts                              slugKey for new ids
    SettingsPage.tsx, SettingsHome.tsx   section menu and the first allowed section
    ShopSettings.tsx
    templateInput.ts                     template editor model (pure)
    TemplatesSettings.tsx, TemplateEditor.tsx
    staffInput.ts                        staff form model (pure)
    StaffSettings.tsx
    BranchSettings.tsx
```

## Routes after this plan

| Path | Page | Needs | Task |
| --- | --- | --- | --- |
| `/app/dashboard` | `DashboardPage` | `orders.view` | 3 |
| `/app/work` | `WorkPage` | `work.view.all` or `work.view.assigned` | 5 |
| `/print/work` | `WorkListPrintPage` (no shell) | `work.view.all` or `work.view.assigned` | 6 |
| `/s/:token` | `StatusPage` (no shell, no sign-in) | nothing | 8 |
| `/app/settings` | `SettingsPage` with `SettingsHome` | `settings.edit` or `staff.manage` | 10 |
| `/app/settings/shop` | `ShopSettings` | `settings.edit` | 10 |
| `/app/settings/templates` | `TemplatesSettings` | `settings.edit` | 12 |
| `/app/settings/templates/new` | `TemplateEditor` | `settings.edit` | 12 |
| `/app/settings/templates/:templateId` | `TemplateEditor` | `settings.edit` | 12 |
| `/app/settings/staff` | `StaffSettings` | `staff.manage` | 13 |
| `/app/settings/branches` | `BranchSettings` | `settings.edit` | 14 |

Every page is loaded with `lazyPage`. The settings sections are child routes of `/app/settings`, rendered in `SettingsPage`'s `<Outlet />`. `/print/work` sits beside the other print routes under `RequireStaff`. `/s/:token` sits at the top level, outside `RequireShop` and `RequireStaff`. When Tasks 3, 5 and 10 are done, `Section` and `PlaceholderPage` have no users left: delete them.

## Test counts

| After task | Web tests |
| --- | --- |
| Start | 240 |
| 1 | 247 |
| 2 | 255 |
| 3 | 261 |
| 4 | 272 |
| 5 | 277 |
| 6 | 281 |
| 7 | 288 |
| 8 | 293 |
| 9 | 297 |
| 10 | 302 |
| 11 | 311 |
| 12 | 316 |
| 13 | 323 |
| 14 | 326 |

Domain tests stay at `173`. Run web tests from `apps/web` with `npx vitest run <path>`, and everything from the repo root with `npm test` and `npm run typecheck`.

---
### Task 1: Saving shop setup

Settings screens need one safe way to change the shop setup. Two sections saving at once must not overwrite each other, and no change may leave the shop without someone who can manage staff, or lock out the person making it.

**Files:**
- Modify: `apps/web/src/data/store.ts`
- Create: `apps/web/src/features/settings/configProblems.ts`
- Test: `apps/web/src/data/store.config.test.ts`, `apps/web/src/features/settings/configProblems.test.ts`

**Interfaces:**
- Consumes: `validateShopConfig`, `staffById` from `@darzikhata/domain`.
- Produces:
  - `type ConfigOutcome = { ok: true } | { ok: false; problems: string[] }` (exported from `store.ts`)
  - `ShopStore.updateConfig(change: (config: ShopConfig) => ShopConfig): Promise<ConfigOutcome>`
  - `configProblemText(problems: string[], language: Language): string`

**Messages** (add to `bn.ts` and `en.ts`):

| Key | bn | en |
| --- | --- | --- |
| `settings.problem.shopName` | দোকানের নাম লিখুন। | Enter the shop name. |
| `settings.problem.noManager` | স্টাফ সামলাতে পারেন এমন অন্তত একজন সক্রিয় ব্যক্তি লাগবে। | At least one active person must be able to manage staff. |
| `settings.problem.self` | নিজেকে নিষ্ক্রিয় করা যাবে না। | You cannot deactivate yourself. |
| `settings.problem.linkExpiry` | লিংকের মেয়াদ ১ থেকে ৩৬৫ দিনের মধ্যে দিন। | Link expiry must be 1 to 365 days. |
| `settings.problem.pin` | পিন ৪ সংখ্যার হতে হবে। | A PIN must be 4 digits. |

- [ ] **Step 1: Write the failing tests**

`apps/web/src/data/store.config.test.ts`:

```ts
import { afterEach, describe, expect, it } from 'vitest';
import type { SeedShopKey } from '../seed/shops';
import { DarziDb } from './db';
import { ShopStore } from './store';

let count = 0;
const dbs: DarziDb[] = [];

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function demoStore(shop: SeedShopKey = 'nakshi') {
  const db = new DarziDb(`config-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  await store.startDemo(shop);
  return { db, store };
}

describe('ShopStore.updateConfig', () => {
  it('saves a valid change, tells the screens, and keeps it after a reload', async () => {
    const { db, store } = await demoStore();
    let heard = 0;
    store.subscribe(() => heard++);
    const outcome = await store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 7 } }));
    expect(outcome).toEqual({ ok: true });
    expect(store.getSnapshot().config!.settings.linkExpiryDays).toBe(7);
    expect(heard).toBe(1);

    const reloaded = new ShopStore({ db });
    await reloaded.load();
    expect(reloaded.getSnapshot().config!.settings.linkExpiryDays).toBe(7);
  });

  it('refuses an invalid setup and changes nothing', async () => {
    const { store } = await demoStore();
    const before = store.getSnapshot().config;
    const outcome = await store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 0 } }));
    expect(outcome).toEqual({ ok: false, problems: ['invalid-link-expiry'] });
    expect(store.getSnapshot().config).toBe(before);
  });

  it('will not let the signed-in person deactivate themselves or remove this device', async () => {
    const { store } = await demoStore();
    const me = store.getSnapshot().session!.staffId!;
    const self = await store.updateConfig((c) => ({ ...c, staff: c.staff.map((s) => (s.id === me ? { ...s, active: false } : s)) }));
    expect(self.ok === false && self.problems).toContain('self-inactive');
    const device = await store.updateConfig((c) => ({ ...c, devices: c.devices.map((d) => ({ ...d, id: 'other' })) }));
    expect(device).toEqual({ ok: false, problems: ['device-missing'] });
  });

  it('applies queued changes one after another, each to the latest setup', async () => {
    const { store } = await demoStore();
    await Promise.all([
      store.updateConfig((c) => ({ ...c, profile: { ...c.profile, phone: '01700000000' } })),
      store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 10 } })),
    ]);
    const config = store.getSnapshot().config!;
    expect(config.profile.phone).toBe('01700000000');
    expect(config.settings.linkExpiryDays).toBe(10);
  });

  it('leaves orders alone when a template’s stages change', async () => {
    const { store } = await demoStore('rahman');
    const before = store.getSnapshot().state;
    const outcome = await store.updateConfig((c) => ({
      ...c,
      templates: c.templates.map((t) => (t.id === 'shirt' ? { ...t, stages: t.stages.filter((s) => s.key !== 'trial') } : t)),
    }));
    expect(outcome.ok).toBe(true);
    expect(store.getSnapshot().state).toBe(before);
  });
});
```

`apps/web/src/features/settings/configProblems.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { configProblemText } from './configProblems';

describe('configProblemText', () => {
  it('explains the problems people can cause, once each', () => {
    expect(configProblemText(['no-owner', 'self-inactive'], 'bn')).toBe(
      'স্টাফ সামলাতে পারেন এমন অন্তত একজন সক্রিয় ব্যক্তি লাগবে। নিজেকে নিষ্ক্রিয় করা যাবে না।',
    );
    expect(configProblemText(['invalid-pin:a', 'invalid-pin:b'], 'en')).toBe('A PIN must be 4 digits.');
  });

  it('falls back to a plain could-not-save message', () => {
    expect(configProblemText(['duplicate-series:A'], 'bn')).toBe('সেভ করা যায়নি (duplicate-series:A)');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/data/store.config.test.ts src/features/settings/configProblems.test.ts`
Expected: FAIL (`updateConfig` and `configProblems` do not exist).

- [ ] **Step 3: Add `updateConfig` to the store**

Import `validateShopConfig` from `@darzikhata/domain`, export the outcome type next to `BatchOutcome`, and add the method before `signOut`. It runs on the store's queue like every other write, and applies `change` to the setup as it is when its turn comes, which is what makes two quick saves from different sections both land.

```ts
/** Result of changing the shop setup: saved, or the problems that stopped it. */
export type ConfigOutcome = { ok: true } | { ok: false; problems: string[] };
```

```ts
  /**
   * Changes the shop setup (profile, settings, templates, staff, branches, devices). The change is
   * made to the latest setup, after any change already queued, and saved only when the result is
   * valid, the signed-in person stays active and this device still exists. The event log is untouched:
   * garments already ordered keep their own copies of stages and measurements.
   */
  updateConfig(change: (config: ShopConfig) => ShopConfig): Promise<ConfigOutcome> {
    return this.enqueue(async () => {
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
```

- [ ] **Step 4: Write `configProblems.ts`**

```ts
import type { Language } from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { translate } from '../../i18n/format';

/** Problems people can cause from the settings screens, by the code's first part. */
const MESSAGES: Record<string, MessageKey> = {
  'no-shop-name': 'settings.problem.shopName',
  'no-owner': 'settings.problem.noManager',
  'self-inactive': 'settings.problem.self',
  'invalid-link-expiry': 'settings.problem.linkExpiry',
  'invalid-pin': 'settings.problem.pin',
};

/**
 * One sentence per problem that stopped a settings change. Codes such as "invalid-pin:staff-1"
 * are matched by their first part; anything else is shown as a plain "could not save".
 */
export function configProblemText(problems: string[], language: Language): string {
  const keys = new Set<string>();
  const texts: string[] = [];
  for (const problem of problems) {
    const key = MESSAGES[problem.split(':')[0]!];
    if (key && keys.has(key)) continue;
    if (key) keys.add(key);
    texts.push(key ? translate(language, key) : translate(language, 'save.rejected', { reason: problem }));
  }
  return texts.join(' ');
}
```

Add the messages above.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/data/store.config.test.ts src/features/settings/configProblems.test.ts`
Expected: PASS (7 tests). Then `npx vitest run`: 247 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/data apps/web/src/features/settings apps/web/src/i18n
git commit -m "feat(web): save shop setup changes after checking them"
```

---

### Task 2: Branch scope

Uniform House has a shop and a workshop. The owner can look at either or both; the workshop supervisor sees only the workshop. The choice is per device and is remembered.

**Files:**
- Create: `apps/web/src/features/branches/branchScope.ts`, `apps/web/src/features/branches/BranchScope.tsx`
- Modify: `apps/web/src/app/App.tsx`, `apps/web/src/shell/DesktopShell.tsx`, `apps/web/src/shell/GlobalSearch.tsx`, `apps/web/src/features/more/MorePage.tsx`, `apps/web/src/features/orders/OrdersPage.tsx`, `apps/web/src/features/orders/OrderDetail.tsx`, `apps/web/src/features/payments/PaymentsPage.tsx`
- Test: `apps/web/src/features/branches/branchScope.test.ts`, `apps/web/src/features/branches/BranchScope.test.tsx`
- Modify test: `apps/web/src/features/orders/OrderDetail.test.tsx` (the production-supervisor test must open a workshop order)

**Interfaces:**
- Consumes: `can`, `canAccessBranch` from `@darzikhata/domain`; `readSetting`, `writeSetting` from `lib/safeStorage.ts`.
- Produces:
  - `type BranchChoice = 'all' | string`
  - `allowedBranches(config, staff, role): Branch[]`
  - `resolveChoice(saved: string | null, allowed: Branch[]): BranchChoice`
  - `branchIdsFor(choice, allowed): string[]`
  - `scopeState(state: ShopState, branchIds: readonly string[]): ShopState`
  - `BranchScopeProvider` (inside `StoreProvider` and `I18nProvider` in `App.tsx`)
  - `useBranchScope(): { allowed: Branch[]; choice: BranchChoice; setChoice(choice: BranchChoice): void; branchIds: string[] }`
  - `useScopedState(): ShopState`, memoised on the state and the branch ids
  - `BranchSwitcher()`: a `SelectField` labelled `শাখা` with `সব শাখা` (value `all`) and each allowed branch; when only one branch is allowed, that branch's name as plain text instead; nothing when nobody is signed in.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `branch.label` | শাখা | Branch |
| `branch.all` | সব শাখা | All branches |
| `orders.otherBranch` | এই অর্ডারটি আপনার শাখার নয় | This order belongs to another branch |

**Done when:**
- The choice is saved under `dk.branch` with `writeSetting` and read back with `resolveChoice`, so a stale or no-longer-allowed choice falls back safely.
- The desktop top bar shows `BranchSwitcher` where it showed the device's branch name. Rahman Tailors (one branch) still shows `প্রধান দোকান` there.
- The More page shows `BranchSwitcher` only in the mobile shell and only when more than one branch is allowed (the desktop top bar already has one).
- `OrdersPage`, `PaymentsPage` and `GlobalSearch` use `useScopedState()`.
- `OrderDetail` shows `orders.otherBranch` in a `role="alert"` element, and nothing else, when the order's branch is not among `allowed`. It uses the allowed branches, not the current choice, so an owner looking at one branch can still open a link to the other.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/branches/branchScope.test.ts`:

```ts
import { DEFAULT_ROLES, emptyState, type Branch } from '@darzikhata/domain';
import { makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { allowedBranches, branchIdsFor, resolveChoice, scopeState } from './branchScope';

const uniform = shopConfig('uniform');
const role = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;
const staff = (id: string) => uniform.staff.find((s) => s.id === id)!;
const ids = (branches: Branch[]) => branches.map((b) => b.id);

describe('allowedBranches', () => {
  it('gives every branch to roles that see all branches, and their own branches to everyone else', () => {
    expect(ids(allowedBranches(uniform, staff('uniform-owner'), role('owner')))).toEqual(['shop', 'workshop']);
    expect(ids(allowedBranches(uniform, staff('uniform-counter'), role('counter')))).toEqual(['shop']);
    expect(ids(allowedBranches(uniform, staff('uniform-supervisor'), role('supervisor')))).toEqual(['workshop']);
    expect(ids(allowedBranches(uniform, staff('uniform-tailor-1'), role('tailor')))).toEqual(['shop', 'workshop']);
    expect(ids(allowedBranches(uniform, { ...staff('uniform-counter'), branchIds: ['shop'] }, role('manager')))).toEqual([
      'shop',
      'workshop',
    ]);
  });
});

describe('resolveChoice and branchIdsFor', () => {
  const both = uniform.branches;
  const shopOnly = both.slice(0, 1);

  it('keeps a saved choice that is still allowed, and otherwise shows everything allowed', () => {
    expect(resolveChoice('workshop', both)).toBe('workshop');
    expect(resolveChoice('all', both)).toBe('all');
    expect(resolveChoice('gone', both)).toBe('all');
    expect(resolveChoice(null, both)).toBe('all');
    expect(resolveChoice('workshop', shopOnly)).toBe('shop');
    expect(resolveChoice('all', shopOnly)).toBe('shop');
  });

  it('turns a choice into branch ids', () => {
    expect(branchIdsFor('all', both)).toEqual(['shop', 'workshop']);
    expect(branchIdsFor('workshop', both)).toEqual(['workshop']);
    expect(branchIdsFor('workshop', shopOnly)).toEqual([]);
  });
});

describe('scopeState', () => {
  it('keeps only the chosen branches’ orders and every customer', () => {
    const state = {
      ...emptyState(),
      customers: { c1: { id: 'c1' } as never },
      orders: { o1: makeOrder({ id: 'o1', branchId: 'shop' }), o2: makeOrder({ id: 'o2', branchId: 'workshop' }) },
    };
    const scoped = scopeState(state, ['workshop']);
    expect(Object.keys(scoped.orders)).toEqual(['o2']);
    expect(scoped.customers).toBe(state.customers);
    expect(scopeState(state, ['shop', 'workshop'])).toBe(state);
  });
});
```

`apps/web/src/features/branches/BranchScope.test.tsx`:

```tsx
import { toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const supervisor = { staffId: 'uniform-supervisor', pin: '3333' };

describe('Branch scope', () => {
  it('lets the owner switch between branches, remembers the choice, and filters the orders list', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders' });
    const count = Object.keys(store.getSnapshot().state.orders).length;
    expect(await screen.findByText(`${toBanglaDigits(String(count))}টি অর্ডার`)).toBeTruthy();
    const branch = screen.getByLabelText('শাখা');
    expect(branch).toHaveProperty('value', 'all');

    await userEvent.selectOptions(branch, 'কারখানা');
    expect(await screen.findByText('১টি অর্ডার')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'A-0027' })).toBeTruthy();
    expect(window.localStorage.getItem('dk.branch')).toBe('workshop');
  });

  it('shows staff of one branch only that branch, with no switcher', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/orders', as: supervisor });
    expect(await screen.findByText('১টি অর্ডার')).toBeTruthy();
    expect(screen.queryByLabelText('শাখা')).toBeNull();
    expect(screen.getByText('কারখানা')).toBeTruthy();

    const shopOrder = Object.values(store.getSnapshot().state.orders).find((o) => o.branchId === 'shop')!;
    await act(() => router.navigate(`/app/orders/${shopOrder.id}`));
    expect((await screen.findByRole('alert')).textContent).toBe('এই অর্ডারটি আপনার শাখার নয়');
  });

  it('limits payments and global search to the chosen branch', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/payments' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা'), 'কারখানা');
    const due = screen.getByRole('table', { name: 'বাকি টাকা' });
    // The header, the group order, and the total.
    expect(within(due).getAllByRole('row')).toHaveLength(3);
    expect(within(due).getByRole('link', { name: 'A-0027' })).toBeTruthy();

    const shopOrder = Object.values(store.getSnapshot().state.orders).find((o) => o.branchId === 'shop')!;
    await userEvent.type(screen.getByRole('combobox', { name: 'অর্ডার বা কাস্টমার খুঁজুন' }), shopOrder.number);
    expect(screen.queryByRole('option', { name: new RegExp(`^${shopOrder.number}`) })).toBeNull();
  });

  it('offers the switcher under More on a phone', async () => {
    await renderApp({ layout: 'mobile', shop: 'uniform', path: '/app/more' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা'), 'দোকান');
    expect(window.localStorage.getItem('dk.branch')).toBe('shop');
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/branches`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `branchScope.ts`**

`branches.view.all` gives every branch even when the staff record lists one; everyone else gets the branches their staff record allows.

```ts
import { can, canAccessBranch, type Branch, type Role, type ShopConfig, type ShopState, type Staff } from '@darzikhata/domain';

/** Which branch the lists show: one branch's id, or 'all' the person may see. */
export type BranchChoice = 'all' | string;

/** Branches this person may see: every branch with 'branches.view.all', otherwise the ones they work in. */
export function allowedBranches(config: ShopConfig, staff: Staff, role: Role): Branch[] {
  if (can(role, 'branches.view.all')) return config.branches;
  return config.branches.filter((b) => canAccessBranch(staff, b.id));
}

/** The saved choice while it is still allowed; otherwise all branches when there are several, or the only one. */
export function resolveChoice(saved: string | null, allowed: Branch[]): BranchChoice {
  if (allowed.length === 1) return allowed[0]!.id;
  if (saved && allowed.some((b) => b.id === saved)) return saved;
  return 'all';
}

export function branchIdsFor(choice: BranchChoice, allowed: Branch[]): string[] {
  return choice === 'all' ? allowed.map((b) => b.id) : allowed.filter((b) => b.id === choice).map((b) => b.id);
}

/** The state with only these branches' orders. Customers belong to the whole shop and stay. */
export function scopeState(state: ShopState, branchIds: readonly string[]): ShopState {
  const orders = Object.values(state.orders);
  if (orders.every((o) => branchIds.includes(o.branchId))) return state;
  return { ...state, orders: Object.fromEntries(orders.filter((o) => branchIds.includes(o.branchId)).map((o) => [o.id, o])) };
}
```

- [ ] **Step 4: Write `BranchScope.tsx` and wire it in**

The provider reads the signed-in person with `useCurrentStaff()`, works out `allowed` with `allowedBranches`, and keeps the saved choice in state (`resolveChoice(readSetting('dk.branch'), allowed)`). `setChoice` writes the setting and updates the state. When nobody is signed in, `allowed` is every branch and the choice is `'all'`. Then make the changes listed in the done-conditions.

- [ ] **Step 5: Keep the supervisor's order-detail test in their branch**

`OrderDetail.test.tsx`'s test "offers only the actions a production supervisor may take" opens the first Uniform House order with unfinished garments, which is a shop order. The supervisor works only in the workshop, so that order now shows the other-branch message. Change its `keep` function to:

```ts
      (o) => o.branchId === 'workshop' && o.items.some((i) => itemSummaryGroup(i) === 'unfinished'),
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/features/branches`
Expected: PASS (8 tests). Then `npx vitest run`: 255 tests pass (the App test still finds `প্রধান দোকান`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add branch scope with a per-device branch switcher"
```

---

### Task 3: Dashboard

The first screen most staff see: what is due today, what is late, what is waiting to be collected, and (for those who may see money) what came in today and what is still owed.

**Files:**
- Create: `apps/web/src/features/dashboard/dashboard.ts`, `apps/web/src/features/dashboard/DashboardPage.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (the `dashboard` route renders `DashboardPage` under `RequireCapability anyOf={navItem('dashboard').requires}`)
- Test: `apps/web/src/features/dashboard/dashboard.test.ts`, `apps/web/src/features/dashboard/DashboardPage.test.tsx`

**Interfaces:**
- Consumes: `trialsOn`, `deliveriesOn`, `overdueItems`, `readyForPickup`, `outstandingBalances`, `netPaid`, `todayInDhaka` from `@darzikhata/domain`; `useScopedState` (Task 2); `itemTitle`, `useToday`, `useCan`.
- Produces: `interface DashboardModel` and `dashboardModel(orders: Order[], today: string): DashboardModel`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `dashboard.summary` | সারসংক্ষেপ | Summary |
| `dashboard.openOrders` | চলমান অর্ডার | Open orders |
| `dashboard.inProgress` | তৈরি হচ্ছে | Being made |
| `dashboard.readyGarments` | রেডি পোশাক | Garments ready |
| `dashboard.overdueGarments` | দেরির পোশাক | Garments late |
| `dashboard.collectedToday` | আজ জমা | Collected today |
| `dashboard.trialsToday` | আজ ট্রায়াল | Trials today |
| `dashboard.deliveriesToday` | আজ ডেলিভারি | Deliveries today |
| `dashboard.overdue` | দেরি হয়েছে | Overdue |
| `dashboard.ready` | নেওয়ার জন্য রেডি | Ready to collect |
| `dashboard.none` | কিছু নেই | Nothing here |

The due card reuses `payments.dueTotal` (মোট বাকি). Rows reuse `item.delivery`, `progress.ready` and `customer.balance`.

**Done when:**
- The heading is `হোম` (`nav.dashboard`), as the App test expects.
- The summary is a `<ul aria-label="সারসংক্ষেপ">` of cards; each card is one `<li>` holding its label and its value. Cards: open orders, being made, garments ready, garments late, and, only with `money.view`, collected today and total due. No card or label says profit.
- Four `<section>` regions named `আজ ট্রায়াল`, `আজ ডেলিভারি`, `দেরি হয়েছে`, `নেওয়ার জন্য রেডি`, each a `<ul>` with one `<li>` per row, or `কিছু নেই` (not in a list item) when empty.
- Garment rows show the order number as a link to `/app/orders/:orderId`, `itemTitle`, the customer's name and, for late rows, the delivery date. Ready rows show the order number link, the customer's name, `{n}টি রেডি` and, with `money.view`, `বাকি {amount}` when something is owed.
- Everything comes from `dashboardModel(Object.values(useScopedState().orders), useToday())`.
- On a phone the cards wrap two to a row and the lists stack; nothing scrolls sideways at 375px.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/dashboard/dashboard.test.ts`:

```ts
import { makeItem, makeOrder, makePayment } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { dashboardModel } from './dashboard';

const TODAY = '2026-10-03';
/** 00:30 on 3 October in Dhaka, and 23:59 on 2 October. */
const JUST_AFTER_MIDNIGHT = '2026-10-02T18:30:00.000Z';
const LATE_YESTERDAY = '2026-10-02T17:59:00.000Z';

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'stitching', trialDate: TODAY, deliveryDate: '2026-10-06' }),
      makeItem({ id: 'b', stageKey: 'ready', deliveryDate: TODAY }),
    ],
    payments: [
      makePayment({ id: 'p1', amount: 100000, at: JUST_AFTER_MIDNIGHT }),
      makePayment({ id: 'p2', kind: 'refund', amount: 20000, reason: 'x' }),
    ],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    items: [makeItem({ id: 'c', stageKey: 'cutting', deliveryDate: '2026-10-01' })],
    payments: [
      makePayment({ id: 'p3', amount: 50000, at: LATE_YESTERDAY }),
      makePayment({ id: 'p4', kind: 'refund', amount: 10000, reason: 'x', at: LATE_YESTERDAY }),
      // The refund should have been ৳50, so today the shop holds ৳50 more.
      makePayment({ id: 'p5', kind: 'correction', amount: -5000, corrects: 'p4', reason: 'typo' }),
    ],
  }),
  makeOrder({
    id: 'o3',
    number: 'A-0003',
    items: [makeItem({ id: 'd', stageKey: 'delivered' })],
    payments: [makePayment({ id: 'p6', amount: 70000, at: LATE_YESTERDAY })],
  }),
];

describe('dashboardModel', () => {
  it('counts orders, garments and money for today', () => {
    const model = dashboardModel(orders, TODAY);
    expect(model).toMatchObject({
      openOrders: 2,
      inProgress: 2,
      readyGarments: 1,
      overdueGarments: 1,
      dueTotal: 85000,
      dueOrders: 2,
      collectedToday: 85000,
    });
    expect(model.trialsToday.map((r) => r.item.id)).toEqual(['a']);
    expect(model.deliveriesToday.map((r) => r.item.id)).toEqual(['b']);
    expect(model.overdue.map((r) => r.item.id)).toEqual(['c']);
    expect(model.ready.map((o) => o.id)).toEqual(['o1']);
  });

  it('is all zeros for a new shop', () => {
    expect(dashboardModel([], TODAY)).toEqual({
      openOrders: 0,
      inProgress: 0,
      readyGarments: 0,
      overdueGarments: 0,
      dueTotal: 0,
      dueOrders: 0,
      collectedToday: 0,
      trialsToday: [],
      deliveriesToday: [],
      overdue: [],
      ready: [],
    });
  });
});
```

`apps/web/src/features/dashboard/DashboardPage.test.tsx`:

```tsx
import { formatTaka, outstandingBalances, toBanglaDigits, todayInDhaka } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { dashboardModel } from './dashboard';

const bn = (n: number) => toBanglaDigits(String(n));
const card = (label: string) => within(screen.getByRole('list', { name: 'সারসংক্ষেপ' })).getByText(label).closest('li')!;
const rows = (name: string) => within(screen.getByRole('region', { name })).queryAllByRole('listitem');
const model = (store: ShopStore) => dashboardModel(Object.values(store.getSnapshot().state.orders), todayInDhaka(new Date()));

describe('Dashboard', () => {
  it('shows today’s numbers and the four lists for the owner', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    const m = model(store);
    expect(card('চলমান অর্ডার').textContent).toContain(bn(m.openOrders));
    expect(card('তৈরি হচ্ছে').textContent).toContain(bn(m.inProgress));
    expect(card('রেডি পোশাক').textContent).toContain(bn(m.readyGarments));
    expect(card('দেরির পোশাক').textContent).toContain(bn(m.overdueGarments));
    expect(card('আজ জমা').textContent).toContain(formatTaka(m.collectedToday, 'bn'));
    expect(card('মোট বাকি').textContent).toContain(formatTaka(m.dueTotal, 'bn'));
    expect(rows('আজ ট্রায়াল')).toHaveLength(m.trialsToday.length);
    expect(rows('আজ ডেলিভারি')).toHaveLength(m.deliveriesToday.length);
    expect(rows('দেরি হয়েছে')).toHaveLength(m.overdue.length);
    expect(rows('নেওয়ার জন্য রেডি')).toHaveLength(m.ready.length);
  });

  it('opens an order from a list', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    const late = await screen.findByRole('region', { name: 'দেরি হয়েছে' });
    const first = model(store).overdue[0]!;
    await userEvent.click(within(late).getAllByRole('link', { name: first.order.number })[0]!);
    expect(router.state.location.pathname).toBe(`/app/orders/${first.order.id}`);
  });

  it('counts a payment taken today', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/dashboard' });
    await screen.findByRole('heading', { name: 'হোম' });
    const before = model(store).collectedToday;
    const { order } = outstandingBalances(Object.values(store.getSnapshot().state.orders)).find((r) => r.balance >= 50000)!;
    await act(() =>
      store.dispatch({
        type: 'payment.recorded',
        orderId: order.id,
        payment: { id: 'paid-today', amount: 50000, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
      }),
    );
    expect(card('আজ জমা').textContent).toContain(formatTaka(before + 50000, 'bn'));
  });

  it('hides money from staff without money access and keeps to their branch', async () => {
    await renderApp({
      layout: 'desktop',
      shop: 'uniform',
      path: '/app/dashboard',
      as: { staffId: 'uniform-supervisor', pin: '3333' },
    });
    await screen.findByRole('heading', { name: 'হোম' });
    expect(screen.queryByText('আজ জমা')).toBeNull();
    expect(screen.queryByText('মোট বাকি')).toBeNull();
    const ready = within(screen.getByRole('region', { name: 'নেওয়ার জন্য রেডি' }));
    expect(ready.getAllByRole('listitem')).toHaveLength(1);
    expect(ready.getByRole('link', { name: 'A-0027' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/dashboard`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `dashboard.ts`**

The tricky part is money for today. A correction's direction depends on the record it corrects (correcting a refund works the other way), and that record may be from an earlier day. So today's money for an order is everything held minus everything held from other days, not a sum over today's records. Days are Dhaka dates.

```ts
import {
  deliveriesOn,
  isOrderClosed,
  itemSummaryGroup,
  netPaid,
  outstandingBalances,
  overdueItems,
  readyForPickup,
  todayInDhaka,
  trialsOn,
  type ItemRef,
  type Order,
  type Poisha,
} from '@darzikhata/domain';

export interface DashboardModel {
  /** Orders with a garment not yet delivered or cancelled. */
  openOrders: number;
  /** Garments in an in-progress stage. */
  inProgress: number;
  /** Garments ready to collect. */
  readyGarments: number;
  overdueGarments: number;
  /** What customers still owe, over every order with a balance. */
  dueTotal: Poisha;
  dueOrders: number;
  /** Money in today (Dhaka date): advances and payments, less refunds, with corrections. Never called profit. */
  collectedToday: Poisha;
  trialsToday: ItemRef[];
  deliveriesToday: ItemRef[];
  overdue: ItemRef[];
  ready: Order[];
}

/**
 * Today's money for one order. A correction's direction depends on the record it corrects,
 * which may be from an earlier day, so this is everything held minus everything held
 * from other days, not a sum over today's records alone.
 */
function collectedOn(order: Order, today: string): Poisha {
  const others = order.payments.filter((p) => todayInDhaka(new Date(p.at)) !== today);
  return netPaid(order.payments) - netPaid(others);
}

export function dashboardModel(orders: Order[], today: string): DashboardModel {
  let inProgress = 0;
  let readyGarments = 0;
  for (const order of orders) {
    for (const item of order.items) {
      const group = itemSummaryGroup(item);
      if (group === 'unfinished') inProgress++;
      if (group === 'ready') readyGarments++;
    }
  }
  const due = outstandingBalances(orders);
  const overdue = overdueItems(orders, today);
  return {
    openOrders: orders.filter((o) => !isOrderClosed(o)).length,
    inProgress,
    readyGarments,
    overdueGarments: overdue.length,
    dueTotal: due.reduce((sum, r) => sum + r.balance, 0),
    dueOrders: due.length,
    collectedToday: orders.reduce((sum, o) => sum + collectedOn(o, today), 0),
    trialsToday: trialsOn(orders, today),
    deliveriesToday: deliveriesOn(orders, today),
    overdue,
    ready: readyForPickup(orders),
  };
}
```

- [ ] **Step 4: Build `DashboardPage` to the done-conditions, and route it**

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/features/dashboard`
Expected: PASS (6 tests). Then `npx vitest run`: 261 tests pass (the global search tests start on this page).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add the dashboard with today's lists and money"
```

---
### Task 4: Work-list model

The rules behind the work list: which garments a person sees, how they are grouped, how the filters live in the URL, and what a batch action would do to each selected garment before anything is saved.

**Files:**
- Create: `apps/web/src/features/work/workList.ts`
- Test: `apps/web/src/features/work/workList.test.ts`

**Interfaces:**
- Consumes: `checkTransition`, `itemSummaryGroup`, `can`, `canAccessBranch`, `ItemRef` from `@darzikhata/domain`; `problemText`.
- Produces:
  - `type WorkGrouping = 'worker' | 'stage'`; `interface WorkQuery { by; worker; stage }`; `DEFAULT_WORK_QUERY`
  - `interface Viewer { staffId: string; seesAll: boolean }`
  - `workItems(orders, viewer): ItemRef[]`, unfinished garments, earliest promised first
  - `filterWork(refs, query): ItemRef[]`
  - `interface WorkGroup { key; staff: Staff | null; stage: Stage | null; refs: ItemRef[] }` and `groupWork(refs, by, config): WorkGroup[]`
  - `stageOptions(refs, config): Stage[]`
  - `readWorkQuery(params)`, `writeWorkQuery(query)`
  - `batchStageTargets(refs): Stage[]`
  - `type SkipReason = 'not-in-list' | 'hand-over' | 'same-stage' | 'backward' | 'skips-required'`
  - `type StagePlanRow`, `planStageMove(refs, toKey): StagePlanRow[]`, `stageMoveBody(row): EventBody`
  - `type AssignPlanRow`, `planAssign(refs, assigneeId: string | null): AssignPlanRow[]`, `assignBody(ref, assigneeId): EventBody`
  - `assignees(config, branchIds): Staff[]`
  - `interface BatchResult { ref; problem: string | null }` and `runBatch(dispatch, steps, language): Promise<BatchResult[]>`

The rules worth knowing before reading the code:

- **Which garments.** Only garments in an in-progress stage. Ready garments belong to the counter (the dashboard's ready list), not to the makers.
- **Grouping.** Worker groups follow the staff list, with unassigned garments last. Stage groups follow the stage's position in its own garment's stage list, because different garments have different lists (an alteration's `working` sits where a shirt's `cutting` does).
- **Batch stage moves are forward only.** Going back is rework and needs a reason for each garment, so it is done on the garment's card. Handing over is never done in bulk. A garment whose list lacks the target stage, or that would skip a required stage, is skipped, not failed.
- **Assignment keeps the preview's version.** `assignBody` carries the garment's version from when the preview was built, so a change made by someone else in the meantime comes back as a conflict instead of being overwritten.
- **One garment at a time.** `runBatch` saves with one `dispatch` per garment, not `dispatchBatch`: one garment's problem must not undo the others, and each garment gets its own result.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/work/workList.test.ts`:

```ts
import { ALTERATION_STAGES, DEFAULT_ROLES, emptyState, type ApplyOutcome, type ShopConfig } from '@darzikhata/domain';
import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_WORK_QUERY,
  assignBody,
  assignees,
  batchStageTargets,
  filterWork,
  groupWork,
  planAssign,
  planStageMove,
  readWorkQuery,
  runBatch,
  stageMoveBody,
  stageOptions,
  workItems,
  writeWorkQuery,
} from './workList';

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'cutting', assignedTo: 'tailor-1', deliveryDate: '2026-10-08' }),
      makeItem({ id: 'b', stageKey: 'stitching', assignedTo: 'tailor-2', deliveryDate: '2026-10-05' }),
      makeItem({ id: 'c', stageKey: 'ready', assignedTo: 'tailor-1', deliveryDate: '2026-10-04' }),
    ],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    branchId: 'workshop',
    items: [
      makeItem({ id: 'd', stageKey: 'booked', deliveryDate: '2026-10-04' }),
      makeItem({
        id: 'e',
        templateId: 'alteration',
        garmentName: { bn: 'অল্টারেশন', en: 'Alteration' },
        stages: ALTERATION_STAGES,
        stageKey: 'working',
        assignedTo: 'tailor-1',
        deliveryDate: '2026-10-04',
      }),
      makeItem({ id: 'f', stageKey: 'cutting', assignedTo: 'tailor-1', cancelled: { reason: 'x', at: '', by: '' } }),
    ],
  }),
];

const config: ShopConfig = {
  id: 'test',
  profile: { name: { bn: 'দোকান', en: 'Shop' }, phone: '', address: '' },
  branches: [
    { id: 'main', name: { bn: 'দোকান', en: 'Shop' }, kind: 'shop', address: '' },
    { id: 'workshop', name: { bn: 'কারখানা', en: 'Workshop' }, kind: 'workshop', address: '' },
  ],
  devices: [{ id: 'device-a', name: 'Phone', series: 'A', branchId: 'main' }],
  roles: DEFAULT_ROLES,
  staff: [
    { id: 'owner', name: 'Owner', roleId: 'owner', branchIds: 'all', pin: '1111', active: true },
    { id: 'tailor-2', name: 'Selim', roleId: 'tailor', branchIds: ['main'], pin: '2222', active: true },
    { id: 'tailor-1', name: 'Rafiq', roleId: 'tailor', branchIds: 'all', pin: '3333', active: true },
    { id: 'old', name: 'Old', roleId: 'tailor', branchIds: 'all', pin: '4444', active: false },
    { id: 'counter', name: 'Counter', roleId: 'counter', branchIds: 'all', pin: '5555', active: true },
  ],
  templates: [],
  settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
};

const all = () => workItems(orders, { staffId: 'owner', seesAll: true });
const ref = (id: string) => {
  for (const order of orders) {
    const item = order.items.find((i) => i.id === id);
    if (item) return { order, item };
  }
  throw new Error(id);
};
const ids = (refs: Array<{ item: { id: string } }>) => refs.map((r) => r.item.id);

describe('workItems', () => {
  it('lists garments still being made, earliest promised first, and only your own without work.view.all', () => {
    expect(ids(all())).toEqual(['d', 'e', 'b', 'a']);
    expect(ids(workItems(orders, { staffId: 'tailor-1', seesAll: false }))).toEqual(['e', 'a']);
  });
});

describe('groupWork', () => {
  it('groups by worker in staff-list order, with unassigned garments last', () => {
    const groups = groupWork(all(), 'worker', config);
    expect(groups.map((g) => g.key)).toEqual(['tailor-2', 'tailor-1', 'none']);
    expect(groups.map((g) => g.staff?.name ?? null)).toEqual(['Selim', 'Rafiq', null]);
    expect(ids(groups[1]!.refs)).toEqual(['e', 'a']);
  });

  it('groups by stage in stage-list order, whatever garment the stage belongs to', () => {
    const groups = groupWork(all(), 'stage', config);
    expect(groups.map((g) => g.key)).toEqual(['booked', 'cutting', 'working', 'stitching']);
    expect(groups[2]!.stage!.label.en).toBe('Working');
    expect(stageOptions(all(), config).map((s) => s.key)).toEqual(['booked', 'cutting', 'working', 'stitching']);
  });
});

describe('filters', () => {
  it('filters by worker, unassigned and stage', () => {
    expect(ids(filterWork(all(), { ...DEFAULT_WORK_QUERY, worker: 'none' }))).toEqual(['d']);
    expect(ids(filterWork(all(), { ...DEFAULT_WORK_QUERY, worker: 'tailor-1', stage: 'working' }))).toEqual(['e']);
  });

  it('reads and writes the filters in the URL, leaving defaults out', () => {
    expect(readWorkQuery(new URLSearchParams('by=stage&worker=none&stage=cutting'))).toEqual({ by: 'stage', worker: 'none', stage: 'cutting' });
    expect(readWorkQuery(new URLSearchParams('by=colour'))).toEqual(DEFAULT_WORK_QUERY);
    expect(writeWorkQuery(DEFAULT_WORK_QUERY).toString()).toBe('');
    expect(writeWorkQuery({ by: 'stage', worker: 'all', stage: 'trial' }).toString()).toBe('by=stage&stage=trial');
  });
});

describe('batch stage moves', () => {
  it('offers forward stages any selected garment can reach, never handing over', () => {
    expect(batchStageTargets([ref('a'), ref('b'), ref('e')]).map((s) => s.key)).toEqual(['stitching', 'trial', 'ready']);
    expect(batchStageTargets([ref('c')])).toEqual([]);
  });

  it('plans each garment, skipping ones that cannot make the move', () => {
    const plan = planStageMove([ref('a'), ref('b'), ref('e'), ref('d')], 'stitching');
    expect(plan.map((r) => (r.ok ? `${r.from.key}>${r.to.key}` : r.reason))).toEqual([
      'cutting>stitching',
      'same-stage',
      'not-in-list',
      'skips-required',
    ]);
    const ready = planStageMove([ref('a'), ref('b')], 'ready');
    expect(ready.map((r) => (r.ok ? r.skipped : r.reason))).toEqual(['skips-required', ['trial']]);
    expect(planStageMove([ref('b')], 'cutting')[0]).toMatchObject({ ok: false, reason: 'backward' });
    expect(planStageMove([ref('c'), ref('b')], 'delivered').map((r) => !r.ok && r.reason)).toEqual(['hand-over', 'hand-over']);
  });

  it('turns a planned move into a stage change', () => {
    const row = planStageMove([ref('a')], 'stitching')[0]!;
    if (!row.ok) throw new Error('expected a move');
    expect(stageMoveBody(row)).toEqual({ type: 'item.stageChanged', orderId: 'o1', itemId: 'a', to: 'stitching', reason: '' });
  });
});

describe('batch assignment', () => {
  it('skips garments the person already has, and records the version the preview was based on', () => {
    expect(planAssign([ref('a'), ref('b'), ref('d')], 'tailor-1').map((r) => r.ok)).toEqual([false, true, true]);
    expect(planAssign([ref('d')], null)[0]).toMatchObject({ ok: false, reason: 'already-assigned' });
    expect(assignBody(ref('b'), 'tailor-1')).toEqual({
      type: 'item.assigned',
      orderId: 'o1',
      itemId: 'b',
      baseVersion: 1,
      assigneeId: 'tailor-1',
    });
  });

  it('offers active makers who work in every selected garment’s branch', () => {
    expect(assignees(config, ['main', 'workshop']).map((s) => s.id)).toEqual(['owner', 'tailor-1']);
    expect(assignees(config, ['main']).map((s) => s.id)).toEqual(['owner', 'tailor-2', 'tailor-1']);
  });
});

describe('runBatch', () => {
  it('saves one garment at a time and reports each result', async () => {
    const state = emptyState();
    const dispatch = vi
      .fn<(body: unknown) => Promise<ApplyOutcome>>()
      .mockResolvedValueOnce({ kind: 'applied', state })
      .mockResolvedValueOnce({ kind: 'conflict', state, currentVersion: 2 });
    const steps = [
      { ref: ref('b'), body: assignBody(ref('b'), 'tailor-1') },
      { ref: ref('d'), body: assignBody(ref('d'), 'tailor-1') },
    ];
    const results = await runBatch(dispatch, steps, 'bn');
    expect(dispatch.mock.calls.map(([body]) => (body as { itemId: string }).itemId)).toEqual(['b', 'd']);
    expect(results.map((r) => [r.ref.item.id, r.problem])).toEqual([
      ['b', null],
      ['d', 'এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।'],
    ]);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/work`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `workList.ts`**

```ts
import {
  can,
  canAccessBranch,
  checkTransition,
  itemSummaryGroup,
  type ApplyOutcome,
  type EventBody,
  type ItemRef,
  type Language,
  type Order,
  type ShopConfig,
  type Stage,
  type Staff,
} from '@darzikhata/domain';
import { problemText } from '../common/problemText';

export type WorkGrouping = 'worker' | 'stage';

export interface WorkQuery {
  by: WorkGrouping;
  /** A staff id, 'none' for garments nobody has yet, or 'all'. */
  worker: string;
  /** A stage key, or 'all'. */
  stage: string;
}

export const DEFAULT_WORK_QUERY: WorkQuery = { by: 'worker', worker: 'all', stage: 'all' };

export interface Viewer {
  staffId: string;
  /** True with 'work.view.all'; otherwise only the viewer's own garments are shown. */
  seesAll: boolean;
}

const UNASSIGNED = 'none';

/** Garments still being made that this person may see, earliest promised first. */
export function workItems(orders: Order[], viewer: Viewer): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (itemSummaryGroup(item) !== 'unfinished') continue;
      if (!viewer.seesAll && item.assignedTo !== viewer.staffId) continue;
      refs.push({ order, item });
    }
  }
  return refs.sort(byDue);
}

/** Earliest delivery date first (no date last), then order number, then position in the order. */
function byDue(a: ItemRef, b: ItemRef): number {
  const da = a.item.deliveryDate;
  const db = b.item.deliveryDate;
  if (da !== db) {
    if (da === null) return 1;
    if (db === null) return -1;
    return da.localeCompare(db);
  }
  return a.order.number.localeCompare(b.order.number) || a.order.items.indexOf(a.item) - b.order.items.indexOf(b.item);
}

export function filterWork(refs: ItemRef[], query: WorkQuery): ItemRef[] {
  return refs.filter(
    (r) =>
      (query.worker === 'all' || (r.item.assignedTo ?? UNASSIGNED) === query.worker) &&
      (query.stage === 'all' || r.item.stageKey === query.stage),
  );
}

export interface WorkGroup {
  /** A staff id or 'none' when grouped by worker; a stage key when grouped by stage. */
  key: string;
  /** The worker, when grouped by worker and the garments have one. */
  staff: Staff | null;
  /** The stage, when grouped by stage. */
  stage: Stage | null;
  refs: ItemRef[];
}

const stageIndex = (ref: ItemRef) => ref.item.stages.findIndex((s) => s.key === ref.item.stageKey);

/**
 * Groups garments for the work list, keeping each group's garments in due order.
 * Worker groups follow the staff list with unassigned garments last. Stage groups follow
 * the stage's position in its garment's stage list, then the stage key.
 */
export function groupWork(refs: ItemRef[], by: WorkGrouping, config: ShopConfig): WorkGroup[] {
  const groups = new Map<string, WorkGroup>();
  for (const ref of [...refs].sort(byDue)) {
    const key = by === 'worker' ? (ref.item.assignedTo ?? UNASSIGNED) : ref.item.stageKey;
    let group = groups.get(key);
    if (!group) {
      group =
        by === 'worker'
          ? { key, staff: config.staff.find((s) => s.id === key) ?? null, stage: null, refs: [] }
          : { key, staff: null, stage: ref.item.stages[stageIndex(ref)]!, refs: [] };
      groups.set(key, group);
    }
    group.refs.push(ref);
  }
  const list = [...groups.values()];
  if (by === 'worker') {
    const rank = (g: WorkGroup) => {
      const index = config.staff.findIndex((s) => s.id === g.key);
      return index < 0 ? Number.MAX_SAFE_INTEGER : index;
    };
    return list.sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key));
  }
  return list.sort((a, b) => stageIndex(a.refs[0]!) - stageIndex(b.refs[0]!) || a.key.localeCompare(b.key));
}

/** The stages the garments are at now, for the stage filter, in the same order as stage groups. */
export function stageOptions(refs: ItemRef[], config: ShopConfig): Stage[] {
  return groupWork(refs, 'stage', config).map((g) => g.stage!);
}

const GROUPINGS: readonly WorkGrouping[] = ['worker', 'stage'];

/** Reads the work-list filters from the URL; anything unknown falls back to the default. */
export function readWorkQuery(params: URLSearchParams): WorkQuery {
  const by = params.get('by') as WorkGrouping | null;
  return {
    by: by && GROUPINGS.includes(by) ? by : DEFAULT_WORK_QUERY.by,
    worker: params.get('worker') || DEFAULT_WORK_QUERY.worker,
    stage: params.get('stage') || DEFAULT_WORK_QUERY.stage,
  };
}

/** The URL form of the filters, leaving defaults out. */
export function writeWorkQuery(query: WorkQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.by !== DEFAULT_WORK_QUERY.by) params.set('by', query.by);
  if (query.worker !== DEFAULT_WORK_QUERY.worker) params.set('worker', query.worker);
  if (query.stage !== DEFAULT_WORK_QUERY.stage) params.set('stage', query.stage);
  return params;
}

const GROUP_RANK: Record<Stage['group'], number> = { unfinished: 0, ready: 1, delivered: 2 };

/**
 * Stages offered when moving several garments at once: every stage at least one selected
 * garment can move forward to, except handing over, which is always done one garment at a time.
 */
export function batchStageTargets(refs: ItemRef[]): Stage[] {
  const found = new Map<string, Stage>();
  for (const { item } of refs) {
    for (const stage of item.stages) {
      if (stage.group === 'delivered' || found.has(stage.key)) continue;
      const check = checkTransition(item.stages, item.stageKey, stage.key);
      if (check.ok && check.kind === 'forward') found.set(stage.key, stage);
    }
  }
  return [...found.values()].sort((a, b) => GROUP_RANK[a.group] - GROUP_RANK[b.group]);
}

export type SkipReason = 'not-in-list' | 'hand-over' | 'same-stage' | 'backward' | 'skips-required';

export type StagePlanRow =
  | { ref: ItemRef; ok: true; from: Stage; to: Stage; skipped: string[] }
  | { ref: ItemRef; ok: false; reason: SkipReason };

/**
 * What moving each selected garment to one stage would do. Only forward moves are made
 * in bulk: going back needs a reason per garment, and handing over is done one at a time.
 */
export function planStageMove(refs: ItemRef[], toKey: string): StagePlanRow[] {
  return refs.map((ref): StagePlanRow => {
    const { item } = ref;
    const to = item.stages.find((s) => s.key === toKey);
    if (!to) return { ref, ok: false, reason: 'not-in-list' };
    if (to.group === 'delivered') return { ref, ok: false, reason: 'hand-over' };
    const check = checkTransition(item.stages, item.stageKey, toKey);
    if (!check.ok) return { ref, ok: false, reason: check.reason === 'same-stage' ? 'same-stage' : 'skips-required' };
    if (check.kind === 'rework') return { ref, ok: false, reason: 'backward' };
    const from = item.stages.find((s) => s.key === item.stageKey)!;
    return { ref, ok: true, from, to, skipped: check.skipped };
  });
}

export function stageMoveBody(row: Extract<StagePlanRow, { ok: true }>): EventBody {
  return { type: 'item.stageChanged', orderId: row.ref.order.id, itemId: row.ref.item.id, to: row.to.key, reason: '' };
}

export type AssignPlanRow = { ref: ItemRef; ok: true } | { ref: ItemRef; ok: false; reason: 'already-assigned' };

/** What giving each selected garment to one person (or to nobody, with null) would do. */
export function planAssign(refs: ItemRef[], assigneeId: string | null): AssignPlanRow[] {
  return refs.map((ref) =>
    ref.item.assignedTo === assigneeId ? { ref, ok: false, reason: 'already-assigned' } : { ref, ok: true },
  );
}

/** Carries the garment's version from when the preview was opened, so a change made since is a conflict. */
export function assignBody(ref: ItemRef, assigneeId: string | null): EventBody {
  return {
    type: 'item.assigned',
    orderId: ref.order.id,
    itemId: ref.item.id,
    baseVersion: ref.item.version,
    assigneeId,
  };
}

/** Active people who make garments and work in every one of these branches. */
export function assignees(config: ShopConfig, branchIds: string[]): Staff[] {
  return config.staff.filter((staff) => {
    const role = config.roles.find((r) => r.id === staff.roleId);
    return (
      staff.active &&
      role !== undefined &&
      can(role, 'work.updateStage') &&
      branchIds.every((branchId) => canAccessBranch(staff, branchId))
    );
  });
}

export interface BatchResult {
  ref: ItemRef;
  /** Null when the change was saved. */
  problem: string | null;
}

/**
 * Saves the changes one garment at a time, in order, so one garment's problem does not
 * stop the others, and reports what happened to each.
 */
export async function runBatch(
  dispatch: (body: EventBody) => Promise<ApplyOutcome>,
  steps: Array<{ ref: ItemRef; body: EventBody }>,
  language: Language,
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  for (const { ref, body } of steps) {
    const outcome = await dispatch(body);
    results.push({ ref, problem: problemText(outcome, language) });
  }
  return results;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/features/work`
Expected: PASS (11 tests). Then `npx vitest run`: 272 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/work
git commit -m "feat(web): add the work-list model with batch planning"
```

---

### Task 5: Work lists page

Makers see what is on their table; supervisors see everyone's work and move or hand out several garments at once, with a preview and a result for each garment.

**Files:**
- Create: `apps/web/src/features/work/useWorkList.ts`, `apps/web/src/features/work/WorkPage.tsx`, `apps/web/src/features/work/WorkGroupTable.tsx`, `apps/web/src/features/work/batchDialogs.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (the `work` route renders `WorkPage` under `RequireCapability anyOf={navItem('work').requires}`)
- Test: `apps/web/src/features/work/WorkPage.test.tsx`

**Interfaces:**
- Consumes: Task 4's `workList.ts`; `useScopedState`, `useBranchScope` (Task 2); `itemTitle`; `Dialog`, `SelectField`, `Checkbox`.
- Produces: `useWorkList(): { viewer: Viewer; query: WorkQuery; setQuery(query: WorkQuery): void; all: ItemRef[]; shown: ItemRef[]; groups: WorkGroup[] }`. It reads the query from the URL with `readWorkQuery` and writes it with `writeWorkQuery` (replace, not push). Viewers without `work.view.all` always get `by: 'stage'` and `worker: 'all'`, whatever the URL says. `all` is `workItems` over `useScopedState()`; `shown` is `filterWork(all, query)`; `groups` is `groupWork(shown, query.by, config)`. Task 6's print page uses it too.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `work.count` | {n}টি পোশাক | {n} garments |
| `work.groupBy` | ভাগ করুন | Group by |
| `work.byWorker` | কারিগর অনুযায়ী | By worker |
| `work.byStage` | ধাপ অনুযায়ী | By stage |
| `work.worker` | কারিগর | Worker |
| `work.everyone` | সবাই | Everyone |
| `work.unassigned` | কারিগর ঠিক হয়নি | No worker yet |
| `work.stage` | ধাপ | Stage |
| `work.allStages` | সব ধাপ | All stages |
| `work.empty` | এখন কোনো কাজ নেই | No work right now |
| `work.late` | দেরি | Late |
| `work.select` | {item} বেছে নিন | Select {item} |
| `work.selectGroup` | সব বেছে নিন: {group} | Select all: {group} |
| `work.selected` | {n}টি বাছাই করা হয়েছে | {n} selected |
| `work.assign` | কারিগর ঠিক করুন | Assign worker |
| `work.clearSelection` | বাছাই মুছুন | Clear selection |
| `work.nobody` | কেউ নেই | Nobody |
| `work.preview` | যা হবে | What will happen |
| `work.results` | ফলাফল | Results |
| `work.done` | হয়েছে | Done |
| `work.skipped` | বাদ গেছে | Skipped |
| `work.change` | {from} → {to} | {from} → {to} |
| `work.skip.assigned` | আগে থেকেই {name} | Already with {name} |
| `work.skip.not-in-list` | এই পোশাকে এই ধাপ নেই | This garment has no such stage |
| `work.skip.hand-over` | হস্তান্তর একটা একটা করে করুন | Hand garments over one at a time |
| `work.skip.same-stage` | আগে থেকেই এই ধাপে | Already at this stage |
| `work.skip.backward` | পেছনে নিতে হলে পোশাকের পাতায় কারণসহ করুন | Moving back needs a reason, on the garment itself |
| `work.skip.skips-required` | মাঝের জরুরি ধাপ বাদ পড়ে | Would skip a required stage |
| `work.bulkNote` | টাকা নেওয়া আর হস্তান্তর একসাথে করা যায় না। | Payments and hand-overs are never done in bulk. |

The batch stage dialog reuses `item.changeStage` (ধাপ বদলান) for its button and title and `item.newStage` (নতুন ধাপ) for its select. Columns reuse `orders.col.order`, `receipt.garment`, `receipt.wearer` and `receipt.delivery`.

**Done when:**
- The heading is `কাজের তালিকা` (`nav.work`), with `{n}টি পোশাক` for the garments shown.
- With `work.view.all`: a `ভাগ করুন` select (`কারিগর অনুযায়ী`, `ধাপ অনুযায়ী`), a `কারিগর` select (`সবাই`, the active `assignees` for the branches in scope, anyone else holding a listed garment, then `কারিগর ঠিক হয়নি` with value `none`) and a `ধাপ` select (`সব ধাপ` and `stageOptions`). With only `work.view.assigned`: the `ধাপ` select alone, and the list is the person's own garments by stage.
- Each group is a `<section>` region named by its title (the worker's name, `কারিগর ঠিক হয়নি`, or the stage label) holding a table with the same name. Columns: অর্ডার (a link to the order), পোশাক (`itemTitle`), কে পরবেন, then ধাপ when grouped by worker or কারিগর when grouped by stage, then ডেলিভারি with `দেরি` beside dates before today. No money anywhere.
- When the person can assign (`work.assign`) or move stages (`work.updateStage`), each row starts with a checkbox named `{number} {itemTitle} বেছে নিন` (for example `A-0027 স্কুল শার্ট ২১ বেছে নিন`), and each table header has one named `সব বেছে নিন: {group title}`. The selection is a set of item ids and survives regrouping and filtering.
- With one or more selected, a bar shows `{n}টি বাছাই করা হয়েছে`, `কারিগর ঠিক করুন` (with `work.assign`), `ধাপ বদলান` (with `work.updateStage`) and `বাছাই মুছুন`. On a phone the bar sits at the top of the list, under the header, so it never covers the tab bar or the New Order button.
- Opening a batch dialog takes the selected garments from the state at that moment and keeps them: the preview and the saved changes use those copies, never later ones.
- `কারিগর ঠিক করুন` dialog: a `কারিগর` select (`কেউ নেই`, then `assignees(config, branches of the selected garments)`), and a list named `যা হবে` with one item per garment: `{number} {itemTitle}: {from} → {to}` or `{number} {itemTitle}: আগে থেকেই {name}`.
- `ধাপ বদলান` dialog: a `নতুন ধাপ` select of `batchStageTargets` (first one chosen), the `work.bulkNote` line, and the `যা হবে` list with `{from} → {to}` or the skip reason (`work.skip.*`) for each garment.
- `নিশ্চিত করুন` is disabled while nothing would change. Clicking it runs `runBatch` over the rows that would change, then shows a list named `ফলাফল` with one item per selected garment: its title, then `হয়েছে`, the problem text, or `বাদ গেছে` in an element of its own. The dialog's button then reads `বন্ধ করুন`; closing clears the selection.
- Enter in the dialog's select does nothing; only the button saves.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/work/WorkPage.test.tsx`:

```tsx
import { itemSummaryGroup, itemsForWorker, toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { workItems } from './workList';

const bn = (n: number) => toBanglaDigits(String(n));
const supervisor = { staffId: 'uniform-supervisor', pin: '3333' };
const region = (name: string) => screen.getByRole('region', { name });

describe('Work lists', () => {
  it('lists every unfinished garment for the owner, by worker or by stage', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/work' });
    const refs = workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });
    expect(await screen.findByText(`${bn(refs.length)}টি পোশাক`)).toBeTruthy();
    expect(within(region('কারিগর ঠিক হয়নি')).getAllByRole('row')).toHaveLength(refs.length + 1);

    await userEvent.selectOptions(screen.getByLabelText('ভাগ করুন'), 'ধাপ অনুযায়ী');
    expect(router.state.location.search).toBe('?by=stage');
    const stitching = refs.filter((r) => r.item.stageKey === 'stitching').length;
    expect(within(await screen.findByRole('region', { name: 'সেলাই' })).getAllByRole('row')).toHaveLength(stitching + 1);
  });

  it('shows a tailor only their own garments, by stage, without the worker filter', async () => {
    const { store } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/app/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    const mine = itemsForWorker(Object.values(store.getSnapshot().state.orders), 'nakshi-tailor');
    expect(await screen.findByText(`${bn(mine.length)}টি পোশাক`)).toBeTruthy();
    expect(screen.queryByLabelText('কারিগর')).toBeNull();
    expect(screen.queryByLabelText('ভাগ করুন')).toBeNull();
    expect(region('সেলাই')).toBeTruthy();
  });

  it('gives several garments to one worker after a preview, skipping ones they already have', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'সব বেছে নিন: রফিক মিয়া' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'সব বেছে নিন: সেলিম শেখ' }));
    expect(screen.getByText('৬টি বাছাই করা হয়েছে')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('কারিগর'), 'সেলিম শেখ');
    const preview = within(dialog).getByRole('list', { name: 'যা হবে' });
    expect(within(preview).getAllByRole('listitem')).toHaveLength(6);
    expect(within(preview).getAllByText(/আগে থেকেই সেলিম শেখ/)).toHaveLength(4);
    expect(within(preview).getAllByText(/রফিক মিয়া → সেলিম শেখ/)).toHaveLength(2);

    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    const results = await within(dialog).findByRole('list', { name: 'ফলাফল' });
    expect(within(results).getAllByText('হয়েছে')).toHaveLength(2);
    expect(within(results).getAllByText('বাদ গেছে')).toHaveLength(4);
    const items = store.getSnapshot().state.orders['uniform-o27']!.items.filter((i) => itemSummaryGroup(i) === 'unfinished');
    expect(items.every((i) => i.assignedTo === 'uniform-tailor-2')).toBe(true);

    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(screen.queryByRole('region', { name: 'রফিক মিয়া' })).toBeNull();
    expect(screen.queryByText('৬টি বাছাই করা হয়েছে')).toBeNull();
  });

  it('moves garments forward together, with a result for each', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work?by=stage', as: supervisor });
    await userEvent.click(await screen.findByRole('checkbox', { name: 'সব বেছে নিন: কাটিং' }));
    await userEvent.click(screen.getByRole('button', { name: 'ধাপ বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'ধাপ বদলান' });
    const targets = within(within(dialog).getByLabelText('নতুন ধাপ')).getAllByRole('option');
    expect(targets.map((o) => o.textContent)).toEqual(['সেলাই']);
    expect(within(within(dialog).getByRole('list', { name: 'যা হবে' })).getAllByText(/কাটিং → সেলাই/)).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    expect(within(await within(dialog).findByRole('list', { name: 'ফলাফল' })).getAllByText('হয়েছে')).toHaveLength(6);
    expect(store.getSnapshot().state.orders['uniform-o27']!.items.filter((i) => i.stageKey === 'stitching')).toHaveLength(6);

    await userEvent.click(within(dialog).getByRole('button', { name: 'বন্ধ করুন' }));
    expect(within(region('সেলাই')).getAllByRole('row')).toHaveLength(7);
  });

  it('reports a garment someone changed after the preview opened, and keeps their change', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/work', as: supervisor });
    const order = store.getSnapshot().state.orders['uniform-o27']!;
    const item = order.items.find((i) => i.assignedTo === 'uniform-tailor-1' && itemSummaryGroup(i) === 'unfinished')!;
    const title = `${order.number} ${item.garmentName.bn} ${bn(order.items.indexOf(item) + 1)}`;
    await userEvent.click(await screen.findByRole('checkbox', { name: `${title} বেছে নিন` }));
    await userEvent.click(screen.getByRole('button', { name: 'কারিগর ঠিক করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'কারিগর ঠিক করুন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('কারিগর'), 'সেলিম শেখ');

    await act(() =>
      store.dispatch({ type: 'item.assigned', orderId: order.id, itemId: item.id, baseVersion: item.version, assigneeId: 'uniform-owner' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'নিশ্চিত করুন' }));
    const results = await within(dialog).findByRole('list', { name: 'ফলাফল' });
    expect(within(results).getByText('এর মধ্যে অন্য কেউ এটি বদলেছেন। নতুন তথ্য দেখে আবার চেষ্টা করুন।')).toBeTruthy();
    const after = store.getSnapshot().state.orders[order.id]!.items.find((i) => i.id === item.id)!;
    expect(after.assignedTo).toBe('uniform-owner');
  });
});
```

Sample data these tests rely on: Rahman Tailors has no workers, so every unfinished garment is unassigned. The Uniform House supervisor works only in the workshop, where the one order is the group order `uniform-o27`. Its six unfinished garments are at cutting, two with রফিক মিয়া and four with সেলিম শেখ.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/work/WorkPage.test.tsx`
Expected: FAIL (the page is still the placeholder).

- [ ] **Step 3: Build `useWorkList`, the page, the group tables and the two dialogs to the done-conditions, and route the page**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/work`
Expected: PASS (16 tests). Then `npx vitest run`: 277 tests pass (the global search tests that start on `/app/work` still pass).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add work lists with previewed batch assignment and stage moves"
```

---

### Task 6: Work-list print

A paper list for the workshop wall or a maker's table, with the same filters as the screen.

**Files:**
- Modify: `apps/web/src/features/print/PrintLayout.tsx`, `ReceiptPage.tsx`, `JobSlipPage.tsx`, `FabricTagsPage.tsx`
- Create: `apps/web/src/features/print/WorkListPrintPage.tsx`
- Modify: `apps/web/src/features/work/WorkPage.tsx` (print link), `apps/web/src/app/AppRoutes.tsx` (`/print/work`)
- Test: `apps/web/src/features/print/WorkListPrint.test.tsx`

**Interfaces:**
- Consumes: `useWorkList` (Task 5); `usePrintLanguage`; `translate`, `formatDate`.
- Produces: `PrintLayoutProps.back: { to: string; label: string }`, replacing `orderId`. The order print pages pass `{ to: '/app/orders/:orderId', label: t('print.back') }`; their tests do not change.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `work.print` | তালিকা প্রিন্ট করুন | Print this list |
| `print.backToWork` | কাজের তালিকায় ফিরে যান | Back to the work list |
| `print.printedOn` | প্রিন্টের তারিখ: {date} | Printed on {date} |
| `work.col.notes` | নোট | Notes |

**Done when:**
- The work page has a link `তালিকা প্রিন্ট করুন` to `/print/work` plus the page's current query string.
- The print page is outside the shell: the toolbar (back link `কাজের তালিকায় ফিরে যান` to `/app/work` plus the same query, language buttons, print button) is in `.no-print`.
- The document has an `<h1>` `কাজের তালিকা`, the shop name, `প্রিন্টের তারিখ: {date}`, and, when filtered, `কারিগর: {name}` and `ধাপ: {stage}` lines (reusing `item.worker` and `item.stage`).
- Each group is an `<h2>` and a table named by the group title, with a `<thead>` so headers repeat on every printed page. Columns: অর্ডার, পোশাক, কে পরবেন, then কারিগর when grouped by stage or ধাপ when grouped by worker, ট্রায়াল, ডেলিভারি, and an empty নোট column for handwriting. Rows use the `.print-block` rule so a row is never split across pages.
- All text is in the print language, which starts as the app language and never changes it.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/print/WorkListPrint.test.tsx`:

```tsx
import { itemsForWorker } from '@darzikhata/domain';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';
import { workItems } from '../work/workList';

const printedRows = () =>
  screen.getAllByRole('table').reduce((sum, table) => sum + within(table).getAllByRole('row').length - 1, 0);
const ownerWork = (store: ShopStore) =>
  workItems(Object.values(store.getSnapshot().state.orders), { staffId: 'rahman-owner', seesAll: true });

describe('Work-list print', () => {
  it('prints outside the app, one table per group with repeating headers', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?by=stage' });
    expect(await screen.findByRole('heading', { name: 'কাজের তালিকা' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();
    expect(printedRows()).toBe(ownerWork(store).length);

    const stitching = screen.getByRole('table', { name: 'সেলাই' });
    expect(within(stitching).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'অর্ডার',
      'পোশাক',
      'কে পরবেন',
      'কারিগর',
      'ট্রায়াল',
      'ডেলিভারি',
      'নোট',
    ]);
    expect(stitching.querySelector('thead')).not.toBeNull();
    expect(screen.getByRole('link', { name: 'কাজের তালিকায় ফিরে যান' }).getAttribute('href')).toBe('/app/work?by=stage');
  });

  it('prints only the filtered garments and says which filter', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/print/work?stage=trial' });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(printedRows()).toBe(ownerWork(store).filter((r) => r.item.stageKey === 'trial').length);
    expect(screen.getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('is linked from the work page with the same filters', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/work?by=stage&stage=cutting' });
    const link = await screen.findByRole('link', { name: 'তালিকা প্রিন্ট করুন' });
    expect(link.getAttribute('href')).toBe('/print/work?by=stage&stage=cutting');
  });

  it('prints a tailor’s own garments only', async () => {
    const { store } = await renderApp({
      layout: 'desktop',
      shop: 'nakshi',
      path: '/print/work',
      as: { staffId: 'nakshi-tailor', pin: '4444' },
    });
    await screen.findByRole('heading', { name: 'কাজের তালিকা' });
    expect(printedRows()).toBe(itemsForWorker(Object.values(store.getSnapshot().state.orders), 'nakshi-tailor').length);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/print/WorkListPrint.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Change `PrintLayout` to take `back`, update the three order print pages, build `WorkListPrintPage`, add the link and the route**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/print src/features/work`
Expected: PASS (the existing print tests unchanged, plus 4). Then `npx vitest run`: 281 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): print the filtered work list"
```

---
### Task 7: Status links in the order

Counter staff create a link for the customer, share it, and turn it off when it should stop working.

**Files:**
- Create: `apps/web/src/lib/share.ts`, `apps/web/src/features/links/statusLink.ts`, `apps/web/src/features/links/StatusLinkSection.tsx`
- Modify: `apps/web/src/features/print/ReceiptPage.tsx` (use `shareOrCopy`), `apps/web/src/features/orders/OrderDetail.tsx` (the section, with `links.manage`)
- Test: `apps/web/src/features/links/statusLink.test.ts`, `apps/web/src/features/links/StatusLink.test.tsx`

**Interfaces:**
- Consumes: `tokenFromBytes`, `activeLink`, `linkState`, `isOrderClosed`, `shopContact` from `@darzikhata/domain`.
- Produces:
  - `shareOrCopy(title: string, text: string): Promise<'shared' | 'copied' | 'failed'>`: the Web Share API when there is one (closing the share sheet still counts as `'shared'`), otherwise `navigator.clipboard.writeText`; `'failed'` when copying is blocked. The receipt's share button uses it, with no change to its tests.
  - `newLinkToken(fill?: (bytes: Uint8Array) => Uint8Array): string`: 16 random bytes (default `crypto.getRandomValues`) through `tokenFromBytes`.
  - `statusPath(token): string` (`/s/{token}`) and `statusUrl(origin, token): string`.
  - `linkShareText(shopName, orderNumber, url, language): string`.
  - `StatusLinkSection({ order })`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `link.section` | স্ট্যাটাস লিংক | Status link |
| `link.about` | কাস্টমার এই লিংকে অর্ডারের অগ্রগতি দেখতে পারবেন। দাম, মাপ বা পেমেন্ট দেখাবে না। | The customer can follow the order at this link. It never shows prices, measurements or payments. |
| `link.demoNote` | ডেমোতে লিংকটি শুধু এই ব্রাউজারেই খোলে। | In the demo, the link opens only in this browser. |
| `link.create` | লিংক তৈরি করুন | Create link |
| `link.url` | লিংক | Link |
| `link.open` | খুলে দেখুন | Open |
| `link.revoke` | লিংক বন্ধ করুন | Turn off link |
| `link.revokeTitle` | লিংক বন্ধ করবেন? | Turn off this link? |
| `link.revokeBody` | এই লিংক আর কাজ করবে না। পরে নতুন লিংক তৈরি করা যাবে। | This link will stop working. You can create a new one later. |
| `link.expiresAfter` | অর্ডার শেষ হওয়ার {n} দিন পর লিংকটি নিজে থেকে বন্ধ হবে। | The link stops working {n} days after the order is finished. |
| `link.expired` | অর্ডার শেষ হওয়ার {n} দিন পার হয়েছে, তাই লিংকটি আর কাজ করে না। | More than {n} days have passed since the order was finished, so the link no longer works. |
| `link.shareText` | {shop}: অর্ডার {number} এর অবস্থা দেখুন: {url} | {shop}: see the progress of order {number}: {url} |

The share button reuses `print.share` (শেয়ার করুন) and the copy notice reuses `print.copied` (কপি হয়েছে).

**Done when:**
- `OrderDetail` shows the section, a `<section>` region named `স্ট্যাটাস লিংক`, only with `links.manage`. It always shows `link.about`, `link.demoNote` and `link.expiresAfter` (with the shop's `linkExpiryDays`).
- With no active link: a `লিংক তৈরি করুন` button that dispatches `link.created` with `newLinkToken()`.
- With an active link (`activeLink(order)`): a read-only text field labelled `লিংক` holding `statusUrl(window.location.origin, token)`, a `শেয়ার করুন` button (`shareOrCopy` with `linkShareText`; shows `কপি হয়েছে` in a `role="status"` element after copying), a `খুলে দেখুন` link to `statusPath(token)`, and `লিংক বন্ধ করুন`.
- `লিংক বন্ধ করুন` opens a dialog `লিংক বন্ধ করবেন?` with `link.revokeBody`, `বাতিল` and a `লিংক বন্ধ করুন` button that dispatches `link.revoked`.
- When the active link's `linkState` is `expired`, the section shows `link.expired` instead of the field and buttons, and no create button (a new link would be expired too).
- A refused save shows `problemText` in a `role="alert"` element inside the section.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/links/statusLink.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { linkShareText, newLinkToken, statusPath, statusUrl } from './statusLink';

describe('status links', () => {
  it('makes a 22-character URL-safe token from 16 random bytes', () => {
    expect(newLinkToken((bytes) => bytes.fill(255))).toBe(`${'_'.repeat(21)}w`);
    const a = newLinkToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newLinkToken()).not.toBe(a);
  });

  it('builds the public address', () => {
    expect(statusPath('abc')).toBe('/s/abc');
    expect(statusUrl('https://darzikhata.example', 'abc')).toBe('https://darzikhata.example/s/abc');
  });

  it('writes the message sent to the customer', () => {
    expect(linkShareText('রহমান টেইলার্স', 'A-0040', 'https://x/s/abc', 'bn')).toBe(
      'রহমান টেইলার্স: অর্ডার A-0040 এর অবস্থা দেখুন: https://x/s/abc',
    );
    expect(linkShareText('Rahman Tailors', 'A-0040', 'https://x/s/abc', 'en')).toBe(
      'Rahman Tailors: see the progress of order A-0040: https://x/s/abc',
    );
  });
});
```

`apps/web/src/features/links/StatusLink.test.tsx`:

```tsx
import { isOrderClosed, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SeedShopKey } from '../../seed/shops';
import { renderApp } from '../../test/renderApp';

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
});

async function openOrder(shop: SeedShopKey, keep: (order: Order) => boolean, as?: { staffId: string; pin: string }) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders', ...(as ? { as } : {}) });
  const order = Object.values(app.store.getSnapshot().state.orders).find(keep)!;
  await act(() => app.router.navigate(`/app/orders/${order.id}`));
  await screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
  return { ...app, order };
}

const section = () => screen.getByRole('region', { name: 'স্ট্যাটাস লিংক' });
const urlField = () => within(section()).getByLabelText('লিংক') as HTMLInputElement;

describe('Status link section', () => {
  it('creates a link and shows where it goes', async () => {
    const { store, order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    expect(within(section()).getByText('ডেমোতে লিংকটি শুধু এই ব্রাউজারেই খোলে।')).toBeTruthy();
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));

    await within(section()).findByLabelText('লিংক');
    const links = store.getSnapshot().state.orders[order.id]!.links;
    expect(links).toHaveLength(1);
    expect(links[0]!.token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(urlField().value).toBe(`${window.location.origin}/s/${links[0]!.token}`);
    expect(urlField().readOnly).toBe(true);
    expect(within(section()).getByRole('link', { name: 'খুলে দেখুন' }).getAttribute('href')).toBe(`/s/${links[0]!.token}`);
  });

  it('shares the link, or copies it when sharing is not available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    const { order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await userEvent.click(await within(section()).findByRole('button', { name: 'শেয়ার করুন' }));
    const text = `রহমান টেইলার্স: অর্ডার ${order.number} এর অবস্থা দেখুন: ${urlField().value}`;
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ text }));

    Reflect.deleteProperty(navigator, 'share');
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await userEvent.click(within(section()).getByRole('button', { name: 'শেয়ার করুন' }));
    expect(writeText).toHaveBeenCalledWith(text);
    expect((await within(section()).findByRole('status')).textContent).toBe('কপি হয়েছে');
  });

  it('turns the link off after confirming', async () => {
    const { store, order } = await openOrder('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(within(section()).getByRole('button', { name: 'লিংক তৈরি করুন' }));
    await userEvent.click(await within(section()).findByRole('button', { name: 'লিংক বন্ধ করুন' }));
    const dialog = await screen.findByRole('dialog', { name: 'লিংক বন্ধ করবেন?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'লিংক বন্ধ করুন' }));

    expect(await within(section()).findByRole('button', { name: 'লিংক তৈরি করুন' })).toBeTruthy();
    expect(store.getSnapshot().state.orders[order.id]!.links[0]!.revokedAt).not.toBeNull();
  });

  it('is only for staff who may manage links', async () => {
    await openOrder('uniform', (o) => o.id === 'uniform-o27', { staffId: 'uniform-supervisor', pin: '3333' });
    expect(screen.queryByRole('region', { name: 'স্ট্যাটাস লিংক' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/links`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `share.ts` and `statusLink.ts`, move the receipt's share logic onto `shareOrCopy`, and build the section to the done-conditions**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/links src/features/print`
Expected: PASS (7 new tests; the receipt share test unchanged). Then `npx vitest run`: 288 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): create, share and turn off status links"
```

---

### Task 8: Public status page

What the customer sees when they open the link: the shop, the order number, and where each garment is. Nothing else.

**Files:**
- Create: `apps/web/src/features/links/StatusPage.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`/s/:token` at the top level, lazy, inside its own `Suspense`)
- Test: `apps/web/src/features/links/StatusPage.test.tsx`

**Interfaces:**
- Consumes: `findOrderByToken`, `linkState`, `publicOrderView`, `shopContact` from `@darzikhata/domain`; `LanguageToggle` from `shell/ShellParts.tsx`.
- Produces: `StatusPage`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `status.garments` | পোশাকের অবস্থা | Garment progress |
| `status.group.unfinished` | তৈরি হচ্ছে | Being made |
| `status.group.ready` | রেডি, নিয়ে যেতে পারেন | Ready to collect |
| `status.group.delivered` | ডেলিভারি হয়েছে | Delivered |
| `status.group.cancelled` | বাতিল | Cancelled |
| `status.updated` | সর্বশেষ আপডেট: {date} | Last updated: {date} |
| `status.phone` | ফোন: {phone} | Phone: {phone} |
| `status.expired` | এই লিংকটি আর কাজ করে না। দোকানে যোগাযোগ করুন। | This link no longer works. Please contact the shop. |
| `status.notFound` | এই লিংকটি পাওয়া যায়নি। ডেমোতে লিংক শুধু যে ব্রাউজারে তৈরি হয়েছে সেখানেই খোলে। | This link was not found. In the demo, links open only in the browser where they were created. |

The order heading reuses `receipt.orderNumber` (অর্ডার {number}); dates reuse `item.trial` and `item.delivery`.

**Done when:**
- The page renders without the app shell and without sign-in, with the store in any state: `loading` shows `Loading`; `empty`, an unknown token, or no order shows `status.notFound`; `revoked` or `expired` (`linkState` with `new Date().toISOString()` and the shop's `linkExpiryDays`) shows `status.expired`.
- An active link shows: an `<h1>` with the shop name, the shop's phone (`status.phone`, the number as a `tel:` link) and address, an `<h2>` `অর্ডার {number}`, `status.updated`, and a list named `পোশাকের অবস্থা` with one item per garment: its name, the wearer when there is one, `status.group.*` with the stage label, and the trial and delivery dates when set.
- Everything shown comes from `publicOrderView(order, shopContact(config, language))`. Never read the order itself in the page, so nothing private can leak.
- A `LanguageToggle` switches between Bangla and English.
- The page is readable at 375px: one column, large text.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/links/StatusPage.test.tsx`:

```tsx
import { isOrderClosed, orderClosedAt, todayInDhaka, type Order } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { addDays } from '../../lib/dates';
import type { SeedShopKey } from '../../seed/shops';
import { renderApp } from '../../test/renderApp';

const TOKEN = 'TestToken_0123456789ab';

/** Creates a link as the owner, signs out, and opens the link like a customer would. */
async function openAsCustomer(
  shop: SeedShopKey,
  keep: (order: Order) => boolean,
  before?: (store: ShopStore, order: Order) => Promise<unknown>,
) {
  const app = await renderApp({ layout: 'mobile', shop, path: '/app' });
  const order = Object.values(app.store.getSnapshot().state.orders).find(keep)!;
  await act(async () => {
    await app.store.dispatch({ type: 'link.created', orderId: order.id, token: TOKEN });
    await before?.(app.store, order);
    await app.store.signOut();
  });
  await act(() => app.router.navigate(`/s/${TOKEN}`));
  return { ...app, order };
}

describe('Public status page', () => {
  it('shows the order’s progress and nothing private', async () => {
    const { store, order } = await openAsCustomer('uniform', (o) => o.id === 'uniform-o27');
    expect(await screen.findByRole('heading', { name: 'ইউনিফর্ম হাউস' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: `অর্ডার ${order.number}` })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: 'প্রধান মেনু' })).toBeNull();

    const garments = screen.getByRole('list', { name: 'পোশাকের অবস্থা' });
    expect(within(garments).getAllByRole('listitem')).toHaveLength(order.items.length);
    expect(within(garments).getAllByText('ক্লাস ৭ - রাফি')).toHaveLength(2);
    expect(within(garments).getAllByText(/ডেলিভারি হয়েছে/).length).toBeGreaterThan(0);

    const text = document.body.textContent!;
    const { config, state } = store.getSnapshot();
    const customer = state.customers[order.customerId]!;
    expect(text).not.toContain('৳');
    expect(text).not.toContain(customer.name);
    expect(text).not.toContain(customer.phone!);
    expect(text).not.toContain(order.notes);
    for (const staff of config!.staff) expect(text).not.toContain(staff.name);
  });

  it('says a turned-off link no longer works', async () => {
    await openAsCustomer('rahman', (o) => !isOrderClosed(o), (store, order) =>
      store.dispatch({ type: 'link.revoked', orderId: order.id, token: TOKEN }),
    );
    expect(await screen.findByText('এই লিংকটি আর কাজ করে না। দোকানে যোগাযোগ করুন।')).toBeTruthy();
    expect(screen.queryByRole('list', { name: 'পোশাকের অবস্থা' })).toBeNull();
  });

  it('expires the link the set number of days after the order is finished', async () => {
    const twoDaysAgo = addDays(todayInDhaka(new Date()), -2);
    await openAsCustomer(
      'rahman',
      (o) => (orderClosedAt(o) ?? '9999') < twoDaysAgo,
      (store) => store.updateConfig((c) => ({ ...c, settings: { ...c.settings, linkExpiryDays: 1 } })),
    );
    expect(await screen.findByText('এই লিংকটি আর কাজ করে না। দোকানে যোগাযোগ করুন।')).toBeTruthy();
  });

  it('explains a link this browser does not know', async () => {
    await renderApp({ layout: 'mobile', path: '/s/unknown-token' });
    expect(
      await screen.findByText('এই লিংকটি পাওয়া যায়নি। ডেমোতে লিংক শুধু যে ব্রাউজারে তৈরি হয়েছে সেখানেই খোলে।'),
    ).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeNull();
  });

  it('switches to English', async () => {
    const { order } = await openAsCustomer('rahman', (o) => !isOrderClosed(o));
    await userEvent.click(await screen.findByRole('button', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: `Order ${order.number}` })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Rahman Tailors' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/links/StatusPage.test.tsx`
Expected: FAIL (the route sends unknown paths to `/`).

- [ ] **Step 3: Build `StatusPage` to the done-conditions and add the route**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/links`
Expected: PASS (12 tests). Then `npx vitest run`: 293 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add the public status page for customers"
```

---

### Task 9: Group orders by wearer

A school order for twelve children is easier to follow child by child: who is ready, who has collected.

**Files:**
- Create: `apps/web/src/features/orders/wearers.ts`
- Modify: `apps/web/src/features/orders/OrderDetail.tsx`
- Test: `apps/web/src/features/orders/wearers.test.ts`, `apps/web/src/features/orders/OrderDetail.wearers.test.tsx`

**Interfaces:**
- Consumes: `orderProgress` from `@darzikhata/domain`; `progressText`; `ItemCard`.
- Produces: `interface WearerGroup { wearer: string | null; items: OrderItem[]; progress: OrderProgress }` and `wearerGroups(order: Order): WearerGroup[]`: groups in order of first appearance, garments without a wearer last; empty when no garment names a wearer.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `wearers.summary` | কে পরবেন অনুযায়ী | By wearer |
| `wearers.others` | নাম ছাড়া পোশাক | Garments without a name |

Columns reuse `receipt.wearer` and `orders.col.progress`.

**Done when:**
- When `wearerGroups(order)` is empty, the detail is unchanged.
- Otherwise, above the garments, a table named `কে পরবেন অনুযায়ী` has one row per group: the wearer (or `নাম ছাড়া পোশাক`) and `progressText(group.progress)`.
- The garment cards are then shown in one `<section>` region per group, named by the wearer (or `নাম ছাড়া পোশাক`), with an `<h3>` and the group's progress text above its cards.

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/orders/wearers.test.ts`:

```ts
import { makeItem, makeOrder } from '@darzikhata/domain/testing';
import { describe, expect, it } from 'vitest';
import { wearerGroups } from './wearers';

describe('wearerGroups', () => {
  it('is empty when no garment names a wearer', () => {
    expect(wearerGroups(makeOrder())).toEqual([]);
  });

  it('groups garments by wearer in order of first appearance, unnamed last, with progress', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', wearer: 'Rafi', stageKey: 'delivered' }),
        makeItem({ id: 'b', wearer: 'Tanha' }),
        makeItem({ id: 'c' }),
        makeItem({ id: 'd', wearer: 'Rafi', stageKey: 'ready' }),
      ],
    });
    const groups = wearerGroups(order);
    expect(groups.map((g) => [g.wearer, g.items.map((i) => i.id)])).toEqual([
      ['Rafi', ['a', 'd']],
      ['Tanha', ['b']],
      [null, ['c']],
    ]);
    expect(groups[0]!.progress).toEqual({ unfinished: 0, ready: 1, delivered: 1, cancelled: 0, total: 2 });
  });
});
```

`apps/web/src/features/orders/OrderDetail.wearers.test.tsx`:

```tsx
import { act, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

async function openDetail(shop: 'rahman' | 'uniform', orderId: string) {
  const app = await renderApp({ layout: 'desktop', shop, path: '/app/orders' });
  await screen.findByRole('table', { name: 'অর্ডার তালিকা' });
  await act(() => app.router.navigate(`/app/orders/${orderId}`));
  return screen.findByRole('region', { name: 'অর্ডারের বিস্তারিত' });
}

describe('Group order detail', () => {
  it('groups the garments by wearer with each wearer’s progress', async () => {
    const detail = await openDetail('uniform', 'uniform-o27');
    const summary = within(detail).getByRole('table', { name: 'কে পরবেন অনুযায়ী' });
    expect(within(summary).getAllByRole('row')).toHaveLength(13);
    expect(within(summary).getByRole('row', { name: /ক্লাস ৭ - রাফি/ }).textContent).toContain('মোট ২টি: ২টি ডেলিভারি হয়েছে');

    const rafi = within(detail).getByRole('region', { name: 'ক্লাস ৭ - রাফি' });
    expect(within(rafi).getByText('মোট ২টি: ২টি ডেলিভারি হয়েছে')).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল শার্ট ১' })).toBeTruthy();
    expect(within(rafi).getByRole('region', { name: 'স্কুল প্যান্ট ২' })).toBeTruthy();
    const sadia = within(detail).getByRole('region', { name: 'ক্লাস ৭ - সাদিয়া' });
    expect(within(sadia).getByText('মোট ২টি: ২টি চলছে')).toBeTruthy();
  });

  it('keeps the plain garment list when nobody is named', async () => {
    const detail = await openDetail('rahman', 'rahman-o40');
    expect(within(detail).queryByRole('table', { name: 'কে পরবেন অনুযায়ী' })).toBeNull();
  });
});
```

Sample data: in `uniform-o27` each of twelve children has a school shirt and a school pant. The first five children's garments are delivered, the next four are ready, and the last three are at cutting.

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/orders/wearers.test.ts src/features/orders/OrderDetail.wearers.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `wearers.ts` (count each group with `orderProgress({ ...order, items })`) and group the cards in `OrderDetail` to the done-conditions**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/orders`
Expected: PASS (4 new tests; the other order tests unchanged). Then `npx vitest run`: 297 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): show group orders by wearer with each wearer's progress"
```

---
### Task 10: Settings page and shop details

The settings frame (a menu of sections the person may use) and the first section: the shop's name, contact details and two rules, the status-link expiry and the women's measurement restriction.

**Files:**
- Create: `apps/web/src/features/settings/SettingsPage.tsx`, `apps/web/src/features/settings/SettingsHome.tsx`, `apps/web/src/features/settings/ShopSettings.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (the settings routes in the table above; this task adds `/app/settings`, its index and `shop`), then delete `Section` and `features/PlaceholderPage.tsx`, which have no users left
- Test: `apps/web/src/features/settings/ShopSettings.test.tsx`

**Interfaces:**
- Consumes: `store.updateConfig`, `configProblemText` (Task 1); `useUnsavedGuard`; `TextField`, `Checkbox`.
- Produces:
  - `SettingsPage`: `<h1>` `সেটিংস`, a `<nav aria-label="সেটিংসের অংশ">` of the sections the role may use, in this order: `দোকান`, `পোশাক ও ধাপ`, `স্টাফ`, `শাখা ও ডিভাইস` (`স্টাফ` needs `staff.manage`, the others `settings.edit`), then `<Outlet />`. Tasks 12 to 14 add their sections to this menu and to the routes.
  - `SettingsHome`: redirects (replace) to the first section in that menu.
  - `ShopSettings`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `settings.sections` | সেটিংসের অংশ | Settings sections |
| `settings.shop` | দোকান | Shop |
| `settings.templates` | পোশাক ও ধাপ | Garments and stages |
| `settings.staff` | স্টাফ | Staff |
| `settings.branches` | শাখা ও ডিভাইস | Branches and devices |
| `settings.shop.title` | দোকানের তথ্য | Shop details |
| `settings.shop.nameBn` | দোকানের নাম (বাংলা) | Shop name (Bangla) |
| `settings.shop.nameEn` | দোকানের নাম (ইংরেজি) | Shop name (English) |
| `settings.shop.phone` | ফোন | Phone |
| `settings.shop.address` | ঠিকানা | Address |
| `settings.shop.linkDays` | লিংকের মেয়াদ (দিন) | Link expiry (days) |
| `settings.shop.linkDaysHint` | অর্ডার শেষ হওয়ার এত দিন পর স্ট্যাটাস লিংক বন্ধ হবে | Status links stop working this many days after an order is finished |
| `settings.shop.restrict` | মহিলা কাস্টমারের মাপ শুধু অনুমতি থাকা স্টাফ দেখবেন | Only permitted staff see female customers’ measurements |
| `settings.shop.error.name` | দোকানের নাম লিখুন | Enter the shop name |
| `settings.shop.error.days` | ১ থেকে ৩৬৫ দিনের মধ্যে দিন | Enter 1 to 365 days |
| `settings.saved` | সেভ হয়েছে | Saved |

**Done when:**
- `/app/settings` opens the first section the person may use; the whole settings area shows `access.denied` for people with neither `settings.edit` nor `staff.manage`, and each section shows it for people without its own capability.
- `ShopSettings` has an `<h2>` `দোকানের তথ্য` and the fields `দোকানের নাম (বাংলা)`, `দোকানের নাম (ইংরেজি)`, `ফোন`, `ঠিকানা`, `লিংকের মেয়াদ (দিন)` (a text field with `inputMode="numeric"`, Bangla or English digits, with the hint) and the checkbox `মহিলা কাস্টমারের মাপ শুধু অনুমতি থাকা স্টাফ দেখবেন`.
- `সেভ করুন` checks the form: at least one name (`settings.shop.error.name` under the Bangla name), and the days a whole number from 1 to 365 (`settings.shop.error.days`). It then saves with `updateConfig`, keeping a missing name language filled from the other, and shows `সেভ হয়েছে`.
- Leaving with unsaved changes, including to another settings section, asks first (`useUnsavedGuard`).

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/settings/ShopSettings.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Shop settings', () => {
  it('opens on the shop details and saves a change', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings' });
    expect(await screen.findByRole('heading', { name: 'দোকানের তথ্য' })).toBeTruthy();
    expect(router.state.location.pathname).toBe('/app/settings/shop');
    const sections = within(screen.getByRole('navigation', { name: 'সেটিংসের অংশ' })).getAllByRole('link');
    expect(sections.map((l) => l.textContent)).toEqual(['দোকান', 'পোশাক ও ধাপ', 'স্টাফ', 'শাখা ও ডিভাইস']);

    const phone = screen.getByLabelText('ফোন');
    await userEvent.clear(phone);
    await userEvent.type(phone, '01700000000');
    const days = screen.getByLabelText('লিংকের মেয়াদ (দিন)');
    await userEvent.clear(days);
    await userEvent.type(days, '৭');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    const config = store.getSnapshot().config!;
    expect(config.profile.phone).toBe('01700000000');
    expect(config.settings.linkExpiryDays).toBe(7);
  });

  it('points out a missing name and impossible days, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/shop' });
    const before = store.getSnapshot().config;
    await userEvent.clear(await screen.findByLabelText('দোকানের নাম (বাংলা)'));
    await userEvent.clear(screen.getByLabelText('দোকানের নাম (ইংরেজি)'));
    const days = screen.getByLabelText('লিংকের মেয়াদ (দিন)');
    await userEvent.clear(days);
    await userEvent.type(days, '০');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    expect(await screen.findByText('দোকানের নাম লিখুন')).toBeTruthy();
    expect(screen.getByText('১ থেকে ৩৬৫ দিনের মধ্যে দিন')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });

  it('turns the boutique’s women’s measurement restriction off', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/settings/shop' });
    const restrict = await screen.findByRole('checkbox', { name: 'মহিলা কাস্টমারের মাপ শুধু অনুমতি থাকা স্টাফ দেখবেন' });
    expect(restrict).toHaveProperty('checked', true);
    await userEvent.click(restrict);
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().config!.settings.restrictFemaleMeasurements).toBe(false);
  });

  it('is closed to staff without settings access', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/settings', as: { staffId: 'nakshi-counter', pin: '2222' } });
    expect((await screen.findByRole('alert')).textContent).toBe('এই অংশ দেখার অনুমতি আপনার নেই।');
  });

  it('asks before leaving with unsaved changes', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/shop' });
    await userEvent.type(await screen.findByLabelText('ঠিকানা'), ' (নতুন)');
    await userEvent.click(within(screen.getByRole('navigation', { name: 'সেটিংসের অংশ' })).getByRole('link', { name: 'স্টাফ' }));
    expect(await screen.findByRole('dialog', { name: 'না সেভ করে চলে যাবেন?' })).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/settings/ShopSettings.test.tsx`
Expected: FAIL (settings is still the placeholder).

- [ ] **Step 3: Build the settings frame and the shop section to the done-conditions; add the routes; delete `Section`, `features/PlaceholderPage.tsx` and the `placeholder.body` message**

The `পোশাক ও ধাপ`, `স্টাফ` and `শাখা ও ডিভাইস` links are in the menu from this task; until Tasks 12 to 14 add their routes, add those three routes now as a plain `<h2>` with the section name, so the links go somewhere.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/settings`
Expected: PASS (5 new tests). Then `npx vitest run`: 302 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add settings with shop details, link expiry and the measurement restriction"
```

---

### Task 11: Template editor model

The rules behind editing a garment template: how new fields and stages get keys, which rows may be removed, and which stage lists would break garment tracking. Getting these wrong would silently orphan saved measurements, so they are pure and tested on their own.

**Files:**
- Create: `apps/web/src/features/settings/keys.ts`, `apps/web/src/features/settings/templateInput.ts`
- Test: `apps/web/src/features/settings/templateInput.test.ts`

**Interfaces:**
- Consumes: `validateStages`, `STANDARD_STAGES` from `@darzikhata/domain`.
- Produces:
  - `slugKey(text, taken, fallback): string` (Tasks 12 and 14 use it for new ids)
  - `interface FieldRow`, `interface StageRow`, `interface TemplateForm`, `FIELD_GROUPS`
  - `templateForm(template)`, `newTemplateForm()`
  - `addField(form)`, `addStage(form)`, `removeRow(form, list, index)`, `moveRow(form, list, index, direction)`
  - `type TemplateErrors = Record<string, MessageKey>` keyed `nameBn`, `price`, `fields.{i}.label`, `stages.{i}.label`, `stages`
  - `readTemplate(form, existing): { ok: true; template } | { ok: false; errors }`

The rules:

- **Keys.** Saved fields and stages keep their keys. A new row gets one when the template is saved: from its English name (`Back neck` becomes `back-neck`), or `field-N` / `stage-N` by position when there is no English name, with `-2`, `-3` added if the key is taken. A new template's id is made the same way from its English name, or `template`.
- **Saved fields cannot be removed.** Earlier measurements keep their values under the field's key, and the measurement tables show only the template's fields. A field no longer wanted can be made optional.
- **Stages can always be removed.** Every garment already ordered has its own copy of its stages.
- **Stage list rules.** The domain's `validateStages` codes become one message for the whole list (`errors.stages`), in this order: none, first stage, delivered stage, ready stage, group order.
- **Names in both languages.** A name typed in one language only is used for both.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `settings.template.error.name` | পোশাকের নাম লিখুন | Enter the garment name |
| `settings.template.error.label` | নাম লিখুন | Enter a name |
| `settings.stages.error.none` | অন্তত একটি ধাপ লাগবে | Add at least one stage |
| `settings.stages.error.first` | প্রথম ধাপ কাজ চলার ধাপ হবে এবং বাদ দেওয়া যাবে না | The first stage must be an in-progress stage that cannot be skipped |
| `settings.stages.error.delivered` | শেষে ঠিক একটি ডেলিভারির ধাপ থাকতে হবে | End with exactly one delivered stage |
| `settings.stages.error.ready` | অন্তত একটি রেডি ধাপ লাগবে যা বাদ দেওয়া যায় না | Add a ready stage that cannot be skipped |
| `settings.stages.error.order` | কাজ চলার ধাপগুলো আগে, তারপর রেডি, শেষে ডেলিভারি | In-progress stages first, then ready, then delivered |

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/settings/templateInput.test.ts`:

```ts
import { STANDARD_STAGES, STARTER_TEMPLATES, type GarmentTemplate } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { slugKey } from './keys';
import { addField, addStage, moveRow, newTemplateForm, readTemplate, removeRow, templateForm, type TemplateForm } from './templateInput';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

function read(form: TemplateForm, existing: GarmentTemplate[] = STARTER_TEMPLATES): GarmentTemplate {
  const result = readTemplate(form, existing);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.template;
}

const errorsOf = (form: TemplateForm) => {
  const result = readTemplate(form, STARTER_TEMPLATES);
  return result.ok ? {} : result.errors;
};

const withField = (form: TemplateForm, labelBn: string, labelEn: string): TemplateForm => {
  const next = addField(form);
  const index = next.fields.length - 1;
  return { ...next, fields: next.fields.map((f, i) => (i === index ? { ...f, labelBn, labelEn } : f)) };
};

describe('slugKey', () => {
  it('makes a key from an English name, falls back, and avoids keys in use', () => {
    expect(slugKey('Back neck', [], 'field-1')).toBe('back-neck');
    expect(slugKey('  Chest!! ', ['chest', 'chest-2'], 'x')).toBe('chest-3');
    expect(slugKey('', [], 'field-9')).toBe('field-9');
  });
});

describe('templateForm and readTemplate', () => {
  it('gives back the same template when nothing is changed', () => {
    expect(read(templateForm(shirt))).toEqual(shirt);
  });

  it('keys a new field from its English name, or by position, and fills a missing language', () => {
    let form = withField(templateForm(shirt), 'বুক', 'Chest');
    form = withField(form, 'পিঠ', '');
    const fields = read(form).fields;
    expect(fields.slice(-2)).toEqual([
      { key: 'chest-2', label: { bn: 'বুক', en: 'Chest' }, unit: 'inch', group: 'body', required: true },
      { key: 'field-10', label: { bn: 'পিঠ', en: 'পিঠ' }, unit: 'inch', group: 'body', required: true },
    ]);
  });

  it('keeps saved fields, which earlier measurements use, and lets new ones go', () => {
    const form = templateForm(shirt);
    expect(removeRow(form, 'fields', 0)).toBe(form);
    const added = addField(form);
    expect(removeRow(added, 'fields', added.fields.length - 1).fields).toHaveLength(shirt.fields.length);
  });

  it('reorders fields and stages, ignoring moves past either end', () => {
    const form = templateForm(shirt);
    expect(moveRow(form, 'fields', 1, -1).fields.slice(0, 2).map((f) => f.key)).toEqual(['chest', 'length']);
    expect(moveRow(form, 'fields', 0, -1)).toBe(form);
    expect(moveRow(form, 'stages', 5, 1)).toBe(form);
  });

  it('adds a new stage before the ready stage and keys it from its English name', () => {
    const form = addStage(templateForm(shirt));
    expect(form.stages.map((s) => s.key)).toEqual(['booked', 'cutting', 'stitching', 'trial', '', 'ready', 'delivered']);
    const named = { ...form, stages: form.stages.map((s) => (s.key ? s : { ...s, labelBn: 'বোতাম', labelEn: 'Buttons' })) };
    expect(read(named).stages[4]).toEqual({ key: 'buttons', label: { bn: 'বোতাম', en: 'Buttons' }, optional: false, group: 'unfinished' });
  });

  it('explains stage lists that would break garment tracking', () => {
    const form = templateForm(shirt);
    const without = (key: string) => ({ ...form, stages: form.stages.filter((s) => s.key !== key) });
    expect(errorsOf(without('ready')).stages).toBe('settings.stages.error.ready');
    expect(errorsOf(without('delivered')).stages).toBe('settings.stages.error.delivered');
    expect(errorsOf({ ...form, stages: [] }).stages).toBe('settings.stages.error.none');
    expect(errorsOf({ ...form, stages: form.stages.map((s, i) => (i === 0 ? { ...s, optional: true } : s)) }).stages).toBe(
      'settings.stages.error.first',
    );
    expect(errorsOf(moveRow(form, 'stages', 4, -1)).stages).toBe('settings.stages.error.order');
    expect(errorsOf(removeRow(form, 'stages', 3)).stages).toBeUndefined();
  });

  it('points at missing names and an unreadable price', () => {
    const form = templateForm(shirt);
    const blank = {
      ...form,
      nameBn: ' ',
      nameEn: '',
      price: null,
      fields: form.fields.map((f, i) => (i === 2 ? { ...f, labelBn: '', labelEn: '' } : f)),
      stages: form.stages.map((s, i) => (i === 1 ? { ...s, labelBn: '', labelEn: ' ' } : s)),
    };
    expect(errorsOf(blank)).toEqual({
      nameBn: 'settings.template.error.name',
      price: 'input.invalidMoney',
      'fields.2.label': 'settings.template.error.label',
      'stages.1.label': 'settings.template.error.label',
    });
  });

  it('starts a new garment with the standard stages and gives it an unused id', () => {
    const form = newTemplateForm();
    expect(form.stages.map((s) => s.key)).toEqual(STANDARD_STAGES.map((s) => s.key));
    const coat = read({ ...form, nameBn: 'শার্ট', nameEn: 'Shirt', price: 250000 });
    expect(coat).toMatchObject({ id: 'shirt-2', name: { bn: 'শার্ট', en: 'Shirt' }, defaultPrice: 250000, active: true, fields: [] });
    expect(coat.stages).toEqual(STANDARD_STAGES);
    expect(read({ ...form, nameBn: 'কোট', price: 0 }).id).toBe('template');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/settings/templateInput.test.ts`
Expected: FAIL (modules not found).

- [ ] **Step 3: Write `keys.ts`**

```ts
/**
 * A short, stable key for a new record, made from its English name: "Back neck" becomes
 * "back-neck". Falls back when the name gives nothing usable (for example, a Bangla-only
 * name), and adds -2, -3, ... when the key is taken.
 */
export function slugKey(text: string, taken: Iterable<string>, fallback: string): string {
  const used = new Set(taken);
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback;
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Write `templateInput.ts`**

```ts
import {
  STANDARD_STAGES,
  validateStages,
  type GarmentTemplate,
  type Label,
  type MeasurementField,
  type Poisha,
  type Stage,
  type StageGroup,
  type Unit,
} from '@darzikhata/domain';
import type { MessageKey } from '../../i18n/bn';
import { slugKey } from './keys';

export interface FieldRow {
  /** Stable id for the screen's list keys. */
  rowId: string;
  /** Empty for a field added in this editor; it gets a key when saved. Saved keys never change. */
  key: string;
  /** Saved fields cannot be removed: earlier measurements keep their values under this key. */
  saved: boolean;
  labelBn: string;
  labelEn: string;
  unit: Unit;
  group: string;
  required: boolean;
}

export interface StageRow {
  rowId: string;
  /** Empty for a stage added in this editor. */
  key: string;
  labelBn: string;
  labelEn: string;
  group: StageGroup;
  optional: boolean;
}

export interface TemplateForm {
  /** Empty for a new template. */
  id: string;
  nameBn: string;
  nameEn: string;
  /** Null when empty or unreadable. */
  price: Poisha | null;
  active: boolean;
  fields: FieldRow[];
  stages: StageRow[];
  /** Counter for row ids of rows added in this editor. */
  nextRow: number;
}

/** Field groups offered in the editor; their names come from the mgroup.* messages. */
export const FIELD_GROUPS = ['body', 'sleeve', 'neck', 'leg', 'kameez', 'salwar', 'blouse', 'skirt'] as const;

const stageRow = (stage: Stage): StageRow => ({
  rowId: stage.key,
  key: stage.key,
  labelBn: stage.label.bn,
  labelEn: stage.label.en,
  group: stage.group,
  optional: stage.optional,
});

export function templateForm(template: GarmentTemplate): TemplateForm {
  return {
    id: template.id,
    nameBn: template.name.bn,
    nameEn: template.name.en,
    price: template.defaultPrice,
    active: template.active,
    fields: template.fields.map((f) => ({
      rowId: f.key,
      key: f.key,
      saved: true,
      labelBn: f.label.bn,
      labelEn: f.label.en,
      unit: f.unit,
      group: f.group,
      required: f.required,
    })),
    stages: template.stages.map(stageRow),
    nextRow: 1,
  };
}

/** A new garment starts with the standard stages and no measurement fields. */
export function newTemplateForm(): TemplateForm {
  return { id: '', nameBn: '', nameEn: '', price: null, active: true, fields: [], stages: STANDARD_STAGES.map(stageRow), nextRow: 1 };
}

export function addField(form: TemplateForm): TemplateForm {
  const row: FieldRow = {
    rowId: `new-${form.nextRow}`,
    key: '',
    saved: false,
    labelBn: '',
    labelEn: '',
    unit: 'inch',
    group: 'body',
    required: true,
  };
  return { ...form, fields: [...form.fields, row], nextRow: form.nextRow + 1 };
}

/** Adds a required in-progress stage just before the first ready stage. */
export function addStage(form: TemplateForm): TemplateForm {
  const row: StageRow = { rowId: `new-${form.nextRow}`, key: '', labelBn: '', labelEn: '', group: 'unfinished', optional: false };
  const ready = form.stages.findIndex((s) => s.group !== 'unfinished');
  const at = ready < 0 ? form.stages.length : ready;
  return { ...form, stages: [...form.stages.slice(0, at), row, ...form.stages.slice(at)], nextRow: form.nextRow + 1 };
}

type ListName = 'fields' | 'stages';

/**
 * Removes a row. Saved fields stay (return the same form); stages can always go, because
 * every garment already ordered keeps its own copy of its stages.
 */
export function removeRow(form: TemplateForm, list: ListName, index: number): TemplateForm {
  if (list === 'fields') {
    if (form.fields[index]?.saved !== false) return form;
    return { ...form, fields: form.fields.filter((_, i) => i !== index) };
  }
  if (!form.stages[index]) return form;
  return { ...form, stages: form.stages.filter((_, i) => i !== index) };
}

function swap<T>(rows: T[], index: number, direction: -1 | 1): T[] | null {
  const other = index + direction;
  if (index < 0 || index >= rows.length || other < 0 || other >= rows.length) return null;
  const next = [...rows];
  [next[index], next[other]] = [next[other]!, next[index]!];
  return next;
}

export function moveRow(form: TemplateForm, list: ListName, index: number, direction: -1 | 1): TemplateForm {
  if (list === 'fields') {
    const fields = swap(form.fields, index, direction);
    return fields ? { ...form, fields } : form;
  }
  const stages = swap(form.stages, index, direction);
  return stages ? { ...form, stages } : form;
}

/** Keyed by the form path, e.g. 'nameBn', 'price', 'fields.2.label', 'stages', 'stages.1.label'. */
export type TemplateErrors = Record<string, MessageKey>;

export type TemplateResult = { ok: true; template: GarmentTemplate } | { ok: false; errors: TemplateErrors };

/** Fills a missing language from the other, so a name always shows in both. */
const label = (bn: string, en: string): Label => {
  const b = bn.trim();
  const e = en.trim();
  return { bn: b || e, en: e || b };
};

const STAGE_RULES: Array<[codes: string[], message: MessageKey]> = [
  [['no-stages'], 'settings.stages.error.none'],
  [['first-not-unfinished', 'first-optional'], 'settings.stages.error.first'],
  [['last-not-delivered', 'multiple-delivered'], 'settings.stages.error.delivered'],
  [['no-required-ready'], 'settings.stages.error.ready'],
  [['groups-out-of-order'], 'settings.stages.error.order'],
];

/**
 * Checks the editor and builds the template. Saved keys are kept; new fields and stages get
 * keys from their English names (or field-N / stage-N), never clashing with keys in use.
 */
export function readTemplate(form: TemplateForm, existing: GarmentTemplate[]): TemplateResult {
  const errors: TemplateErrors = {};
  if (!form.nameBn.trim() && !form.nameEn.trim()) errors.nameBn = 'settings.template.error.name';
  if (form.price === null || form.price < 0) errors.price = 'input.invalidMoney';

  const fieldKeys = form.fields.filter((f) => f.key).map((f) => f.key);
  const fields: MeasurementField[] = form.fields.map((row, i) => {
    if (!row.labelBn.trim() && !row.labelEn.trim()) errors[`fields.${i}.label`] = 'settings.template.error.label';
    let key = row.key;
    if (!key) {
      key = slugKey(row.labelEn, fieldKeys, `field-${i + 1}`);
      fieldKeys.push(key);
    }
    return { key, label: label(row.labelBn, row.labelEn), unit: row.unit, group: row.group, required: row.required };
  });

  const stageKeys = form.stages.filter((s) => s.key).map((s) => s.key);
  const stages: Stage[] = form.stages.map((row, i) => {
    if (!row.labelBn.trim() && !row.labelEn.trim()) errors[`stages.${i}.label`] = 'settings.template.error.label';
    let key = row.key;
    if (!key) {
      key = slugKey(row.labelEn, stageKeys, `stage-${i + 1}`);
      stageKeys.push(key);
    }
    return { key, label: label(row.labelBn, row.labelEn), optional: row.optional, group: row.group };
  });
  const problems = validateStages(stages);
  const rule = STAGE_RULES.find(([codes]) => codes.some((code) => problems.includes(code)));
  if (rule) errors.stages = rule[1];

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const id = form.id || slugKey(form.nameEn, existing.map((t) => t.id), 'template');
  return {
    ok: true,
    template: { id, name: label(form.nameBn, form.nameEn), defaultPrice: form.price!, fields, stages, active: form.active },
  };
}
```

Add the messages above.

- [ ] **Step 5: Run the test**

Run: `npx vitest run src/features/settings/templateInput.test.ts`
Expected: PASS (9 tests). Then `npx vitest run`: 311 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/settings apps/web/src/i18n
git commit -m "feat(web): add the template editor model with stable keys and stage rules"
```

---

### Task 12: Garment template and stage editor

Shops change prices, add measurements they take, add a stage such as embroidery, or retire a garment they no longer make.

**Files:**
- Create: `apps/web/src/features/settings/TemplatesSettings.tsx`, `apps/web/src/features/settings/TemplateEditor.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`templates`, `templates/new` before `templates/:templateId`)
- Test: `apps/web/src/features/settings/TemplateEditor.test.tsx`

**Interfaces:**
- Consumes: Task 11's `templateInput.ts`; `store.updateConfig`, `configProblemText`; `NumberField` (money); `useUnsavedGuard`; `groupLabel` from `features/customers/measurementView.ts`.
- Produces: `TemplatesSettings`, `TemplateEditor`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `settings.templates.list` | পোশাকের ধরন | Garment types |
| `settings.templates.new` | নতুন পোশাক | New garment |
| `settings.col.name` | নাম | Name |
| `settings.col.status` | অবস্থা | Status |
| `settings.template.inUse` | চালু | In use |
| `settings.template.retired` | বন্ধ | Retired |
| `settings.template.editTitle` | {name} বদলান | Edit {name} |
| `settings.nameBn` | নাম (বাংলা) | Name (Bangla) |
| `settings.nameEn` | নাম (ইংরেজি) | Name (English) |
| `settings.template.active` | নতুন অর্ডারে দেখান | Offer in new orders |
| `settings.template.fields` | মাপের ঘর | Measurement fields |
| `settings.template.fieldsNote` | একক বদলালে শুধু নতুন মাপে লাগবে। সেভ করা ঘর বাদ দেওয়া যায় না, কারণ আগের মাপ এতে আছে; দরকার না হলে জরুরি থেকে সরিয়ে দিন। | A unit change applies to new measurements only. Saved fields cannot be removed, because earlier measurements use them; untick Required instead. |
| `settings.field.labelBn` | ঘর {n}: বাংলা নাম | Field {n}: Bangla name |
| `settings.field.labelEn` | ঘর {n}: ইংরেজি নাম | Field {n}: English name |
| `settings.field.unit` | ঘর {n}: একক | Field {n}: unit |
| `settings.field.group` | ঘর {n}: ভাগ | Field {n}: group |
| `settings.field.required` | ঘর {n}: জরুরি | Field {n}: required |
| `settings.field.up` | ঘর {n} উপরে | Move field {n} up |
| `settings.field.down` | ঘর {n} নিচে | Move field {n} down |
| `settings.field.remove` | ঘর {n} বাদ দিন | Remove field {n} |
| `settings.field.add` | ঘর যোগ করুন | Add field |
| `settings.template.stages` | ধাপ | Stages |
| `settings.template.stagesNote` | ধাপ বদলালে শুধু নতুন অর্ডারে লাগবে। আগের অর্ডারের পোশাক নিজের ধাপ রাখে। | Stage changes apply to new orders only. Garments already ordered keep their own stages. |
| `settings.stage.labelBn` | ধাপ {n}: বাংলা নাম | Stage {n}: Bangla name |
| `settings.stage.labelEn` | ধাপ {n}: ইংরেজি নাম | Stage {n}: English name |
| `settings.stage.group` | ধাপ {n}: ধরন | Stage {n}: kind |
| `settings.stage.optional` | ধাপ {n}: বাদ দেওয়া যায় | Stage {n}: can be skipped |
| `settings.stage.up` | ধাপ {n} উপরে | Move stage {n} up |
| `settings.stage.down` | ধাপ {n} নিচে | Move stage {n} down |
| `settings.stage.remove` | ধাপ {n} বাদ দিন | Remove stage {n} |
| `settings.stage.add` | ধাপ যোগ করুন | Add stage |
| `stageGroup.unfinished` | কাজ চলছে | In progress |
| `stageGroup.ready` | রেডি | Ready |
| `stageGroup.delivered` | ডেলিভারি | Delivered |

`{n}` is the row's position, written with `number()` (Bangla digits in Bangla). The price field reuses `receipt.price` (দাম); unit options reuse `unit.inch` and `unit.cm`; group options reuse `mgroup.*` through `groupLabel`.

**Done when:**
- `TemplatesSettings` has a table `পোশাকের ধরন` with one row per template: its name as a link to `/app/settings/templates/:templateId`, its price, and `চালু` or `বন্ধ`; and a `নতুন পোশাক` link to `/app/settings/templates/new`.
- `TemplateEditor` has an `<h2>`: `{name} বদলান`, or `নতুন পোশাক` for a new template. It has `নাম (বাংলা)`, `নাম (ইংরেজি)`, `দাম` (a money `NumberField`) and the checkbox `নতুন অর্ডারে দেখান`.
- A table `মাপের ঘর` has one row per field: the two names, unit and group selects, the required checkbox, `উপরে` and `নিচে` buttons (disabled at either end), and `বাদ দিন` only for fields added in this editor. Below it are `ঘর যোগ করুন` and the fields note.
- A table `ধাপ` has one row per stage: the two names, a kind select (`কাজ চলছে`, `রেডি`, `ডেলিভারি`), the `বাদ দেওয়া যায়` checkbox, `উপরে`, `নিচে` and `বাদ দিন`. Below it are `ধাপ যোগ করুন` and the stages note.
- `সেভ করুন` runs `readTemplate`. Errors show beside their fields, with the stage-list message in a `role="alert"` element under the stages table and nothing saved. When it is valid, it replaces the template (or appends a new one) with `updateConfig`, then goes back to `/app/settings/templates` after `allowNextNavigation()`.
- Leaving with unsaved changes asks first.
- Inactive templates are already left out of order entry and the measurement tabs (Plan 3 filters on `active`); the last test checks it end to end.

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/settings/TemplateEditor.test.tsx`:

```tsx
import { toBanglaDigits } from '@darzikhata/domain';
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

const bn = (n: number) => toBanglaDigits(String(n));

describe('Template editor', () => {
  it('changes a garment’s price and adds a measurement field', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'শার্ট' }));
    expect(await screen.findByRole('heading', { name: 'শার্ট বদলান' })).toBeTruthy();
    const price = screen.getByLabelText('দাম');
    await userEvent.clear(price);
    await userEvent.type(price, '৮০০');
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.type(screen.getByLabelText('ঘর ৯: বাংলা নাম'), 'পিঠ');
    await userEvent.type(screen.getByLabelText('ঘর ৯: ইংরেজি নাম'), 'Back');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    const list = await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    expect(within(within(list).getByRole('row', { name: /শার্ট/ })).getByText('৳৮০০')).toBeTruthy();
    const shirt = store.getSnapshot().config!.templates.find((t) => t.id === 'shirt')!;
    expect(shirt.defaultPrice).toBe(80000);
    expect(shirt.fields.at(-1)).toEqual({ key: 'back', label: { bn: 'পিঠ', en: 'Back' }, unit: 'inch', group: 'body', required: true });
  });

  it('changes stages for new orders only', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    const { state, config } = store.getSnapshot();
    const order = Object.values(state.orders).find((o) => o.items.some((i) => i.stageKey === 'trial'))!;
    const item = order.items.find((i) => i.stageKey === 'trial')!;
    const template = config!.templates.find((t) => t.id === item.templateId)!;

    await userEvent.click(await screen.findByRole('link', { name: template.name.bn }));
    const n = template.stages.findIndex((s) => s.key === 'trial') + 1;
    await userEvent.click(await screen.findByRole('button', { name: `ধাপ ${bn(n)} বাদ দিন` }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    const saved = store.getSnapshot().config!.templates.find((t) => t.id === template.id)!;
    expect(saved.stages.map((s) => s.key)).not.toContain('trial');

    await act(() => router.navigate(`/app/orders/${order.id}`));
    const card = await screen.findByRole('region', { name: `${item.garmentName.bn} ${bn(order.items.indexOf(item) + 1)}` });
    expect(within(card).getByText('ধাপ: ট্রায়াল')).toBeTruthy();
  });

  it('explains a stage list that would break tracking, and saves nothing', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    const before = store.getSnapshot().config;
    await userEvent.selectOptions(await screen.findByLabelText('ধাপ ৫: ধরন'), 'কাজ চলছে');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    expect(await screen.findByText('অন্তত একটি রেডি ধাপ লাগবে যা বাদ দেওয়া যায় না')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });

  it('keeps saved measurement fields and lets new ones go', async () => {
    await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates/shirt' });
    await screen.findByRole('heading', { name: 'শার্ট বদলান' });
    expect(screen.queryByRole('button', { name: 'ঘর ১ বাদ দিন' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'ঘর যোগ করুন' }));
    await userEvent.click(screen.getByRole('button', { name: 'ঘর ৯ বাদ দিন' }));
    expect(screen.queryByLabelText('ঘর ৯: বাংলা নাম')).toBeNull();
  });

  it('adds a new garment and retires another, as order entry shows', async () => {
    const { store, router } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/templates' });
    await userEvent.click(await screen.findByRole('link', { name: 'নতুন পোশাক' }));
    await userEvent.type(await screen.findByLabelText('নাম (বাংলা)'), 'কোট');
    await userEvent.type(screen.getByLabelText('নাম (ইংরেজি)'), 'Coat');
    await userEvent.type(screen.getByLabelText('দাম'), '২৫০০');
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));

    await userEvent.click(await screen.findByRole('link', { name: 'প্যান্ট' }));
    await userEvent.click(await screen.findByRole('checkbox', { name: 'নতুন অর্ডারে দেখান' }));
    await userEvent.click(screen.getByRole('button', { name: 'সেভ করুন' }));
    await screen.findByRole('table', { name: 'পোশাকের ধরন' });
    expect(store.getSnapshot().config!.templates.find((t) => t.id === 'coat')).toMatchObject({ defaultPrice: 250000, active: true });

    await act(() => router.navigate('/app/orders/new'));
    const left = await screen.findByRole('region', { name: 'কাস্টমার ও পোশাক' });
    const garments = within(within(left).getByLabelText('পোশাক')).getAllByRole('option').map((o) => o.textContent);
    expect(garments).toContain('কোট');
    expect(garments).not.toContain('প্যান্ট');
  });
});
```

The shirt template's stages are booked, cutting, stitching, trial, ready, delivered; stage 5 is ready. It has eight fields, so a new field is field 9.

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/settings/TemplateEditor.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Build the list and the editor to the done-conditions; replace the placeholder route**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/settings`
Expected: PASS (5 new tests). Then `npx vitest run`: 316 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): edit garment templates, measurement fields and stages"
```

---
### Task 13: Staff

The owner adds people, gives them a role, a PIN and the branches they work in, and deactivates people who leave. Deactivated staff stay in the setup because their names are on past work.

**Files:**
- Create: `apps/web/src/features/settings/staffInput.ts`, `apps/web/src/features/settings/StaffSettings.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`staff`, under `staff.manage`)
- Test: `apps/web/src/features/settings/staffInput.test.ts`, `apps/web/src/features/settings/StaffSettings.test.tsx`

**Interfaces:**
- Consumes: `toEnglishDigits`, `isValidPin` from `@darzikhata/domain`; `store.updateConfig`, `store.createId`, `configProblemText`.
- Produces:
  - `interface StaffForm { name: string; roleId: string; pin: string; allBranches: boolean; branchIds: string[]; active: boolean }`
  - `staffForm(staff: Staff | null, config: ShopConfig): StaffForm`: a new person is an active `tailor` (or the last role, if the shop has no tailor role) in all branches with an empty PIN.
  - `interface StaffContext { config: ShopConfig; staffId: string | null; selfId: string; newId(): string }` (`staffId` is null for a new person)
  - `readStaff(form, ctx): { ok: true; staff: Staff } | { ok: false; errors: Record<string, MessageKey> }`. Rules: a name is needed; the PIN must be 4 digits (Bangla or English) and is stored in English digits; at least one branch unless all branches; and the signed-in person cannot change their own role or deactivate themselves (`errors.self`). Branch ids are kept in the shop's branch order.
  - `StaffSettings`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `settings.staff.new` | নতুন স্টাফ | New staff member |
| `settings.editItem` | {name}: বদলান | Edit {name} |
| `settings.staff.role` | দায়িত্ব | Role |
| `settings.staff.active` | সক্রিয় | Active |
| `settings.staff.inactive` | নিষ্ক্রিয় | Inactive |
| `settings.staff.error.name` | নাম লিখুন | Enter a name |
| `settings.staff.error.pin` | পিন ৪ সংখ্যার হতে হবে | A PIN must be 4 digits |
| `settings.staff.error.branches` | অন্তত একটি শাখা বেছে নিন | Choose at least one branch |
| `settings.staff.error.self` | নিজের দায়িত্ব বদলানো বা নিজেকে নিষ্ক্রিয় করা যাবে না | You cannot change your own role or deactivate yourself |

Labels reuse `settings.col.name` (নাম), `pin.label` (পিন), `branch.all` (সব শাখা), `branch.label` (শাখা) and `settings.col.status` (অবস্থা).

**Done when:**
- An `<h2>` `স্টাফ`, then a table `স্টাফ` with one row per person: name, role name, branches (`সব শাখা` or the branch names), and `সক্রিয়` or `নিষ্ক্রিয়`, plus a `{name}: বদলান` button. PINs are never shown.
- `নতুন স্টাফ` and each `বদলান` open a dialog titled `নতুন স্টাফ` or the person's name, with `নাম`, `দায়িত্ব` (a select of the shop's roles), `পিন` (`inputMode="numeric"`), the `সব শাখা` checkbox and, when it is unticked and the shop has more than one branch, one checkbox per branch, and the `সক্রিয়` checkbox.
- `সেভ করুন` runs `readStaff` (with `store.createId` for a new id and the signed-in staff id as `selfId`). Field errors show beside their fields and `errors.self` in a `role="alert"` element in the dialog. Valid changes are saved with `updateConfig` (replace or append); a refusal shows `configProblemText` in the dialog. The dialog closes after a save.
- A deactivated person disappears from sign-in (Plan 2 lists only active staff) and from work assignment (`assignees` skips inactive staff).

- [ ] **Step 1: Write the failing tests**

`apps/web/src/features/settings/staffInput.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shopConfig } from '../../seed/shops';
import { readStaff, staffForm, type StaffForm } from './staffInput';

const uniform = shopConfig('uniform');
const person = (id: string) => uniform.staff.find((s) => s.id === id)!;
const ctx = (staffId: string | null) => ({ config: uniform, staffId, selfId: 'uniform-owner', newId: () => 'staff-new' });
const form = (overrides: Partial<StaffForm> = {}): StaffForm => ({ ...staffForm(null, uniform), ...overrides });

describe('staffForm', () => {
  it('starts a new person as an active tailor in every branch', () => {
    expect(staffForm(null, uniform)).toEqual({ name: '', roleId: 'tailor', pin: '', allBranches: true, branchIds: [], active: true });
  });

  it('gives back the same person when nothing is changed', () => {
    for (const staff of uniform.staff) expect(readStaff(staffForm(staff, uniform), ctx(staff.id))).toEqual({ ok: true, staff });
  });
});

describe('readStaff', () => {
  it('builds a new person, reading Bangla digits and keeping branches in shop order', () => {
    expect(readStaff(form({ name: ' রিনা ', pin: '৫৫৫৫', allBranches: false, branchIds: ['workshop', 'shop'] }), ctx(null))).toEqual({
      ok: true,
      staff: { id: 'staff-new', name: 'রিনা', roleId: 'tailor', branchIds: ['shop', 'workshop'], pin: '5555', active: true },
    });
  });

  it('points out a missing name, a bad PIN and no branch', () => {
    expect(readStaff(form({ name: ' ', pin: '12a4', allBranches: false }), ctx(null))).toEqual({
      ok: false,
      errors: { name: 'settings.staff.error.name', pin: 'settings.staff.error.pin', branches: 'settings.staff.error.branches' },
    });
  });

  it('stops you changing your own role or deactivating yourself, but not someone else', () => {
    const owner = person('uniform-owner');
    const selfError = { ok: false, errors: { self: 'settings.staff.error.self' } };
    expect(readStaff({ ...staffForm(owner, uniform), roleId: 'manager' }, ctx(owner.id))).toEqual(selfError);
    expect(readStaff({ ...staffForm(owner, uniform), active: false }, ctx(owner.id))).toEqual(selfError);
    const tailor = person('uniform-tailor-2');
    expect(readStaff({ ...staffForm(tailor, uniform), active: false }, ctx(tailor.id))).toMatchObject({ ok: true, staff: { active: false } });
  });
});
```

`apps/web/src/features/settings/StaffSettings.test.tsx`:

```tsx
import { act, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { ShopStore } from '../../data/store';
import { renderApp } from '../../test/renderApp';

async function trySignIn(store: ShopStore, staffId: string, pin: string): Promise<boolean> {
  let ok = false;
  await act(async () => {
    await store.signOut();
    ok = await store.signIn(staffId, pin);
  });
  return ok;
}

describe('Staff settings', () => {
  it('adds a person who can then sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন স্টাফ' }));
    const dialog = await screen.findByRole('dialog', { name: 'নতুন স্টাফ' });
    await userEvent.type(within(dialog).getByLabelText('নাম'), 'নতুন দর্জি');
    await userEvent.selectOptions(within(dialog).getByLabelText('দায়িত্ব'), 'দর্জি');
    await userEvent.type(within(dialog).getByLabelText('পিন'), '৬৬৬৬');
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'সব শাখা' }));
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'কারখানা' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    expect(within(table).getByRole('row', { name: /নতুন দর্জি/ }).textContent).toContain('কারখানা');
    const added = store.getSnapshot().config!.staff.find((s) => s.name === 'নতুন দর্জি')!;
    expect(added).toMatchObject({ roleId: 'tailor', pin: '6666', branchIds: ['workshop'], active: true });
    expect(await trySignIn(store, added.id, '6666')).toBe(true);
  });

  it('deactivates a person so they can no longer sign in', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    await userEvent.click(await screen.findByRole('button', { name: 'সেলিম শেখ: বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'সেলিম শেখ' });
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'সক্রিয়' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'স্টাফ' });
    expect(within(table).getByRole('row', { name: /সেলিম শেখ/ }).textContent).toContain('নিষ্ক্রিয়');
    expect(store.getSnapshot().config!.staff.find((s) => s.id === 'uniform-tailor-2')!.active).toBe(false);
    expect(await trySignIn(store, 'uniform-tailor-2', '5555')).toBe(false);
  });

  it('stops you changing your own role', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/staff' });
    const before = store.getSnapshot().config;
    await userEvent.click(await screen.findByRole('button', { name: 'কামাল হোসেন: বদলান' }));
    const dialog = await screen.findByRole('dialog', { name: 'কামাল হোসেন' });
    await userEvent.selectOptions(within(dialog).getByLabelText('দায়িত্ব'), 'ম্যানেজার');
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(await within(dialog).findByText('নিজের দায়িত্ব বদলানো বা নিজেকে নিষ্ক্রিয় করা যাবে না')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/features/settings/staffInput.test.ts src/features/settings/StaffSettings.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `staffInput.ts`, then build `StaffSettings` to the done-conditions and replace the placeholder route**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/settings`
Expected: PASS (7 new tests). Then `npx vitest run`: 323 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add, edit and deactivate staff with self-protection"
```

---

### Task 14: Branches and devices

A shop that opens a workshop adds a branch; a laptop that moves to the workshop is moved with it, so new orders taken on it belong there.

**Files:**
- Create: `apps/web/src/features/settings/BranchSettings.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (`branches`)
- Test: `apps/web/src/features/settings/BranchSettings.test.tsx`

**Interfaces:**
- Consumes: `slugKey` (Task 11); `store.updateConfig`, `configProblemText`; `ChoiceGroup`.
- Produces: `BranchSettings`.

**Messages:**

| Key | bn | en |
| --- | --- | --- |
| `settings.branches.list` | শাখার তালিকা | Branches |
| `settings.branches.new` | নতুন শাখা | New branch |
| `settings.branches.note` | শাখা মুছে ফেলা যায় না, কারণ অর্ডার, স্টাফ আর ডিভাইস এর সাথে যুক্ত। | Branches cannot be deleted, because orders, staff and devices refer to them. |
| `settings.branch.kind` | ধরন | Kind |
| `branchKind.shop` | দোকান | Shop |
| `branchKind.workshop` | কারখানা | Workshop |
| `settings.branch.error.name` | শাখার নাম লিখুন | Enter the branch name |
| `settings.devices.list` | ডিভাইসের তালিকা | Devices |
| `settings.device.series` | সিরিজ | Series |
| `settings.device.branch` | শাখা: {name} | Branch: {name} |
| `settings.devices.note` | নতুন অর্ডার ডিভাইসের শাখায় যায়। সিরিজ বদলানো যায় না, কারণ অর্ডার নম্বর এতে চলে। | New orders go to the device’s branch. The series cannot change, because order numbers use it. |

Name fields reuse `settings.nameBn` and `settings.nameEn`; the address reuses `settings.shop.address`; the edit button reuses `settings.editItem`. Do not name any table or control exactly `শাখা` here: that is the branch switcher's label.

**Done when:**
- A table `শাখার তালিকা` with one row per branch: name, kind, address and a `{name}: বদলান` button; then `নতুন শাখা` and the branches note. There is no delete.
- The branch dialog (titled `নতুন শাখা` or the branch's name) has `নাম (বাংলা)`, `নাম (ইংরেজি)`, a `ধরন` choice (`দোকান`, `কারখানা`) and `ঠিকানা`. `সেভ করুন` needs at least one name (`settings.branch.error.name`), fills a missing language from the other, gives a new branch the id `slugKey(nameEn, branch ids, 'branch-N')`, saves with `updateConfig`, and closes.
- A table `ডিভাইসের তালিকা` with one row per device: name, series (read-only) and a select labelled `শাখা: {device name}`. Changing the select saves at once with `updateConfig` and shows `সেভ হয়েছে`; the devices note sits below.
- A shop that gains a second branch gets the branch switcher in the top bar for people who may see all branches (Task 2 reads the setup, so nothing extra is needed).

- [ ] **Step 1: Write the failing test**

`apps/web/src/features/settings/BranchSettings.test.tsx`:

```tsx
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/renderApp';

describe('Branch settings', () => {
  it('adds a branch, after which the branch switcher appears', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    const add = await screen.findByRole('button', { name: 'নতুন শাখা' });
    expect(screen.queryByLabelText('শাখা')).toBeNull();
    await userEvent.click(add);
    const dialog = await screen.findByRole('dialog', { name: 'নতুন শাখা' });
    await userEvent.type(within(dialog).getByLabelText('নাম (বাংলা)'), 'কারখানা');
    await userEvent.type(within(dialog).getByLabelText('নাম (ইংরেজি)'), 'Workshop');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'কারখানা' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));

    const table = await screen.findByRole('table', { name: 'শাখার তালিকা' });
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(store.getSnapshot().config!.branches.at(-1)).toMatchObject({
      id: 'workshop',
      name: { bn: 'কারখানা', en: 'Workshop' },
      kind: 'workshop',
    });
    expect(await screen.findByLabelText('শাখা')).toBeTruthy();
  });

  it('moves a device to another branch at once', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'uniform', path: '/app/settings/branches' });
    await userEvent.selectOptions(await screen.findByLabelText('শাখা: দোকানের কম্পিউটার'), 'কারখানা');
    expect(await screen.findByText('সেভ হয়েছে')).toBeTruthy();
    expect(store.getSnapshot().config!.devices[0]!.branchId).toBe('workshop');
  });

  it('needs a name for a branch', async () => {
    const { store } = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/settings/branches' });
    const before = store.getSnapshot().config;
    await userEvent.click(await screen.findByRole('button', { name: 'নতুন শাখা' }));
    const dialog = await screen.findByRole('dialog', { name: 'নতুন শাখা' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'সেভ করুন' }));
    expect(within(dialog).getByText('শাখার নাম লিখুন')).toBeTruthy();
    expect(store.getSnapshot().config).toBe(before);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/features/settings/BranchSettings.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Build `BranchSettings` to the done-conditions and replace the placeholder route**

- [ ] **Step 4: Run the tests**

Run: `npx vitest run src/features/settings`
Expected: PASS (3 new tests). Then `npx vitest run`: 326 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "feat(web): add branches and move devices between them"
```

---

### Task 15: Size budget and checks by hand

**Files:** none, unless a check needs a fix.

- [ ] **Step 1: Run every automated check**

Run (from the repo root):

```bash
npm test
npm run typecheck
git grep -n "—" -- apps packages
```

Expected: domain `173` and web `326` tests pass; no type errors; no em dashes.

- [ ] **Step 2: Check the first download stays small**

Run (from `apps/web`): `npx vite build`, then the same gzip check as Plan 3's Task 16:

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

Expected: the entry chunk is still under 250 KB gzipped. The new pages (dashboard, work, settings sections, status page, work-list print) are separate chunks. `BranchScope.tsx` and `branchScope.ts` load with the shell; nothing else from this plan should.

- [ ] **Step 3: Check by hand**

Run `npx vite preview` and check:

1. **Phone width (375px), Rahman Tailors owner:** the dashboard cards wrap and the four lists stack; the work list's tables scroll inside their own box, and the page does not scroll sideways (`document.documentElement.scrollWidth` is 375).
2. **Desktop at 1366px, 1920px and 150% zoom:** the dashboard, the work list with the selection bar showing, and the template editor's two tables all fit without the page scrolling sideways.
3. **Keyboard only, Uniform House supervisor (PIN 3333):** on the work list, tick a group, open `ধাপ বদলান`, choose a stage, confirm, read the results and close, without the mouse. Enter in the dialog's select never confirms. Focus returns to the page after closing.
4. **Print preview of the work list** (Uniform House owner, `/print/work?by=stage`, Bangla and English): no toolbar prints, table headers repeat on the second page, no row is split across pages. Save as PDF and check the Bangla text.
5. **Status link:** create a link on an open order and open it with `খুলে দেখুন` in a new tab of the same browser (in the demo a link opens only in the browser where it was made). Check that it shows no prices, measurements or names. Turn the link off and reload the tab: it says the link no longer works.
6. **Settings round trip:** in Nakshi Boutique as the owner, add an `Embroidery` stage to the blouse after cutting, take a new blouse order, and check its card offers the new stage while an older blouse does not. Then reset the demo from More and check the template is back to normal.
7. **Branch scope:** in Uniform House as the owner, choose `কারখানা`, reload: the choice is kept. Sign in as the counter (PIN 2222): only the shop's orders show, and there is no switcher.

Stop the preview server when done.

- [ ] **Step 4: Commit any fixes**

If a check needed a fix, commit it with a message describing the fix.

---

## After this plan

When all 15 tasks are committed and the checks pass, write Plan 5 (demo layer) against the real exports of `apps/web`. Plan 5 can rely on:

- `ShopStore.updateConfig` and `ConfigOutcome`, for presenter scenario 7 (customize a template) and for any demo setting it needs to change;
- `useScopedState` and `useBranchScope`, so sync and the review queue respect branch scope;
- `workList.ts` (`planStageMove`, `planAssign`, `runBatch`), whose per-garment results already show conflicts, which the sync review queue will produce more of;
- `statusLink.ts` and `StatusPage`, for presenter scenario 5 (share a link, view it as the customer, revoke it);
- `PrintLayout`'s `back` prop for any further print page;
- the sample-data facts the tests in this plan state (the Uniform House workshop holds only `uniform-o27`; Rahman Tailors has no workers).
