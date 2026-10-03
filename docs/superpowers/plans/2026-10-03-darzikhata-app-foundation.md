# DarziKhata App Foundation Implementation Plan (Plan 2 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the installable DarziKhata web app foundation: shop configuration, three sample shops, a local IndexedDB event store, Bangla-first text, a small UI kit, separate desktop and mobile shells, PIN sign-in on shared devices, and a working PWA build.

**Architecture:** `apps/web` is a Vite + React app that depends on the pure `@darzikhata/domain` package. `ShopStore` is the only code that touches IndexedDB: it replays the saved event log through `replay`, and each change goes through `applyEvent` and is saved before the screen updates. Screens read state through `useSyncExternalStore`. Desktop and mobile get different shells around the same routes and permission rules.

**Tech Stack:** React 19.3, React Router 8.4 (declarative mode), Dexie 4.4, Vite 8.3, Tailwind CSS 4.3 (`@tailwindcss/vite`), vite-plugin-pwa 1.3, Vitest 5 with jsdom 30, Testing Library, fake-indexeddb 6, `@fontsource/hind-siliguri`.

**Spec:** [docs/superpowers/specs/2026-10-03-darzikhata-demo-design.md](../specs/2026-10-03-darzikhata-demo-design.md) (sections 3, 4, 5.1, 6.1 to 6.3, 7.1, 7.2, 7.6, 8.4, 9)

**Builds on:** Plan 1, merged to `main` (`@darzikhata/domain`, 167 tests).

## Plan series

1. Domain package (done).
2. **App foundation** (this plan).
3. Core workflows: customers and measurements, order entry (mobile steps and desktop three-column form), order detail, payments, receipts and print layouts, global search with the `/` and `N` shortcuts, route-level code splitting.
4. Operations: dashboard, work lists with batch actions, public status page (`/s/:token`), settings (template and stage editors, staff, branches), group orders, branch scope.
5. Demo layer: simulated offline and sync with the full status indicator, a seeded review-queue conflict and its review screen, presenter mode, Playwright end-to-end tests, deployment.

## Global Constraints

- Node `>=22.12`. Exact dependency ranges are the ones in Task 2's `apps/web/package.json`; add no other dependencies.
- `packages/domain` stays pure: no React, Dexie, DOM or Node imports.
- Only `apps/web/src/data/store.ts` and `db.ts` touch IndexedDB. Screens change data only through `ShopStore.dispatch`.
- localStorage is used only for per-viewer conveniences (language, layout), only through `lib/safeStorage.ts`, and the app must work when it throws.
- Every visible string comes from `i18n/bn.ts` / `i18n/en.ts` via `useI18n().t`, except the language names "বাংলা" and "English" and data from the shop itself. Bangla is the default.
- Money stays integer poisha end to end; format it only at display time with `useI18n().money`.
- Touch targets are at least 40px tall (48px for primary mobile actions). Every control is keyboard-operable with a visible focus ring.
- Colours come from the CSS variables in `src/index.css` (light and dark). No hard-coded colours in components except the white text on brand buttons.
- Run web commands from `apps/web` and domain commands from `packages/domain` unless a step says repo root.
- Do not use em dashes in code, comments or docs.
- Commit messages carry no AI attribution (no `Co-Authored-By` trailers, no "Generated with" lines).

## File structure

```
packages/domain/src/config.ts        shop setup types, validation and lookups
apps/web/
  package.json, tsconfig.json, vite.config.ts, index.html
  public/icon.svg, icon-192.png, icon-512.png
  scripts/make-icons.mjs             draws the PNG icons
  src/
    main.tsx                         creates the store, mounts the app in BrowserRouter
    index.css                        Tailwind, Hind Siliguri, light/dark colour tokens
    test/setup.ts                    fake IndexedDB, cleanup, empty localStorage
    lib/safeStorage.ts               guarded localStorage
    seed/random.ts                   seeded random numbers
    seed/people.ts                   sample names and notes
    seed/shops.ts                    the three sample shop setups
    seed/generate.ts                 sample event histories relative to today
    data/db.ts                       Dexie schema
    data/store.ts                    ShopStore
    data/StoreContext.tsx            React bindings for the store
    i18n/bn.ts, en.ts                dictionaries
    i18n/format.ts                   translate, dates, money, numbers
    i18n/I18nProvider.tsx            language state and useI18n
    ui/Button.tsx, TextField.tsx, NumberField.tsx, PinPad.tsx, Dialog.tsx
    shell/nav.ts                     sections and the capabilities they need
    shell/ShellPreference.tsx        desktop or mobile, with a saved override
    shell/ShellParts.tsx             connection badge, language toggle, switch user
    shell/DesktopShell.tsx, MobileShell.tsx
    features/welcome/WelcomePage.tsx
    features/auth/SignInPage.tsx
    features/more/MorePage.tsx
    features/PlaceholderPage.tsx
    app/guards.tsx, AppRoutes.tsx, App.tsx
```

---

### Task 1: Shop configuration in the domain

Adds the shop setup types (organization profile, branches, devices with their number series, roles, staff, templates, settings) and their validation to `@darzikhata/domain`. Setup is edited online only, so it lives beside the event log, not in it.

**Files:**
- Create: `packages/domain/src/config.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/config.test.ts`

**Interfaces:**
- Consumes: `Label`, `Language` (`label.ts`); `ShopContact` (`links.ts`); `isValidSeries` (`numbering.ts`); `can`, `isValidPin`, `Role`, `Staff` (`permissions.ts`); `validateTemplate`, `GarmentTemplate` (`templates.ts`).
- Produces:
  - `interface Branch { id; name: Label; kind: 'shop' | 'workshop'; address }`
  - `interface Device { id; name; series; branchId }`
  - `interface ShopProfile { name: Label; phone; address }`
  - `interface ShopSettings { restrictFemaleMeasurements: boolean; linkExpiryDays: number; defaultLanguage: Language }`
  - `interface ShopConfig { id; profile; branches; devices; roles; staff; templates; settings }`
  - `validateShopConfig(config): string[]`
  - `staffById(config, staffId): Staff | null`, `roleOf(config, staffId): Role | null`, `templateById(config, templateId): GarmentTemplate | null`
  - `shopContact(config, language): ShopContact`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { roleOf, shopContact, staffById, templateById, validateShopConfig, type ShopConfig } from './config';
import { DEFAULT_ROLES } from './permissions';
import { STARTER_TEMPLATES } from './templates';

function config(overrides: Partial<ShopConfig> = {}): ShopConfig {
  return {
    id: 'rahman',
    profile: { name: { bn: 'রহমান টেইলার্স', en: 'Rahman Tailors' }, phone: '01755123456', address: 'মিরপুর ১০' },
    branches: [{ id: 'main', name: { bn: 'প্রধান দোকান', en: 'Main shop' }, kind: 'shop', address: '' }],
    devices: [{ id: 'device-a', name: 'Counter phone', series: 'A', branchId: 'main' }],
    roles: DEFAULT_ROLES,
    staff: [{ id: 'owner', name: 'Abdur Rahman', roleId: 'owner', branchIds: 'all', pin: '1111', active: true }],
    templates: STARTER_TEMPLATES,
    settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
    ...overrides,
  };
}

describe('validateShopConfig', () => {
  it('accepts a minimal single-shop setup', () => {
    expect(validateShopConfig(config())).toEqual([]);
  });

  it('reports structural problems', () => {
    const broken = config({
      profile: { name: { bn: '', en: '' }, phone: '', address: '' },
      branches: [],
      devices: [
        { id: 'd1', name: 'x', series: 'a', branchId: 'nowhere' },
        { id: 'd2', name: 'y', series: 'a', branchId: 'nowhere' },
      ],
      staff: [
        { id: 's1', name: 'x', roleId: 'ghost', branchIds: ['nowhere'], pin: '12', active: true },
        { id: 's1', name: 'y', roleId: 'tailor', branchIds: 'all', pin: '1234', active: true },
      ],
      templates: [STARTER_TEMPLATES[0]!, STARTER_TEMPLATES[0]!],
      settings: { restrictFemaleMeasurements: false, linkExpiryDays: 0, defaultLanguage: 'bn' },
    });
    expect(validateShopConfig(broken)).toEqual([
      'no-shop-name',
      'no-branches',
      'invalid-series:d1',
      'device-branch:d1',
      'invalid-series:d2',
      'device-branch:d2',
      'duplicate-series:a',
      'duplicate-staff:s1',
      'unknown-role:s1',
      'unknown-branch:s1',
      'invalid-pin:s1',
      'no-owner',
      'duplicate-template:shirt',
      'invalid-link-expiry',
    ]);
  });

  it('prefixes template problems with the template id', () => {
    const bad = { ...STARTER_TEMPLATES[0]!, stages: [] };
    expect(validateShopConfig(config({ templates: [bad] }))).toEqual(['template:shirt:no-stages']);
  });

  it('requires an active person who can manage staff', () => {
    const inactiveOwner = config({
      staff: [{ id: 'owner', name: 'x', roleId: 'owner', branchIds: 'all', pin: '1111', active: false }],
    });
    expect(validateShopConfig(inactiveOwner)).toEqual(['no-owner']);
  });
});

describe('lookups', () => {
  it('finds staff, their role and templates', () => {
    const c = config();
    expect(staffById(c, 'owner')?.name).toBe('Abdur Rahman');
    expect(staffById(c, 'nobody')).toBeNull();
    expect(roleOf(c, 'owner')?.id).toBe('owner');
    expect(roleOf(c, 'nobody')).toBeNull();
    expect(templateById(c, 'panjabi')?.name.en).toBe('Panjabi');
    expect(templateById(c, 'nope')).toBeNull();
  });

  it('gives shop contact details in the chosen language', () => {
    expect(shopContact(config(), 'en')).toEqual({ name: 'Rahman Tailors', phone: '01755123456', address: 'মিরপুর ১০' });
    expect(shopContact(config(), 'bn').name).toBe('রহমান টেইলার্স');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/config.test.ts`

Expected: FAIL with `Error: Cannot find module './config'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/config.ts`:

```ts
import type { Label, Language } from './label';
import type { ShopContact } from './links';
import { isValidSeries } from './numbering';
import { can, isValidPin, type Role, type Staff } from './permissions';
import { validateTemplate, type GarmentTemplate } from './templates';

export interface Branch {
  id: string;
  name: Label;
  kind: 'shop' | 'workshop';
  address: string;
}

/** A browser or phone that writes data. Each has its own order-number series. */
export interface Device {
  id: string;
  name: string;
  series: string;
  branchId: string;
}

export interface ShopProfile {
  name: Label;
  phone: string;
  address: string;
}

export interface ShopSettings {
  /** When true, female customers' measurements need 'measurements.view.female'. */
  restrictFemaleMeasurements: boolean;
  /** Status links expire this many days after an order is fully delivered or cancelled. */
  linkExpiryDays: number;
  defaultLanguage: Language;
}

/** Shop setup. Edited online only, so it lives outside the event log. */
export interface ShopConfig {
  id: string;
  profile: ShopProfile;
  branches: Branch[];
  devices: Device[];
  roles: Role[];
  staff: Staff[];
  templates: GarmentTemplate[];
  settings: ShopSettings;
}

function duplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) repeated.add(value);
    seen.add(value);
  }
  return [...repeated];
}

/** Returns a list of problems with a shop setup; empty means valid. */
export function validateShopConfig(config: ShopConfig): string[] {
  const errors: string[] = [];
  const branchIds = config.branches.map((b) => b.id);
  const roleIds = config.roles.map((r) => r.id);

  if (!config.profile.name.bn.trim() && !config.profile.name.en.trim()) errors.push('no-shop-name');
  if (config.branches.length === 0) errors.push('no-branches');
  for (const id of duplicates(branchIds)) errors.push(`duplicate-branch:${id}`);

  if (config.devices.length === 0) errors.push('no-devices');
  for (const device of config.devices) {
    if (!isValidSeries(device.series)) errors.push(`invalid-series:${device.id}`);
    if (!branchIds.includes(device.branchId)) errors.push(`device-branch:${device.id}`);
  }
  for (const series of duplicates(config.devices.map((d) => d.series))) errors.push(`duplicate-series:${series}`);

  for (const id of duplicates(roleIds)) errors.push(`duplicate-role:${id}`);
  for (const id of duplicates(config.staff.map((s) => s.id))) errors.push(`duplicate-staff:${id}`);
  for (const staff of config.staff) {
    if (!roleIds.includes(staff.roleId)) errors.push(`unknown-role:${staff.id}`);
    if (staff.branchIds !== 'all' && staff.branchIds.some((b) => !branchIds.includes(b))) {
      errors.push(`unknown-branch:${staff.id}`);
    }
    if (!isValidPin(staff.pin)) errors.push(`invalid-pin:${staff.id}`);
  }
  const hasManager = config.staff.some((s) => {
    const role = roleOf(config, s.id);
    return s.active && role !== null && can(role, 'staff.manage');
  });
  if (!hasManager) errors.push('no-owner');

  for (const id of duplicates(config.templates.map((t) => t.id))) errors.push(`duplicate-template:${id}`);
  for (const template of config.templates) {
    for (const problem of validateTemplate(template)) errors.push(`template:${template.id}:${problem}`);
  }

  const { linkExpiryDays } = config.settings;
  if (!Number.isInteger(linkExpiryDays) || linkExpiryDays < 1) errors.push('invalid-link-expiry');
  return errors;
}

export function staffById(config: ShopConfig, staffId: string): Staff | null {
  return config.staff.find((s) => s.id === staffId) ?? null;
}

export function roleOf(config: ShopConfig, staffId: string): Role | null {
  const staff = staffById(config, staffId);
  return staff ? (config.roles.find((r) => r.id === staff.roleId) ?? null) : null;
}

export function templateById(config: ShopConfig, templateId: string): GarmentTemplate | null {
  return config.templates.find((t) => t.id === templateId) ?? null;
}

/** The shop details shown on receipts and public status pages, in one language. */
export function shopContact(config: ShopConfig, language: Language): ShopContact {
  const { name, phone, address } = config.profile;
  return { name: name[language] || name.bn || name.en, phone, address };
}
```

`packages/domain/src/index.ts`: Add the config module to the public API, directly after the `./apply` line:

```ts
export * from './apply';
export * from './config';
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/config.test.ts`

Expected: PASS, 6 tests.

Run (repo root): `npm test -w @darzikhata/domain`

Expected: `Tests  173 passed (173)`.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/config.ts packages/domain/src/index.ts packages/domain/src/config.test.ts
git commit -m "feat(domain): add shop configuration types and validation"
```

### Task 2: Web app workspace and seeded random numbers

Creates `@darzikhata/web` (Vite 8, React 19, React Router 8, Dexie 4, Tailwind 4, vite-plugin-pwa) with a jsdom test setup, then adds the seeded random generator that keeps demo data identical on every reset.

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/seed/random.ts`
- Test: `apps/web/src/seed/random.test.ts`

**Interfaces:**
- Consumes: Nothing from earlier tasks.
- Produces:
  - `interface Rng { next(): number; int(min, max): number; pick<T>(items): T; chance(probability): boolean }`
  - `createRng(seed: number): Rng`

- [ ] **Step 1: Create `apps/web/package.json`**

The workspace package. Dependency versions were current on 3 Oct 2026; `vite-plugin-pwa` is held at 1.3.0 because 2.0.0 was published that same day and only changes a peer dependency this app does not use.

```json
{
  "name": "@darzikhata/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.3.3",
    "@testing-library/dom": "^10.4.2",
    "@testing-library/react": "^16.3.3",
    "@testing-library/user-event": "^14.6.7",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "@vitejs/plugin-react": "^6.1.1",
    "fake-indexeddb": "^6.2.5",
    "jsdom": "^30.1.1",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.2",
    "vite-plugin-pwa": "^1.3.0"
  },
  "dependencies": {
    "@darzikhata/domain": "0.0.0",
    "@fontsource/hind-siliguri": "^5.3.0",
    "dexie": "^4.4.6",
    "react": "^19.3.0",
    "react-dom": "^19.3.0",
    "react-router": "^8.4.0"
  }
}
```

- [ ] **Step 2: Create `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client", "vite-plugin-pwa/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 3: Create `apps/web/vite.config.ts`**

The PWA plugin is skipped in test mode. Icons it references are created in Task 9.

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // The service worker is irrelevant in unit tests, so it is only added for real builds.
    mode !== 'test' &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        manifest: {
          name: 'DarziKhata (ডেমো)',
          short_name: 'DarziKhata',
          description: 'দর্জির মাপ, অর্ডার আর হিসাব এক জায়গায়',
          lang: 'bn',
          start_url: '/',
          display: 'standalone',
          theme_color: '#0f766e',
          background_color: '#f8faf9',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: '/index.html',
        },
      }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
```

- [ ] **Step 4: Create `apps/web/src/test/setup.ts`**

Runs before every web test: an in-memory IndexedDB, DOM cleanup, and an empty localStorage.

```ts
import 'fake-indexeddb/auto';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
```

- [ ] **Step 5: Install dependencies**

Run (repo root): `npm install`

Expected: ends with `found 0 vulnerabilities`, and `node_modules/@darzikhata/domain` links to `packages/domain`.

Run (repo root): `npm audit signatures`

Expected: every package reports verified registry signatures, with no invalid or missing signatures.

- [ ] **Step 6: Write the failing test**

`apps/web/src/seed/random.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { createRng } from './random';

describe('createRng', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('differs between seeds', () => {
    expect(createRng(1).next()).not.toBe(createRng(2).next());
  });

  it('keeps int within bounds and picks from the list', () => {
    const rng = createRng(7);
    for (let i = 0; i < 200; i++) {
      const n = rng.int(3, 5);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(5);
      expect(['x', 'y']).toContain(rng.pick(['x', 'y']));
    }
  });

  it('respects chance extremes', () => {
    const rng = createRng(9);
    expect(rng.chance(0)).toBe(false);
    expect(rng.chance(1)).toBe(true);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx vitest run src/seed/random.test.ts`

Expected: FAIL with `Error: Cannot find module './random'`.

- [ ] **Step 8: Write the implementation**

`apps/web/src/seed/random.ts`:

```ts
/** A small seeded random generator (mulberry32), so demo data is the same on every reset. */
export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(probability: number): boolean;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)]!,
    chance: (probability) => next() < probability,
  };
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx vitest run src/seed/random.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 10: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 11: Commit**

```bash
git add apps/web/package.json apps/web/tsconfig.json apps/web/vite.config.ts apps/web/src/test/setup.ts apps/web/src/seed/random.ts apps/web/src/seed/random.test.ts package-lock.json
git commit -m "feat(web): scaffold web app workspace with seeded random generator"
```

### Task 3: Sample shops and their history

Three sample shops for interviews: Rahman Tailors (solo men's tailor), Nakshi Boutique (women's wear, 4 staff, trial and QC, restricted women's measurements) and Uniform House (shop plus workshop, 12-wearer school order). Each history is generated from domain events with dates relative to today, so today's trials, deliveries and overdue lists always have rows. Every generated event must apply cleanly.

**Files:**
- Create: `apps/web/src/seed/people.ts`
- Create: `apps/web/src/seed/shops.ts`
- Create: `apps/web/src/seed/generate.ts`
- Test: `apps/web/src/seed/generate.test.ts`

**Interfaces:**
- Consumes: `createRng`, `Rng` (Task 2); from `@darzikhata/domain`: `DEFAULT_ROLES`, `STANDARD_STAGES`, `STARTER_TEMPLATES`, `formatOrderNumber`, `snapshotOf`, `ShopConfig` and the event, template, measurement and money types.
- Produces:
  - `type SeedShopKey = 'rahman' | 'nakshi' | 'uniform'`
  - `SEED_SHOPS: Array<{ key: SeedShopKey; name: Label; summary: Label }>`
  - `shopConfig(key: SeedShopKey): ShopConfig` (owner PIN 1111; other staff 2222, 3333... in list order)
  - `generateShop(key: SeedShopKey, today: string): { config: ShopConfig; events: DomainEvent[] }`
  - `addDays(date, days): string`, `dhakaTime(date, hour, minute = 0): string`
  - Staff ids used later: `rahman-owner`; `nakshi-owner`, `nakshi-counter`, `nakshi-cutting`, `nakshi-tailor`; `uniform-owner`, `uniform-counter`, `uniform-supervisor`, `uniform-tailor-1`, `uniform-tailor-2`. Every shop has device `device-a` with series `A`.

- [ ] **Step 1: Write the failing test**

`apps/web/src/seed/generate.test.ts`:

```ts
import {
  deliveriesOn,
  moneySummary,
  orderProgress,
  overdueItems,
  readyForPickup,
  replay,
  trialsOn,
  validateShopConfig,
} from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { addDays, dhakaTime, generateShop } from './generate';
import { SEED_SHOPS } from './shops';

const TODAY = '2026-10-03';

describe('date helpers', () => {
  it('adds days across month ends', () => {
    expect(addDays('2026-10-03', -3)).toBe('2026-09-30');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('turns Dhaka wall-clock time into UTC', () => {
    expect(dhakaTime('2026-10-03', 10, 30)).toBe('2026-10-03T04:30:00.000Z');
    expect(dhakaTime('2026-10-03', 2)).toBe('2026-10-02T20:00:00.000Z');
  });
});

describe.each(SEED_SHOPS.map((s) => s.key))('generateShop(%s)', (key) => {
  const { config, events } = generateShop(key, TODAY);
  const { state, outcomes } = replay(events);
  const orders = Object.values(state.orders);

  it('has a valid setup', () => {
    expect(validateShopConfig(config)).toEqual([]);
  });

  it('produces events that all apply', () => {
    expect(outcomes.filter((o) => o.outcome !== 'applied')).toEqual([]);
  });

  it('is the same on every run', () => {
    expect(generateShop(key, TODAY).events).toEqual(events);
  });

  it('keeps every event in the past', () => {
    const endOfYesterday = dhakaTime(TODAY, 0);
    expect(events.every((e) => e.at < endOfYesterday)).toBe(true);
  });

  it('has about 30 customers and 40 orders', () => {
    expect(Object.keys(state.customers)).toHaveLength(30);
    expect(orders.length).toBeGreaterThanOrEqual(40);
  });

  it('fills today’s lists', () => {
    expect(deliveriesOn(orders, TODAY).length).toBeGreaterThan(0);
    expect(overdueItems(orders, TODAY).length).toBeGreaterThan(0);
    expect(readyForPickup(orders).length).toBeGreaterThan(0);
  });

  it('includes a correction, a refund, a cancellation and a household', () => {
    const payments = orders.flatMap((o) => o.payments);
    expect(payments.some((p) => p.kind === 'correction')).toBe(true);
    expect(payments.some((p) => p.kind === 'refund')).toBe(true);
    expect(orders.some((o) => o.items.some((i) => i.cancelled))).toBe(true);
    expect(Object.keys(state.households).length).toBe(2);
  });

  it('never leaves an order overpaid', () => {
    expect(orders.filter((o) => moneySummary(o).creditDue > 0).map((o) => o.number)).toEqual([]);
  });
});

describe('shop-specific data', () => {
  it('gives Nakshi Boutique a trial today and the women’s measurement restriction', () => {
    const { config, events } = generateShop('nakshi', TODAY);
    const orders = Object.values(replay(events).state.orders);
    expect(config.settings.restrictFemaleMeasurements).toBe(true);
    expect(trialsOn(orders, TODAY).length).toBeGreaterThan(0);
  });

  it('gives Uniform House a 12-wearer group order with partial delivery at the workshop', () => {
    const { config, events } = generateShop('uniform', TODAY);
    const orders = Object.values(replay(events).state.orders);
    const group = orders.find((o) => o.branchId === 'workshop')!;
    expect(config.branches.map((b) => b.id)).toEqual(['shop', 'workshop']);
    expect(new Set(group.items.map((i) => i.wearer)).size).toBe(12);
    expect(orderProgress(group)).toMatchObject({ delivered: 10, ready: 8, unfinished: 6, total: 24 });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/seed/generate.test.ts`

Expected: FAIL with `Error: Cannot find module './generate'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/seed/people.ts`:

```ts
export interface SeedPerson {
  bn: string;
  en: string;
  gender: 'male' | 'female';
}

const man = (bn: string, en: string): SeedPerson => ({ bn, en, gender: 'male' });
const woman = (bn: string, en: string): SeedPerson => ({ bn, en, gender: 'female' });

export const MEN: SeedPerson[] = [
  man('রহিম উদ্দিন', 'Rahim Uddin'),
  man('করিম মিয়া', 'Karim Mia'),
  man('আব্দুল হক', 'Abdul Haque'),
  man('মোহাম্মদ আলী', 'Mohammad Ali'),
  man('জাহাঙ্গীর আলম', 'Jahangir Alam'),
  man('সাকিব হাসান', 'Sakib Hasan'),
  man('তানভীর আহমেদ', 'Tanvir Ahmed'),
  man('রাশেদ চৌধুরী', 'Rashed Chowdhury'),
  man('ফারুক হোসেন', 'Faruk Hossain'),
  man('নাজমুল ইসলাম', 'Nazmul Islam'),
  man('মাহবুব রহমান', 'Mahbub Rahman'),
  man('শফিকুল ইসলাম', 'Shafiqul Islam'),
  man('আরিফ খান', 'Arif Khan'),
  man('মিজানুর রহমান', 'Mizanur Rahman'),
  man('হাবিবুর রহমান', 'Habibur Rahman'),
  man('কামরুল হাসান', 'Kamrul Hasan'),
  man('সুমন দাস', 'Sumon Das'),
  man('বিপ্লব বড়ুয়া', 'Biplob Barua'),
  man('ইমরান হোসেন', 'Imran Hossain'),
  man('রফিকুল আমিন', 'Rafiqul Amin'),
];

export const WOMEN: SeedPerson[] = [
  woman('শিরিন আক্তার', 'Shirin Akter'),
  woman('ফাতেমা বেগম', 'Fatema Begum'),
  woman('নুসরাত জাহান', 'Nusrat Jahan'),
  woman('সুলতানা রাজিয়া', 'Sultana Razia'),
  woman('তাহমিনা খাতুন', 'Tahmina Khatun'),
  woman('রুমানা ইসলাম', 'Rumana Islam'),
  woman('শারমিন সুলতানা', 'Sharmin Sultana'),
  woman('মরিয়ম নেসা', 'Mariam Nesa'),
  woman('জান্নাতুল ফেরদৌস', 'Jannatul Ferdous'),
  woman('লাবণ্য দাস', 'Labonno Das'),
  woman('সাবরিনা হক', 'Sabrina Haque'),
  woman('আয়েশা সিদ্দিকা', 'Ayesha Siddika'),
  woman('রেহানা পারভীন', 'Rehana Parvin'),
  woman('মৌসুমী রায়', 'Mousumi Roy'),
  woman('নাসরিন সুলতানা', 'Nasrin Sultana'),
  woman('ফারজানা ইয়াসমিন', 'Farzana Yasmin'),
  woman('তানজিলা হোসেন', 'Tanzila Hossain'),
  woman('মিতু আক্তার', 'Mitu Akter'),
  woman('রোকসানা বেগম', 'Roksana Begum'),
  woman('পপি চৌধুরী', 'Popy Chowdhury'),
];

export const CHILDREN: string[] = [
  'রাফি', 'তানহা', 'আয়ান', 'নাবিলা', 'সামি', 'রিয়া', 'ফাহিম', 'মাহি', 'আরাফ', 'সাদিয়া', 'তাসিন', 'নুহা',
];

export const DESIGN_NOTES: string[] = [
  'কলার একটু চওড়া',
  'দুই পকেট, ঢাকনা সহ',
  'হাতায় কাফলিং',
  'ফিটিং একটু ঢিলা',
  'সামনে লুকানো বোতাম',
  'গলায় সূক্ষ্ম কাজ',
  '',
  '',
];

export const FABRIC_NOTES: string[] = ['কাস্টমারের কাপড়, সাদা সুতি', 'নীল লিনেন', 'দোকানের কাপড় #১২', 'সিল্ক, মেরুন', 'জর্জেট, গোলাপি', ''];

export const FITTING_NOTES: string[] = ['কাঁধ ¼ ইঞ্চি কমাতে হবে', 'হাতা ½ ইঞ্চি লম্বা', 'কোমর একটু ঢিলা করতে হবে'];
```

`apps/web/src/seed/shops.ts`:

```ts
import {
  DEFAULT_ROLES,
  STANDARD_STAGES,
  STARTER_TEMPLATES,
  type GarmentTemplate,
  type Label,
  type MeasurementField,
  type Role,
  type ShopConfig,
  type Stage,
} from '@darzikhata/domain';

export type SeedShopKey = 'rahman' | 'nakshi' | 'uniform';

export interface SeedShopInfo {
  key: SeedShopKey;
  name: Label;
  summary: Label;
}

export const SEED_SHOPS: SeedShopInfo[] = [
  {
    key: 'rahman',
    name: { bn: 'রহমান টেইলার্স', en: 'Rahman Tailors' },
    summary: { bn: 'একা দর্জি, ছেলেদের শার্ট-প্যান্ট-পাঞ্জাবি', en: 'Solo men’s tailor: shirt, pant, panjabi' },
  },
  {
    key: 'nakshi',
    name: { bn: 'নকশী বুটিক', en: 'Nakshi Boutique' },
    summary: { bn: 'মেয়েদের পোশাক, ৪ জন স্টাফ, ট্রায়াল ও QC', en: 'Women’s wear, 4 staff, trial and QC' },
  },
  {
    key: 'uniform',
    name: { bn: 'ইউনিফর্ম হাউস', en: 'Uniform House' },
    summary: { bn: 'দোকান আর কারখানা, স্কুলের গ্রুপ অর্ডার', en: 'Shop and workshop, school group order' },
  },
];

const starter = (id: string): GarmentTemplate => STARTER_TEMPLATES.find((t) => t.id === id)!;

const field = (key: string, bn: string, en: string, group: string, required = true): MeasurementField => ({
  key,
  label: { bn, en },
  unit: 'inch',
  group,
  required,
});

const stage = (key: string, bn: string, en: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn, en },
  optional,
  group,
});

const BRIDAL_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('cutting', 'কাটিং', 'Cutting', 'unfinished'),
  stage('embroidery', 'এমব্রয়ডারি', 'Embroidery', 'unfinished'),
  stage('stitching', 'সেলাই', 'Stitching', 'unfinished'),
  stage('trial', 'ট্রায়াল', 'Trial', 'unfinished', true),
  stage('qc', 'মান যাচাই', 'Quality check', 'unfinished', true),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

const BRIDAL_LEHENGA: GarmentTemplate = {
  id: 'bridal-lehenga',
  name: { bn: 'ব্রাইডাল লেহেঙ্গা', en: 'Bridal lehenga' },
  defaultPrice: 1500000,
  fields: [
    field('length', 'ব্লাউজের ঝুল', 'Blouse length', 'blouse'),
    field('chest', 'বুক', 'Chest', 'blouse'),
    field('waist', 'কোমর', 'Waist', 'skirt'),
    field('hip', 'হিপ', 'Hip', 'skirt'),
    field('skirt-length', 'লেহেঙ্গার ঝুল', 'Skirt length', 'skirt'),
    field('shoulder', 'কাঁধ', 'Shoulder', 'blouse'),
    field('sleeve', 'হাতা', 'Sleeve', 'blouse'),
  ],
  stages: BRIDAL_STAGES,
  active: true,
};

const SCHOOL_SHIRT: GarmentTemplate = {
  id: 'school-shirt',
  name: { bn: 'স্কুল শার্ট', en: 'School shirt' },
  defaultPrice: 45000,
  fields: [
    field('length', 'ঝুল', 'Length', 'body'),
    field('chest', 'বুক', 'Chest', 'body'),
    field('shoulder', 'কাঁধ', 'Shoulder', 'body'),
    field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
    field('collar', 'গলা', 'Collar', 'neck'),
  ],
  stages: STANDARD_STAGES,
  active: true,
};

const SCHOOL_PANT: GarmentTemplate = {
  id: 'school-pant',
  name: { bn: 'স্কুল প্যান্ট', en: 'School pant' },
  defaultPrice: 50000,
  fields: [
    field('length', 'ঝুল', 'Length', 'body'),
    field('waist', 'কোমর', 'Waist', 'body'),
    field('hip', 'হিপ', 'Hip', 'body'),
    field('bottom', 'মুহুরি', 'Bottom', 'leg'),
  ],
  stages: STANDARD_STAGES,
  active: true,
};

/** Boutique cutters and tailors need women's measurements; counter staff do not. */
const BOUTIQUE_ROLES: Role[] = DEFAULT_ROLES.map((role) =>
  role.id === 'cutting' || role.id === 'tailor'
    ? { ...role, capabilities: [...role.capabilities, 'measurements.view.female'] }
    : role,
);

const pin = (n: number) => String(n).repeat(4);

export function shopConfig(key: SeedShopKey): ShopConfig {
  switch (key) {
    case 'rahman':
      return {
        id: 'rahman',
        profile: { name: SEED_SHOPS[0]!.name, phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' },
        branches: [{ id: 'main', name: { bn: 'প্রধান দোকান', en: 'Main shop' }, kind: 'shop', address: 'মিরপুর ১০, ঢাকা' }],
        devices: [{ id: 'device-a', name: 'দোকানের ফোন', series: 'A', branchId: 'main' }],
        roles: DEFAULT_ROLES,
        staff: [{ id: 'rahman-owner', name: 'আব্দুর রহমান', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true }],
        templates: [starter('shirt'), starter('pant'), starter('panjabi'), starter('alteration')],
        settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
    case 'nakshi':
      return {
        id: 'nakshi',
        profile: { name: SEED_SHOPS[1]!.name, phone: '01866234567', address: 'ধানমন্ডি ২৭, ঢাকা' },
        branches: [{ id: 'main', name: { bn: 'বুটিক', en: 'Boutique' }, kind: 'shop', address: 'ধানমন্ডি ২৭, ঢাকা' }],
        devices: [{ id: 'device-a', name: 'কাউন্টার ল্যাপটপ', series: 'A', branchId: 'main' }],
        roles: BOUTIQUE_ROLES,
        staff: [
          { id: 'nakshi-owner', name: 'নাসরিন সুলতানা', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true },
          { id: 'nakshi-counter', name: 'মিতু আক্তার', roleId: 'counter', branchIds: 'all', pin: pin(2), active: true },
          { id: 'nakshi-cutting', name: 'রোকেয়া বেগম', roleId: 'cutting', branchIds: 'all', pin: pin(3), active: true },
          { id: 'nakshi-tailor', name: 'জামাল উদ্দিন', roleId: 'tailor', branchIds: 'all', pin: pin(4), active: true },
        ],
        templates: [starter('salwar-kameez'), starter('blouse'), BRIDAL_LEHENGA, starter('alteration')],
        settings: { restrictFemaleMeasurements: true, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
    case 'uniform':
      return {
        id: 'uniform',
        profile: { name: SEED_SHOPS[2]!.name, phone: '01977345678', address: 'আগ্রাবাদ, চট্টগ্রাম' },
        branches: [
          { id: 'shop', name: { bn: 'দোকান', en: 'Shop' }, kind: 'shop', address: 'আগ্রাবাদ, চট্টগ্রাম' },
          { id: 'workshop', name: { bn: 'কারখানা', en: 'Workshop' }, kind: 'workshop', address: 'হালিশহর, চট্টগ্রাম' },
        ],
        devices: [{ id: 'device-a', name: 'দোকানের কম্পিউটার', series: 'A', branchId: 'shop' }],
        roles: DEFAULT_ROLES,
        staff: [
          { id: 'uniform-owner', name: 'কামাল হোসেন', roleId: 'owner', branchIds: 'all', pin: pin(1), active: true },
          { id: 'uniform-counter', name: 'শাপলা রায়', roleId: 'counter', branchIds: ['shop'], pin: pin(2), active: true },
          { id: 'uniform-supervisor', name: 'হাবিব উল্লাহ', roleId: 'supervisor', branchIds: ['workshop'], pin: pin(3), active: true },
          { id: 'uniform-tailor-1', name: 'রফিক মিয়া', roleId: 'tailor', branchIds: 'all', pin: pin(4), active: true },
          { id: 'uniform-tailor-2', name: 'সেলিম শেখ', roleId: 'tailor', branchIds: 'all', pin: pin(5), active: true },
        ],
        templates: [SCHOOL_SHIRT, SCHOOL_PANT, starter('shirt'), starter('pant')],
        settings: { restrictFemaleMeasurements: false, linkExpiryDays: 30, defaultLanguage: 'bn' },
      };
  }
}
```

`apps/web/src/seed/generate.ts`:

```ts
import {
  formatOrderNumber,
  snapshotOf,
  type DomainEvent,
  type EventBody,
  type GarmentTemplate,
  type MeasurementSnapshot,
  type MeasurementValue,
  type MeasurementVersion,
  type NewOrderItem,
  type PaymentMethod,
  type Poisha,
  type ShopConfig,
  type Stage,
} from '@darzikhata/domain';
import { CHILDREN, DESIGN_NOTES, FABRIC_NOTES, FITTING_NOTES, MEN, WOMEN, type SeedPerson } from './people';
import { createRng, type Rng } from './random';
import { shopConfig, type SeedShopKey } from './shops';

export interface SeedData {
  config: ShopConfig;
  events: DomainEvent[];
}

interface Recipe {
  seed: number;
  femaleShare: number;
  /** Template ids to draw garments from; repeats make a garment more common. */
  garments: string[];
  takers: string[];
  measurers: string[];
  workers: string[];
  branchId: string;
}

const RECIPES: Record<SeedShopKey, Recipe> = {
  rahman: {
    seed: 101,
    femaleShare: 0,
    garments: ['shirt', 'shirt', 'pant', 'panjabi', 'panjabi', 'alteration'],
    takers: ['rahman-owner'],
    measurers: ['rahman-owner'],
    workers: [],
    branchId: 'main',
  },
  nakshi: {
    seed: 202,
    femaleShare: 1,
    garments: ['salwar-kameez', 'salwar-kameez', 'blouse', 'blouse', 'bridal-lehenga', 'alteration'],
    takers: ['nakshi-counter', 'nakshi-owner'],
    measurers: ['nakshi-cutting'],
    workers: ['nakshi-tailor'],
    branchId: 'main',
  },
  uniform: {
    seed: 303,
    femaleShare: 0.3,
    garments: ['shirt', 'pant', 'shirt', 'pant', 'school-shirt'],
    takers: ['uniform-counter'],
    measurers: ['uniform-counter'],
    workers: ['uniform-tailor-1', 'uniform-tailor-2'],
    branchId: 'shop',
  },
};

const CUSTOMER_COUNT = 30;
const ORDER_COUNT = 40;

/** Typical measurements in inches; lengths depend on the garment. */
const BASE: Record<string, number> = {
  chest: 38, waist: 34, hip: 38, shoulder: 17, sleeve: 23, cuff: 9, collar: 15.5, thigh: 23, knee: 17,
  bottom: 15, rise: 11, 'kameez-length': 40, armhole: 16, 'neck-front': 7, 'neck-back': 5,
  'salwar-length': 38, 'salwar-bottom': 14, 'under-bust': 30, 'sleeve-round': 11, 'skirt-length': 41,
};
const LENGTH: Record<string, number> = {
  shirt: 29, pant: 40, panjabi: 42, blouse: 15, 'bridal-lehenga': 15, 'school-shirt': 24, 'school-pant': 34,
};

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** A Dhaka wall-clock time (UTC+6) on a date, as an ISO timestamp. */
export function dhakaTime(date: string, hour: number, minute = 0): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d, hour - 6, minute)).toISOString();
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** `count` dates spread evenly from `start` to `end` inclusive. */
function spreadDates(start: string, end: string, count: number): string[] {
  const span = Math.max(0, daysBetween(start, end));
  return Array.from({ length: count }, (_, i) => addDays(start, count === 1 ? span : Math.round((span * i) / (count - 1))));
}

const roundToTaka100 = (poisha: Poisha) => Math.round(poisha / 10000) * 10000;

function measurementValues(rng: Rng, template: GarmentTemplate, scale = 1): Record<string, MeasurementValue> {
  const values: Record<string, MeasurementValue> = {};
  for (const field of template.fields) {
    if (!field.required && rng.chance(0.5)) continue;
    const base = field.key === 'length' ? (LENGTH[template.id] ?? 30) : (BASE[field.key] ?? 12);
    const quarterSteps = Math.round((base * scale) / 0.25) + rng.int(-8, 8);
    values[field.key] = { value: Math.max(1, quarterSteps) * 0.25, unit: field.unit };
  }
  return values;
}

type Phase = { kind: 'delivered' } | { kind: 'ready' } | { kind: 'working'; fraction: number };

function stagePath(stages: Stage[], includeTrial: boolean, includeQc: boolean): Stage[] {
  return stages.filter((s) => !s.optional || (s.key === 'trial' && includeTrial) || (s.key === 'qc' && includeQc));
}

function targetIndex(path: Stage[], phase: Phase): number {
  const ready = path.findIndex((s) => s.group === 'ready');
  if (phase.kind === 'delivered') return path.length - 1;
  if (phase.kind === 'ready') return ready;
  return Math.min(ready - 1, Math.max(0, Math.floor(phase.fraction * ready)));
}

/** Generates a demo shop's setup and full event history, with dates relative to `today` (YYYY-MM-DD). */
export function generateShop(key: SeedShopKey, today: string): SeedData {
  const config = shopConfig(key);
  const recipe = RECIPES[key];
  const rng = createRng(recipe.seed);
  const owner = config.staff[0]!.id;
  const yesterday = addDays(today, -1);
  const templateById = (id: string) => config.templates.find((t) => t.id === id)!;

  const pending: Array<{ at: string; staffId: string; body: EventBody }> = [];
  const emit = (at: string, staffId: string, body: EventBody) => pending.push({ at, staffId, body });

  // Customers, with two households that share one phone number.
  const men = [...MEN];
  const women = [...WOMEN];
  const customers: Array<{ id: string; person: SeedPerson }> = [];
  const regularCustomers = key === 'uniform' ? CUSTOMER_COUNT - 1 : CUSTOMER_COUNT;
  let sharedPhone = '';
  let householdDay = '';
  for (let i = 0; i < regularCustomers; i++) {
    const pool = rng.chance(recipe.femaleShare) ? women : men;
    const person = pool.length > 0 ? pool.splice(rng.int(0, pool.length - 1), 1)[0]! : rng.pick([...MEN, ...WOMEN]);
    const id = `${key}-c${i + 1}`;
    const inHousehold = i === 1 || i === 2 || i === 5 || i === 6;
    if (i === 1 || i === 5) householdDay = addDays(today, -rng.int(90, 120));
    const createdOn = inHousehold ? householdDay : addDays(today, -rng.int(90, 120));
    const householdId = inHousehold ? `${key}-h${i < 5 ? 1 : 2}` : null;
    if (i === 1 || i === 5) {
      sharedPhone = `017${String(rng.int(10000000, 99999999))}`;
      emit(dhakaTime(createdOn, 9), owner, {
        type: 'household.created',
        household: { id: householdId!, label: `${person.bn.split(' ').at(-1)} পরিবার` },
      });
    }
    const phone = inHousehold ? sharedPhone : rng.chance(0.9) ? `01${rng.int(3, 9)}${String(rng.int(10000000, 99999999))}` : null;
    emit(dhakaTime(createdOn, 10), owner, {
      type: 'customer.created',
      customer: { id, name: person.bn, nameAlt: person.en, phone, householdId, gender: person.gender, notes: '' },
    });
    customers.push({ id, person });
  }

  // Measurements: one version per customer and garment, sometimes re-measured.
  const latest = new Map<string, MeasurementVersion>();
  const measure = (customerId: string, template: GarmentTemplate, at: string): MeasurementSnapshot | null => {
    if (template.fields.length === 0) return null;
    const key2 = `${customerId}:${template.id}`;
    const existing = latest.get(key2);
    if (!existing || rng.chance(0.15)) {
      const versionNo = existing ? Number(existing.id.split('-v').at(-1)) + 1 : 1;
      const version: MeasurementVersion = {
        id: `${customerId}-${template.id}-v${versionNo}`,
        takenAt: at,
        takenBy: rng.pick(recipe.measurers),
        source: rng.chance(0.1) ? 'sample' : 'body',
        notes: versionNo > 1 ? 'আবার মাপ নেওয়া হয়েছে' : '',
        values: measurementValues(rng, template),
      };
      emit(at, version.takenBy, { type: 'measurement.recorded', customerId, templateId: template.id, version });
      latest.set(key2, version);
    }
    return snapshotOf(latest.get(key2)!);
  };

  // Orders, oldest first so numbers follow time. Uniform House also gets one school group order.
  const specs: Array<{ daysAgo: number; group: boolean }> = Array.from({ length: ORDER_COUNT }, (_, i) => ({
    daysAgo: 46 - Math.round((i * 45) / (ORDER_COUNT - 1)),
    group: false,
  }));
  if (key === 'uniform') specs.splice(26, 0, { daysAgo: 20, group: true });

  let correctionDone = false;
  let refundDone = false;
  let cancellations = 0;

  specs.forEach((spec, index) => {
    const n = index + 1;
    const orderId = `${key}-o${n}`;
    const number = formatOrderNumber(config.devices[0]!.series, n);
    const created = addDays(today, -spec.daysAgo);
    const createdAt = dhakaTime(created, 11, index % 50);
    const taker = spec.group ? owner : rng.pick(recipe.takers);

    if (spec.group) {
      emitGroupOrder({ orderId, number, created, createdAt });
      return;
    }

    const customer = rng.pick(customers);
    const first = templateById(rng.pick(recipe.garments));
    const others = recipe.garments.filter((g) => g !== 'alteration');
    const templates = first.id === 'alteration' ? [first] : [first, ...Array.from({ length: rng.int(0, 2) }, () => templateById(rng.pick(others)))];

    const lead = rng.int(7, 12);
    let deliveryDate = addDays(created, lead);
    let trialToday = false;
    if (index % 9 === 4) deliveryDate = today;
    if (index % 11 === 5 && first.stages.some((s) => s.key === 'trial')) {
      trialToday = true;
      deliveryDate = addDays(today, 3);
    }

    const items: NewOrderItem[] = templates.map((template, j) => {
      const hasTrial = template.stages.some((s) => s.key === 'trial');
      const trialDate = trialToday && j === 0 ? today : hasTrial && rng.chance(0.35) ? addDays(created, Math.max(2, lead - 4)) : null;
      return {
        id: `${orderId}-i${j + 1}`,
        templateId: template.id,
        garmentName: template.name,
        price: template.defaultPrice + (rng.chance(0.2) ? 10000 : 0),
        wearer: null,
        measurements: measure(customer.id, template, dhakaTime(created, 10, 50)),
        designNotes: rng.pick(DESIGN_NOTES),
        fabricNote: rng.pick(FABRIC_NOTES),
        photoIds: [],
        stages: template.stages,
        assignedTo: recipe.workers.length > 0 ? rng.pick(recipe.workers) : null,
        trialDate,
        deliveryDate,
      };
    });

    const subtotal = items.reduce((sum, i) => sum + i.price, 0);
    const discount = subtotal >= 50000 && rng.chance(0.15) ? { amount: rng.pick([10000, 20000]), reason: 'নিয়মিত কাস্টমার' } : null;
    emit(createdAt, taker, {
      type: 'order.created',
      order: { id: orderId, number, customerId: customer.id, branchId: recipe.branchId, notes: '', discount, items },
    });

    // Decide how far along the order is.
    const overdueBy = daysBetween(deliveryDate, today);
    let phase: Phase;
    if (overdueBy >= 3) phase = rng.chance(0.8) ? { kind: 'delivered' } : rng.chance(0.5) ? { kind: 'ready' } : { kind: 'working', fraction: 0.9 };
    else if (overdueBy >= -1) phase = rng.chance(0.5) ? { kind: 'ready' } : { kind: 'working', fraction: 0.9 };
    else phase = { kind: 'working', fraction: spec.daysAgo / lead };
    if (trialToday) phase = { kind: 'working', fraction: 0.9 };

    // Money in: an advance, with one mistyped advance corrected afterwards.
    let total = subtotal - (discount?.amount ?? 0);
    let paid = 0;
    let p = 0;
    const pay = (at: string, amount: Poisha, kind: 'advance' | 'payment' | 'refund', reason = '') => {
      p += 1;
      const method: PaymentMethod = rng.pick(['cash', 'cash', 'bkash', 'nagad']);
      emit(at, taker, {
        type: 'payment.recorded',
        orderId,
        payment: {
          id: `${orderId}-p${p}`,
          amount,
          method,
          reference: method === 'cash' ? '' : `TX${rng.int(100000, 999999)}`,
          kind,
          corrects: null,
          reason,
        },
      });
      paid += kind === 'refund' ? -amount : amount;
    };

    const fullPrepay = !refundDone && items.length >= 2 && phase.kind === 'working';
    if (fullPrepay) {
      pay(dhakaTime(created, 11, 55), total, 'advance');
    } else if (rng.chance(0.8)) {
      const advance = roundToTaka100((total * rng.int(30, 60)) / 100);
      if (!correctionDone && advance >= 50000) {
        pay(dhakaTime(created, 11, 55), advance + 50000, 'advance');
        p += 1;
        emit(dhakaTime(created, 12, 5), taker, {
          type: 'payment.recorded',
          orderId,
          payment: {
            id: `${orderId}-p${p}`,
            amount: -50000,
            method: 'cash',
            reference: '',
            kind: 'correction',
            corrects: `${orderId}-p1`,
            reason: 'ভুল অঙ্ক লেখা হয়েছিল',
          },
        });
        paid -= 50000;
        correctionDone = true;
      } else if (advance > 0) {
        pay(dhakaTime(created, 11, 55), advance, 'advance');
      }
    }

    // A few multi-item orders lose one item; one of them was prepaid and gets a refund.
    let activeItems = items;
    if (items.length >= 2 && phase.kind === 'working' && cancellations < 2) {
      const cancelled = items[items.length - 1]!;
      emit(dhakaTime(created, 13), taker, {
        type: 'item.cancelled',
        orderId,
        itemId: cancelled.id,
        reason: 'কাস্টমার এই আইটেমটি বাতিল করেছেন',
      });
      activeItems = items.slice(0, -1);
      cancellations += 1;
      total = Math.max(0, total - cancelled.price);
      if (paid > total) {
        pay(dhakaTime(created, 13, 10), paid - total, 'refund', 'বাতিল আইটেমের টাকা ফেরত');
        refundDone = true;
      }
    }

    // Stage history, with the last garment of some delivered orders still waiting for pickup.
    const lastDay = phase.kind === 'delivered' ? (deliveryDate < yesterday ? deliveryDate : yesterday) : yesterday;
    const holdBackLast = phase.kind === 'delivered' && activeItems.length > 1 && index % 3 === 0;
    activeItems.forEach((item, j) => {
      const itemPhase: Phase = holdBackLast && j === activeItems.length - 1 ? { kind: 'ready' } : phase;
      const trialPassed = item.trialDate !== null && item.trialDate <= yesterday;
      const path = stagePath(item.stages, trialPassed, rng.chance(0.5));
      const target = targetIndex(path, itemPhase);
      if (target === 0) return;
      const dates = spreadDates(created, lastDay < created ? created : lastDay, target);
      for (let s = 1; s <= target; s++) {
        const to = path[s]!;
        const at = dhakaTime(dates[s - 1]!, 14, s);
        emit(at, item.assignedTo ?? owner, { type: 'item.stageChanged', orderId, itemId: item.id, to: to.key, reason: '' });
        if (to.key === 'trial') {
          emit(dhakaTime(dates[s - 1]!, 15), taker, {
            type: 'item.adjustmentAdded',
            orderId,
            itemId: item.id,
            adjustment: { id: `${item.id}-a1`, note: rng.pick(FITTING_NOTES) },
          });
        }
      }
    });

    // Fully delivered orders were settled on the last delivery day.
    if (phase.kind === 'delivered' && !holdBackLast && total - paid > 0) {
      pay(dhakaTime(lastDay, 17), total - paid, 'payment');
    }
  });

  function emitGroupOrder(order: { orderId: string; number: string; created: string; createdAt: string }) {
    const school = `${key}-c${CUSTOMER_COUNT}`;
    emit(dhakaTime(addDays(order.created, -10), 10), owner, {
      type: 'customer.created',
      customer: { id: school, name: 'আইডিয়াল স্কুল', nameAlt: 'Ideal School', phone: '01811456789', householdId: null, gender: null, notes: 'স্কুলের ইউনিফর্ম অর্ডার' },
    });
    const deliveryDate = addDays(order.created, 14);
    const items: NewOrderItem[] = [];
    CHILDREN.forEach((child, k) => {
      for (const templateId of ['school-shirt', 'school-pant']) {
        const template = templateById(templateId);
        items.push({
          id: `${order.orderId}-w${k + 1}-${templateId}`,
          templateId,
          garmentName: template.name,
          price: template.defaultPrice,
          wearer: `ক্লাস ৭ - ${child}`,
          measurements: {
            versionId: `${order.orderId}-w${k + 1}-${templateId}`,
            takenAt: order.createdAt,
            source: 'body',
            values: measurementValues(rng, template, 0.8),
          },
          designNotes: 'স্কুলের লোগো বুক পকেটে',
          fabricNote: 'স্কুলের দেওয়া কাপড়',
          photoIds: [],
          stages: template.stages,
          assignedTo: recipe.workers[k % recipe.workers.length]!,
          trialDate: null,
          deliveryDate,
        });
      }
    });
    emit(order.createdAt, owner, {
      type: 'order.created',
      order: { id: order.orderId, number: order.number, customerId: school, branchId: 'workshop', notes: '১২ জন ছাত্রের ইউনিফর্ম', discount: null, items },
    });
    const total = items.reduce((sum, i) => sum + i.price, 0);
    const paymentBody = (id: string, amount: Poisha, kind: 'advance' | 'payment'): EventBody => ({
      type: 'payment.recorded',
      orderId: order.orderId,
      payment: { id, amount, method: 'bank', reference: `CHQ${id.slice(-1)}`, kind, corrects: null, reason: '' },
    });
    emit(dhakaTime(order.created, 12), owner, paymentBody(`${order.orderId}-p1`, roundToTaka100(total / 2), 'advance'));

    const deliveredOn = addDays(deliveryDate, -1);
    items.forEach((item, idx) => {
      const wearer = Math.floor(idx / 2);
      const phase: Phase = wearer < 5 ? { kind: 'delivered' } : wearer < 9 ? { kind: 'ready' } : { kind: 'working', fraction: 0.6 };
      const path = stagePath(item.stages, false, false);
      const target = targetIndex(path, phase);
      const dates = spreadDates(addDays(order.created, 1), phase.kind === 'working' ? yesterday : deliveredOn, target);
      for (let s = 1; s <= target; s++) {
        emit(dhakaTime(dates[s - 1]!, 14, s), item.assignedTo ?? owner, {
          type: 'item.stageChanged',
          orderId: order.orderId,
          itemId: item.id,
          to: path[s]!.key,
          reason: '',
        });
      }
    });
    emit(dhakaTime(deliveredOn, 17), owner, paymentBody(`${order.orderId}-p2`, roundToTaka100(total / 4), 'payment'));
  }

  const ordered = pending
    .map((entry, order) => ({ ...entry, order }))
    .sort((a, b) => a.at.localeCompare(b.at) || a.order - b.order);
  const deviceId = config.devices[0]!.id;
  const events = ordered.map(
    (entry, i) => ({ id: `${key}-e${i + 1}`, at: entry.at, deviceId, staffId: entry.staffId, ...entry.body }) as DomainEvent,
  );
  return { config, events };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/seed/generate.test.ts`

Expected: PASS, 28 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/seed/people.ts apps/web/src/seed/shops.ts apps/web/src/seed/generate.ts apps/web/src/seed/generate.test.ts
git commit -m "feat(web): generate three sample shops from domain events"
```

### Task 4: Local database and shop store

IndexedDB (via Dexie) holds the event log and a few setup records. `ShopStore` rebuilds state from the log, saves each change to the device before updating the screen, runs changes one at a time, and handles demo start, reset, sign-out and PIN sign-in.

**Files:**
- Create: `apps/web/src/data/db.ts`
- Create: `apps/web/src/data/store.ts`
- Test: `apps/web/src/data/store.test.ts`

**Interfaces:**
- Consumes: `generateShop`, `SeedShopKey` (Task 3); from `@darzikhata/domain`: `applyEvent`, `emptyState`, `replay`, `staffById`, `todayInDhaka`, `verifyPin` and types.
- Produces:
  - `class DarziDb extends Dexie` with tables `events` (`++seq, &id`) and `meta` (`key`: `'config' | 'session' | 'deviceId'`); `new DarziDb(name = 'darzikhata')`
  - `interface Session { shopKey: SeedShopKey; staffId: string | null }`
  - `interface StoreSnapshot { status: 'loading' | 'empty' | 'ready'; config; state; session; deviceId }`
  - `new ShopStore({ db, now?, newId? })` with `getSnapshot()`, `subscribe(listener)`, `load()`, `startDemo(shopKey)`, `clear()`, `dispatch(body: EventBody): Promise<ApplyOutcome>`, `signOut()`, `signIn(staffId, pin): Promise<boolean>`

- [ ] **Step 1: Write the failing test**

`apps/web/src/data/store.test.ts`:

```ts
import { moneySummary } from '@darzikhata/domain';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from './db';
import { ShopStore } from './store';

let dbCount = 0;
const dbs: DarziDb[] = [];

function freshStore(name = `test-${++dbCount}`) {
  const db = new DarziDb(name);
  dbs.push(db);
  let n = 0;
  const store = new ShopStore({ db, now: () => new Date('2026-10-03T06:00:00.000Z'), newId: () => `new-${++n}` });
  return { db, store, name };
}

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

const advance = (id: string, amount: number) =>
  ({
    type: 'payment.recorded',
    orderId: 'rahman-o40',
    payment: { id, amount, method: 'cash', reference: '', kind: 'payment', corrects: null, reason: '' },
  }) as const;

describe('ShopStore', () => {
  it('starts empty when nothing is saved', async () => {
    const { store } = freshStore();
    expect(store.getSnapshot().status).toBe('loading');
    await store.load();
    expect(store.getSnapshot().status).toBe('empty');
  });

  it('starts a demo shop signed in as the owner', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    const snap = store.getSnapshot();
    expect(snap.status).toBe('ready');
    expect(snap.config?.id).toBe('rahman');
    expect(snap.session).toEqual({ shopKey: 'rahman', staffId: 'rahman-owner' });
    expect(snap.deviceId).toBe('device-a');
    expect(Object.keys(snap.state.orders).length).toBeGreaterThanOrEqual(40);
  });

  it('saves applied changes so a reload sees them', async () => {
    const { store, name } = freshStore();
    await store.startDemo('rahman');
    const before = moneySummary(store.getSnapshot().state.orders['rahman-o40']!).paid;

    const outcome = await store.dispatch(advance('extra-1', 10000));
    expect(outcome.kind).toBe('applied');
    expect(moneySummary(store.getSnapshot().state.orders['rahman-o40']!).paid).toBe(before + 10000);

    const reloaded = new ShopStore({ db: new DarziDb(name) });
    await reloaded.load();
    const event = reloaded.getSnapshot().state.orders['rahman-o40']!.payments.at(-1)!;
    expect(event).toMatchObject({ id: 'extra-1', by: 'rahman-owner', at: '2026-10-03T06:00:00.000Z' });
  });

  it('does not save rejected changes', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    const count = await db.events.count();
    const outcome = await store.dispatch(advance('bad', -5));
    expect(outcome).toMatchObject({ kind: 'rejected', reason: 'invalid-amount' });
    expect(await db.events.count()).toBe(count);
  });

  it('keeps the save order the same as the apply order for rapid changes', async () => {
    const { store, db } = freshStore();
    await store.startDemo('rahman');
    await Promise.all([store.dispatch(advance('a', 100)), store.dispatch(advance('b', 100)), store.dispatch(advance('c', 100))]);
    const last = await db.events.orderBy('seq').reverse().limit(3).toArray();
    expect(last.map((r) => r.id).reverse()).toEqual(['new-1', 'new-2', 'new-3']);
  });

  it('refuses changes when nobody is signed in', async () => {
    const { store } = freshStore();
    await store.startDemo('rahman');
    await store.signOut();
    await expect(store.dispatch(advance('x', 100))).rejects.toThrow('No one is signed in to a shop');
  });

  it('signs staff in only with the right PIN', async () => {
    const { store } = freshStore();
    await store.startDemo('nakshi');
    await store.signOut();
    expect(store.getSnapshot().session?.staffId).toBeNull();
    expect(await store.signIn('nakshi-tailor', '1111')).toBe(false);
    expect(await store.signIn('nobody', '4444')).toBe(false);
    expect(await store.signIn('nakshi-tailor', '৪৪৪৪')).toBe(true);
    expect(store.getSnapshot().session?.staffId).toBe('nakshi-tailor');
  });

  it('clears everything', async () => {
    const { store, db } = freshStore();
    await store.startDemo('uniform');
    await store.clear();
    expect(store.getSnapshot().status).toBe('empty');
    expect(await db.events.count()).toBe(0);
  });

  it('notifies subscribers on change', async () => {
    const { store } = freshStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => calls++);
    await store.load();
    unsubscribe();
    await store.startDemo('rahman');
    expect(calls).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/store.test.ts`

Expected: FAIL with `Error: Cannot find module './db'` (or `'./store'`).

- [ ] **Step 3: Write the implementation**

`apps/web/src/data/db.ts`:

```ts
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
```

`apps/web/src/data/store.ts`:

```ts
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/data/store.test.ts`

Expected: PASS, 9 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/data/db.ts apps/web/src/data/store.ts apps/web/src/data/store.test.ts
git commit -m "feat(web): add IndexedDB event store with demo start and PIN sign-in"
```

### Task 5: Bangla and English text

All interface text lives in two dictionaries, with Bangla as the source of keys and the default language. The provider remembers each viewer's language choice and formats money, dates (Dhaka time) and numbers in the right digits.

**Files:**
- Create: `apps/web/src/lib/safeStorage.ts`
- Create: `apps/web/src/i18n/bn.ts`
- Create: `apps/web/src/i18n/en.ts`
- Create: `apps/web/src/i18n/format.ts`
- Create: `apps/web/src/i18n/I18nProvider.tsx`
- Test: `apps/web/src/i18n/i18n.test.tsx`

**Interfaces:**
- Consumes: From `@darzikhata/domain`: `formatTaka`, `labelIn`, `toScript`, `todayInDhaka`, `Label`, `Language`, `Poisha`.
- Produces:
  - `readSetting(key): string | null`, `writeSetting(key, value): void` (localStorage, never throws)
  - `bn` dictionary, `type MessageKey`, `type Messages`; `en: Messages`
  - `translate(language, key, vars?)`, `formatDate(value, language, { year? })`, `formatMoney(amount, language)`, `formatNumber(value, language)`
  - `<I18nProvider>` and `useI18n(): { language; setLanguage; t(key, vars?); label(label); money(amount); date(value, options?); number(value) }` (saved under `dk.language`)

- [ ] **Step 1: Write the failing test**

`apps/web/src/i18n/i18n.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { bn } from './bn';
import { en } from './en';
import { formatDate, formatMoney, translate } from './format';
import { I18nProvider, useI18n } from './I18nProvider';

describe('messages', () => {
  it('have the same keys in both languages', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(bn).sort());
  });

  it('fill placeholders', () => {
    expect(translate('bn', 'auth.enterPin', { name: 'মিতু' })).toBe('মিতু, আপনার পিন দিন');
    expect(translate('en', 'shell.signedInAs', { name: 'Mitu', role: 'Counter staff' })).toBe('Mitu (Counter staff)');
    expect(translate('en', 'auth.enterPin')).toBe('{name}, enter your PIN');
  });
});

describe('formatting', () => {
  it('formats dates in Bangla and English', () => {
    expect(formatDate('2026-10-03', 'bn')).toBe('৩ অক্টোবর ২০২৬');
    expect(formatDate('2026-10-03', 'en', { year: false })).toBe('3 Oct');
  });

  it('shows timestamps as the Dhaka date', () => {
    expect(formatDate('2026-10-03T19:00:00.000Z', 'en')).toBe('4 Oct 2026');
  });

  it('formats money in the language’s digits', () => {
    expect(formatMoney(240000, 'bn')).toBe('৳২,৪০০');
    expect(formatMoney(240000, 'en')).toBe('৳2,400');
  });
});

function Probe() {
  const { t, money, language, setLanguage } = useI18n();
  return (
    <div>
      <p>{t('nav.orders')}</p>
      <p>{money(140000)}</p>
      <button onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}>toggle</button>
    </div>
  );
}

describe('I18nProvider', () => {
  it('defaults to Bangla and switches language, remembering the choice', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('অর্ডার')).toBeTruthy();
    expect(screen.getByText('৳১,৪০০')).toBeTruthy();
    expect(document.documentElement.lang).toBe('bn');

    await userEvent.click(screen.getByRole('button', { name: 'toggle' }));
    expect(screen.getByText('Orders')).toBeTruthy();
    expect(screen.getByText('৳1,400')).toBeTruthy();
    expect(window.localStorage.getItem('dk.language')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('starts in the remembered language', () => {
    window.localStorage.setItem('dk.language', 'en');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('Orders')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/i18n/i18n.test.tsx`

Expected: FAIL with `Error: Cannot find module './bn'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/lib/safeStorage.ts`:

```ts
/**
 * localStorage for per-viewer conveniences (language, layout override). It can be
 * missing or throw in private windows, so every access is guarded and failures are ignored.
 */
export function readSetting(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeSetting(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the setting simply is not remembered.
  }
}
```

`apps/web/src/i18n/bn.ts`:

```ts
/** Bangla is the source of truth for message keys; English must provide every key. */
export const bn = {
  'app.name': 'দর্জিখাতা',
  'app.demo': 'ডেমো',
  'common.loading': 'লোড হচ্ছে…',
  'common.cancel': 'বাতিল',
  'common.confirm': 'নিশ্চিত করুন',
  'common.close': 'বন্ধ করুন',

  'welcome.title': 'দর্জিখাতা ডেমো',
  'welcome.subtitle': 'মাপ, অর্ডার আর বাকি টাকার হিসাব এক জায়গায়। একটি নমুনা দোকান বেছে নিন।',
  'welcome.note': 'সব তথ্য শুধু এই ব্রাউজারে থাকে। যেকোনো সময় রিসেট করা যায়।',
  'welcome.open': 'এই দোকান খুলুন',

  'auth.whoIsUsing': 'কে ব্যবহার করছেন?',
  'auth.enterPin': '{name}, আপনার পিন দিন',
  'auth.wrongPin': 'পিন মেলেনি, আবার চেষ্টা করুন',
  'auth.back': 'অন্য কেউ',
  'auth.demoPins': 'ডেমো পিন: তালিকার ক্রম অনুযায়ী ১১১১, ২২২২, ৩৩৩৩…',

  'nav.dashboard': 'হোম',
  'nav.orders': 'অর্ডার',
  'nav.customers': 'কাস্টমার ও মাপ',
  'nav.customersShort': 'কাস্টমার',
  'nav.work': 'কাজের তালিকা',
  'nav.workShort': 'কাজ',
  'nav.payments': 'পেমেন্ট',
  'nav.settings': 'সেটিংস',
  'nav.more': 'আরও',
  'nav.newOrder': 'নতুন অর্ডার',
  'nav.main': 'প্রধান মেনু',

  'shell.online': 'অনলাইন',
  'shell.offline': 'অফলাইন',
  'shell.switchUser': 'ইউজার বদলান',
  'shell.signedInAs': '{name} ({role})',

  'placeholder.body': 'এই অংশটি পরের ধাপে তৈরি হবে।',
  'access.denied': 'এই অংশ দেখার অনুমতি আপনার নেই।',

  'more.language': 'ভাষা',
  'more.layout': 'স্ক্রিন লেআউট',
  'more.layout.auto': 'স্ক্রিন অনুযায়ী',
  'more.layout.mobile': 'মোবাইল',
  'more.layout.desktop': 'ডেস্কটপ',
  'more.demo': 'ডেমো',
  'more.changeShop': 'অন্য নমুনা দোকান বেছে নিন',
  'more.reset': 'ডেমো ডেটা রিসেট করুন',
  'more.resetConfirm': 'এই ডিভাইসের সব পরিবর্তন মুছে যাবে এবং নমুনা ডেটা আবার শুরু হবে।',
  'more.changeShopConfirm': 'এই দোকানের সব ডেমো ডেটা মুছে যাবে।',

  'input.invalidMeasurement': 'মাপ বোঝা যায়নি। যেমন ৩৮½ বা 38.5 লিখুন',
  'input.invalidMoney': 'টাকার অঙ্ক বোঝা যায়নি',
  'pin.delete': 'শেষ সংখ্যা মুছুন',
  'pin.label': 'পিন',
} as const;

export type MessageKey = keyof typeof bn;
export type Messages = Record<MessageKey, string>;
```

`apps/web/src/i18n/en.ts`:

```ts
import type { Messages } from './bn';

export const en: Messages = {
  'app.name': 'DarziKhata',
  'app.demo': 'Demo',
  'common.loading': 'Loading…',
  'common.cancel': 'Cancel',
  'common.confirm': 'Confirm',
  'common.close': 'Close',

  'welcome.title': 'DarziKhata demo',
  'welcome.subtitle': 'Measurements, orders and balances in one place. Pick a sample shop.',
  'welcome.note': 'All data stays in this browser only. You can reset it at any time.',
  'welcome.open': 'Open this shop',

  'auth.whoIsUsing': 'Who is using this device?',
  'auth.enterPin': '{name}, enter your PIN',
  'auth.wrongPin': 'Wrong PIN, please try again',
  'auth.back': 'Someone else',
  'auth.demoPins': 'Demo PINs, in list order: 1111, 2222, 3333…',

  'nav.dashboard': 'Home',
  'nav.orders': 'Orders',
  'nav.customers': 'Customers & measurements',
  'nav.customersShort': 'Customers',
  'nav.work': 'Work lists',
  'nav.workShort': 'Work',
  'nav.payments': 'Payments',
  'nav.settings': 'Settings',
  'nav.more': 'More',
  'nav.newOrder': 'New order',
  'nav.main': 'Main menu',

  'shell.online': 'Online',
  'shell.offline': 'Offline',
  'shell.switchUser': 'Switch user',
  'shell.signedInAs': '{name} ({role})',

  'placeholder.body': 'This part is built in a later step.',
  'access.denied': 'You do not have permission to see this.',

  'more.language': 'Language',
  'more.layout': 'Screen layout',
  'more.layout.auto': 'Match screen',
  'more.layout.mobile': 'Mobile',
  'more.layout.desktop': 'Desktop',
  'more.demo': 'Demo',
  'more.changeShop': 'Choose another sample shop',
  'more.reset': 'Reset demo data',
  'more.resetConfirm': 'All changes on this device will be erased and the sample data restored.',
  'more.changeShopConfirm': 'All demo data for this shop will be erased.',

  'input.invalidMeasurement': 'Could not read that measurement. Try 38½ or 38.5',
  'input.invalidMoney': 'Could not read that amount',
  'pin.delete': 'Delete last digit',
  'pin.label': 'PIN',
};
```

`apps/web/src/i18n/format.ts`:

```ts
import { formatTaka, toScript, todayInDhaka, type Language, type Poisha } from '@darzikhata/domain';
import { bn, type MessageKey, type Messages } from './bn';
import { en } from './en';

export const MESSAGES: Record<Language, Messages> = { bn, en };

/** Looks up a message and fills {placeholders}. Unknown placeholders are left as typed. */
export function translate(language: Language, key: MessageKey, vars: Record<string, string | number> = {}): string {
  return MESSAGES[language][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

const MONTHS: Record<Language, string[]> = {
  bn: ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** Formats YYYY-MM-DD, or an ISO timestamp shown in Dhaka time, as "৩ অক্টোবর ২০২৬" / "3 Oct 2026". */
export function formatDate(value: string, language: Language, options: { year?: boolean } = {}): string {
  const date = value.length > 10 ? todayInDhaka(new Date(value)) : value;
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const text = `${d} ${MONTHS[language][m - 1]}${options.year === false ? '' : ` ${y}`}`;
  return toScript(text, language);
}

export function formatMoney(amount: Poisha, language: Language): string {
  return formatTaka(amount, language);
}

export function formatNumber(value: number, language: Language): string {
  return toScript(String(value), language);
}
```

`apps/web/src/i18n/I18nProvider.tsx`:

```tsx
import type { Label, Language, Poisha } from '@darzikhata/domain';
import { labelIn } from '@darzikhata/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';
import type { MessageKey } from './bn';
import { formatDate, formatMoney, formatNumber, translate } from './format';

const LANGUAGE_KEY = 'dk.language';

export interface I18n {
  language: Language;
  setLanguage(language: Language): void;
  t(key: MessageKey, vars?: Record<string, string | number>): string;
  label(label: Label): string;
  money(amount: Poisha): string;
  date(value: string, options?: { year?: boolean }): string;
  number(value: number): string;
}

const I18nContext = createContext<I18n | null>(null);

function initialLanguage(fallback: Language): Language {
  const saved = readSetting(LANGUAGE_KEY);
  return saved === 'bn' || saved === 'en' ? saved : fallback;
}

export function I18nProvider({ children, fallback = 'bn' }: { children: ReactNode; fallback?: Language }) {
  const [language, setLanguageState] = useState<Language>(() => initialLanguage(fallback));

  const setLanguage = useCallback((next: Language) => {
    writeSetting(LANGUAGE_KEY, next);
    setLanguageState(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18n>(
    () => ({
      language,
      setLanguage,
      t: (key, vars) => translate(language, key, vars),
      label: (l) => labelIn(l, language),
      money: (amount) => formatMoney(amount, language),
      date: (v, options) => formatDate(v, language, options),
      number: (v) => formatNumber(v, language),
    }),
    [language, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used inside I18nProvider');
  return context;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/i18n/i18n.test.tsx`

Expected: PASS, 7 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/safeStorage.ts apps/web/src/i18n/bn.ts apps/web/src/i18n/en.ts apps/web/src/i18n/format.ts apps/web/src/i18n/I18nProvider.tsx apps/web/src/i18n/i18n.test.tsx
git commit -m "feat(web): add Bangla-first i18n with money and date formatting"
```

### Task 6: UI kit

The few shared controls every later screen needs: a button, a labelled text field with error text, a number field that understands Bangla digits and tailor fractions, a PIN pad for shared devices, and an accessible dialog. Theme colours are CSS variables, added in Task 9.

**Files:**
- Create: `apps/web/src/ui/Button.tsx`
- Create: `apps/web/src/ui/TextField.tsx`
- Create: `apps/web/src/ui/NumberField.tsx`
- Create: `apps/web/src/ui/PinPad.tsx`
- Create: `apps/web/src/ui/Dialog.tsx`
- Test: `apps/web/src/ui/ui.test.tsx`

**Interfaces:**
- Consumes: `useI18n` (Task 5); from `@darzikhata/domain`: `formatMeasurement`, `parseMeasurement`, `parseTaka`, `toEnglishDigits`, `toScript`.
- Produces:
  - `<Button variant? size?>` (defaults to `type="button"`), `buttonClasses(variant?, size?)` for links styled as buttons
  - `<TextField label error? hint? suffix? ...inputProps>`
  - `<NumberField label kind: 'measurement' | 'money' initialValue? onValueChange(value | null) suffix? id?>` (money values are poisha)
  - `<PinPad label error? onComplete(pin) length = 4>`
  - `<Dialog open title onClose children? actions?>`

- [ ] **Step 1: Write the failing test**

`apps/web/src/ui/ui.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { NumberField } from './NumberField';
import { PinPad } from './PinPad';
import { TextField } from './TextField';

const inBangla = (ui: ReactNode) => render(<I18nProvider>{ui}</I18nProvider>);

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('button');
  });
});

describe('TextField', () => {
  it('links the label, error and input', () => {
    render(<TextField label="নাম" error="নাম লাগবে" />);
    const input = screen.getByLabelText('নাম');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(screen.getByText('নাম লাগবে').id);
  });
});

describe('NumberField', () => {
  it('reads Bangla fractions as measurements', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="বুক" kind="measurement" onValueChange={onValueChange} suffix="ইঞ্চি" />);
    await userEvent.type(screen.getByLabelText('বুক'), '৩৮½');
    expect(onValueChange).toHaveBeenLastCalledWith(38.5);
    expect(screen.getByText('ইঞ্চি')).toBeTruthy();
  });

  it('reformats on blur and reports empty as null', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="হাতা" kind="measurement" onValueChange={onValueChange} />);
    const input = screen.getByLabelText('হাতা') as HTMLInputElement;
    await userEvent.type(input, '23 1/4');
    await userEvent.tab();
    expect(input.value).toBe('২৩¼');
    await userEvent.clear(input);
    expect(onValueChange).toHaveBeenLastCalledWith(null);
  });

  it('shows an error for unreadable text without reporting a value', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="বুক" kind="measurement" onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('বুক'), 'abc');
    expect(screen.getByText('মাপ বোঝা যায়নি। যেমন ৩৮½ বা 38.5 লিখুন')).toBeTruthy();
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('reports money in poisha and shows the initial value in taka', async () => {
    const onValueChange = vi.fn();
    inBangla(<NumberField label="অগ্রিম" kind="money" initialValue={100000} onValueChange={onValueChange} />);
    const input = screen.getByLabelText('অগ্রিম') as HTMLInputElement;
    expect(input.value).toBe('১০০০');
    await userEvent.clear(input);
    await userEvent.type(input, '১,৫০০');
    expect(onValueChange).toHaveBeenLastCalledWith(150000);
  });
});

describe('PinPad', () => {
  it('shows Bangla digits and completes after four presses', async () => {
    const onComplete = vi.fn();
    inBangla(<PinPad label="পিন" onComplete={onComplete} />);
    for (const digit of ['৪', '৪', '৪']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(onComplete).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: '৪' }));
    expect(onComplete).toHaveBeenCalledWith('4444');
  });

  it('deletes the last digit and accepts typed digits', async () => {
    const onComplete = vi.fn();
    inBangla(<PinPad label="পিন" onComplete={onComplete} />);
    await userEvent.click(screen.getByRole('button', { name: '৯' }));
    await userEvent.click(screen.getByRole('button', { name: 'শেষ সংখ্যা মুছুন' }));
    screen.getByRole('group', { name: 'পিন' }).focus();
    await userEvent.keyboard('12৩4');
    expect(onComplete).toHaveBeenCalledWith('1234');
  });

  it('announces errors', () => {
    inBangla(<PinPad label="পিন" error="পিন মেলেনি" onComplete={() => {}} />);
    expect(screen.getByText('পিন মেলেনি')).toBeTruthy();
  });
});

describe('Dialog', () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <button onClick={() => setOpen(true)}>open</button>
        <Dialog open={open} title="নিশ্চিত?" onClose={() => setOpen(false)} actions={<button>ok</button>}>
          body
        </Dialog>
      </>
    );
  }

  it('opens with focus inside, closes on Escape and restores focus', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'open' });
    await userEvent.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'নিশ্চিত?' });
    expect(document.activeElement).toBe(dialog);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/ui/ui.test.tsx`

Expected: FAIL with `Error: Cannot find module './Button'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/ui/Button.tsx`:

```tsx
import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-strong dark:text-surface',
  secondary: 'border border-line bg-panel text-ink hover:bg-surface',
  ghost: 'text-ink hover:bg-surface',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-surface',
};

/** Shared focus ring and sizing, also used by links styled as buttons. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: 'md' | 'lg' = 'md'): string {
  const sizing = size === 'lg' ? 'min-h-12 px-5 text-base' : 'min-h-10 px-4 text-sm';
  return `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 ${sizing} ${VARIANTS[variant]}`;
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
}

export function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`${buttonClasses(variant, size)} ${className}`} {...props} />;
}
```

`apps/web/src/ui/TextField.tsx`:

```tsx
import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  /** Shown inside the field on the right, e.g. a unit such as "ইঞ্চি". */
  suffix?: ReactNode;
}

export function TextField({ label, error, hint, suffix, id, className = '', ...input }: TextFieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <div
        className={`flex min-h-12 items-center rounded-lg border bg-panel focus-within:outline-2 focus-within:outline-brand ${error ? 'border-danger' : 'border-line'}`}
      >
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-base outline-none"
          {...input}
        />
        {suffix && <span className="pr-3 text-sm text-muted">{suffix}</span>}
      </div>
      {message && (
        <p id={messageId} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
```

`apps/web/src/ui/NumberField.tsx`:

```tsx
import { formatMeasurement, parseMeasurement, parseTaka, toScript, type Language, type Poisha } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { TextField } from './TextField';

export interface NumberFieldProps {
  label: string;
  /** 'measurement' accepts fractions like ৩৮½; 'money' takes taka and reports poisha. */
  kind: 'measurement' | 'money';
  initialValue?: number | null;
  /** Called with the parsed number, or null when the field is emptied. Not called for unreadable text. */
  onValueChange(value: number | null): void;
  suffix?: ReactNode;
  id?: string;
}

function display(kind: NumberFieldProps['kind'], value: number | null, language: Language): string {
  if (value === null) return '';
  if (kind === 'measurement') return formatMeasurement(value, language);
  const poisha: Poisha = value;
  return toScript(poisha % 100 === 0 ? String(poisha / 100) : (poisha / 100).toFixed(2), language);
}

/** A number input that understands Bangla digits and tailor-style fractions. */
export function NumberField({ label, kind, initialValue = null, onValueChange, suffix, id }: NumberFieldProps) {
  const { language, t } = useI18n();
  const [text, setText] = useState(() => display(kind, initialValue, language));
  const [value, setValue] = useState<number | null>(initialValue);
  const [invalid, setInvalid] = useState(false);
  const parse = kind === 'measurement' ? parseMeasurement : parseTaka;

  const change = (raw: string) => {
    setText(raw);
    if (raw.trim() === '') {
      setInvalid(false);
      setValue(null);
      onValueChange(null);
      return;
    }
    const parsed = parse(raw);
    setInvalid(parsed === null);
    if (parsed !== null) {
      setValue(parsed);
      onValueChange(parsed);
    }
  };

  return (
    <TextField
      id={id}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      suffix={suffix}
      error={invalid ? t(kind === 'measurement' ? 'input.invalidMeasurement' : 'input.invalidMoney') : undefined}
      onChange={(e) => change(e.target.value)}
      onBlur={() => {
        if (!invalid) setText(display(kind, value, language));
      }}
    />
  );
}
```

`apps/web/src/ui/PinPad.tsx`:

```tsx
import { toEnglishDigits } from '@darzikhata/domain';
import { useState, type KeyboardEvent } from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface PinPadProps {
  label: string;
  error?: string | undefined;
  onComplete(pin: string): void;
  length?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'] as const;

/** Large-button PIN entry for shared shop devices. Also accepts typed digits in either script. */
export function PinPad({ label, error, onComplete, length = 4 }: PinPadProps) {
  const { t, number } = useI18n();
  const [digits, setDigits] = useState('');

  const press = (digit: string) => {
    const next = digits + digit;
    if (next.length >= length) {
      setDigits('');
      onComplete(next.slice(0, length));
    } else {
      setDigits(next);
    }
  };
  const remove = () => setDigits((d) => d.slice(0, -1));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const digit = toEnglishDigits(e.key);
    if (/^\d$/.test(digit)) {
      e.preventDefault();
      press(digit);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      remove();
    }
  };

  return (
    <div role="group" aria-label={label} tabIndex={0} onKeyDown={onKeyDown} className="mx-auto flex w-full max-w-xs flex-col items-center gap-4 outline-none">
      <div className="flex gap-3" aria-hidden="true">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`h-4 w-4 rounded-full border-2 border-brand ${i < digits.length ? 'bg-brand' : ''}`} />
        ))}
      </div>
      <p aria-live="polite" className="min-h-6 text-sm text-danger">
        {error}
      </p>
      <div className="grid w-full grid-cols-3 gap-3">
        {KEYS.map((key, i) =>
          key === '' ? (
            <span key={i} />
          ) : key === 'delete' ? (
            <button key={i} type="button" aria-label={t('pin.delete')} onClick={remove} className="min-h-14 rounded-xl text-xl hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand">
              ⌫
            </button>
          ) : (
            <button key={i} type="button" onClick={() => press(key)} className="min-h-14 rounded-xl border border-line bg-panel text-2xl font-semibold hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand">
              {number(Number(key))}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
```

`apps/web/src/ui/Dialog.tsx`:

```tsx
import { useEffect, useId, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  title: string;
  onClose(): void;
  children?: ReactNode;
  actions?: ReactNode;
}

/** A modal that takes focus, closes on Escape or a backdrop click, and returns focus afterwards. */
export function Dialog({ open, title, onClose, children, actions }: DialogProps) {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className="w-full max-w-md rounded-xl bg-panel p-5 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-lg font-semibold">
          {title}
        </h2>
        {children && <div className="mt-2 text-muted">{children}</div>}
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/ui/ui.test.tsx`

Expected: PASS, 10 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/ui/Button.tsx apps/web/src/ui/TextField.tsx apps/web/src/ui/NumberField.tsx apps/web/src/ui/PinPad.tsx apps/web/src/ui/Dialog.tsx apps/web/src/ui/ui.test.tsx
git commit -m "feat(web): add UI kit with Bangla number field and PIN pad"
```

### Task 7: Navigation rules

One list of app sections with the capabilities each needs, so both shells and the route guards show exactly what a role may use.

**Files:**
- Create: `apps/web/src/shell/nav.ts`
- Test: `apps/web/src/shell/nav.test.ts`

**Interfaces:**
- Consumes: `MessageKey` (Task 5); `can`, `Capability`, `Role` from `@darzikhata/domain`.
- Produces:
  - `type NavKey = 'dashboard' | 'orders' | 'customers' | 'work' | 'payments' | 'settings'`
  - `NAV_ITEMS: NavItem[]` with paths `/app/dashboard`, `/app/orders`, `/app/customers`, `/app/work`, `/app/payments`, `/app/settings`
  - `canUse(role, requires)`, `visibleNav(role)`, `homePath(role)`, `navItem(key)`

- [ ] **Step 1: Write the failing test**

`apps/web/src/shell/nav.test.ts`:

```ts
import { DEFAULT_ROLES } from '@darzikhata/domain';
import { describe, expect, it } from 'vitest';
import { homePath, visibleNav } from './nav';

const role = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;
const keys = (id: string) => visibleNav(role(id)).map((i) => i.key);

describe('navigation by role', () => {
  it('shows the owner everything', () => {
    expect(keys('owner')).toEqual(['dashboard', 'orders', 'customers', 'work', 'payments', 'settings']);
  });

  it('shows a tailor only their work', () => {
    expect(keys('tailor')).toEqual(['work']);
    expect(homePath(role('tailor'))).toBe('/app/work');
  });

  it('shows counter staff payments but not settings', () => {
    expect(keys('counter')).toEqual(['dashboard', 'orders', 'customers', 'work', 'payments']);
  });

  it('lands accounts staff on the dashboard', () => {
    expect(keys('accounts')).toEqual(['dashboard', 'orders', 'customers', 'payments']);
    expect(homePath(role('accounts'))).toBe('/app/dashboard');
  });

  it('falls back to More when nothing is visible', () => {
    expect(homePath({ id: 'none', name: { bn: '', en: '' }, capabilities: [] })).toBe('/app/more');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/shell/nav.test.ts`

Expected: FAIL with `Error: Cannot find module './nav'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/shell/nav.ts`:

```ts
import { can, type Capability, type Role } from '@darzikhata/domain';
import type { MessageKey } from '../i18n/bn';

export type NavKey = 'dashboard' | 'orders' | 'customers' | 'work' | 'payments' | 'settings';

export interface NavItem {
  key: NavKey;
  path: string;
  label: MessageKey;
  shortLabel: MessageKey;
  /** The item shows when the role has any one of these. */
  requires: Capability[];
  /** Whether it gets a tab on mobile; the rest live under More. */
  mobileTab: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', path: '/app/dashboard', label: 'nav.dashboard', shortLabel: 'nav.dashboard', requires: ['orders.view'], mobileTab: true },
  { key: 'orders', path: '/app/orders', label: 'nav.orders', shortLabel: 'nav.orders', requires: ['orders.view'], mobileTab: true },
  { key: 'customers', path: '/app/customers', label: 'nav.customers', shortLabel: 'nav.customersShort', requires: ['customers.view'], mobileTab: true },
  { key: 'work', path: '/app/work', label: 'nav.work', shortLabel: 'nav.workShort', requires: ['work.view.all', 'work.view.assigned'], mobileTab: true },
  { key: 'payments', path: '/app/payments', label: 'nav.payments', shortLabel: 'nav.payments', requires: ['money.view'], mobileTab: false },
  { key: 'settings', path: '/app/settings', label: 'nav.settings', shortLabel: 'nav.settings', requires: ['settings.edit'], mobileTab: false },
];

export function canUse(role: Role, requires: Capability[]): boolean {
  return requires.some((capability) => can(role, capability));
}

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => canUse(role, item.requires));
}

/** Where a person lands after signing in: their first visible section, or More if none. */
export function homePath(role: Role): string {
  return visibleNav(role)[0]?.path ?? '/app/more';
}

export function navItem(key: NavKey): NavItem {
  return NAV_ITEMS.find((item) => item.key === key)!;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/shell/nav.test.ts`

Expected: PASS, 5 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/shell/nav.ts apps/web/src/shell/nav.test.ts
git commit -m "feat(web): add role-based navigation rules"
```

### Task 8: App shells, sign-in and routes

Puts it together: the welcome screen, "who is using this device?" with PIN, a desktop shell (sidebar and top bar) and a separate mobile shell (bottom tabs and floating New Order), route guards, a More page with language, layout and demo reset, and placeholder pages for the sections later plans build.

**Files:**
- Create: `apps/web/src/data/StoreContext.tsx`
- Create: `apps/web/src/shell/ShellPreference.tsx`
- Create: `apps/web/src/shell/ShellParts.tsx`
- Create: `apps/web/src/shell/DesktopShell.tsx`
- Create: `apps/web/src/shell/MobileShell.tsx`
- Create: `apps/web/src/features/PlaceholderPage.tsx`
- Create: `apps/web/src/features/welcome/WelcomePage.tsx`
- Create: `apps/web/src/features/auth/SignInPage.tsx`
- Create: `apps/web/src/features/more/MorePage.tsx`
- Create: `apps/web/src/app/guards.tsx`
- Create: `apps/web/src/app/AppRoutes.tsx`
- Create: `apps/web/src/app/App.tsx`
- Test: `apps/web/src/app/App.test.tsx`

**Interfaces:**
- Consumes: Everything from Tasks 3 to 7.
- Produces:
  - `<StoreProvider store>`, `useStore()`, `useSnapshot()`, `useCurrentStaff(): { staff; role } | null`
  - `<ShellProvider>`, `useShell(): { kind: 'mobile' | 'desktop'; preference: 'auto' | 'mobile' | 'desktop'; setPreference }` (saved under `dk.layout`; desktop from 1024px)
  - `ConnectionBadge`, `LanguageToggle`, `SwitchUserButton`, `useOnline()`, `useShopHeader()`
  - `<DesktopShell role>`, `<MobileShell role>` (both render an `<Outlet />`)
  - `Entry`, `RequireShop`, `RequireStaff`, `RequireCapability anyOf`, `HomeRedirect`, `Loading`
  - `<AppRoutes />` and `<App store />` (no router inside, so tests can use `MemoryRouter`)
  - Routes: `/`, `/welcome`, `/sign-in`, `/app` (index redirects to the role's first section), `/app/dashboard`, `/app/orders`, `/app/orders/new`, `/app/customers`, `/app/work`, `/app/payments`, `/app/settings`, `/app/more`

- [ ] **Step 1: Write the failing test**

`apps/web/src/app/App.test.tsx`:

```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { DarziDb } from '../data/db';
import { ShopStore } from '../data/store';
import { App } from './App';

let count = 0;
const dbs: DarziDb[] = [];

afterEach(async () => {
  for (const db of dbs.splice(0)) await db.delete();
});

async function renderApp({ layout, path = '/', shop, as }: {
  layout: 'mobile' | 'desktop';
  path?: string;
  shop?: 'rahman' | 'nakshi';
  as?: { staffId: string; pin: string };
}) {
  window.localStorage.setItem('dk.layout', layout);
  const db = new DarziDb(`app-test-${++count}`);
  dbs.push(db);
  const store = new ShopStore({ db });
  if (shop) await store.startDemo(shop);
  else await store.load();
  if (as) {
    await store.signOut();
    await store.signIn(as.staffId, as.pin);
  }
  render(
    <MemoryRouter initialEntries={[path]}>
      <App store={store} />
    </MemoryRouter>,
  );
  return store;
}

const mainNav = () => screen.getByRole('navigation', { name: 'প্রধান মেনু' });

describe('App', () => {
  it('opens a sample shop from the welcome screen into the desktop workspace', async () => {
    await renderApp({ layout: 'desktop' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'এই দোকান খুলুন: রহমান টেইলার্স' }));

    expect(await screen.findByRole('heading', { name: 'হোম' })).toBeTruthy();
    expect(screen.getByText('রহমান টেইলার্স')).toBeTruthy();
    expect(screen.getByText('প্রধান দোকান')).toBeTruthy();
    const nav = within(mainNav());
    for (const name of ['হোম', 'অর্ডার', 'কাস্টমার ও মাপ', 'কাজের তালিকা', 'পেমেন্ট', 'সেটিংস', 'আরও']) {
      expect(nav.getByRole('link', { name })).toBeTruthy();
    }
    expect(screen.getByRole('link', { name: '+ নতুন অর্ডার' })).toBeTruthy();
  });

  it('uses bottom tabs on mobile, with Payments under More', async () => {
    await renderApp({ layout: 'mobile', shop: 'rahman', path: '/app' });
    const nav = within(await screen.findByRole('navigation', { name: 'প্রধান মেনু' }));
    expect(nav.getAllByRole('link').map((l) => l.textContent)).toEqual(['হোম', 'অর্ডার', 'কাস্টমার', 'কাজ', 'আরও']);

    await userEvent.click(nav.getByRole('link', { name: 'আরও' }));
    expect(await screen.findByRole('link', { name: 'পেমেন্ট' })).toBeTruthy();
  });

  it('switches to a tailor by PIN and hides money from them', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app' });
    await userEvent.click(await screen.findByRole('button', { name: /ইউজার বদলান/ }));

    expect(await screen.findByRole('heading', { name: 'কে ব্যবহার করছেন?' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: /জামাল উদ্দিন/ }));
    for (const digit of ['১', '১', '১', '১']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(await screen.findByText('পিন মেলেনি, আবার চেষ্টা করুন')).toBeTruthy();

    for (const digit of ['৪', '৪', '৪', '৪']) await userEvent.click(screen.getByRole('button', { name: digit }));
    expect(await screen.findByRole('heading', { name: 'কাজের তালিকা' })).toBeTruthy();
    const links = within(mainNav()).getAllByRole('link').map((l) => l.textContent);
    expect(links).toEqual(['কাজের তালিকা', 'আরও']);
    expect(screen.queryByRole('link', { name: '+ নতুন অর্ডার' })).toBeNull();
  });

  it('shows a message instead of a page the role cannot use', async () => {
    await renderApp({ layout: 'desktop', shop: 'nakshi', path: '/app/payments', as: { staffId: 'nakshi-tailor', pin: '4444' } });
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'এই অংশ দেখার অনুমতি আপনার নেই।');
  });

  it('sends people with no saved shop to the welcome screen', async () => {
    await renderApp({ layout: 'desktop', path: '/app/orders' });
    expect(await screen.findByRole('heading', { name: 'দর্জিখাতা ডেমো' })).toBeTruthy();
  });

  it('switches language and layout from More, and resets the demo after confirming', async () => {
    const store = await renderApp({ layout: 'desktop', shop: 'rahman', path: '/app/more' });
    await userEvent.click(await screen.findByRole('radio', { name: 'English' }));
    expect(await screen.findByRole('heading', { name: 'More' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: 'Mobile' }));
    expect(within(screen.getByRole('navigation', { name: 'Main menu' })).getAllByRole('link')).toHaveLength(5);

    const before = Object.keys(store.getSnapshot().state.orders).length;
    await userEvent.click(screen.getByRole('button', { name: 'Reset demo data' }));
    const dialog = await screen.findByRole('dialog', { name: 'Reset demo data' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('heading', { name: 'Home' })).toBeTruthy();
    expect(Object.keys(store.getSnapshot().state.orders)).toHaveLength(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/App.test.tsx`

Expected: FAIL with `Error: Cannot find module './App'`.

- [ ] **Step 3: Write the implementation**

`apps/web/src/data/StoreContext.tsx`:

```tsx
import { roleOf, staffById, type Role, type Staff } from '@darzikhata/domain';
import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import type { ShopStore, StoreSnapshot } from './store';

const StoreContext = createContext<ShopStore | null>(null);

export function StoreProvider({ store, children }: { store: ShopStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore(): ShopStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function useSnapshot(): StoreSnapshot {
  const store = useStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

/** The signed-in staff member and their role, or null when nobody is signed in. */
export function useCurrentStaff(): { staff: Staff; role: Role } | null {
  const { config, session } = useSnapshot();
  if (!config || !session?.staffId) return null;
  const staff = staffById(config, session.staffId);
  const role = roleOf(config, session.staffId);
  return staff && role ? { staff, role } : null;
}
```

`apps/web/src/shell/ShellPreference.tsx`:

```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { readSetting, writeSetting } from '../lib/safeStorage';

export type ShellKind = 'mobile' | 'desktop';
export type ShellPreference = 'auto' | ShellKind;

const PREFERENCE_KEY = 'dk.layout';
const DESKTOP_QUERY = '(min-width: 1024px)';

interface ShellContextValue {
  kind: ShellKind;
  preference: ShellPreference;
  setPreference(preference: ShellPreference): void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

function readPreference(): ShellPreference {
  const saved = readSetting(PREFERENCE_KEY);
  return saved === 'mobile' || saved === 'desktop' ? saved : 'auto';
}

function matchesDesktop(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DESKTOP_QUERY).matches;
}

/** Chooses the desktop layout at 1024px and wider, unless this device has a saved override. */
export function ShellProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ShellPreference>(readPreference);
  const [wide, setWide] = useState(matchesDesktop);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      kind: preference === 'auto' ? (wide ? 'desktop' : 'mobile') : preference,
      preference,
      setPreference: (next) => {
        writeSetting(PREFERENCE_KEY, next);
        setPreferenceState(next);
      },
    }),
    [preference, wide],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const context = useContext(ShellContext);
  if (!context) throw new Error('useShell must be used inside ShellProvider');
  return context;
}
```

`apps/web/src/shell/ShellParts.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online;
}

/** Shows whether the browser is online. Sync states are added with the sync work. */
export function ConnectionBadge() {
  const { t } = useI18n();
  const online = useOnline();
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs font-semibold">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${online ? 'bg-brand' : 'bg-accent'}`} />
      {t(online ? 'shell.online' : 'shell.offline')}
    </span>
  );
}

export function LanguageToggle() {
  const { language, setLanguage } = useI18n();
  const next = language === 'bn' ? 'en' : 'bn';
  return (
    <button
      type="button"
      onClick={() => setLanguage(next)}
      lang={next}
      className="min-h-10 rounded-lg border border-line px-3 text-sm font-semibold hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
    >
      {next === 'en' ? 'English' : 'বাংলা'}
    </button>
  );
}

export function useShopHeader() {
  const { config, deviceId } = useSnapshot();
  const { label } = useI18n();
  const branch = config?.branches.find((b) => b.id === config.devices.find((d) => d.id === deviceId)?.branchId);
  return { shopName: config ? label(config.profile.name) : '', branchName: branch ? label(branch.name) : '' };
}

export function SwitchUserButton({ compact = false }: { compact?: boolean }) {
  const { t, label } = useI18n();
  const current = useCurrentStaff();
  const store = useStore();
  const navigate = useNavigate();
  if (!current) return null;
  const who = t('shell.signedInAs', { name: current.staff.name, role: label(current.role.name) });
  return (
    <button
      type="button"
      title={who}
      onClick={async () => {
        await store.signOut();
        navigate('/sign-in');
      }}
      className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-brand"
    >
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-semibold text-brand-strong">
        {current.staff.name.slice(0, 1)}
      </span>
      {compact ? <span className="sr-only">{t('shell.switchUser')}</span> : <span>{who} · {t('shell.switchUser')}</span>}
    </button>
  );
}
```

`apps/web/src/shell/DesktopShell.tsx`:

```tsx
import { can, type Role } from '@darzikhata/domain';
import { Link, NavLink, Outlet } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { buttonClasses } from '../ui/Button';
import { visibleNav } from './nav';
import { ConnectionBadge, LanguageToggle, SwitchUserButton, useShopHeader } from './ShellParts';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'bg-brand-soft text-brand-strong' : 'text-ink hover:bg-surface'
  }`;

/** Sidebar and top bar for laptops and large screens. */
export function DesktopShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName, branchName } = useShopHeader();

  return (
    <div className="flex min-h-dvh">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-panel">
        <div className="flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-brand">{t('app.name')}</span>
          <span className="rounded bg-accent/15 px-1.5 text-xs font-semibold text-accent">{t('app.demo')}</span>
        </div>
        <nav aria-label={t('nav.main')} className="flex flex-1 flex-col gap-1 px-3 py-2">
          {visibleNav(role).map((item) => (
            <NavLink key={item.key} to={item.path} className={linkClass}>
              {t(item.label)}
            </NavLink>
          ))}
          <NavLink to="/app/more" className={linkClass}>
            {t('nav.more')}
          </NavLink>
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-line bg-panel px-6">
          <div className="min-w-0">
            <p className="truncate font-semibold">{shopName}</p>
            {branchName && <p className="truncate text-xs text-muted">{branchName}</p>}
          </div>
          <div className="flex-1" />
          <ConnectionBadge />
          <LanguageToggle />
          {can(role, 'orders.create') && (
            <Link to="/app/orders/new" className={buttonClasses('primary')}>
              + {t('nav.newOrder')}
            </Link>
          )}
          <SwitchUserButton />
        </header>
        <main className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

`apps/web/src/shell/MobileShell.tsx`:

```tsx
import { can, type Role } from '@darzikhata/domain';
import { Link, NavLink, Outlet } from 'react-router';
import { useI18n } from '../i18n/I18nProvider';
import { visibleNav } from './nav';
import { ConnectionBadge, SwitchUserButton, useShopHeader } from './ShellParts';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-col items-center justify-center px-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand ${
    isActive ? 'text-brand' : 'text-muted'
  }`;

/** Header, bottom tabs and a floating New Order button for phones. */
export function MobileShell({ role }: { role: Role }) {
  const { t } = useI18n();
  const { shopName } = useShopHeader();
  const tabs = visibleNav(role).filter((item) => item.mobileTab);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-line bg-panel px-4">
        <p className="min-w-0 flex-1 truncate font-semibold">{shopName}</p>
        <ConnectionBadge />
        <SwitchUserButton compact />
      </header>
      <main className="flex-1 px-4 pt-4 pb-36">
        <Outlet />
      </main>
      {can(role, 'orders.create') && (
        <Link
          to="/app/orders/new"
          className="fixed bottom-20 left-1/2 z-10 flex min-h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand dark:text-surface"
        >
          + {t('nav.newOrder')}
        </Link>
      )}
      <nav
        aria-label={t('nav.main')}
        className="fixed inset-x-0 bottom-0 z-10 grid border-t border-line bg-panel pb-[env(safe-area-inset-bottom)]"
        style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
      >
        {tabs.map((item) => (
          <NavLink key={item.key} to={item.path} className={tabClass}>
            {t(item.shortLabel)}
          </NavLink>
        ))}
        <NavLink to="/app/more" className={tabClass}>
          {t('nav.more')}
        </NavLink>
      </nav>
    </div>
  );
}
```

`apps/web/src/features/PlaceholderPage.tsx`:

```tsx
import type { MessageKey } from '../i18n/bn';
import { useI18n } from '../i18n/I18nProvider';

/** Stands in for sections that later plans build, so navigation and permissions can be tested now. */
export function PlaceholderPage({ title }: { title: MessageKey }) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{t(title)}</h1>
      <p className="text-muted">{t('placeholder.body')}</p>
    </section>
  );
}
```

`apps/web/src/features/welcome/WelcomePage.tsx`:

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { SEED_SHOPS, type SeedShopKey } from '../../seed/shops';
import { LanguageToggle } from '../../shell/ShellParts';
import { Button } from '../../ui/Button';

/** First screen: pick one of the sample shops to explore. */
export function WelcomePage() {
  const { t, label } = useI18n();
  const store = useStore();
  const navigate = useNavigate();
  const [opening, setOpening] = useState<SeedShopKey | null>(null);

  const open = async (key: SeedShopKey) => {
    setOpening(key);
    await store.startDemo(key);
    navigate('/app');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-brand">{t('welcome.title')}</h1>
          <p className="mt-2 text-muted">{t('welcome.subtitle')}</p>
        </div>
        <LanguageToggle />
      </div>
      <ul className="grid gap-4 sm:grid-cols-3">
        {SEED_SHOPS.map((shop) => (
          <li key={shop.key} className="flex flex-col gap-3 rounded-xl border border-line bg-panel p-4">
            <h2 className="text-lg font-semibold">{label(shop.name)}</h2>
            <p className="flex-1 text-sm text-muted">{label(shop.summary)}</p>
            <Button size="lg" disabled={opening !== null} onClick={() => open(shop.key)} aria-label={`${t('welcome.open')}: ${label(shop.name)}`}>
              {t('welcome.open')}
            </Button>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">{t('welcome.note')}</p>
    </main>
  );
}
```

`apps/web/src/features/auth/SignInPage.tsx`:

```tsx
import { roleOf, type Staff } from '@darzikhata/domain';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnapshot, useStore } from '../../data/StoreContext';
import { useI18n } from '../../i18n/I18nProvider';
import { Button } from '../../ui/Button';
import { PinPad } from '../../ui/PinPad';

/** "Who is using this device?" then a PIN, for shops that share one phone or computer. */
export function SignInPage() {
  const { t, label } = useI18n();
  const { config } = useSnapshot();
  const store = useStore();
  const navigate = useNavigate();
  const [chosen, setChosen] = useState<Staff | null>(null);
  const [error, setError] = useState<string | undefined>();

  if (!config) return null;
  const staff = config.staff.filter((s) => s.active);

  const submit = async (pin: string) => {
    if (!chosen) return;
    if (await store.signIn(chosen.id, pin)) navigate('/app');
    else setError(t('auth.wrongPin'));
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{chosen ? t('auth.enterPin', { name: chosen.name }) : t('auth.whoIsUsing')}</h1>
      {chosen ? (
        <>
          <PinPad label={t('pin.label')} error={error} onComplete={submit} />
          <Button
            variant="ghost"
            onClick={() => {
              setChosen(null);
              setError(undefined);
            }}
          >
            {t('auth.back')}
          </Button>
        </>
      ) : (
        <ul className="flex flex-col gap-2">
          {staff.map((person) => {
            const role = roleOf(config, person.id);
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => setChosen(person)}
                  className="flex min-h-14 w-full items-center justify-between rounded-xl border border-line bg-panel px-4 text-left hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span className="font-semibold">{person.name}</span>
                  <span className="text-sm text-muted">{role ? label(role.name) : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted">{t('auth.demoPins')}</p>
    </main>
  );
}
```

`apps/web/src/features/more/MorePage.tsx`:

```tsx
import type { Language } from '@darzikhata/domain';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { useCurrentStaff, useSnapshot, useStore } from '../../data/StoreContext';
import type { MessageKey } from '../../i18n/bn';
import { useI18n } from '../../i18n/I18nProvider';
import { visibleNav } from '../../shell/nav';
import { useShell, type ShellPreference } from '../../shell/ShellPreference';
import { Button, buttonClasses } from '../../ui/Button';
import { Dialog } from '../../ui/Dialog';

function Choice<T extends string>({ legend, value, options, onChange }: {
  legend: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange(value: T): void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand ${
              value === option.value ? 'border-brand bg-brand-soft text-brand-strong' : 'border-line bg-panel'
            }`}
          >
            <input type="radio" className="sr-only" checked={value === option.value} onChange={() => onChange(option.value)} />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <section className="flex flex-col gap-4 rounded-xl border border-line bg-panel p-4">{children}</section>;
}

/** Language, layout, sections not on the mobile tab bar, and demo controls. */
export function MorePage() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useShell();
  const { session } = useSnapshot();
  const current = useCurrentStaff();
  const store = useStore();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState<'reset' | 'change' | null>(null);

  const extraSections = current ? visibleNav(current.role).filter((item) => !item.mobileTab) : [];
  const layouts: Array<{ value: ShellPreference; label: MessageKey }> = [
    { value: 'auto', label: 'more.layout.auto' },
    { value: 'mobile', label: 'more.layout.mobile' },
    { value: 'desktop', label: 'more.layout.desktop' },
  ];

  const confirm = async () => {
    if (confirming === 'reset' && session) {
      await store.startDemo(session.shopKey);
      navigate('/app');
    } else {
      await store.clear();
      navigate('/welcome');
    }
    setConfirming(null);
  };

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-xl font-semibold">{t('nav.more')}</h1>
      {extraSections.length > 0 && (
        <Section>
          <ul className="flex flex-col gap-2">
            {extraSections.map((item) => (
              <li key={item.key}>
                <Link to={item.path} className={`${buttonClasses('secondary', 'lg')} w-full justify-start`}>
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section>
        <Choice<Language>
          legend={t('more.language')}
          value={language}
          onChange={setLanguage}
          options={[
            { value: 'bn', label: 'বাংলা' },
            { value: 'en', label: 'English' },
          ]}
        />
        <Choice<ShellPreference>
          legend={t('more.layout')}
          value={preference}
          onChange={setPreference}
          options={layouts.map((l) => ({ value: l.value, label: t(l.label) }))}
        />
      </Section>
      <Section>
        <h2 className="font-semibold">{t('more.demo')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirming('reset')}>
            {t('more.reset')}
          </Button>
          <Button variant="secondary" onClick={() => setConfirming('change')}>
            {t('more.changeShop')}
          </Button>
        </div>
      </Section>
      <Dialog
        open={confirming !== null}
        title={t(confirming === 'reset' ? 'more.reset' : 'more.changeShop')}
        onClose={() => setConfirming(null)}
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirming(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" onClick={confirm}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        {t(confirming === 'reset' ? 'more.resetConfirm' : 'more.changeShopConfirm')}
      </Dialog>
    </div>
  );
}
```

`apps/web/src/app/guards.tsx`:

```tsx
import type { Capability } from '@darzikhata/domain';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router';
import { useCurrentStaff, useSnapshot } from '../data/StoreContext';
import { useI18n } from '../i18n/I18nProvider';
import { canUse, homePath } from '../shell/nav';

export function Loading() {
  const { t } = useI18n();
  return (
    <p role="status" className="p-8 text-center text-muted">
      {t('common.loading')}
    </p>
  );
}

/** Sends people to the right first screen for the saved state. */
export function Entry() {
  const { status, session } = useSnapshot();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  return <Navigate to={session?.staffId ? '/app' : '/sign-in'} replace />;
}

export function RequireShop({ children }: { children: ReactNode }) {
  const { status } = useSnapshot();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  return <>{children}</>;
}

export function RequireStaff({ children }: { children: ReactNode }) {
  const { status } = useSnapshot();
  const current = useCurrentStaff();
  if (status === 'loading') return <Loading />;
  if (status === 'empty') return <Navigate to="/welcome" replace />;
  if (!current) return <Navigate to="/sign-in" replace />;
  return <>{children}</>;
}

/** Shows a plain message instead of the page when the signed-in role lacks every listed capability. */
export function RequireCapability({ anyOf, children }: { anyOf: Capability[]; children: ReactNode }) {
  const { t } = useI18n();
  const current = useCurrentStaff();
  if (!current || !canUse(current.role, anyOf)) {
    return (
      <p role="alert" className="rounded-xl border border-line bg-panel p-4">
        {t('access.denied')}
      </p>
    );
  }
  return <>{children}</>;
}

export function HomeRedirect() {
  const current = useCurrentStaff();
  return <Navigate to={current ? homePath(current.role) : '/sign-in'} replace />;
}
```

`apps/web/src/app/AppRoutes.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router';
import { useCurrentStaff } from '../data/StoreContext';
import { SignInPage } from '../features/auth/SignInPage';
import { MorePage } from '../features/more/MorePage';
import { PlaceholderPage } from '../features/PlaceholderPage';
import { WelcomePage } from '../features/welcome/WelcomePage';
import { DesktopShell } from '../shell/DesktopShell';
import { MobileShell } from '../shell/MobileShell';
import { navItem, type NavKey } from '../shell/nav';
import { useShell } from '../shell/ShellPreference';
import { Entry, HomeRedirect, RequireCapability, RequireShop, RequireStaff } from './guards';

function AppShell() {
  const { kind } = useShell();
  const current = useCurrentStaff();
  if (!current) return null;
  return kind === 'desktop' ? <DesktopShell role={current.role} /> : <MobileShell role={current.role} />;
}

function Section({ nav }: { nav: NavKey }) {
  const item = navItem(nav);
  return (
    <RequireCapability anyOf={item.requires}>
      <PlaceholderPage title={item.label} />
    </RequireCapability>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Entry />} />
      <Route path="/welcome" element={<WelcomePage />} />
      <Route
        path="/sign-in"
        element={
          <RequireShop>
            <SignInPage />
          </RequireShop>
        }
      />
      <Route
        path="/app"
        element={
          <RequireStaff>
            <AppShell />
          </RequireStaff>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="dashboard" element={<Section nav="dashboard" />} />
        <Route path="orders" element={<Section nav="orders" />} />
        <Route
          path="orders/new"
          element={
            <RequireCapability anyOf={['orders.create']}>
              <PlaceholderPage title="nav.newOrder" />
            </RequireCapability>
          }
        />
        <Route path="customers" element={<Section nav="customers" />} />
        <Route path="work" element={<Section nav="work" />} />
        <Route path="payments" element={<Section nav="payments" />} />
        <Route path="settings" element={<Section nav="settings" />} />
        <Route path="more" element={<MorePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
```

`apps/web/src/app/App.tsx`:

```tsx
import { StoreProvider } from '../data/StoreContext';
import type { ShopStore } from '../data/store';
import { I18nProvider } from '../i18n/I18nProvider';
import { ShellProvider } from '../shell/ShellPreference';
import { AppRoutes } from './AppRoutes';

/** Everything except the router, so tests can supply a MemoryRouter. */
export function App({ store }: { store: ShopStore }) {
  return (
    <StoreProvider store={store}>
      <I18nProvider>
        <ShellProvider>
          <AppRoutes />
        </ShellProvider>
      </I18nProvider>
    </StoreProvider>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/App.test.tsx`

Expected: PASS, 6 tests.

Run: `npx vitest run`

Expected: `Test Files  7 passed (7)` and `Tests  69 passed (69)`.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/data/StoreContext.tsx apps/web/src/shell/ShellPreference.tsx apps/web/src/shell/ShellParts.tsx apps/web/src/shell/DesktopShell.tsx apps/web/src/shell/MobileShell.tsx apps/web/src/features/PlaceholderPage.tsx apps/web/src/features/welcome/WelcomePage.tsx apps/web/src/features/auth/SignInPage.tsx apps/web/src/features/more/MorePage.tsx apps/web/src/app/guards.tsx apps/web/src/app/AppRoutes.tsx apps/web/src/app/App.tsx apps/web/src/app/App.test.tsx
git commit -m "feat(web): add desktop and mobile shells with PIN sign-in and routes"
```

### Task 9: Installable build and visual check

Adds the page entry, theme colours and fonts, and app icons, then proves the production build produces a service worker, a manifest and a bundle within budget, and that both shells look right in a real browser.

**Files:**
- Create: `apps/web/index.html`
- Create: `apps/web/src/index.css`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/public/icon.svg`
- Create: `apps/web/scripts/make-icons.mjs`
- Create (generated): `apps/web/public/icon-192.png`, `apps/web/public/icon-512.png`

**Interfaces:**
- Consumes: `App` (Task 8), `DarziDb` and `ShopStore` (Task 4).
- Produces: `npm run build -w @darzikhata/web` output in `apps/web/dist` (already ignored by `.gitignore`'s `dist/`), installable as a PWA.

- [ ] **Step 1: Create `apps/web/index.html`**

```html
<!doctype html>
<html lang="bn">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f766e" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <title>DarziKhata</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Create `apps/web/src/index.css`**

Tailwind 4 reads the colour tokens through `@theme inline`, so `bg-brand`, `text-muted`, `border-line` and the rest follow light and dark mode.

```css
@import 'tailwindcss';
@import '@fontsource/hind-siliguri/bengali-400.css';
@import '@fontsource/hind-siliguri/bengali-600.css';
@import '@fontsource/hind-siliguri/latin-400.css';
@import '@fontsource/hind-siliguri/latin-600.css';

@theme inline {
  --font-sans: 'Hind Siliguri', system-ui, sans-serif;
  --color-brand: var(--brand);
  --color-brand-strong: var(--brand-strong);
  --color-brand-soft: var(--brand-soft);
  --color-accent: var(--accent);
  --color-surface: var(--surface);
  --color-panel: var(--panel);
  --color-ink: var(--ink);
  --color-muted: var(--muted);
  --color-line: var(--line);
  --color-danger: var(--danger);
}

:root {
  --brand: #0f766e;
  --brand-strong: #115e59;
  --brand-soft: #ccfbf1;
  --accent: #b45309;
  --surface: #f6f8f7;
  --panel: #ffffff;
  --ink: #1c2420;
  --muted: #56655e;
  --line: #d9e2de;
  --danger: #b91c1c;
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root {
    --brand: #2dd4bf;
    --brand-strong: #5eead4;
    --brand-soft: #134e4a;
    --accent: #f59e0b;
    --surface: #0f1513;
    --panel: #18201d;
    --ink: #e7eeeb;
    --muted: #a0b1a9;
    --line: #2c3833;
    --danger: #f87171;
    color-scheme: dark;
  }
}

body {
  background-color: var(--surface);
  color: var(--ink);
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}
```

- [ ] **Step 3: Create `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { DarziDb } from './data/db';
import { ShopStore } from './data/store';
import './index.css';

const store = new ShopStore({ db: new DarziDb() });
void store.load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App store={store} />
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 4: Create `apps/web/public/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#0f766e"/>
  <circle cx="256" cy="256" r="120" fill="none" stroke="#ffffff" stroke-width="36"/>
  <line x1="150" y1="362" x2="362" y2="150" stroke="#ffffff" stroke-width="28" stroke-linecap="round"/>
  <circle cx="340" cy="172" r="10" fill="#0f766e"/>
</svg>
```

- [ ] **Step 5: Create `apps/web/scripts/make-icons.mjs`**

Draws the same shapes as `icon.svg` into PNGs using only Node built-ins, so no image tooling is needed.

```js
// Draws the app icon (same shapes as public/icon.svg) into PNGs for the web app manifest.
// Run from the repo root: node apps/web/scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const TEAL = [15, 118, 110, 255];
const WHITE = [255, 255, 255, 255];
const CLEAR = [0, 0, 0, 0];

function colorAt(x, y) {
  // Coordinates are in the SVG's 512 x 512 space.
  const r = 112;
  const cx = Math.min(Math.max(x, r), 512 - r);
  const cy = Math.min(Math.max(y, r), 512 - r);
  if (x < 0 || y < 0 || x > 512 || y > 512 || Math.hypot(x - cx, y - cy) > r) return CLEAR;
  if (Math.hypot(x - 340, y - 172) <= 10) return TEAL;
  if (Math.abs(Math.hypot(x - 256, y - 256) - 120) <= 18) return WHITE;
  // Distance from the needle segment (150,362)-(362,150), with round caps.
  const t = Math.min(1, Math.max(0, ((x - 150) * 212 + (y - 362) * -212) / (212 * 212 * 2)));
  if (Math.hypot(x - (150 + 212 * t), y - (362 - 212 * t)) <= 14) return WHITE;
  return TEAL;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(size) {
  const samples = 4;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    raw[py * (size * 4 + 1)] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const color = colorAt(((px + (sx + 0.5) / samples) * 512) / size, ((py + (sy + 0.5) / samples) * 512) / size);
          for (let i = 0; i < 4; i++) sum[i] += color[i];
        }
      }
      const offset = py * (size * 4 + 1) + 1 + px * 4;
      for (let i = 0; i < 4; i++) raw[offset + i] = Math.round(sum[i] / (samples * samples));
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  const file = new URL(`../public/icon-${size}.png`, import.meta.url);
  writeFileSync(file, png(size));
  console.log(`wrote public/icon-${size}.png`);
}
```

- [ ] **Step 6: Generate the PNG icons**

Run (repo root): `node apps/web/scripts/make-icons.mjs`

Expected:

```
wrote public/icon-192.png
wrote public/icon-512.png
```

- [ ] **Step 7: Build**

Run (repo root): `npm run build -w @darzikhata/web`

Expected: the build succeeds; output lists `dist/manifest.webmanifest`, one `dist/assets/index-*.js` under 250 kB gzip (about 132 kB at the time of writing), and a `PWA v1.3.0` block that ends with `dist/sw.js`.

- [ ] **Step 8: Look at it in a browser**

Run (repo root): `npm run preview -w @darzikhata/web -- --port 4317`, open `http://localhost:4317`, and check:

1. The welcome screen shows three shops in Bangla with Hind Siliguri (joined letters such as "ন্ড" and "ক্ষ" render as one shape, not with a visible hasanta).
2. Open Nakshi Boutique at 1366px wide: the sidebar shows all sections, and the top bar shows the shop, branch, online badge, language toggle, New Order and the owner.
3. At 375px wide (browser device mode): bottom tabs হোম, অর্ডার, কাস্টমার, কাজ, আরও, a floating New Order button, and `document.documentElement.scrollWidth` equals 375 (no sideways scrolling).
4. Switch the OS or browser to dark mode: colours switch and text stays readable.
5. DevTools > Application > Manifest shows the name, icons and no installability errors; Service Workers shows `sw.js` activated.

Stop the preview server when done.

- [ ] **Step 9: Run every test and type check**

Run (repo root): `npm test`

Expected: domain `Tests  173 passed (173)`, web `Tests  69 passed (69)`.

Run (repo root): `npm run typecheck`

Expected: both workspaces exit 0.

Run (repo root): `git grep -n "—" -- apps packages`

Expected: no output.

- [ ] **Step 10: Commit**

```bash
git add apps/web/index.html apps/web/src/index.css apps/web/src/main.tsx apps/web/public/icon.svg apps/web/scripts/make-icons.mjs apps/web/public/icon-192.png apps/web/public/icon-512.png
git commit -m "feat(web): add installable PWA build with icons and theme"
```

---

## After this plan

When all 9 tasks are committed and the visual check passes, write Plan 3 (core workflows) against the real exports of `@darzikhata/domain` and `apps/web`.
