# DarziKhata Domain Package Implementation Plan (Plan 1 of 5)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@darzikhata/domain`, a pure TypeScript package holding every DarziKhata business rule (money, measurements, stages, orders, payments, permissions, search, numbering, status links, work lists and sync), fully covered by tests.

**Architecture:** Every change is a `DomainEvent` with a device-generated id; `applyEvent` folds events into a `ShopState`, ignoring repeated ids and turning stale edits into conflicts. Balances, progress and work lists are derived from state, never stored. The package has no UI, storage or browser dependencies; time, ids and randomness come from the caller.

**Tech Stack:** TypeScript 7 (`typescript@^7.0.2`), Vitest 5 (`vitest@^5.0.3`), npm workspaces, Node 22.12+.

**Spec:** [docs/superpowers/specs/2026-10-03-darzikhata-demo-design.md](../specs/2026-10-03-darzikhata-demo-design.md)

## Plan series

The design is too large for one plan, so it is split into five. Each produces working, tested software. Plans 2 to 5 are written after the previous plan lands, so they can use the real interfaces.

1. **Domain package** (this plan): all business rules, tested.
2. **Web foundation:** shop configuration types (organization, branches, devices, settings such as women's-measurement restriction and link expiry days; kept outside the event log), Vite + React PWA, Dexie event store and repositories, seed shops, i18n, UI kit (including the Bangla number input), mobile and desktop shells, owner sign-in and staff PIN switching.
3. **Core workflows:** customers and measurements, order entry (mobile steps and desktop three-column form), order detail, payments, receipts and print layouts.
4. **Operations:** dashboard, work lists with batch actions, status link page, settings (template and stage editors, staff, branches), group orders, branch scope.
5. **Demo layer:** simulated offline and sync with review queue UI, presenter mode, Playwright end-to-end tests, deployment.

## Global Constraints

- Node `>=22.12`; `typescript@^7.0.2`; `vitest@^5.0.3`. No other dependencies in this plan.
- `packages/domain/src` must not import React, Dexie, DOM or Node APIs. TypeScript `lib` is `ES2022` only, so browser globals will not type-check.
- Money is always integer poisha (`Poisha = number`). Never store a balance.
- Payments are append-only. Corrections and refunds are new records with reasons.
- Order numbers use per-device series (`A-0142`). Offline numbers are final.
- Every order item keeps its own measurement snapshot and copy of its stages.
- Bangla is the default display language and digit script; every numeric parser accepts Bangla and English digits.
- Tests sit next to the code as `src/<module>.test.ts`. Test helpers live in `src/testing/fixtures.ts`.
- Run commands from `packages/domain` unless a step says otherwise.
- Do not use em dashes in code, comments or docs.
- Commit messages carry no AI attribution (no `Co-Authored-By` trailers, no "Generated with" lines).

## File structure

```
package.json                     workspace root (scripts: test, typecheck)
tsconfig.base.json               shared strict compiler options
packages/domain/
  package.json                   @darzikhata/domain, exports "." and "./testing"
  tsconfig.json
  src/
    digits.ts       Bangla/English digit conversion
    label.ts        two-language labels
    money.ts        integer poisha, lakh grouping, taka parsing
    measurements.ts fields, fraction parsing, versions, snapshots
    stages.ts       configurable stages, transitions, summary groups
    templates.ts    garment templates and starter set
    permissions.ts  roles, capabilities, branch scope, PINs
    search.ts       cross-script name keys, phone normalization, customer search
    numbering.ts    per-device order numbers
    model.ts        state types (Customer, Order, OrderItem, Payment, ShopState)
    orders.ts       totals, progress, closed state
    payments.ts     net paid, corrections, balance, credit due
    events.ts       event types and reducer step helpers
    reduceCustomers.ts  customer, household, measurement events
    reduceOrders.ts     order, garment, discount, link events
    reducePayments.ts   payment events
    apply.ts        applyEvent (idempotent) and replay
    links.ts        status link tokens, expiry, public view
    worklists.ts    dashboard and production lists
    sync.ts         push/pull, review queue, device sync, status
    index.ts        public API
    testing/fixtures.ts  test builders
```

---

### Task 1: Workspace scaffold, digits and labels

Sets up the npm workspace and the `@darzikhata/domain` package, then adds the two smallest modules: Bangla/English digit conversion and two-language labels. Every later module builds on these.

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/domain/package.json`
- Create: `packages/domain/tsconfig.json`
- Create: `packages/domain/src/digits.ts`
- Create: `packages/domain/src/label.ts`
- Test: `packages/domain/src/digits.test.ts`
- Test: `packages/domain/src/label.test.ts`

**Interfaces:**
- Consumes: Nothing.
- Produces:
  - `type DigitScript = 'bn' | 'en'`
  - `toEnglishDigits(input: string): string`
  - `toBanglaDigits(input: string): string`
  - `toScript(input: string, script: DigitScript): string`
  - `type Language = 'bn' | 'en'`, `interface Label { bn: string; en: string }`
  - `labelIn(label: Label, language: Language): string`

- [ ] **Step 1: Create the workspace root**

`package.json`:

```json
{
  "name": "darzikhata",
  "private": true,
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "devDependencies": {
    "typescript": "^7.0.2",
    "vitest": "^5.0.3"
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

- [ ] **Step 2: Create the domain package**

`packages/domain/package.json`:

```json
{
  "name": "@darzikhata/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./testing": "./src/testing/fixtures.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit -p tsconfig.json"
  }
}
```

`packages/domain/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Install dependencies**

Run (repo root): `npm install`

Expected: ends with `found 0 vulnerabilities`; `node_modules/.bin/vitest` and `node_modules/.bin/tsc` exist. `.gitignore` already ignores `node_modules/`.

- [ ] **Step 4: Write the failing tests**

`packages/domain/src/digits.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { toBanglaDigits, toEnglishDigits, toScript } from './digits';

describe('digits', () => {
  it('converts Bangla digits to English digits', () => {
    expect(toEnglishDigits('০১৭১২-৩৪৫৬৭৮')).toBe('01712-345678');
  });

  it('leaves non-digit text unchanged', () => {
    expect(toEnglishDigits('রহিম 42')).toBe('রহিম 42');
  });

  it('converts English digits to Bangla digits', () => {
    expect(toBanglaDigits('A-0142')).toBe('A-০১৪২');
  });

  it('converts to a chosen script', () => {
    expect(toScript('৳2,400', 'bn')).toBe('৳২,৪০০');
    expect(toScript('৳২,৪০০', 'en')).toBe('৳2,400');
  });
});
```

`packages/domain/src/label.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { labelIn } from './label';

describe('labelIn', () => {
  it('returns the requested language', () => {
    expect(labelIn({ bn: 'শার্ট', en: 'Shirt' }, 'en')).toBe('Shirt');
    expect(labelIn({ bn: 'শার্ট', en: 'Shirt' }, 'bn')).toBe('শার্ট');
  });

  it('falls back to the other language when one is empty', () => {
    expect(labelIn({ bn: 'ঝুল', en: '' }, 'en')).toBe('ঝুল');
    expect(labelIn({ bn: '', en: 'Length' }, 'bn')).toBe('Length');
  });
});
```

- [ ] **Step 5: Run the tests to verify they fail**

Run: `npx vitest run src/digits.test.ts src/label.test.ts`

Expected: FAIL with `Error: Cannot find module './digits'` and `Error: Cannot find module './label'`.

- [ ] **Step 6: Write the implementation**

`packages/domain/src/digits.ts`:

```ts
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';

export type DigitScript = 'bn' | 'en';

/** Replaces Bangla digits (০-৯) with ASCII digits. Everything else is unchanged. */
export function toEnglishDigits(input: string): string {
  return input.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Replaces ASCII digits with Bangla digits. Everything else is unchanged. */
export function toBanglaDigits(input: string): string {
  return input.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]!);
}

export function toScript(input: string, script: DigitScript): string {
  return script === 'bn' ? toBanglaDigits(input) : toEnglishDigits(input);
}
```

`packages/domain/src/label.ts`:

```ts
export type Language = 'bn' | 'en';

/** Text that is shown in both supported languages. */
export interface Label {
  bn: string;
  en: string;
}

export function labelIn(label: Label, language: Language): string {
  return label[language] || label.bn || label.en;
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `npx vitest run src/digits.test.ts src/label.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 8: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json packages/domain/package.json packages/domain/tsconfig.json packages/domain/src/digits.ts packages/domain/src/label.ts packages/domain/src/digits.test.ts packages/domain/src/label.test.ts
git commit -m "feat(domain): scaffold workspace with digit and label helpers"
```

### Task 2: Money

Integer poisha everywhere, lakh-style grouping (12,34,567), and parsing typed taka in either script. No floating-point money anywhere.

**Files:**
- Create: `packages/domain/src/money.ts`
- Test: `packages/domain/src/money.test.ts`

**Interfaces:**
- Consumes: `toEnglishDigits`, `toScript`, `DigitScript` from `digits.ts`.
- Produces:
  - `type Poisha = number` (always an integer)
  - `isPoisha(value: number): boolean`
  - `takaToPoisha(taka: number): Poisha`
  - `groupLakh(digits: string): string`
  - `formatTaka(amount: Poisha, script: DigitScript = 'bn'): string`
  - `parseTaka(input: string): Poisha | null`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/money.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatTaka, groupLakh, isPoisha, parseTaka, takaToPoisha } from './money';

describe('money', () => {
  it('converts taka to integer poisha without float drift', () => {
    expect(takaToPoisha(2400)).toBe(240000);
    expect(takaToPoisha(0.29)).toBe(29);
    expect(takaToPoisha(19.99)).toBe(1999);
  });

  it('recognises integer poisha only', () => {
    expect(isPoisha(100)).toBe(true);
    expect(isPoisha(10.5)).toBe(false);
  });

  it('groups digits in lakh style', () => {
    expect(groupLakh('999')).toBe('999');
    expect(groupLakh('2400')).toBe('2,400');
    expect(groupLakh('1234567')).toBe('12,34,567');
    expect(groupLakh('123456789')).toBe('12,34,56,789');
  });

  it('formats taka in Bangla and English digits', () => {
    expect(formatTaka(240000)).toBe('৳২,৪০০');
    expect(formatTaka(240000, 'en')).toBe('৳2,400');
    expect(formatTaka(123456789, 'en')).toBe('৳12,34,567.89');
    expect(formatTaka(-50000, 'en')).toBe('-৳500');
    expect(formatTaka(0, 'en')).toBe('৳0');
  });

  it('rejects non-integer amounts when formatting', () => {
    expect(() => formatTaka(10.5)).toThrow();
  });

  it('parses typed taka in either script', () => {
    expect(parseTaka('২,৪০০')).toBe(240000);
    expect(parseTaka('2400.50')).toBe(240050);
    expect(parseTaka('৳ 1,000')).toBe(100000);
    expect(parseTaka('12.345')).toBeNull();
    expect(parseTaka('abc')).toBeNull();
    expect(parseTaka('')).toBeNull();
    expect(parseTaka('-5')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/money.test.ts`

Expected: FAIL with `Error: Cannot find module './money'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/money.ts`:

```ts
import { toEnglishDigits, toScript, type DigitScript } from './digits';

/** Money is always stored as an integer number of poisha (1 taka = 100 poisha). */
export type Poisha = number;

export function isPoisha(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function takaToPoisha(taka: number): Poisha {
  const poisha = Math.round(taka * 100);
  if (!Number.isSafeInteger(poisha)) {
    throw new Error(`Invalid taka amount: ${taka}`);
  }
  return poisha;
}

/** Groups an integer digit string the South Asian way: 1234567 -> 12,34,567. */
export function groupLakh(digits: string): string {
  if (digits.length <= 3) return digits;
  const lastThree = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const pairs: string[] = [];
  while (rest.length > 2) {
    pairs.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) pairs.unshift(rest);
  return `${pairs.join(',')},${lastThree}`;
}

/** Formats poisha as taka, e.g. 240000 -> "৳২,৪০০". Poisha are shown only when non-zero. */
export function formatTaka(amount: Poisha, script: DigitScript = 'bn'): string {
  if (!isPoisha(amount)) throw new Error(`Amount must be integer poisha, got ${amount}`);
  const abs = Math.abs(amount);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  let text = `৳${groupLakh(String(whole))}`;
  if (fraction) text += `.${String(fraction).padStart(2, '0')}`;
  return toScript(amount < 0 ? `-${text}` : text, script);
}

/** Parses typed taka such as "২,৪০০" or "2400.50" into poisha. Returns null when invalid. */
export function parseTaka(input: string): Poisha | null {
  const cleaned = toEnglishDigits(input).replace(/[,\s৳]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return takaToPoisha(Number(cleaned));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/money.test.ts`

Expected: PASS, 6 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/money.ts packages/domain/src/money.test.ts
git commit -m "feat(domain): add integer poisha money helpers"
```

### Task 3: Measurements

Measurement fields, versions and per-order snapshots. Parses what tailors actually type (৩৮½, 38 1/2, 15¼) and stores exact numbers. Units are stored with each value so a template unit change never reinterprets saved data.

**Files:**
- Create: `packages/domain/src/measurements.ts`
- Test: `packages/domain/src/measurements.test.ts`

**Interfaces:**
- Consumes: `toEnglishDigits`, `toScript`, `DigitScript` from `digits.ts`; `Label` from `label.ts`.
- Produces:
  - `type Unit = 'inch' | 'cm'`, `type MeasurementSource = 'body' | 'sample'`
  - `interface MeasurementField { key; label: Label; unit: Unit; group: string; required: boolean }`
  - `interface MeasurementValue { value: number; unit: Unit }`
  - `interface MeasurementVersion { id; takenAt; takenBy; source; notes; values: Record<string, MeasurementValue> }`
  - `interface MeasurementProfile { customerId; templateId; versions: MeasurementVersion[] }`
  - `interface MeasurementSnapshot { versionId; takenAt; source; values }`
  - `parseMeasurement(input: string): number | null`
  - `formatMeasurement(value: number, script: DigitScript = 'bn'): string`
  - `profileKey(customerId: string, templateId: string): string` (returns `"customerId:templateId"`)
  - `currentVersion(profile): MeasurementVersion | null`
  - `missingRequiredFields(fields, values): string[]`
  - `snapshotOf(version: MeasurementVersion): MeasurementSnapshot`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/measurements.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  currentVersion,
  formatMeasurement,
  missingRequiredFields,
  parseMeasurement,
  profileKey,
  snapshotOf,
  type MeasurementField,
  type MeasurementVersion,
} from './measurements';

const version = (id: string, chest: number): MeasurementVersion => ({
  id,
  takenAt: '2026-10-03T04:00:00.000Z',
  takenBy: 'staff-owner',
  source: 'body',
  notes: '',
  values: { chest: { value: chest, unit: 'inch' } },
});

describe('parseMeasurement', () => {
  it('parses whole numbers and decimals in either script', () => {
    expect(parseMeasurement('38')).toBe(38);
    expect(parseMeasurement('৩৮')).toBe(38);
    expect(parseMeasurement('38.5')).toBe(38.5);
    expect(parseMeasurement('৩৮.৫')).toBe(38.5);
  });

  it('parses unicode fractions', () => {
    expect(parseMeasurement('৩৮½')).toBe(38.5);
    expect(parseMeasurement('15¼')).toBe(15.25);
    expect(parseMeasurement('15 ¾')).toBe(15.75);
    expect(parseMeasurement('½')).toBe(0.5);
  });

  it('parses typed fractions', () => {
    expect(parseMeasurement('38 1/2')).toBe(38.5);
    expect(parseMeasurement('38-1/4')).toBe(38.25);
    expect(parseMeasurement('৩৮ ১/২')).toBe(38.5);
    expect(parseMeasurement('3/8')).toBe(0.375);
  });

  it('rejects invalid, zero and negative input', () => {
    expect(parseMeasurement('')).toBeNull();
    expect(parseMeasurement('abc')).toBeNull();
    expect(parseMeasurement('0')).toBeNull();
    expect(parseMeasurement('-3')).toBeNull();
    expect(parseMeasurement('1/0')).toBeNull();
    expect(parseMeasurement('1/2½')).toBeNull();
  });
});

describe('formatMeasurement', () => {
  it('uses unicode fractions for eighths', () => {
    expect(formatMeasurement(38.5)).toBe('৩৮½');
    expect(formatMeasurement(15.25, 'en')).toBe('15¼');
    expect(formatMeasurement(0.375, 'en')).toBe('⅜');
    expect(formatMeasurement(40, 'en')).toBe('40');
  });

  it('falls back to two decimals otherwise', () => {
    expect(formatMeasurement(96.52, 'en')).toBe('96.52');
    expect(formatMeasurement(10.333, 'en')).toBe('10.33');
  });
});

describe('profiles and snapshots', () => {
  it('builds a stable profile key', () => {
    expect(profileKey('c1', 'shirt')).toBe('c1:shirt');
  });

  it('returns the latest version as current', () => {
    const profile = { customerId: 'c1', templateId: 'shirt', versions: [version('v1', 38), version('v2', 40)] };
    expect(currentVersion(profile)?.id).toBe('v2');
    expect(currentVersion({ ...profile, versions: [] })).toBeNull();
  });

  it('lists missing required fields', () => {
    const fields: MeasurementField[] = [
      { key: 'chest', label: { bn: 'বুক', en: 'Chest' }, unit: 'inch', group: 'body', required: true },
      { key: 'length', label: { bn: 'ঝুল', en: 'Length' }, unit: 'inch', group: 'body', required: true },
      { key: 'cuff', label: { bn: 'মুহুরি', en: 'Cuff' }, unit: 'inch', group: 'sleeve', required: false },
    ];
    expect(missingRequiredFields(fields, { chest: { value: 38, unit: 'inch' } })).toEqual(['length']);
  });

  it('snapshots are independent copies of the version', () => {
    const v = version('v1', 38);
    const snap = snapshotOf(v);
    v.values.chest!.value = 44;
    expect(snap.values.chest).toEqual({ value: 38, unit: 'inch' });
    expect(snap.versionId).toBe('v1');
    expect(snap.source).toBe('body');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/measurements.test.ts`

Expected: FAIL with `Error: Cannot find module './measurements'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/measurements.ts`:

```ts
import { toEnglishDigits, toScript, type DigitScript } from './digits';
import type { Label } from './label';

export type Unit = 'inch' | 'cm';
export type MeasurementSource = 'body' | 'sample';

export interface MeasurementField {
  key: string;
  label: Label;
  unit: Unit;
  /** Display group, e.g. "body", "sleeve", "salwar". */
  group: string;
  required: boolean;
}

/** Each saved value carries its own unit, so changing a template unit never reinterprets it. */
export interface MeasurementValue {
  value: number;
  unit: Unit;
}

export interface MeasurementVersion {
  id: string;
  takenAt: string;
  takenBy: string;
  source: MeasurementSource;
  notes: string;
  values: Record<string, MeasurementValue>;
}

export interface MeasurementProfile {
  customerId: string;
  templateId: string;
  versions: MeasurementVersion[];
}

/** A frozen copy of a measurement version stored on an order item. */
export interface MeasurementSnapshot {
  versionId: string;
  takenAt: string;
  source: MeasurementSource;
  values: Record<string, MeasurementValue>;
}

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

const EIGHTHS_TO_UNICODE: Record<number, string> = {
  1: '⅛',
  2: '¼',
  3: '⅜',
  4: '½',
  5: '⅝',
  6: '¾',
  7: '⅞',
};

/**
 * Parses a typed measurement. Accepts Bangla or English digits, decimals ("38.5"),
 * unicode fractions ("৩৮½") and plain fractions ("38 1/2", "38-1/2", "1/2").
 * Returns null for anything else, including zero or negative values.
 */
export function parseMeasurement(input: string): number | null {
  let text = toEnglishDigits(input).trim().replace(/\s+/g, ' ');
  if (!text) return null;

  let value: number | null = null;
  const last = text.slice(-1);
  const unicodeFraction = UNICODE_FRACTIONS[last];
  if (unicodeFraction !== undefined) {
    text = text.slice(0, -1).trim();
    if (text === '') value = unicodeFraction;
    else if (/^\d+$/.test(text)) value = Number(text) + unicodeFraction;
  } else {
    const fraction = /^(?:(\d+)[ -])?(\d+)\/(\d+)$/.exec(text);
    if (fraction) {
      const whole = Number(fraction[1] ?? '0');
      const numerator = Number(fraction[2]);
      const denominator = Number(fraction[3]);
      if (denominator !== 0) value = whole + numerator / denominator;
    } else if (/^\d+(\.\d+)?$/.test(text)) {
      value = Number(text);
    }
  }

  return value !== null && value > 0 ? value : null;
}

/** Formats a measurement, using unicode fractions for eighths: 38.5 -> "৩৮½". */
export function formatMeasurement(value: number, script: DigitScript = 'bn'): string {
  const eighths = Math.round(value * 8);
  let text: string;
  if (Math.abs(value * 8 - eighths) < 1e-9) {
    const whole = Math.floor(eighths / 8);
    const remainder = eighths % 8;
    const fraction = remainder ? EIGHTHS_TO_UNICODE[remainder]! : '';
    text = whole === 0 && fraction ? fraction : `${whole}${fraction}`;
  } else {
    text = String(Math.round(value * 100) / 100);
  }
  return toScript(text, script);
}

export function profileKey(customerId: string, templateId: string): string {
  return `${customerId}:${templateId}`;
}

/** The most recently recorded version, or null when none exist. */
export function currentVersion(profile: MeasurementProfile): MeasurementVersion | null {
  return profile.versions[profile.versions.length - 1] ?? null;
}

/** Keys of required fields that have no value. */
export function missingRequiredFields(
  fields: MeasurementField[],
  values: Record<string, MeasurementValue>,
): string[] {
  return fields.filter((f) => f.required && values[f.key] === undefined).map((f) => f.key);
}

export function snapshotOf(version: MeasurementVersion): MeasurementSnapshot {
  const values: Record<string, MeasurementValue> = {};
  for (const [key, v] of Object.entries(version.values)) {
    values[key] = { value: v.value, unit: v.unit };
  }
  return { versionId: version.id, takenAt: version.takenAt, source: version.source, values };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/measurements.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/measurements.ts packages/domain/src/measurements.test.ts
git commit -m "feat(domain): add measurement parsing, versions and snapshots"
```

### Task 4: Garment stages

Shop-configurable stage lists that always map to four reporting groups (unfinished, ready, delivered, cancelled). Optional stages such as Trial can be skipped; required ones cannot; moving backwards is rework.

**Files:**
- Create: `packages/domain/src/stages.ts`
- Test: `packages/domain/src/stages.test.ts`

**Interfaces:**
- Consumes: `Label` from `label.ts`.
- Produces:
  - `type StageGroup = 'unfinished' | 'ready' | 'delivered'`, `type SummaryGroup = StageGroup | 'cancelled'`
  - `interface Stage { key: string; label: Label; optional: boolean; group: StageGroup }`
  - `validateStages(stages: Stage[]): string[]` (empty array means valid)
  - `checkTransition(stages, fromKey, toKey): TransitionCheck` where `TransitionCheck = { ok: true; kind: 'forward' | 'rework'; skipped: string[] } | { ok: false; reason: 'unknown-stage' | 'same-stage' | 'skips-required' | 'already-delivered' }`
  - `stageByKey(stages, key): Stage` (throws `Unknown stage: <key>`)
  - `stageGroup(stages, key): StageGroup`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/stages.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkTransition, stageGroup, validateStages, type Stage } from './stages';

const s = (key: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn: key, en: key },
  optional,
  group,
});

const shirt: Stage[] = [
  s('booked', 'unfinished'),
  s('cutting', 'unfinished'),
  s('stitching', 'unfinished'),
  s('trial', 'unfinished', true),
  s('ready', 'ready'),
  s('delivered', 'delivered'),
];

describe('validateStages', () => {
  it('accepts a standard list', () => {
    expect(validateStages(shirt)).toEqual([]);
  });

  it('accepts a short alteration list', () => {
    const alteration = [s('booked', 'unfinished'), s('working', 'unfinished'), s('ready', 'ready'), s('delivered', 'delivered')];
    expect(validateStages(alteration)).toEqual([]);
  });

  it('reports structural problems', () => {
    expect(validateStages([])).toEqual(['no-stages']);
    expect(validateStages([s('ready', 'ready'), s('delivered', 'delivered')])).toContain('first-not-unfinished');
    expect(validateStages([s('a', 'unfinished'), s('b', 'ready')])).toContain('last-not-delivered');
    expect(validateStages([s('a', 'unfinished'), s('a', 'ready'), s('c', 'delivered')])).toContain('duplicate-key:a');
    expect(validateStages([s('a', 'unfinished'), s('d', 'delivered')])).toContain('no-required-ready');
    expect(
      validateStages([s('a', 'unfinished'), s('r', 'ready'), s('b', 'unfinished'), s('d', 'delivered')]),
    ).toContain('groups-out-of-order');
  });
});

describe('checkTransition', () => {
  it('allows the next stage', () => {
    expect(checkTransition(shirt, 'booked', 'cutting')).toEqual({ ok: true, kind: 'forward', skipped: [] });
  });

  it('allows skipping optional stages', () => {
    expect(checkTransition(shirt, 'stitching', 'ready')).toEqual({ ok: true, kind: 'forward', skipped: ['trial'] });
  });

  it('blocks skipping required stages', () => {
    expect(checkTransition(shirt, 'booked', 'stitching')).toEqual({ ok: false, reason: 'skips-required' });
    expect(checkTransition(shirt, 'stitching', 'delivered')).toEqual({ ok: false, reason: 'skips-required' });
  });

  it('treats backward moves as rework', () => {
    expect(checkTransition(shirt, 'ready', 'stitching')).toEqual({ ok: true, kind: 'rework', skipped: [] });
  });

  it('blocks moves out of delivered, to the same stage, and to unknown stages', () => {
    expect(checkTransition(shirt, 'delivered', 'ready')).toEqual({ ok: false, reason: 'already-delivered' });
    expect(checkTransition(shirt, 'ready', 'ready')).toEqual({ ok: false, reason: 'same-stage' });
    expect(checkTransition(shirt, 'ready', 'nope')).toEqual({ ok: false, reason: 'unknown-stage' });
  });
});

describe('stageGroup', () => {
  it('returns the group of a stage', () => {
    expect(stageGroup(shirt, 'trial')).toBe('unfinished');
    expect(stageGroup(shirt, 'ready')).toBe('ready');
  });

  it('throws for unknown stages', () => {
    expect(() => stageGroup(shirt, 'nope')).toThrow('Unknown stage: nope');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/stages.test.ts`

Expected: FAIL with `Error: Cannot find module './stages'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/stages.ts`:

```ts
import type { Label } from './label';

/** Groups every stage falls into for reporting, whatever the shop calls its stages. */
export type StageGroup = 'unfinished' | 'ready' | 'delivered';
export type SummaryGroup = StageGroup | 'cancelled';

export interface Stage {
  key: string;
  label: Label;
  /** Optional stages (e.g. Trial, QC) may be skipped when moving forward. */
  optional: boolean;
  group: StageGroup;
}

const GROUP_ORDER: Record<StageGroup, number> = { unfinished: 0, ready: 1, delivered: 2 };

/** Returns a list of problems with a stage list; empty means valid. */
export function validateStages(stages: Stage[]): string[] {
  if (stages.length === 0) return ['no-stages'];
  const errors: string[] = [];

  const keys = new Set<string>();
  for (const stage of stages) {
    if (!stage.key.trim()) errors.push('empty-key');
    if (keys.has(stage.key)) errors.push(`duplicate-key:${stage.key}`);
    keys.add(stage.key);
  }

  const first = stages[0]!;
  if (first.group !== 'unfinished') errors.push('first-not-unfinished');
  if (first.optional) errors.push('first-optional');

  const last = stages[stages.length - 1]!;
  if (last.group !== 'delivered') errors.push('last-not-delivered');
  if (stages.filter((s) => s.group === 'delivered').length > 1) errors.push('multiple-delivered');
  if (!stages.some((s) => s.group === 'ready' && !s.optional)) errors.push('no-required-ready');

  for (let i = 1; i < stages.length; i++) {
    if (GROUP_ORDER[stages[i]!.group] < GROUP_ORDER[stages[i - 1]!.group]) {
      errors.push('groups-out-of-order');
      break;
    }
  }
  return errors;
}

export type TransitionCheck =
  | { ok: true; kind: 'forward' | 'rework'; skipped: string[] }
  | { ok: false; reason: 'unknown-stage' | 'same-stage' | 'skips-required' | 'already-delivered' };

/**
 * Checks a move between stages. Forward moves may skip optional stages only.
 * Backward moves are rework. Nothing moves out of a delivered stage.
 */
export function checkTransition(stages: Stage[], fromKey: string, toKey: string): TransitionCheck {
  const from = stages.findIndex((s) => s.key === fromKey);
  const to = stages.findIndex((s) => s.key === toKey);
  if (from < 0 || to < 0) return { ok: false, reason: 'unknown-stage' };
  if (from === to) return { ok: false, reason: 'same-stage' };
  if (stages[from]!.group === 'delivered') return { ok: false, reason: 'already-delivered' };
  if (to < from) return { ok: true, kind: 'rework', skipped: [] };

  const between = stages.slice(from + 1, to);
  if (between.some((s) => !s.optional)) return { ok: false, reason: 'skips-required' };
  return { ok: true, kind: 'forward', skipped: between.map((s) => s.key) };
}

export function stageByKey(stages: Stage[], key: string): Stage {
  const stage = stages.find((s) => s.key === key);
  if (!stage) throw new Error(`Unknown stage: ${key}`);
  return stage;
}

export function stageGroup(stages: Stage[], key: string): StageGroup {
  return stageByKey(stages, key).group;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/stages.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/stages.ts packages/domain/src/stages.test.ts
git commit -m "feat(domain): add configurable garment stages"
```

### Task 5: Garment templates

A template bundles a garment name, default price, measurement fields (with Bangla shop terms) and a stage list. Ships six starter templates; shops can change all of them.

**Files:**
- Create: `packages/domain/src/templates.ts`
- Test: `packages/domain/src/templates.test.ts`

**Interfaces:**
- Consumes: `Label`; `MeasurementField`, `Unit` from `measurements.ts`; `isPoisha`, `Poisha` from `money.ts`; `validateStages`, `Stage` from `stages.ts`.
- Produces:
  - `interface GarmentTemplate { id; name: Label; defaultPrice: Poisha; fields: MeasurementField[]; stages: Stage[]; active: boolean }`
  - `validateTemplate(template): string[]`
  - `STANDARD_STAGES: Stage[]` (booked, cutting, stitching, trial (optional), ready, delivered)
  - `ALTERATION_STAGES: Stage[]` (booked, working, ready, delivered)
  - `STARTER_TEMPLATES: GarmentTemplate[]` with ids `shirt`, `pant`, `panjabi`, `salwar-kameez`, `blouse`, `alteration`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/templates.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { STARTER_TEMPLATES, validateTemplate, type GarmentTemplate } from './templates';

const shirt = STARTER_TEMPLATES.find((t) => t.id === 'shirt')!;

describe('starter templates', () => {
  it('are all valid', () => {
    for (const template of STARTER_TEMPLATES) {
      expect(validateTemplate(template), template.id).toEqual([]);
    }
  });

  it('price two shirts and a panjabi at ৳2,400, matching the spec example', () => {
    const panjabi = STARTER_TEMPLATES.find((t) => t.id === 'panjabi')!;
    expect(shirt.defaultPrice * 2 + panjabi.defaultPrice).toBe(240000);
  });
});

describe('validateTemplate', () => {
  it('reports template problems', () => {
    const broken: GarmentTemplate = {
      ...shirt,
      id: ' ',
      name: { bn: '', en: '' },
      defaultPrice: 10.5,
      fields: [shirt.fields[0]!, shirt.fields[0]!],
    };
    expect(validateTemplate(broken)).toEqual(['empty-id', 'empty-name', 'invalid-price', 'duplicate-field:length']);
  });

  it('includes stage problems', () => {
    expect(validateTemplate({ ...shirt, stages: [] })).toEqual(['no-stages']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/templates.test.ts`

Expected: FAIL with `Error: Cannot find module './templates'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/templates.ts`:

```ts
import type { Label } from './label';
import type { MeasurementField, Unit } from './measurements';
import { isPoisha, type Poisha } from './money';
import { validateStages, type Stage } from './stages';

export interface GarmentTemplate {
  id: string;
  name: Label;
  defaultPrice: Poisha;
  fields: MeasurementField[];
  stages: Stage[];
  active: boolean;
}

/** Returns a list of problems with a template; empty means valid. */
export function validateTemplate(template: GarmentTemplate): string[] {
  const errors: string[] = [];
  if (!template.id.trim()) errors.push('empty-id');
  if (!template.name.bn.trim() && !template.name.en.trim()) errors.push('empty-name');
  if (!isPoisha(template.defaultPrice) || template.defaultPrice < 0) errors.push('invalid-price');

  const keys = new Set<string>();
  for (const field of template.fields) {
    if (!field.key.trim()) errors.push('empty-field-key');
    if (keys.has(field.key)) errors.push(`duplicate-field:${field.key}`);
    keys.add(field.key);
  }

  return [...errors, ...validateStages(template.stages)];
}

const field = (
  key: string,
  bn: string,
  en: string,
  group: string,
  required = true,
  unit: Unit = 'inch',
): MeasurementField => ({ key, label: { bn, en }, unit, group, required });

const stage = (key: string, bn: string, en: string, group: Stage['group'], optional = false): Stage => ({
  key,
  label: { bn, en },
  optional,
  group,
});

export const STANDARD_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('cutting', 'কাটিং', 'Cutting', 'unfinished'),
  stage('stitching', 'সেলাই', 'Stitching', 'unfinished'),
  stage('trial', 'ট্রায়াল', 'Trial', 'unfinished', true),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

export const ALTERATION_STAGES: Stage[] = [
  stage('booked', 'বুকড', 'Booked', 'unfinished'),
  stage('working', 'কাজ চলছে', 'Working', 'unfinished'),
  stage('ready', 'রেডি', 'Ready', 'ready'),
  stage('delivered', 'ডেলিভারি হয়েছে', 'Delivered', 'delivered'),
];

/** Example templates a new shop starts with. Shops can edit or replace all of them. */
export const STARTER_TEMPLATES: GarmentTemplate[] = [
  {
    id: 'shirt',
    name: { bn: 'শার্ট', en: 'Shirt' },
    defaultPrice: 70000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('waist', 'পেট', 'Waist', 'body'),
      field('hip', 'হিপ', 'Hip', 'body', false),
      field('shoulder', 'কাঁধ (পুট)', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('cuff', 'হাতার মুহুরি', 'Cuff', 'sleeve', false),
      field('collar', 'গলা', 'Collar', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'pant',
    name: { bn: 'প্যান্ট', en: 'Pant' },
    defaultPrice: 70000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('waist', 'কোমর', 'Waist', 'body'),
      field('hip', 'হিপ', 'Hip', 'body'),
      field('thigh', 'থাই (রান)', 'Thigh', 'leg'),
      field('knee', 'হাঁটু', 'Knee', 'leg', false),
      field('bottom', 'মুহুরি', 'Bottom', 'leg'),
      field('rise', 'ফ্লাই', 'Rise', 'body', false),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'panjabi',
    name: { bn: 'পাঞ্জাবি', en: 'Panjabi' },
    defaultPrice: 100000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('waist', 'পেট', 'Waist', 'body'),
      field('shoulder', 'কাঁধ (পুট)', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('cuff', 'হাতার মুহুরি', 'Cuff', 'sleeve', false),
      field('collar', 'গলা', 'Collar', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'salwar-kameez',
    name: { bn: 'সালোয়ার কামিজ', en: 'Salwar kameez' },
    defaultPrice: 120000,
    fields: [
      field('kameez-length', 'কামিজের ঝুল', 'Kameez length', 'kameez'),
      field('chest', 'বুক', 'Chest', 'kameez'),
      field('waist', 'কোমর', 'Waist', 'kameez'),
      field('hip', 'হিপ', 'Hip', 'kameez'),
      field('shoulder', 'কাঁধ', 'Shoulder', 'kameez'),
      field('sleeve', 'হাতা', 'Sleeve', 'kameez'),
      field('armhole', 'আর্মহোল', 'Armhole', 'kameez'),
      field('neck-front', 'সামনের গলা', 'Front neck', 'kameez'),
      field('neck-back', 'পিছনের গলা', 'Back neck', 'kameez', false),
      field('salwar-length', 'সালোয়ারের ঝুল', 'Salwar length', 'salwar'),
      field('salwar-bottom', 'মুহুরি', 'Bottom', 'salwar'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'blouse',
    name: { bn: 'ব্লাউজ', en: 'Blouse' },
    defaultPrice: 80000,
    fields: [
      field('length', 'ঝুল', 'Length', 'body'),
      field('chest', 'বুক', 'Chest', 'body'),
      field('under-bust', 'বুকের নিচে', 'Under bust', 'body'),
      field('waist', 'কোমর', 'Waist', 'body'),
      field('shoulder', 'কাঁধ', 'Shoulder', 'body'),
      field('sleeve', 'হাতা', 'Sleeve', 'sleeve'),
      field('sleeve-round', 'হাতার ঘের', 'Sleeve round', 'sleeve'),
      field('armhole', 'আর্মহোল', 'Armhole', 'sleeve'),
      field('neck-front', 'সামনের গলা', 'Front neck', 'neck'),
      field('neck-back', 'পিছনের গলা', 'Back neck', 'neck'),
    ],
    stages: STANDARD_STAGES,
    active: true,
  },
  {
    id: 'alteration',
    name: { bn: 'অল্টারেশন', en: 'Alteration' },
    defaultPrice: 20000,
    fields: [],
    stages: ALTERATION_STAGES,
    active: true,
  },
];
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/templates.test.ts`

Expected: PASS, 4 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/templates.ts packages/domain/src/templates.test.ts
git commit -m "feat(domain): add garment templates with starter set"
```

### Task 6: Roles, permissions and PINs

Roles are capability sets. Includes the restricted-visibility rule for women's measurements, branch scope, and staff PIN checks that accept Bangla digits.

**Files:**
- Create: `packages/domain/src/permissions.ts`
- Test: `packages/domain/src/permissions.test.ts`

**Interfaces:**
- Consumes: `toEnglishDigits`; `Label`.
- Produces:
  - `CAPABILITIES` (readonly tuple) and `type Capability`
  - `interface Role { id; name: Label; capabilities: Capability[] }`
  - `interface Staff { id; name; roleId; branchIds: 'all' | string[]; pin: string; active: boolean }`
  - `DEFAULT_ROLES: Role[]` with ids `owner`, `manager`, `counter`, `cutting`, `supervisor`, `tailor`, `accounts`
  - `can(role, capability): boolean`
  - `canViewMeasurementsOf(role, customer: { gender }, restrictFemaleMeasurements: boolean): boolean`
  - `canAccessBranch(staff, branchId): boolean`
  - `isValidPin(pin): boolean`, `verifyPin(staff, input): boolean`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/permissions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  DEFAULT_ROLES,
  can,
  canAccessBranch,
  canViewMeasurementsOf,
  isValidPin,
  verifyPin,
  type Staff,
} from './permissions';

const roleById = (id: string) => DEFAULT_ROLES.find((r) => r.id === id)!;

const staff = (overrides: Partial<Staff> = {}): Staff => ({
  id: 's1',
  name: 'Karim',
  roleId: 'tailor',
  branchIds: ['main'],
  pin: '1234',
  active: true,
  ...overrides,
});

describe('default roles', () => {
  it('give the owner every capability', () => {
    expect(roleById('owner').capabilities).toEqual([...CAPABILITIES]);
  });

  it('keep money away from tailors', () => {
    const tailor = roleById('tailor');
    expect(can(tailor, 'money.view')).toBe(false);
    expect(can(tailor, 'payments.record')).toBe(false);
    expect(can(tailor, 'work.updateStage')).toBe(true);
  });

  it('let counter staff record payments but not correct or refund them', () => {
    const counter = roleById('counter');
    expect(can(counter, 'payments.record')).toBe(true);
    expect(can(counter, 'payments.correct')).toBe(false);
    expect(can(counter, 'payments.refund')).toBe(false);
  });

  it('stop managers from managing staff', () => {
    expect(can(roleById('manager'), 'staff.manage')).toBe(false);
    expect(can(roleById('manager'), 'settings.edit')).toBe(true);
  });
});

describe('canViewMeasurementsOf', () => {
  const counter = roleById('counter');
  const owner = roleById('owner');
  const accounts = roleById('accounts');

  it('requires measurements.view', () => {
    expect(canViewMeasurementsOf(accounts, { gender: 'male' }, false)).toBe(false);
  });

  it('allows everyone with measurements.view when no restriction is set', () => {
    expect(canViewMeasurementsOf(counter, { gender: 'female' }, false)).toBe(true);
  });

  it('hides female customers from roles without the female capability when restricted', () => {
    expect(canViewMeasurementsOf(counter, { gender: 'female' }, true)).toBe(false);
    expect(canViewMeasurementsOf(counter, { gender: 'male' }, true)).toBe(true);
    expect(canViewMeasurementsOf(owner, { gender: 'female' }, true)).toBe(true);
  });
});

describe('branches and PINs', () => {
  it('checks branch scope', () => {
    expect(canAccessBranch(staff(), 'main')).toBe(true);
    expect(canAccessBranch(staff(), 'workshop')).toBe(false);
    expect(canAccessBranch(staff({ branchIds: 'all' }), 'workshop')).toBe(true);
  });

  it('validates four-digit PINs in either script', () => {
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('১২৩৪')).toBe(true);
    expect(isValidPin('123')).toBe(false);
    expect(isValidPin('12a4')).toBe(false);
  });

  it('verifies PINs typed in either script, only for active staff', () => {
    expect(verifyPin(staff(), '১২৩৪')).toBe(true);
    expect(verifyPin(staff(), '1235')).toBe(false);
    expect(verifyPin(staff({ active: false }), '1234')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/permissions.test.ts`

Expected: FAIL with `Error: Cannot find module './permissions'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/permissions.ts`:

```ts
import { toEnglishDigits } from './digits';
import type { Label } from './label';

export const CAPABILITIES = [
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.cancel',
  'customers.view',
  'customers.edit',
  'measurements.view',
  'measurements.view.female',
  'measurements.edit',
  'money.view',
  'payments.record',
  'payments.correct',
  'payments.refund',
  'work.view.assigned',
  'work.view.all',
  'work.assign',
  'work.updateStage',
  'links.manage',
  'settings.edit',
  'staff.manage',
  'branches.view.all',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export interface Role {
  id: string;
  name: Label;
  capabilities: Capability[];
}

export interface Staff {
  id: string;
  name: string;
  roleId: string;
  /** 'all' or the branch ids this person works in. */
  branchIds: 'all' | string[];
  /** Demo only: stored as typed. The pilot stores a hash instead. */
  pin: string;
  active: boolean;
}

const role = (id: string, bn: string, en: string, capabilities: Capability[]): Role => ({
  id,
  name: { bn, en },
  capabilities,
});

export const DEFAULT_ROLES: Role[] = [
  role('owner', 'মালিক', 'Owner', [...CAPABILITIES]),
  role(
    'manager',
    'ম্যানেজার',
    'Manager',
    CAPABILITIES.filter((c) => c !== 'staff.manage'),
  ),
  role('counter', 'কাউন্টার', 'Counter staff', [
    'orders.view',
    'orders.create',
    'orders.edit',
    'customers.view',
    'customers.edit',
    'measurements.view',
    'measurements.edit',
    'money.view',
    'payments.record',
    'work.view.all',
    'links.manage',
  ]),
  role('cutting', 'মাপ ও কাটিং', 'Measurement & cutting', [
    'orders.view',
    'customers.view',
    'measurements.view',
    'measurements.edit',
    'work.view.all',
    'work.updateStage',
  ]),
  role('supervisor', 'প্রোডাকশন সুপারভাইজার', 'Production supervisor', [
    'orders.view',
    'customers.view',
    'measurements.view',
    'work.view.all',
    'work.assign',
    'work.updateStage',
  ]),
  role('tailor', 'দর্জি', 'Tailor', ['measurements.view', 'work.view.assigned', 'work.updateStage']),
  role('accounts', 'হিসাবরক্ষক', 'Accounts', [
    'orders.view',
    'customers.view',
    'money.view',
    'payments.record',
    'payments.correct',
    'payments.refund',
  ]),
];

export function can(role: Role, capability: Capability): boolean {
  return role.capabilities.includes(capability);
}

/**
 * Whether this role may see a customer's measurements. When the shop restricts
 * women's measurements, female customers additionally need 'measurements.view.female'.
 */
export function canViewMeasurementsOf(
  role: Role,
  customer: { gender: 'male' | 'female' | 'other' | null },
  restrictFemaleMeasurements: boolean,
): boolean {
  if (!can(role, 'measurements.view')) return false;
  if (restrictFemaleMeasurements && customer.gender === 'female') {
    return can(role, 'measurements.view.female');
  }
  return true;
}

export function canAccessBranch(staff: Staff, branchId: string): boolean {
  return staff.branchIds === 'all' || staff.branchIds.includes(branchId);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4}$/.test(toEnglishDigits(pin));
}

export function verifyPin(staff: Staff, input: string): boolean {
  return staff.active && toEnglishDigits(input) === toEnglishDigits(staff.pin);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/permissions.test.ts`

Expected: PASS, 10 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/permissions.ts packages/domain/src/permissions.test.ts
git commit -m "feat(domain): add roles, capabilities and staff PIN checks"
```

### Task 7: Customer search

Finds customers by phone (typed in Bangla or English digits) or by name across scripts. `nameKey` reduces both "রহিম" and "Rahim" to the consonant skeleton "rhm".

**Files:**
- Create: `packages/domain/src/search.ts`
- Test: `packages/domain/src/search.test.ts`

**Interfaces:**
- Consumes: `toEnglishDigits`.
- Produces:
  - `nameKey(name: string): string`
  - `normalizePhone(input: string): string`
  - `interface SearchableCustomer { name: string; nameAlt: string | null; phone: string | null }`
  - `customerMatchScore(customer, query): number` (0 none, 1 sound-alike, 2 name text, 3 phone)
  - `searchCustomers<T extends SearchableCustomer>(customers: T[], query: string, limit = 20): T[]`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { customerMatchScore, nameKey, normalizePhone, searchCustomers } from './search';

describe('nameKey', () => {
  it.each([
    ['রহিম', 'Rahim'],
    ['করিম', 'Karim'],
    ['মোহাম্মদ', 'Muhammad'],
    ['চৌধুরী', 'Chowdhury'],
    ['শিরিন', 'Shirin'],
    ['জাহাঙ্গীর', 'Jahangir'],
    ['ফাতেমা', 'Fatema'],
    ['হোসেন', 'Hossain'],
    ['খান', 'Khan'],
    ['আহমেদ', 'Ahmed'],
    ['বাংলা', 'Bangla'],
  ])('gives %s and %s the same key', (bangla, latin) => {
    expect(nameKey(bangla)).toBe(nameKey(latin));
    expect(nameKey(bangla).length).toBeGreaterThan(0);
  });

  it('handles ড় and য় written as one or two code points', () => {
    expect(nameKey('বড়ুয়া')).toBe(nameKey('Barua'));
  });

  it('does not match different names', () => {
    expect(nameKey('Rahim')).not.toBe(nameKey('Karim'));
  });
});

describe('normalizePhone', () => {
  it('normalizes digits, separators and country code', () => {
    expect(normalizePhone('০১৭১২-৩৪৫৬৭৮')).toBe('01712345678');
    expect(normalizePhone('+880 1712 345678')).toBe('01712345678');
  });
});

describe('customer search', () => {
  const customers = [
    { id: '1', name: 'রহিম উদ্দিন', nameAlt: null, phone: '01712345678' },
    { id: '2', name: 'Karim Mia', nameAlt: 'করিম মিয়া', phone: '01812000000' },
    { id: '3', name: 'Shirin Akter', nameAlt: null, phone: null },
  ];

  it('matches phone digits typed in Bangla', () => {
    expect(customerMatchScore(customers[0]!, '৩৪৫৬')).toBe(3);
    expect(searchCustomers(customers, '৩৪৫৬').map((c) => c.id)).toEqual(['1']);
  });

  it('matches name text directly', () => {
    expect(customerMatchScore(customers[1]!, 'karim')).toBe(2);
    expect(customerMatchScore(customers[1]!, 'করিম')).toBe(2);
  });

  it('matches across scripts by sound', () => {
    expect(customerMatchScore(customers[0]!, 'Rahim')).toBe(1);
    expect(customerMatchScore(customers[2]!, 'শিরিন')).toBe(1);
  });

  it('returns nothing for empty or unmatched queries', () => {
    expect(searchCustomers(customers, '  ')).toEqual([]);
    expect(searchCustomers(customers, 'Zzz')).toEqual([]);
  });

  it('ranks better matches first and respects the limit', () => {
    const list = [
      { id: 'a', name: 'Rahima', nameAlt: null, phone: null },
      { id: 'b', name: 'রহিম', nameAlt: null, phone: null },
    ];
    expect(searchCustomers(list, 'rahim').map((c) => c.id)).toEqual(['a', 'b']);
    expect(searchCustomers(list, 'rahim', 1).map((c) => c.id)).toEqual(['a']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/search.test.ts`

Expected: FAIL with `Error: Cannot find module './search'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/search.ts`:

```ts
import { toEnglishDigits } from './digits';

/** Bangla letters mapped to a rough Latin consonant. Vowels and signs are dropped. */
const BANGLA_CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'k', 'গ': 'g', 'ঘ': 'g', 'ঙ': 'ng',
  'চ': 'c', 'ছ': 'c', 'জ': 'j', 'ঝ': 'j', 'ঞ': 'n',
  'ট': 't', 'ঠ': 't', 'ড': 'd', 'ঢ': 'd', 'ণ': 'n',
  'ত': 't', 'থ': 't', 'দ': 'd', 'ধ': 'd', 'ন': 'n',
  'প': 'p', 'ফ': 'f', 'ব': 'b', 'ভ': 'b', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 's', 'ষ': 's',
  'স': 's', 'হ': 'h', 'ৎ': 't', 'ং': 'ng',
};

const LATIN_DIGRAPHS: Array<[RegExp, string]> = [
  [/chh|ch/g, 'C'],
  [/kh/g, 'k'],
  [/gh/g, 'g'],
  [/jh/g, 'j'],
  [/th/g, 't'],
  [/dh/g, 'd'],
  [/ph/g, 'f'],
  [/bh/g, 'b'],
  [/sh/g, 's'],
];

const LATIN_SINGLE: Record<string, string> = {
  C: 'c', c: 'k', q: 'k', z: 'j', v: 'b', x: 'ks',
  a: '', e: '', i: '', o: '', u: '', w: '', y: '',
};

/**
 * Reduces a name to a consonant skeleton that is the same for Bangla and Latin
 * spellings, so "রহিম" and "Rahim" both become "rhm".
 */
export function nameKey(name: string): string {
  let text = name
    .normalize('NFD')
    .toLowerCase()
    .replace(/য়/g, '') // য় is a vowel glide
    .replace(/্য/g, '') // ya-phala
    .replace(/[ডঢ]়/g, 'r'); // ড় ঢ়
  for (const [pattern, replacement] of LATIN_DIGRAPHS) text = text.replace(pattern, replacement);

  let key = '';
  for (const ch of text) {
    const bangla = BANGLA_CONSONANTS[ch];
    const latin = LATIN_SINGLE[ch];
    if (bangla !== undefined) key += bangla;
    else if (latin !== undefined) key += latin;
    else if (/[a-z]/.test(ch)) key += ch;
  }
  return key.replace(/(.)\1+/g, '$1');
}

/** Digits only, Bangla digits converted, +880 country code turned into a leading 0. */
export function normalizePhone(input: string): string {
  const digits = toEnglishDigits(input).replace(/\D/g, '');
  return digits.startsWith('880') && digits.length === 13 ? `0${digits.slice(3)}` : digits;
}

export interface SearchableCustomer {
  name: string;
  nameAlt: string | null;
  phone: string | null;
}

/** 0 = no match. Higher is better: phone 3, name text 2, name sound-alike 1. */
export function customerMatchScore(customer: SearchableCustomer, query: string): number {
  const trimmed = query.trim();
  if (!trimmed) return 0;

  const queryDigits = normalizePhone(trimmed);
  if (/^[\d\s+\-০-৯]+$/.test(trimmed) && queryDigits.length >= 3) {
    return customer.phone && normalizePhone(customer.phone).includes(queryDigits) ? 3 : 0;
  }

  const names = [customer.name, customer.nameAlt].filter((n): n is string => !!n);
  const lowered = trimmed.toLowerCase();
  if (names.some((n) => n.toLowerCase().includes(lowered))) return 2;

  const queryKey = nameKey(trimmed);
  if (queryKey.length >= 2 && names.some((n) => nameKey(n).includes(queryKey))) return 1;
  return 0;
}

/** Matching customers, best first, then alphabetically by name. */
export function searchCustomers<T extends SearchableCustomer>(customers: T[], query: string, limit = 20): T[] {
  return customers
    .map((customer) => ({ customer, score: customerMatchScore(customer, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.customer.name.localeCompare(b.customer.name))
    .slice(0, limit)
    .map((r) => r.customer);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/search.test.ts`

Expected: PASS, 19 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/search.ts packages/domain/src/search.test.ts
git commit -m "feat(domain): add cross-script customer search"
```

### Task 8: Order numbering

Per-device series (A-0142, B-0031) so numbers issued offline are final and never collide. Also lets staff find an order by typing "142" or "১৪২".

**Files:**
- Create: `packages/domain/src/numbering.ts`
- Test: `packages/domain/src/numbering.test.ts`

**Interfaces:**
- Consumes: `toEnglishDigits`.
- Produces:
  - `isValidSeries(series): boolean` (one or two uppercase letters)
  - `formatOrderNumber(series, n): string`
  - `parseOrderNumber(value): { series: string; n: number } | null`
  - `nextOrderNumber(existing: Iterable<string>, series: string): string`
  - `orderNumberMatches(number, query): boolean`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/numbering.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatOrderNumber, isValidSeries, nextOrderNumber, orderNumberMatches, parseOrderNumber } from './numbering';

describe('order numbering', () => {
  it('validates series letters', () => {
    expect(isValidSeries('A')).toBe(true);
    expect(isValidSeries('AB')).toBe(true);
    expect(isValidSeries('a')).toBe(false);
    expect(isValidSeries('ABC')).toBe(false);
    expect(isValidSeries('1')).toBe(false);
  });

  it('formats and parses numbers', () => {
    expect(formatOrderNumber('A', 142)).toBe('A-0142');
    expect(formatOrderNumber('B', 12345)).toBe('B-12345');
    expect(parseOrderNumber('A-0142')).toEqual({ series: 'A', n: 142 });
    expect(parseOrderNumber('nonsense')).toBeNull();
  });

  it('continues the device series and ignores other series', () => {
    expect(nextOrderNumber([], 'A')).toBe('A-0001');
    expect(nextOrderNumber(['A-0001', 'A-0007', 'B-0040'], 'A')).toBe('A-0008');
    expect(nextOrderNumber(['A-0001', 'A-0007', 'B-0040'], 'B')).toBe('B-0041');
  });

  it('never issues the same number on two devices', () => {
    const existing = ['A-0001', 'B-0001'];
    expect(nextOrderNumber(existing, 'A')).not.toBe(nextOrderNumber(existing, 'B'));
  });

  it('rejects invalid series', () => {
    expect(() => nextOrderNumber([], 'a')).toThrow('Invalid series: a');
  });
});

describe('orderNumberMatches', () => {
  it.each(['A-0142', 'a-142', 'a142', '142', '১৪২', ' A-০১৪২ '])('matches %s', (query) => {
    expect(orderNumberMatches('A-0142', query)).toBe(true);
  });

  it.each(['B-0142', '14', '', 'A-0143'])('does not match %s', (query) => {
    expect(orderNumberMatches('A-0142', query)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/numbering.test.ts`

Expected: FAIL with `Error: Cannot find module './numbering'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/numbering.ts`:

```ts
import { toEnglishDigits } from './digits';

/**
 * Each device has its own series letter(s), so numbers issued offline are final:
 * device A issues A-0001, A-0002...; device B issues B-0001... They never collide.
 */
export function isValidSeries(series: string): boolean {
  return /^[A-Z]{1,2}$/.test(series);
}

export function formatOrderNumber(series: string, n: number): string {
  return `${series}-${String(n).padStart(4, '0')}`;
}

export function parseOrderNumber(value: string): { series: string; n: number } | null {
  const match = /^([A-Z]{1,2})-?(\d+)$/.exec(toEnglishDigits(value).trim().toUpperCase());
  return match ? { series: match[1]!, n: Number(match[2]) } : null;
}

export function nextOrderNumber(existing: Iterable<string>, series: string): string {
  if (!isValidSeries(series)) throw new Error(`Invalid series: ${series}`);
  let highest = 0;
  for (const number of existing) {
    const parsed = parseOrderNumber(number);
    if (parsed && parsed.series === series) highest = Math.max(highest, parsed.n);
  }
  return formatOrderNumber(series, highest + 1);
}

/** Matches "A-0142" for queries like "A-0142", "a-142", "a142", "142" or "১৪২". */
export function orderNumberMatches(number: string, query: string): boolean {
  const q = toEnglishDigits(query).trim().toUpperCase();
  if (!q) return false;
  const target = parseOrderNumber(number);
  if (!target) return number.toUpperCase().includes(q);
  if (/^\d+$/.test(q)) return target.n === Number(q);
  const parsed = parseOrderNumber(q);
  return parsed !== null && parsed.series === target.series && parsed.n === target.n;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/numbering.test.ts`

Expected: PASS, 15 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/numbering.ts packages/domain/src/numbering.test.ts
git commit -m "feat(domain): add per-device order numbering"
```

### Task 9: Shop model, order totals and balances

The state types every later task uses, plus the derived numbers: order total (cancelled items excluded, discount and adjustments applied), per-garment progress, and balance derived from payments. Balance is never stored. Also adds the first test fixtures.

**Files:**
- Create: `packages/domain/src/model.ts`
- Create: `packages/domain/src/orders.ts`
- Create: `packages/domain/src/payments.ts`
- Create: `packages/domain/src/testing/fixtures.ts`
- Test: `packages/domain/src/orders.test.ts`
- Test: `packages/domain/src/payments.test.ts`

**Interfaces:**
- Consumes: `Label`, `MeasurementProfile`, `MeasurementSnapshot`, `Poisha`, `Stage`, `stageGroup`, `SummaryGroup`, `STANDARD_STAGES`.
- Produces:
  - `model.ts`: `Gender`, `Customer`, `Household`, `Discount`, `PriceAdjustment`, `StageChange`, `FittingAdjustment`, `Cancellation`, `OrderItem`, `PaymentMethod` (`'cash' | 'bkash' | 'nagad' | 'bank'`), `PaymentKind` (`'advance' | 'payment' | 'refund' | 'correction'`), `Payment`, `StatusLink`, `Order`, `ShopState`, `emptyState(): ShopState`
  - `orders.ts`: `itemSummaryGroup(item): SummaryGroup`, `subtotal(order)`, `adjustmentsTotal(order)`, `orderTotal(order)`, `orderProgress(order): OrderProgress`, `isOrderClosed(order)`, `itemDeliveredAt(item)`, `orderClosedAt(order)`
  - `payments.ts`: `netPaid(payments)`, `correctedAmount(payments, paymentId)`, `balanceDue(order)` (negative means credit due), `moneySummary(order): { total; paid; balance; creditDue }`
  - `testing/fixtures.ts`: `T0`, `makeItem(overrides)`, `makeOrder(overrides)`, `makePayment(overrides)`, `spec54Order(overrides)`

- [ ] **Step 1: Create the test fixtures (later extended in Task 10)**

`packages/domain/src/testing/fixtures.ts`:

```ts
import type { Order, OrderItem, Payment } from '../model';
import { STANDARD_STAGES } from '../templates';

/** A fixed moment used by tests: 3 Oct 2026, 10:00 in Dhaka. */
export const T0 = '2026-10-03T04:00:00.000Z';

export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'i1',
    templateId: 'shirt',
    garmentName: { bn: 'শার্ট', en: 'Shirt' },
    price: 70000,
    wearer: null,
    measurements: null,
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    stages: STANDARD_STAGES,
    stageKey: 'booked',
    stageHistory: [],
    assignedTo: null,
    trialDate: null,
    deliveryDate: null,
    adjustments: [],
    cancelled: null,
    version: 1,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 'A-0001',
    customerId: 'c1',
    branchId: 'main',
    createdAt: T0,
    createdBy: 'staff-owner',
    updatedAt: T0,
    notes: '',
    discount: null,
    priceAdjustments: [],
    items: [makeItem()],
    payments: [],
    links: [],
    version: 1,
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    amount: 100000,
    method: 'cash',
    reference: '',
    kind: 'advance',
    corrects: null,
    reason: '',
    at: T0,
    by: 'staff-owner',
    ...overrides,
  };
}

/** The spec example: two shirts (৳700 each) and a panjabi (৳1,000), total ৳2,400. */
export function spec54Order(overrides: Partial<Order> = {}): Order {
  return makeOrder({
    items: [
      makeItem({ id: 'shirt-1' }),
      makeItem({ id: 'shirt-2' }),
      makeItem({ id: 'panjabi-1', templateId: 'panjabi', garmentName: { bn: 'পাঞ্জাবি', en: 'Panjabi' }, price: 100000 }),
    ],
    ...overrides,
  });
}
```

- [ ] **Step 2: Write the failing tests**

`packages/domain/src/orders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  isOrderClosed,
  itemDeliveredAt,
  itemSummaryGroup,
  orderClosedAt,
  orderProgress,
  orderTotal,
  subtotal,
} from './orders';
import { makeItem, makeOrder, spec54Order } from './testing/fixtures';

const delivered = (id: string, at: string) =>
  makeItem({
    id,
    stageKey: 'delivered',
    stageHistory: [{ from: 'ready', to: 'delivered', at, by: 'staff-owner', kind: 'forward', reason: '' }],
  });

describe('order totals', () => {
  it('totals the spec example at ৳2,400', () => {
    expect(orderTotal(spec54Order())).toBe(240000);
  });

  it('excludes cancelled items', () => {
    const order = spec54Order();
    order.items[0] = makeItem({ id: 'shirt-1', cancelled: { reason: 'changed mind', at: 'x', by: 'y' } });
    expect(subtotal(order)).toBe(170000);
    expect(orderTotal(order)).toBe(170000);
  });

  it('applies discount and price adjustments', () => {
    const order = spec54Order({
      discount: { amount: 20000, reason: 'regular customer' },
      priceAdjustments: [{ id: 'a1', amount: 15000, reason: 'extra embroidery', at: 'x', by: 'y' }],
    });
    expect(orderTotal(order)).toBe(240000 - 20000 + 15000);
  });

  it('never goes below zero', () => {
    const order = makeOrder({
      items: [makeItem({ cancelled: { reason: 'r', at: 'x', by: 'y' } })],
      discount: { amount: 10000, reason: 'r' },
    });
    expect(orderTotal(order)).toBe(0);
  });
});

describe('order progress', () => {
  it('counts items by summary group', () => {
    const order = makeOrder({
      items: [
        makeItem({ id: 'a', stageKey: 'stitching' }),
        makeItem({ id: 'b', stageKey: 'ready' }),
        delivered('c', '2026-10-05T10:00:00.000Z'),
        makeItem({ id: 'd', cancelled: { reason: 'r', at: 'x', by: 'y' } }),
      ],
    });
    expect(orderProgress(order)).toEqual({ unfinished: 1, ready: 1, delivered: 1, cancelled: 1, total: 4 });
    expect(itemSummaryGroup(order.items[3]!)).toBe('cancelled');
  });

  it('keeps the order open when only one garment is collected', () => {
    const order = spec54Order();
    order.items[0] = delivered('shirt-1', '2026-10-05T10:00:00.000Z');
    expect(isOrderClosed(order)).toBe(false);
    expect(orderClosedAt(order)).toBeNull();
  });

  it('closes when every item is delivered or cancelled, at the latest of those times', () => {
    const order = makeOrder({
      items: [
        delivered('a', '2026-10-05T10:00:00.000Z'),
        makeItem({ id: 'b', cancelled: { reason: 'r', at: '2026-10-06T09:00:00.000Z', by: 'y' } }),
      ],
    });
    expect(isOrderClosed(order)).toBe(true);
    expect(orderClosedAt(order)).toBe('2026-10-06T09:00:00.000Z');
  });

  it('reports when an item was delivered', () => {
    expect(itemDeliveredAt(delivered('a', '2026-10-05T10:00:00.000Z'))).toBe('2026-10-05T10:00:00.000Z');
    expect(itemDeliveredAt(makeItem({ stageKey: 'ready' }))).toBeNull();
  });

  it('treats an order with no items as open', () => {
    expect(isOrderClosed(makeOrder({ items: [] }))).toBe(false);
  });
});
```

`packages/domain/src/payments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { balanceDue, correctedAmount, moneySummary, netPaid } from './payments';
import { makeItem, makePayment, spec54Order } from './testing/fixtures';

describe('payments', () => {
  it('derives the spec example balance of ৳1,400 after a ৳1,000 advance', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 100000 })] });
    expect(balanceDue(order)).toBe(140000);
    expect(moneySummary(order)).toEqual({ total: 240000, paid: 100000, balance: 140000, creditDue: 0 });
  });

  it('adds partial payments and subtracts refunds', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'p2', kind: 'payment', amount: 50000 }),
      makePayment({ id: 'p3', kind: 'refund', amount: 20000 }),
    ];
    expect(netPaid(payments)).toBe(130000);
  });

  it('applies a correction as a signed delta to the payment it corrects', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'c1', kind: 'correction', corrects: 'p1', amount: -50000, reason: 'typed 1000 instead of 500' }),
    ];
    expect(netPaid(payments)).toBe(50000);
    expect(correctedAmount(payments, 'p1')).toBe(50000);
  });

  it('applies a correction to a refund in the refund direction', () => {
    const payments = [
      makePayment({ id: 'p1', amount: 100000 }),
      makePayment({ id: 'r1', kind: 'refund', amount: 50000 }),
      makePayment({ id: 'c1', kind: 'correction', corrects: 'r1', amount: -20000, reason: 'refund was 300' }),
    ];
    expect(correctedAmount(payments, 'r1')).toBe(30000);
    expect(netPaid(payments)).toBe(70000);
  });

  it('throws for an unknown payment id', () => {
    expect(() => correctedAmount([], 'nope')).toThrow('Unknown payment: nope');
  });

  it('shows credit due when a cancellation leaves the customer overpaid', () => {
    const order = spec54Order({ payments: [makePayment({ amount: 200000 })] });
    order.items[2] = makeItem({ id: 'panjabi-1', price: 100000, cancelled: { reason: 'r', at: 'x', by: 'y' } });
    expect(balanceDue(order)).toBe(-60000);
    expect(moneySummary(order)).toEqual({ total: 140000, paid: 200000, balance: 0, creditDue: 60000 });
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/orders.test.ts src/payments.test.ts`

Expected: FAIL with `Error: Cannot find module` for `../model`, `./orders` or `./payments` (none exist yet).

- [ ] **Step 4: Write the implementation**

`packages/domain/src/model.ts`:

```ts
import type { Label } from './label';
import type { MeasurementProfile, MeasurementSnapshot } from './measurements';
import type { Poisha } from './money';
import type { Stage } from './stages';

export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  name: string;
  /** The same name in the other script, if known. */
  nameAlt: string | null;
  phone: string | null;
  householdId: string | null;
  gender: Gender | null;
  notes: string;
  createdAt: string;
  version: number;
}

/** Groups customers such as family members sharing a phone. Never merges them. */
export interface Household {
  id: string;
  label: string;
  createdAt: string;
}

export interface Discount {
  amount: Poisha;
  reason: string;
}

export interface PriceAdjustment {
  id: string;
  /** Signed: positive adds to the total, negative reduces it. */
  amount: Poisha;
  reason: string;
  at: string;
  by: string;
}

export interface StageChange {
  from: string;
  to: string;
  at: string;
  by: string;
  kind: 'forward' | 'rework';
  reason: string;
}

/** A change requested at a fitting. The measurement snapshot itself is never edited. */
export interface FittingAdjustment {
  id: string;
  note: string;
  at: string;
  by: string;
}

export interface Cancellation {
  reason: string;
  at: string;
  by: string;
}

export interface OrderItem {
  id: string;
  templateId: string;
  garmentName: Label;
  price: Poisha;
  /** Who will wear it, for group orders, e.g. "Rahim - class 7". */
  wearer: string | null;
  measurements: MeasurementSnapshot | null;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  /** Copied from the template when ordered, so later template edits never change this item. */
  stages: Stage[];
  stageKey: string;
  stageHistory: StageChange[];
  assignedTo: string | null;
  trialDate: string | null;
  deliveryDate: string | null;
  adjustments: FittingAdjustment[];
  cancelled: Cancellation | null;
  version: number;
}

export type PaymentMethod = 'cash' | 'bkash' | 'nagad' | 'bank';
export type PaymentKind = 'advance' | 'payment' | 'refund' | 'correction';

export interface Payment {
  id: string;
  /** Positive for advance, payment and refund. Signed delta for a correction. */
  amount: Poisha;
  method: PaymentMethod;
  reference: string;
  kind: PaymentKind;
  /** For corrections: the id of the payment being corrected. */
  corrects: string | null;
  reason: string;
  at: string;
  by: string;
}

export interface StatusLink {
  token: string;
  createdAt: string;
  revokedAt: string | null;
}

export interface Order {
  id: string;
  number: string;
  customerId: string;
  branchId: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  notes: string;
  discount: Discount | null;
  priceAdjustments: PriceAdjustment[];
  items: OrderItem[];
  payments: Payment[];
  links: StatusLink[];
  version: number;
}

/** Everything rebuilt from the event log. */
export interface ShopState {
  customers: Record<string, Customer>;
  households: Record<string, Household>;
  /** Keyed by profileKey(customerId, templateId). */
  profiles: Record<string, MeasurementProfile>;
  orders: Record<string, Order>;
  appliedEventIds: Record<string, true>;
}

export function emptyState(): ShopState {
  return { customers: {}, households: {}, profiles: {}, orders: {}, appliedEventIds: {} };
}
```

`packages/domain/src/orders.ts`:

```ts
import type { Order, OrderItem } from './model';
import type { Poisha } from './money';
import { stageGroup, type SummaryGroup } from './stages';

export function itemSummaryGroup(item: OrderItem): SummaryGroup {
  return item.cancelled ? 'cancelled' : stageGroup(item.stages, item.stageKey);
}

/** Sum of prices of items that are not cancelled. */
export function subtotal(order: Order): Poisha {
  return order.items.filter((i) => !i.cancelled).reduce((sum, i) => sum + i.price, 0);
}

export function adjustmentsTotal(order: Order): Poisha {
  return order.priceAdjustments.reduce((sum, a) => sum + a.amount, 0);
}

/** Subtotal minus discount plus price adjustments, never below zero. */
export function orderTotal(order: Order): Poisha {
  return Math.max(0, subtotal(order) - (order.discount?.amount ?? 0) + adjustmentsTotal(order));
}

export interface OrderProgress {
  unfinished: number;
  ready: number;
  delivered: number;
  cancelled: number;
  total: number;
}

export function orderProgress(order: Order): OrderProgress {
  const progress: OrderProgress = { unfinished: 0, ready: 0, delivered: 0, cancelled: 0, total: order.items.length };
  for (const item of order.items) progress[itemSummaryGroup(item)] += 1;
  return progress;
}

/** An order is closed when every item is delivered or cancelled. */
export function isOrderClosed(order: Order): boolean {
  const p = orderProgress(order);
  return p.total > 0 && p.delivered + p.cancelled === p.total;
}

export function itemDeliveredAt(item: OrderItem): string | null {
  if (item.cancelled || stageGroup(item.stages, item.stageKey) !== 'delivered') return null;
  const last = item.stageHistory[item.stageHistory.length - 1];
  return last ? last.at : null;
}

/** When the last item was delivered or cancelled; null while the order is open. */
export function orderClosedAt(order: Order): string | null {
  if (!isOrderClosed(order)) return null;
  let latest: string | null = null;
  for (const item of order.items) {
    const at = item.cancelled ? item.cancelled.at : itemDeliveredAt(item);
    if (at && (latest === null || at > latest)) latest = at;
  }
  return latest;
}
```

`packages/domain/src/payments.ts`:

```ts
import type { Order, Payment } from './model';
import type { Poisha } from './money';
import { orderTotal } from './orders';

function effectSign(payment: Payment, all: Payment[]): number {
  if (payment.kind === 'refund') return -1;
  if (payment.kind === 'correction') {
    const target = all.find((p) => p.id === payment.corrects);
    return target?.kind === 'refund' ? -1 : 1;
  }
  return 1;
}

/** Money actually held for the order: payments and advances, minus refunds, with corrections applied. */
export function netPaid(payments: Payment[]): Poisha {
  return payments.reduce((sum, p) => sum + effectSign(p, payments) * p.amount, 0);
}

/** The amount a payment stands at after all corrections to it. */
export function correctedAmount(payments: Payment[], paymentId: string): Poisha {
  const original = payments.find((p) => p.id === paymentId);
  if (!original) throw new Error(`Unknown payment: ${paymentId}`);
  return payments
    .filter((p) => p.kind === 'correction' && p.corrects === paymentId)
    .reduce((sum, p) => sum + p.amount, original.amount);
}

/** Positive: customer owes this much. Negative: the shop owes the customer (credit due). */
export function balanceDue(order: Order): Poisha {
  return orderTotal(order) - netPaid(order.payments);
}

export interface MoneySummary {
  total: Poisha;
  paid: Poisha;
  balance: Poisha;
  creditDue: Poisha;
}

export function moneySummary(order: Order): MoneySummary {
  const total = orderTotal(order);
  const paid = netPaid(order.payments);
  const balance = total - paid;
  return { total, paid, balance: Math.max(0, balance), creditDue: Math.max(0, -balance) };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/orders.test.ts src/payments.test.ts`

Expected: PASS, 15 tests.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/model.ts packages/domain/src/orders.ts packages/domain/src/payments.ts packages/domain/src/orders.test.ts packages/domain/src/payments.test.ts packages/domain/src/testing/fixtures.ts
git commit -m "feat(domain): add shop model with derived totals and balances"
```

### Task 10: Event log and customer events

Introduces the event model that is the source of truth: every change is an event with a device-generated id. `applyEvent` makes re-sent events no-ops and turns stale edits into conflicts. This task handles customer, household and measurement events; orders and payments follow in the next two tasks.

**Files:**
- Create: `packages/domain/src/events.ts`
- Create: `packages/domain/src/reduceCustomers.ts`
- Create: `packages/domain/src/apply.ts`
- Modify: `packages/domain/src/testing/fixtures.ts`
- Test: `packages/domain/src/reduceCustomers.test.ts`

**Interfaces:**
- Consumes: `ShopState`, `Customer`, `Discount`, `OrderItem`, `Payment`, `emptyState` from `model.ts`; `profileKey`, `MeasurementVersion`, `MeasurementSnapshot`; `Poisha`; `Stage`; `Label`.
- Produces:
  - `events.ts`: `EventMeta { id; at; deviceId; staffId }`, `NewCustomer`, `NewOrderItem`, `NewOrder`, `CustomerChanges`, `ItemChanges`, `EventBody` (union of 15 event types), `DomainEvent = EventMeta & EventBody`, `EventType`, `EDIT_EVENT_TYPES`, `EditEvent`, `isEditEvent(event)`, `Step`, `applied(state)`, `rejected(reason)`, `stale(currentVersion)`
  - `apply.ts`: `ApplyOutcome` (`'applied' | 'duplicate' | 'conflict' | 'rejected'` kinds), `applyEvent(state, event): ApplyOutcome`, `replay(events, initial = emptyState()): { state; outcomes }`
  - `reduceCustomers.ts`: `reduceCustomerEvent(state, event): Step`
  - `testing/fixtures.ts` adds: `eventFactory(deviceId = 'dev-A', staffId = 'staff-owner')`, `newCustomer(overrides)`, `newOrderItem(overrides)`, `newOrder(overrides)`

- [ ] **Step 1: Extend the test fixtures with event builders**

Replace the whole of `packages/domain/src/testing/fixtures.ts` with:

```ts
import type { DomainEvent, EventBody, EventMeta, NewCustomer, NewOrder, NewOrderItem } from '../events';
import type { Order, OrderItem, Payment } from '../model';
import { STANDARD_STAGES } from '../templates';

/** A fixed moment used by tests: 3 Oct 2026, 10:00 in Dhaka. */
export const T0 = '2026-10-03T04:00:00.000Z';

export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'i1',
    templateId: 'shirt',
    garmentName: { bn: 'শার্ট', en: 'Shirt' },
    price: 70000,
    wearer: null,
    measurements: null,
    designNotes: '',
    fabricNote: '',
    photoIds: [],
    stages: STANDARD_STAGES,
    stageKey: 'booked',
    stageHistory: [],
    assignedTo: null,
    trialDate: null,
    deliveryDate: null,
    adjustments: [],
    cancelled: null,
    version: 1,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    number: 'A-0001',
    customerId: 'c1',
    branchId: 'main',
    createdAt: T0,
    createdBy: 'staff-owner',
    updatedAt: T0,
    notes: '',
    discount: null,
    priceAdjustments: [],
    items: [makeItem()],
    payments: [],
    links: [],
    version: 1,
    ...overrides,
  };
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    amount: 100000,
    method: 'cash',
    reference: '',
    kind: 'advance',
    corrects: null,
    reason: '',
    at: T0,
    by: 'staff-owner',
    ...overrides,
  };
}

/** The spec example: two shirts (৳700 each) and a panjabi (৳1,000), total ৳2,400. */
export function spec54Order(overrides: Partial<Order> = {}): Order {
  return makeOrder({
    items: [
      makeItem({ id: 'shirt-1' }),
      makeItem({ id: 'shirt-2' }),
      makeItem({ id: 'panjabi-1', templateId: 'panjabi', garmentName: { bn: 'পাঞ্জাবি', en: 'Panjabi' }, price: 100000 }),
    ],
    ...overrides,
  });
}

export function eventFactory(deviceId = 'dev-A', staffId = 'staff-owner') {
  let n = 0;
  return (body: EventBody, overrides: Partial<EventMeta> = {}): DomainEvent => {
    n += 1;
    const at = new Date(Date.parse(T0) + n * 60_000).toISOString();
    return { id: `${deviceId}-e${n}`, at, deviceId, staffId, ...body, ...overrides } as DomainEvent;
  };
}

export function newCustomer(overrides: Partial<NewCustomer> = {}): NewCustomer {
  return {
    id: 'c1',
    name: 'রহিম উদ্দিন',
    nameAlt: 'Rahim Uddin',
    phone: '01712345678',
    householdId: null,
    gender: 'male',
    notes: '',
    ...overrides,
  };
}

export function newOrderItem(overrides: Partial<NewOrderItem> = {}): NewOrderItem {
  return {
    id: 'i1',
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
    deliveryDate: null,
    ...overrides,
  };
}

export function newOrder(overrides: Partial<NewOrder> = {}): NewOrder {
  return {
    id: 'o1',
    number: 'A-0001',
    customerId: 'c1',
    branchId: 'main',
    notes: '',
    discount: null,
    items: [newOrderItem()],
    ...overrides,
  };
}
```

- [ ] **Step 2: Write the failing test**

`packages/domain/src/reduceCustomers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import { snapshotOf } from './measurements';
import { emptyState } from './model';
import { eventFactory, newCustomer } from './testing/fixtures';

const version = (id: string, chest: number) => ({
  id,
  takenAt: '2026-10-03T04:00:00.000Z',
  takenBy: 'staff-owner',
  source: 'body' as const,
  notes: '',
  values: { chest: { value: chest, unit: 'inch' as const } },
});

describe('customer events', () => {
  it('creates a customer at version 1 with the event time', () => {
    const ev = eventFactory();
    const created = ev({ type: 'customer.created', customer: newCustomer() });
    const { state } = replay([created]);
    expect(state.customers.c1).toMatchObject({ name: 'রহিম উদ্দিন', version: 1, createdAt: created.at });
  });

  it('rejects duplicate ids and empty names', () => {
    const ev = eventFactory();
    const { outcomes } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.created', customer: newCustomer({ id: 'c2', name: '  ' }) }),
    ]);
    expect(outcomes.map((o) => o.reason ?? o.outcome)).toEqual(['applied', 'customer-exists', 'name-required']);
  });

  it('allows two customers with the same phone number, never merging them', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'household.created', household: { id: 'h1', label: 'Uddin family' } }),
      ev({ type: 'customer.created', customer: newCustomer({ householdId: 'h1' }) }),
      ev({ type: 'customer.created', customer: newCustomer({ id: 'c2', name: 'সাকিব', householdId: 'h1' }) }),
    ]);
    expect(Object.keys(state.customers)).toEqual(['c1', 'c2']);
    expect(state.customers.c2!.householdId).toBe('h1');
  });

  it('applies an edit based on the current version and bumps the version', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01812000000' } }),
    ]);
    expect(state.customers.c1).toMatchObject({ phone: '01812000000', version: 2 });
  });

  it('reports a stale edit as a conflict without changing state', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { name: 'Rahim' } }),
    ]);
    const result = applyEvent(state, ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '0' } }));
    expect(result.kind).toBe('conflict');
    expect(result.kind === 'conflict' && result.currentVersion).toBe(2);
    expect(result.state).toBe(state);
  });

  it('rejects unknown households', () => {
    const ev = eventFactory();
    const result = applyEvent(emptyState(), ev({ type: 'customer.created', customer: newCustomer({ householdId: 'nope' }) }));
    expect(result.kind === 'rejected' && result.reason).toBe('unknown-household');
  });
});

describe('measurement events', () => {
  it('appends versions to the profile for that customer and garment', () => {
    const ev = eventFactory();
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v2', 40) }),
    ]);
    expect(state.profiles['c1:shirt']!.versions.map((v) => v.id)).toEqual(['v1', 'v2']);
  });

  it('does not change a snapshot already taken when a newer version is recorded', () => {
    const ev = eventFactory();
    const first = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
    ]).state;
    const snapshot = snapshotOf(first.profiles['c1:shirt']!.versions[0]!);
    replay([ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v2', 42) })], first);
    expect(snapshot.values.chest!.value).toBe(38);
  });

  it('rejects unknown customers, invalid values and repeated version ids', () => {
    const ev = eventFactory();
    const { outcomes } = replay([
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 0) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
      ev({ type: 'measurement.recorded', customerId: 'c1', templateId: 'shirt', version: version('v1', 38) }),
    ]);
    expect(outcomes.map((o) => o.reason ?? o.outcome)).toEqual([
      'unknown-customer',
      'applied',
      'invalid-measurement',
      'applied',
      'version-exists',
    ]);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/reduceCustomers.test.ts`

Expected: FAIL with `Error: Cannot find module './apply'`.

- [ ] **Step 4: Write the implementation**

`packages/domain/src/events.ts`:

```ts
import type { Label } from './label';
import type { MeasurementSnapshot, MeasurementVersion } from './measurements';
import type { Customer, Discount, OrderItem, Payment, ShopState } from './model';
import type { Poisha } from './money';
import type { Stage } from './stages';

/** Who made a change, where, and when. The id is generated on the device and makes re-sending safe. */
export interface EventMeta {
  id: string;
  at: string;
  deviceId: string;
  staffId: string;
}

export type NewCustomer = Omit<Customer, 'createdAt' | 'version'>;

export interface NewOrderItem {
  id: string;
  templateId: string;
  garmentName: Label;
  price: Poisha;
  wearer: string | null;
  measurements: MeasurementSnapshot | null;
  designNotes: string;
  fabricNote: string;
  photoIds: string[];
  stages: Stage[];
  assignedTo: string | null;
  trialDate: string | null;
  deliveryDate: string | null;
}

export interface NewOrder {
  id: string;
  number: string;
  customerId: string;
  branchId: string;
  notes: string;
  discount: Discount | null;
  items: NewOrderItem[];
}

export type CustomerChanges = Partial<Pick<Customer, 'name' | 'nameAlt' | 'phone' | 'householdId' | 'gender' | 'notes'>>;
export type ItemChanges = Partial<
  Pick<OrderItem, 'price' | 'designNotes' | 'fabricNote' | 'trialDate' | 'deliveryDate' | 'wearer'>
>;

export type EventBody =
  | { type: 'customer.created'; customer: NewCustomer }
  | { type: 'customer.updated'; customerId: string; baseVersion: number; changes: CustomerChanges }
  | { type: 'household.created'; household: { id: string; label: string } }
  | { type: 'measurement.recorded'; customerId: string; templateId: string; version: MeasurementVersion }
  | { type: 'order.created'; order: NewOrder }
  | { type: 'order.discountSet'; orderId: string; baseVersion: number; discount: Discount | null }
  | { type: 'order.priceAdjusted'; orderId: string; adjustment: { id: string; amount: Poisha; reason: string } }
  | { type: 'item.stageChanged'; orderId: string; itemId: string; to: string; reason: string }
  | { type: 'item.assigned'; orderId: string; itemId: string; baseVersion: number; assigneeId: string | null }
  | { type: 'item.updated'; orderId: string; itemId: string; baseVersion: number; changes: ItemChanges }
  | { type: 'item.adjustmentAdded'; orderId: string; itemId: string; adjustment: { id: string; note: string } }
  | { type: 'item.cancelled'; orderId: string; itemId: string; reason: string }
  | { type: 'payment.recorded'; orderId: string; payment: Omit<Payment, 'at' | 'by'> }
  | { type: 'link.created'; orderId: string; token: string }
  | { type: 'link.revoked'; orderId: string; token: string };

export type DomainEvent = EventMeta & EventBody;
export type EventType = EventBody['type'];

/**
 * Edit events change an existing record and carry the version they were based on.
 * Everything else only adds information and always applies when valid.
 */
export const EDIT_EVENT_TYPES = ['customer.updated', 'order.discountSet', 'item.assigned', 'item.updated'] as const;

export type EditEvent = Extract<DomainEvent, { type: (typeof EDIT_EVENT_TYPES)[number] }>;

export function isEditEvent(event: DomainEvent): event is EditEvent {
  return (EDIT_EVENT_TYPES as readonly string[]).includes(event.type);
}

/** Result of one reducer step. */
export type Step =
  | { ok: true; state: ShopState }
  | { ok: false; conflict: true; currentVersion: number }
  | { ok: false; conflict: false; reason: string };

export const applied = (state: ShopState): Step => ({ ok: true, state });
export const rejected = (reason: string): Step => ({ ok: false, conflict: false, reason });
export const stale = (currentVersion: number): Step => ({ ok: false, conflict: true, currentVersion });
```

`packages/domain/src/reduceCustomers.ts`:

```ts
import { applied, rejected, stale, type DomainEvent, type Step } from './events';
import { profileKey } from './measurements';
import type { ShopState } from './model';

type CustomerEvent = Extract<
  DomainEvent,
  { type: 'customer.created' | 'customer.updated' | 'household.created' | 'measurement.recorded' }
>;

export function reduceCustomerEvent(state: ShopState, event: CustomerEvent): Step {
  switch (event.type) {
    case 'customer.created': {
      const { customer } = event;
      if (state.customers[customer.id]) return rejected('customer-exists');
      if (!customer.name.trim()) return rejected('name-required');
      if (customer.householdId && !state.households[customer.householdId]) return rejected('unknown-household');
      return applied({
        ...state,
        customers: { ...state.customers, [customer.id]: { ...customer, createdAt: event.at, version: 1 } },
      });
    }

    case 'customer.updated': {
      const current = state.customers[event.customerId];
      if (!current) return rejected('unknown-customer');
      if (current.version !== event.baseVersion) return stale(current.version);
      if (event.changes.name !== undefined && !event.changes.name.trim()) return rejected('name-required');
      if (event.changes.householdId && !state.households[event.changes.householdId]) {
        return rejected('unknown-household');
      }
      return applied({
        ...state,
        customers: {
          ...state.customers,
          [current.id]: { ...current, ...event.changes, version: current.version + 1 },
        },
      });
    }

    case 'household.created': {
      const { household } = event;
      if (state.households[household.id]) return rejected('household-exists');
      if (!household.label.trim()) return rejected('label-required');
      return applied({
        ...state,
        households: { ...state.households, [household.id]: { ...household, createdAt: event.at } },
      });
    }

    case 'measurement.recorded': {
      if (!state.customers[event.customerId]) return rejected('unknown-customer');
      const values = Object.values(event.version.values);
      if (values.some((v) => !Number.isFinite(v.value) || v.value <= 0)) return rejected('invalid-measurement');
      const key = profileKey(event.customerId, event.templateId);
      const profile = state.profiles[key] ?? { customerId: event.customerId, templateId: event.templateId, versions: [] };
      if (profile.versions.some((v) => v.id === event.version.id)) return rejected('version-exists');
      return applied({
        ...state,
        profiles: { ...state.profiles, [key]: { ...profile, versions: [...profile.versions, event.version] } },
      });
    }
  }
}
```

`packages/domain/src/apply.ts` (create; order and payment events are routed in Tasks 11 and 12):

```ts
import { rejected, type DomainEvent, type Step } from './events';
import { emptyState, type ShopState } from './model';
import { reduceCustomerEvent } from './reduceCustomers';

export type ApplyOutcome =
  | { kind: 'applied'; state: ShopState }
  | { kind: 'duplicate'; state: ShopState }
  | { kind: 'conflict'; state: ShopState; currentVersion: number }
  | { kind: 'rejected'; state: ShopState; reason: string };

function reduce(state: ShopState, event: DomainEvent): Step {
  switch (event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
    case 'measurement.recorded':
      return reduceCustomerEvent(state, event);
    default:
      return rejected('unsupported-event');
  }
}

/**
 * Applies one event. An event id that was already applied is a no-op, so
 * re-sending the same events never duplicates orders or payments.
 * On conflict or rejection the state is returned unchanged.
 */
export function applyEvent(state: ShopState, event: DomainEvent): ApplyOutcome {
  if (state.appliedEventIds[event.id]) return { kind: 'duplicate', state };
  const step = reduce(state, event);
  if (step.ok) {
    return { kind: 'applied', state: { ...step.state, appliedEventIds: { ...step.state.appliedEventIds, [event.id]: true } } };
  }
  if (step.conflict) return { kind: 'conflict', state, currentVersion: step.currentVersion };
  return { kind: 'rejected', state, reason: step.reason };
}

export interface ReplayResult {
  state: ShopState;
  outcomes: Array<{ eventId: string; outcome: ApplyOutcome['kind']; reason?: string }>;
}

/** Rebuilds state from a list of events, starting from an empty shop unless a state is given. */
export function replay(events: DomainEvent[], initial: ShopState = emptyState()): ReplayResult {
  let state = initial;
  const outcomes: ReplayResult['outcomes'] = [];
  for (const event of events) {
    const result = applyEvent(state, event);
    state = result.state;
    outcomes.push(
      result.kind === 'rejected'
        ? { eventId: event.id, outcome: result.kind, reason: result.reason }
        : { eventId: event.id, outcome: result.kind },
    );
  }
  return { state, outcomes };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/reduceCustomers.test.ts`

Expected: PASS, 9 tests.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/events.ts packages/domain/src/reduceCustomers.ts packages/domain/src/reduceCustomers.test.ts packages/domain/src/apply.ts packages/domain/src/testing/fixtures.ts
git commit -m "feat(domain): add event log with customer and measurement events"
```

### Task 11: Order and garment events

Order creation, stage moves (skips, rework with reason), worker assignment, item edits, fitting adjustments, cancellation, discounts, price adjustments and status links. Items keep their own copy of the stages, so later template edits never change existing orders.

**Files:**
- Create: `packages/domain/src/reduceOrders.ts`
- Modify: `packages/domain/src/apply.ts`
- Test: `packages/domain/src/reduceOrders.test.ts`

**Interfaces:**
- Consumes: `applied`, `rejected`, `stale`, `DomainEvent`, `NewOrderItem`, `Step` from `events.ts`; `subtotal`, `adjustmentsTotal`; `checkTransition`, `stageGroup`, `validateStages`; `isPoisha`.
- Produces:
  - `reduceOrders.ts`: `reduceOrderEvent(state, event): Step`
  - `apply.ts` now routes every non-customer event except `payment.recorded` to `reduceOrderEvent`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/reduceOrders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import type { DomainEvent } from './events';
import type { ShopState } from './model';
import { orderProgress, orderTotal } from './orders';
import { ALTERATION_STAGES } from './templates';
import { eventFactory, newCustomer, newOrder, newOrderItem } from './testing/fixtures';

/** A shop with customer c1 and the spec example order o1 (two shirts and a panjabi). */
function shopWithOrder() {
  const ev = eventFactory();
  const { state } = replay([
    ev({ type: 'customer.created', customer: newCustomer() }),
    ev({
      type: 'order.created',
      order: newOrder({
        items: [
          newOrderItem({ id: 'shirt-1' }),
          newOrderItem({ id: 'shirt-2' }),
          newOrderItem({ id: 'panjabi-1', templateId: 'panjabi', price: 100000 }),
        ],
      }),
    }),
  ]);
  return { ev, state };
}

function run(state: ShopState, events: DomainEvent[]) {
  return replay(events, state);
}

function reasons(result: ReturnType<typeof replay>) {
  return result.outcomes.map((o) => o.reason ?? o.outcome);
}

describe('order.created', () => {
  it('creates the order with every item at its first stage', () => {
    const { state } = shopWithOrder();
    const order = state.orders.o1!;
    expect(order.number).toBe('A-0001');
    expect(order.items.map((i) => i.stageKey)).toEqual(['booked', 'booked', 'booked']);
    expect(orderTotal(order)).toBe(240000);
  });

  it('rejects invalid orders', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.created', order: newOrder() }),
      ev({ type: 'order.created', order: newOrder({ id: 'o2' }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o3', number: 'A-0003', customerId: 'nobody' }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o4', number: 'A-0004', items: [] }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o5', number: 'A-0005', items: [newOrderItem({ price: 10.5 })] }) }),
      ev({ type: 'order.created', order: newOrder({ id: 'o6', number: 'A-0006', items: [newOrderItem({ stages: [] })] }) }),
      ev({
        type: 'order.created',
        order: newOrder({ id: 'o7', number: 'A-0007', discount: { amount: 80000, reason: 'too much' } }),
      }),
      ev({
        type: 'order.created',
        order: newOrder({ id: 'o8', number: 'A-0008', items: [newOrderItem(), newOrderItem()] }),
      }),
    ]);
    expect(reasons(result)).toEqual([
      'order-exists',
      'number-taken',
      'unknown-customer',
      'no-items',
      'invalid-price',
      'invalid-stages',
      'discount-exceeds-subtotal',
      'duplicate-item',
    ]);
  });
});

describe('stage changes', () => {
  it('moves items forward and records history with who and when', () => {
    const { ev, state } = shopWithOrder();
    const move = ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' });
    const item = run(state, [move]).state.orders.o1!.items[0]!;
    expect(item.stageKey).toBe('cutting');
    expect(item.stageHistory).toEqual([
      { from: 'booked', to: 'cutting', at: move.at, by: 'staff-owner', kind: 'forward', reason: '' },
    ]);
  });

  it('allows skipping the optional trial stage', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'stitching', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'ready', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'applied', 'applied']);
    expect(orderProgress(result.state.orders.o1!)).toMatchObject({ unfinished: 2, ready: 1 });
  });

  it('requires a reason for rework and rejects invalid moves', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'stitching', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'booked', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to: 'booked', reason: 'collar redo' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'nope', to: 'cutting', reason: '' }),
      ev({ type: 'item.stageChanged', orderId: 'nope', itemId: 'shirt-1', to: 'cutting', reason: '' }),
    ]);
    expect(reasons(result)).toEqual([
      'skips-required',
      'applied',
      'reason-required',
      'applied',
      'unknown-item',
      'unknown-order',
    ]);
    expect(result.state.orders.o1!.items[0]!.stageHistory[1]).toMatchObject({ kind: 'rework', reason: 'collar redo' });
  });

  it('keeps the order open when one garment is delivered', () => {
    const { ev, state } = shopWithOrder();
    const steps = ['cutting', 'stitching', 'ready', 'delivered'].map((to) =>
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to, reason: '' }),
    );
    const order = run(state, steps).state.orders.o1!;
    expect(orderProgress(order)).toEqual({ unfinished: 2, ready: 0, delivered: 1, cancelled: 0, total: 3 });
  });

  it('uses the stages copied onto the item, not the current template', () => {
    const ev = eventFactory();
    const result = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'order.created', order: newOrder({ items: [newOrderItem({ templateId: 'alteration', stages: ALTERATION_STAGES })] }) }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'working', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'applied', 'applied']);
  });
});

describe('item edits', () => {
  it('assigns a worker when based on the current version', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.assigned', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, assigneeId: 'tailor-1' }),
    ]);
    expect(result.state.orders.o1!.items[0]).toMatchObject({ assignedTo: 'tailor-1', version: 2 });
  });

  it('turns a stale edit into a conflict', () => {
    const { ev, state } = shopWithOrder();
    const first = run(state, [
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, changes: { deliveryDate: '2026-10-10' } }),
    ]).state;
    const result = applyEvent(
      first,
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'shirt-1', baseVersion: 1, changes: { deliveryDate: '2026-10-12' } }),
    );
    expect(result).toMatchObject({ kind: 'conflict', currentVersion: 2 });
    expect(result.state.orders.o1!.items[0]!.deliveryDate).toBe('2026-10-10');
  });

  it('records fitting adjustments without touching measurements', () => {
    const { ev, state } = shopWithOrder();
    const item = run(state, [
      ev({ type: 'item.adjustmentAdded', orderId: 'o1', itemId: 'shirt-1', adjustment: { id: 'a1', note: 'চেস্ট ½ ঢিলা' } }),
    ]).state.orders.o1!.items[0]!;
    expect(item.adjustments).toEqual([{ id: 'a1', note: 'চেস্ট ½ ঢিলা', at: expect.any(String), by: 'staff-owner' }]);
    expect(item.measurements).toBeNull();
  });

  it('rejects price edits that would leave the discount above the subtotal', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.discountSet', orderId: 'o1', baseVersion: 1, discount: { amount: 200000, reason: 'r' } }),
      ev({ type: 'item.updated', orderId: 'o1', itemId: 'panjabi-1', baseVersion: 1, changes: { price: 0 } }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'discount-exceeds-subtotal']);
  });
});

describe('cancellation', () => {
  it('cancels an item with a reason and removes it from the total', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: '' }),
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: 'customer changed mind' }),
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'panjabi-1', to: 'cutting', reason: '' }),
    ]);
    expect(reasons(result)).toEqual(['reason-required', 'applied', 'item-cancelled']);
    expect(orderTotal(result.state.orders.o1!)).toBe(140000);
  });

  it('cannot cancel a delivered item', () => {
    const { ev, state } = shopWithOrder();
    const steps = ['cutting', 'stitching', 'ready', 'delivered'].map((to) =>
      ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'shirt-1', to, reason: '' }),
    );
    const result = run(state, [...steps, ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'shirt-1', reason: 'r' })]);
    expect(reasons(result).at(-1)).toBe('already-delivered');
  });
});

describe('discounts and price adjustments', () => {
  it('sets a discount on the current version', () => {
    const { ev, state } = shopWithOrder();
    const order = run(state, [
      ev({ type: 'order.discountSet', orderId: 'o1', baseVersion: 1, discount: { amount: 20000, reason: 'regular' } }),
    ]).state.orders.o1!;
    expect(orderTotal(order)).toBe(220000);
    expect(order.version).toBe(2);
  });

  it('adds signed price adjustments with reasons', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a1', amount: 15000, reason: 'extra embroidery' } }),
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a2', amount: -5000, reason: '' } }),
      ev({ type: 'order.priceAdjusted', orderId: 'o1', adjustment: { id: 'a3', amount: -999999, reason: 'r' } }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'reason-required', 'total-negative']);
    expect(orderTotal(result.state.orders.o1!)).toBe(255000);
  });
});

describe('status links', () => {
  it('creates and revokes links', () => {
    const { ev, state } = shopWithOrder();
    const result = run(state, [
      ev({ type: 'link.created', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.created', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'tok1' }),
      ev({ type: 'link.revoked', orderId: 'o1', token: 'nope' }),
    ]);
    expect(reasons(result)).toEqual(['applied', 'link-exists', 'applied', 'already-revoked', 'unknown-link']);
    expect(result.state.orders.o1!.links[0]!.revokedAt).not.toBeNull();
  });

  it('stamps updatedAt with the time of the last change', () => {
    const { ev, state } = shopWithOrder();
    const last = ev({ type: 'link.created', orderId: 'o1', token: 'tok1' });
    expect(run(state, [last]).state.orders.o1!.updatedAt).toBe(last.at);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/reduceOrders.test.ts`

Expected: FAIL because the tests get `unsupported-event` outcomes: `apply.ts` does not route order events yet.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/reduceOrders.ts`:

```ts
import { applied, rejected, stale, type DomainEvent, type NewOrderItem, type Step } from './events';
import type { Order, OrderItem, ShopState } from './model';
import { isPoisha } from './money';
import { adjustmentsTotal, subtotal } from './orders';
import { checkTransition, stageGroup, validateStages } from './stages';

type OrderEvent = Extract<
  DomainEvent,
  {
    type:
      | 'order.created'
      | 'order.discountSet'
      | 'order.priceAdjusted'
      | 'item.stageChanged'
      | 'item.assigned'
      | 'item.updated'
      | 'item.adjustmentAdded'
      | 'item.cancelled'
      | 'link.created'
      | 'link.revoked';
  }
>;

type ItemEvent = Extract<OrderEvent, { itemId: string }>;

/** Stores an order, stamping updatedAt with the event time. */
function save(state: ShopState, order: Order, at: string): Step {
  return applied({ ...state, orders: { ...state.orders, [order.id]: { ...order, updatedAt: at } } });
}

function replaceItem(order: Order, item: OrderItem): Order {
  return { ...order, items: order.items.map((i) => (i.id === item.id ? item : i)) };
}

function newItem(input: NewOrderItem): OrderItem {
  return {
    ...input,
    stageKey: input.stages[0]!.key,
    stageHistory: [],
    adjustments: [],
    cancelled: null,
    version: 1,
  };
}

function validateNewItem(input: NewOrderItem): string | null {
  if (!isPoisha(input.price) || input.price < 0) return 'invalid-price';
  if (validateStages(input.stages).length > 0) return 'invalid-stages';
  return null;
}

export function reduceOrderEvent(state: ShopState, event: OrderEvent): Step {
  if (event.type === 'order.created') return createOrder(state, event);

  const order = state.orders[event.orderId];
  if (!order) return rejected('unknown-order');

  switch (event.type) {
    case 'order.discountSet': {
      if (order.version !== event.baseVersion) return stale(order.version);
      const amount = event.discount?.amount ?? 0;
      if (!isPoisha(amount) || amount < 0) return rejected('invalid-amount');
      if (amount > subtotal(order)) return rejected('discount-exceeds-subtotal');
      return save(state, { ...order, discount: event.discount, version: order.version + 1 }, event.at);
    }

    case 'order.priceAdjusted': {
      const { adjustment } = event;
      if (!isPoisha(adjustment.amount) || adjustment.amount === 0) return rejected('invalid-amount');
      if (!adjustment.reason.trim()) return rejected('reason-required');
      if (order.priceAdjustments.some((a) => a.id === adjustment.id)) return rejected('adjustment-exists');
      const totalAfter = subtotal(order) - (order.discount?.amount ?? 0) + adjustmentsTotal(order) + adjustment.amount;
      if (totalAfter < 0) return rejected('total-negative');
      const added = { ...adjustment, at: event.at, by: event.staffId };
      return save(state, { ...order, priceAdjustments: [...order.priceAdjustments, added] }, event.at);
    }

    case 'link.created': {
      if (!event.token.trim()) return rejected('token-required');
      if (order.links.some((l) => l.token === event.token)) return rejected('link-exists');
      const link = { token: event.token, createdAt: event.at, revokedAt: null };
      return save(state, { ...order, links: [...order.links, link] }, event.at);
    }

    case 'link.revoked': {
      const link = order.links.find((l) => l.token === event.token);
      if (!link) return rejected('unknown-link');
      if (link.revokedAt) return rejected('already-revoked');
      const links = order.links.map((l) => (l.token === event.token ? { ...l, revokedAt: event.at } : l));
      return save(state, { ...order, links }, event.at);
    }

    default:
      return reduceItemEvent(state, order, event);
  }
}

function createOrder(state: ShopState, event: Extract<OrderEvent, { type: 'order.created' }>): Step {
  const input = event.order;
  if (state.orders[input.id]) return rejected('order-exists');
  if (Object.values(state.orders).some((o) => o.number === input.number)) return rejected('number-taken');
  if (!state.customers[input.customerId]) return rejected('unknown-customer');
  if (input.items.length === 0) return rejected('no-items');
  if (new Set(input.items.map((i) => i.id)).size !== input.items.length) return rejected('duplicate-item');
  for (const item of input.items) {
    const problem = validateNewItem(item);
    if (problem) return rejected(problem);
  }

  const order: Order = {
    id: input.id,
    number: input.number,
    customerId: input.customerId,
    branchId: input.branchId,
    createdAt: event.at,
    createdBy: event.staffId,
    updatedAt: event.at,
    notes: input.notes,
    discount: input.discount,
    priceAdjustments: [],
    items: input.items.map(newItem),
    payments: [],
    links: [],
    version: 1,
  };
  const discount = input.discount?.amount ?? 0;
  if (!isPoisha(discount) || discount < 0) return rejected('invalid-amount');
  if (discount > subtotal(order)) return rejected('discount-exceeds-subtotal');
  return save(state, order, event.at);
}

function reduceItemEvent(state: ShopState, order: Order, event: ItemEvent): Step {
  const item = order.items.find((i) => i.id === event.itemId);
  if (!item) return rejected('unknown-item');

  if (event.type === 'item.assigned' || event.type === 'item.updated') {
    if (item.version !== event.baseVersion) return stale(item.version);
  }
  if (item.cancelled) return rejected('item-cancelled');

  switch (event.type) {
    case 'item.stageChanged': {
      const check = checkTransition(item.stages, item.stageKey, event.to);
      if (!check.ok) return rejected(check.reason);
      if (check.kind === 'rework' && !event.reason.trim()) return rejected('reason-required');
      const change = {
        from: item.stageKey,
        to: event.to,
        at: event.at,
        by: event.staffId,
        kind: check.kind,
        reason: event.reason,
      };
      const moved = { ...item, stageKey: event.to, stageHistory: [...item.stageHistory, change] };
      return save(state, replaceItem(order, moved), event.at);
    }

    case 'item.assigned': {
      const assigned = { ...item, assignedTo: event.assigneeId, version: item.version + 1 };
      return save(state, replaceItem(order, assigned), event.at);
    }

    case 'item.updated': {
      const { price } = event.changes;
      if (price !== undefined && (!isPoisha(price) || price < 0)) return rejected('invalid-price');
      const updated = { ...item, ...event.changes, version: item.version + 1 };
      const next = replaceItem(order, updated);
      if ((order.discount?.amount ?? 0) > subtotal(next)) return rejected('discount-exceeds-subtotal');
      return save(state, next, event.at);
    }

    case 'item.adjustmentAdded': {
      const { adjustment } = event;
      if (!adjustment.note.trim()) return rejected('note-required');
      if (item.adjustments.some((a) => a.id === adjustment.id)) return rejected('adjustment-exists');
      const added = { ...adjustment, at: event.at, by: event.staffId };
      return save(state, replaceItem(order, { ...item, adjustments: [...item.adjustments, added] }), event.at);
    }

    case 'item.cancelled': {
      if (!event.reason.trim()) return rejected('reason-required');
      if (stageGroup(item.stages, item.stageKey) === 'delivered') return rejected('already-delivered');
      const cancelled = { ...item, cancelled: { reason: event.reason, at: event.at, by: event.staffId } };
      return save(state, replaceItem(order, cancelled), event.at);
    }
  }
}
```

`packages/domain/src/apply.ts` (replace the whole file; payments are routed in Task 12):

```ts
import { rejected, type DomainEvent, type Step } from './events';
import { emptyState, type ShopState } from './model';
import { reduceCustomerEvent } from './reduceCustomers';
import { reduceOrderEvent } from './reduceOrders';

export type ApplyOutcome =
  | { kind: 'applied'; state: ShopState }
  | { kind: 'duplicate'; state: ShopState }
  | { kind: 'conflict'; state: ShopState; currentVersion: number }
  | { kind: 'rejected'; state: ShopState; reason: string };

function reduce(state: ShopState, event: DomainEvent): Step {
  switch (event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
    case 'measurement.recorded':
      return reduceCustomerEvent(state, event);
    case 'payment.recorded':
      return rejected('unsupported-event');
    default:
      return reduceOrderEvent(state, event);
  }
}

/**
 * Applies one event. An event id that was already applied is a no-op, so
 * re-sending the same events never duplicates orders or payments.
 * On conflict or rejection the state is returned unchanged.
 */
export function applyEvent(state: ShopState, event: DomainEvent): ApplyOutcome {
  if (state.appliedEventIds[event.id]) return { kind: 'duplicate', state };
  const step = reduce(state, event);
  if (step.ok) {
    return { kind: 'applied', state: { ...step.state, appliedEventIds: { ...step.state.appliedEventIds, [event.id]: true } } };
  }
  if (step.conflict) return { kind: 'conflict', state, currentVersion: step.currentVersion };
  return { kind: 'rejected', state, reason: step.reason };
}

export interface ReplayResult {
  state: ShopState;
  outcomes: Array<{ eventId: string; outcome: ApplyOutcome['kind']; reason?: string }>;
}

/** Rebuilds state from a list of events, starting from an empty shop unless a state is given. */
export function replay(events: DomainEvent[], initial: ShopState = emptyState()): ReplayResult {
  let state = initial;
  const outcomes: ReplayResult['outcomes'] = [];
  for (const event of events) {
    const result = applyEvent(state, event);
    state = result.state;
    outcomes.push(
      result.kind === 'rejected'
        ? { eventId: event.id, outcome: result.kind, reason: result.reason }
        : { eventId: event.id, outcome: result.kind },
    );
  }
  return { state, outcomes };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/reduceOrders.test.ts`

Expected: PASS, 17 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/reduceOrders.ts packages/domain/src/reduceOrders.test.ts packages/domain/src/apply.ts
git commit -m "feat(domain): add order, garment stage and status link events"
```

### Task 12: Payment events

Append-only money: advances, payments, refunds (never more than was paid) and corrections that reference the record they fix. Completes `apply.ts`.

**Files:**
- Create: `packages/domain/src/reducePayments.ts`
- Modify: `packages/domain/src/apply.ts`
- Test: `packages/domain/src/reducePayments.test.ts`
- Test: `packages/domain/src/apply.test.ts`

**Interfaces:**
- Consumes: `applied`, `rejected`, `DomainEvent`, `Step`; `correctedAmount`, `netPaid`; `isPoisha`.
- Produces:
  - `reducePayments.ts`: `reducePaymentEvent(state, event): Step`
  - `apply.ts` final version routing all 15 event types

- [ ] **Step 1: Write the failing tests**

`packages/domain/src/reducePayments.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { replay } from './apply';
import type { Payment } from './model';
import { moneySummary } from './payments';
import { eventFactory, newCustomer, newOrder, newOrderItem } from './testing/fixtures';

type PaymentInput = Omit<Payment, 'at' | 'by'>;

const pay = (overrides: Partial<PaymentInput> = {}): PaymentInput => ({
  id: 'p1',
  amount: 100000,
  method: 'cash',
  reference: '',
  kind: 'advance',
  corrects: null,
  reason: '',
  ...overrides,
});

function shop() {
  const ev = eventFactory();
  const base = [
    ev({ type: 'customer.created', customer: newCustomer() }),
    ev({
      type: 'order.created',
      order: newOrder({
        items: [
          newOrderItem({ id: 'shirt-1' }),
          newOrderItem({ id: 'shirt-2' }),
          newOrderItem({ id: 'panjabi-1', price: 100000 }),
        ],
      }),
    }),
  ];
  return { ev, base };
}

describe('payment.recorded', () => {
  it('records the spec example advance and derives a ৳1,400 balance', () => {
    const { ev, base } = shop();
    const { state } = replay([...base, ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() })]);
    const order = state.orders.o1!;
    expect(order.payments[0]).toMatchObject({ id: 'p1', by: 'staff-owner' });
    expect(moneySummary(order).balance).toBe(140000);
  });

  it('rejects invalid payments', () => {
    const { ev, base } = shop();
    const { outcomes } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'nope', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 0 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 10.5 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ method: 'card' as never }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
    ]);
    expect(outcomes.slice(2).map((o) => o.reason ?? o.outcome)).toEqual([
      'unknown-order',
      'invalid-amount',
      'invalid-amount',
      'invalid-method',
      'applied',
      'payment-exists',
    ]);
  });

  it('only refunds what has been paid, and needs a reason', () => {
    const { ev, base } = shop();
    const { outcomes, state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r1', kind: 'refund', amount: 150000, reason: 'r' }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r2', kind: 'refund', amount: 50000 }) }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'r3', kind: 'refund', amount: 50000, reason: 'r' }) }),
    ]);
    expect(outcomes.slice(3).map((o) => o.reason ?? o.outcome)).toEqual([
      'refund-exceeds-paid',
      'reason-required',
      'applied',
    ]);
    expect(moneySummary(state.orders.o1!).paid).toBe(50000);
  });

  it('corrects a payment with a new record instead of editing it', () => {
    const { ev, base } = shop();
    const { outcomes, state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      ev({
        type: 'payment.recorded',
        orderId: 'o1',
        payment: pay({ id: 'c1', kind: 'correction', corrects: 'p1', amount: -50000, reason: 'typed 1000 not 500' }),
      }),
    ]);
    expect(outcomes.at(-1)!.outcome).toBe('applied');
    const order = state.orders.o1!;
    expect(order.payments.map((p) => p.amount)).toEqual([100000, -50000]);
    expect(moneySummary(order).paid).toBe(50000);
  });

  it('rejects invalid corrections', () => {
    const { ev, base } = shop();
    const correction = (overrides: Partial<PaymentInput>) =>
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ kind: 'correction', reason: 'r', ...overrides }) });
    const { outcomes } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay() }),
      correction({ id: 'c1', corrects: 'nope', amount: -100 }),
      correction({ id: 'c2', corrects: 'p1', amount: 0 }),
      correction({ id: 'c3', corrects: 'p1', amount: -100, reason: '' }),
      correction({ id: 'c4', corrects: 'p1', amount: -200000 }),
      correction({ id: 'c5', corrects: 'p1', amount: -100 }),
      correction({ id: 'c6', corrects: 'c5', amount: -100 }),
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ id: 'p9', corrects: 'p1' }) }),
    ]);
    expect(outcomes.slice(3).map((o) => o.reason ?? o.outcome)).toEqual([
      'invalid-correction-target',
      'invalid-amount',
      'reason-required',
      'correction-below-zero',
      'applied',
      'invalid-correction-target',
      'invalid-correction-target',
    ]);
  });

  it('shows credit due after cancelling an overpaid item', () => {
    const { ev, base } = shop();
    const { state } = replay([
      ...base,
      ev({ type: 'payment.recorded', orderId: 'o1', payment: pay({ amount: 240000 }) }),
      ev({ type: 'item.cancelled', orderId: 'o1', itemId: 'panjabi-1', reason: 'fabric not available' }),
    ]);
    expect(moneySummary(state.orders.o1!)).toEqual({ total: 140000, paid: 240000, balance: 0, creditDue: 100000 });
  });
});
```

`packages/domain/src/apply.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { applyEvent, replay } from './apply';
import { isEditEvent } from './events';
import { emptyState } from './model';
import { eventFactory, newCustomer, newOrder } from './testing/fixtures';

describe('applyEvent', () => {
  it('records applied event ids', () => {
    const ev = eventFactory();
    const event = ev({ type: 'customer.created', customer: newCustomer() });
    const result = applyEvent(emptyState(), event);
    expect(result.kind).toBe('applied');
    expect(result.state.appliedEventIds[event.id]).toBe(true);
  });

  it('treats a repeated event id as a duplicate and changes nothing', () => {
    const ev = eventFactory();
    const payment = ev({
      type: 'payment.recorded',
      orderId: 'o1',
      payment: { id: 'p1', amount: 100000, method: 'cash', reference: '', kind: 'advance', corrects: null, reason: '' },
    });
    const { state } = replay([
      ev({ type: 'customer.created', customer: newCustomer() }),
      ev({ type: 'order.created', order: newOrder() }),
      payment,
    ]);
    const again = applyEvent(state, payment);
    expect(again.kind).toBe('duplicate');
    expect(again.state).toBe(state);
    expect(again.state.orders.o1!.payments).toHaveLength(1);
  });

  it('does not record ids of rejected events, so a fixed retry can apply', () => {
    const ev = eventFactory();
    const event = ev({ type: 'order.created', order: newOrder() });
    const rejected = applyEvent(emptyState(), event);
    expect(rejected.kind).toBe('rejected');
    expect(rejected.state.appliedEventIds[event.id]).toBeUndefined();
  });

  it('replaying the same log twice gives the same state', () => {
    const ev = eventFactory();
    const log = [ev({ type: 'customer.created', customer: newCustomer() }), ev({ type: 'order.created', order: newOrder() })];
    const once = replay(log).state;
    const twice = replay(log, once);
    expect(twice.state).toEqual(once);
    expect(twice.outcomes.map((o) => o.outcome)).toEqual(['duplicate', 'duplicate']);
  });
});

describe('isEditEvent', () => {
  it('identifies edit events', () => {
    const ev = eventFactory();
    expect(isEditEvent(ev({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: {} }))).toBe(true);
    expect(isEditEvent(ev({ type: 'item.assigned', orderId: 'o1', itemId: 'i1', baseVersion: 1, assigneeId: null }))).toBe(true);
    expect(isEditEvent(ev({ type: 'customer.created', customer: newCustomer() }))).toBe(false);
    expect(isEditEvent(ev({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'cutting', reason: '' }))).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/reducePayments.test.ts src/apply.test.ts`

Expected: FAIL because `reducePayments.test.ts` gets `unsupported-event` outcomes; `apply.test.ts` fails on the duplicate-payment case.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/reducePayments.ts`:

```ts
import { applied, rejected, type DomainEvent, type Step } from './events';
import type { ShopState } from './model';
import { isPoisha } from './money';
import { correctedAmount, netPaid } from './payments';

type PaymentEvent = Extract<DomainEvent, { type: 'payment.recorded' }>;

const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

/** Payments are append-only. Mistakes are fixed with a correction record, never by editing. */
export function reducePaymentEvent(state: ShopState, event: PaymentEvent): Step {
  const order = state.orders[event.orderId];
  if (!order) return rejected('unknown-order');

  const { payment } = event;
  if (order.payments.some((p) => p.id === payment.id)) return rejected('payment-exists');
  if (!METHODS.includes(payment.method)) return rejected('invalid-method');
  if (!isPoisha(payment.amount)) return rejected('invalid-amount');

  if (payment.kind === 'correction') {
    const target = order.payments.find((p) => p.id === payment.corrects);
    if (!target || target.kind === 'correction') return rejected('invalid-correction-target');
    if (payment.amount === 0) return rejected('invalid-amount');
    if (!payment.reason.trim()) return rejected('reason-required');
    if (correctedAmount(order.payments, target.id) + payment.amount < 0) return rejected('correction-below-zero');
  } else {
    if (payment.amount <= 0) return rejected('invalid-amount');
    if (payment.corrects !== null) return rejected('invalid-correction-target');
    if (payment.kind === 'refund') {
      if (!payment.reason.trim()) return rejected('reason-required');
      if (payment.amount > netPaid(order.payments)) return rejected('refund-exceeds-paid');
    }
  }

  const recorded = { ...payment, at: event.at, by: event.staffId };
  const updated = { ...order, payments: [...order.payments, recorded], updatedAt: event.at };
  return applied({ ...state, orders: { ...state.orders, [order.id]: updated } });
}
```

`packages/domain/src/apply.ts` (replace the whole file with the final version):

```ts
import type { DomainEvent, Step } from './events';
import { emptyState, type ShopState } from './model';
import { reduceCustomerEvent } from './reduceCustomers';
import { reduceOrderEvent } from './reduceOrders';
import { reducePaymentEvent } from './reducePayments';

export type ApplyOutcome =
  | { kind: 'applied'; state: ShopState }
  | { kind: 'duplicate'; state: ShopState }
  | { kind: 'conflict'; state: ShopState; currentVersion: number }
  | { kind: 'rejected'; state: ShopState; reason: string };

function reduce(state: ShopState, event: DomainEvent): Step {
  switch (event.type) {
    case 'customer.created':
    case 'customer.updated':
    case 'household.created':
    case 'measurement.recorded':
      return reduceCustomerEvent(state, event);
    case 'payment.recorded':
      return reducePaymentEvent(state, event);
    default:
      return reduceOrderEvent(state, event);
  }
}

/**
 * Applies one event. An event id that was already applied is a no-op, so
 * re-sending the same events never duplicates orders or payments.
 * On conflict or rejection the state is returned unchanged.
 */
export function applyEvent(state: ShopState, event: DomainEvent): ApplyOutcome {
  if (state.appliedEventIds[event.id]) return { kind: 'duplicate', state };
  const step = reduce(state, event);
  if (step.ok) {
    return { kind: 'applied', state: { ...step.state, appliedEventIds: { ...step.state.appliedEventIds, [event.id]: true } } };
  }
  if (step.conflict) return { kind: 'conflict', state, currentVersion: step.currentVersion };
  return { kind: 'rejected', state, reason: step.reason };
}

export interface ReplayResult {
  state: ShopState;
  outcomes: Array<{ eventId: string; outcome: ApplyOutcome['kind']; reason?: string }>;
}

/** Rebuilds state from a list of events, starting from an empty shop unless a state is given. */
export function replay(events: DomainEvent[], initial: ShopState = emptyState()): ReplayResult {
  let state = initial;
  const outcomes: ReplayResult['outcomes'] = [];
  for (const event of events) {
    const result = applyEvent(state, event);
    state = result.state;
    outcomes.push(
      result.kind === 'rejected'
        ? { eventId: event.id, outcome: result.kind, reason: result.reason }
        : { eventId: event.id, outcome: result.kind },
    );
  }
  return { state, outcomes };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/reducePayments.test.ts src/apply.test.ts`

Expected: PASS, 11 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/reducePayments.ts packages/domain/src/apply.ts packages/domain/src/reducePayments.test.ts packages/domain/src/apply.test.ts
git commit -m "feat(domain): add append-only payment events"
```

### Task 13: Customer status links

Unguessable tokens, revocation, automatic expiry N days after the order closes, and the exact public projection a customer sees (no measurements, prices, payments, notes or staff).

**Files:**
- Create: `packages/domain/src/links.ts`
- Test: `packages/domain/src/links.test.ts`

**Interfaces:**
- Consumes: `Label`; `Order`, `StatusLink`; `itemSummaryGroup`, `orderClosedAt`; `stageByKey`, `SummaryGroup`.
- Produces:
  - `tokenFromBytes(bytes: Uint8Array): string` (needs 16+ bytes; the web app passes `crypto.getRandomValues(new Uint8Array(16))`)
  - `activeLink(order): StatusLink | null`
  - `type LinkState = 'active' | 'revoked' | 'expired' | 'unknown'`
  - `linkState(order, token, now: string, expiryDays: number): LinkState`
  - `findOrderByToken(orders: Iterable<Order>, token): Order | null`
  - `interface ShopContact { name; phone; address }`, `interface PublicOrderView`
  - `publicOrderView(order, shop: ShopContact): PublicOrderView`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/links.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { activeLink, findOrderByToken, linkState, publicOrderView, tokenFromBytes } from './links';
import { makeItem, makeOrder, makePayment } from './testing/fixtures';

const shop = { name: 'রহমান টেইলার্স', phone: '01755123456', address: 'মিরপুর ১০, ঢাকা' };

const deliveredItem = (at: string) =>
  makeItem({
    stageKey: 'delivered',
    stageHistory: [{ from: 'ready', to: 'delivered', at, by: 'x', kind: 'forward', reason: '' }],
  });

describe('tokenFromBytes', () => {
  it('encodes 16 bytes as 22 URL-safe characters', () => {
    const token = tokenFromBytes(new Uint8Array(16).fill(255));
    expect(token).toHaveLength(22);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('encodes known bytes correctly', () => {
    const bytes = new Uint8Array([0xfb, 0xff, 0x00, ...new Array(13).fill(0)]);
    expect(tokenFromBytes(bytes).slice(0, 4)).toBe('-_8A');
  });

  it('refuses short input', () => {
    expect(() => tokenFromBytes(new Uint8Array(8))).toThrow();
  });
});

describe('link state', () => {
  const now = '2026-10-10T00:00:00.000Z';

  it('finds the active link and the order it belongs to', () => {
    const order = makeOrder({
      links: [
        { token: 'old', createdAt: 'x', revokedAt: 'y' },
        { token: 'new', createdAt: 'x', revokedAt: null },
      ],
    });
    expect(activeLink(order)?.token).toBe('new');
    expect(findOrderByToken([makeOrder({ id: 'other' }), order], 'new')).toBe(order);
    expect(findOrderByToken([order], 'missing')).toBeNull();
  });

  it('reports unknown and revoked links', () => {
    const order = makeOrder({ links: [{ token: 't', createdAt: 'x', revokedAt: '2026-10-05T00:00:00.000Z' }] });
    expect(linkState(order, 'nope', now, 30)).toBe('unknown');
    expect(linkState(order, 't', now, 30)).toBe('revoked');
  });

  it('keeps links active while the order is open', () => {
    const order = makeOrder({ links: [{ token: 't', createdAt: 'x', revokedAt: null }] });
    expect(linkState(order, 't', '2027-01-01T00:00:00.000Z', 30)).toBe('active');
  });

  it('expires links the given number of days after the order closes', () => {
    const order = makeOrder({
      items: [deliveredItem('2026-10-01T00:00:00.000Z')],
      links: [{ token: 't', createdAt: 'x', revokedAt: null }],
    });
    expect(linkState(order, 't', '2026-10-31T00:00:00.000Z', 30)).toBe('active');
    expect(linkState(order, 't', '2026-10-31T00:00:00.001Z', 30)).toBe('expired');
  });
});

describe('publicOrderView', () => {
  it('shows progress and dates but nothing private', () => {
    const order = makeOrder({
      notes: 'customer is difficult',
      payments: [makePayment()],
      items: [
        makeItem({
          stageKey: 'stitching',
          wearer: 'Rahim',
          trialDate: '2026-10-07',
          deliveryDate: '2026-10-10',
          assignedTo: 'tailor-1',
          designNotes: 'secret',
          measurements: { versionId: 'v1', takenAt: 'x', source: 'body', values: { chest: { value: 38, unit: 'inch' } } },
        }),
      ],
    });
    const view = publicOrderView(order, shop);
    expect(view).toEqual({
      shop,
      orderNumber: 'A-0001',
      lastUpdatedAt: order.updatedAt,
      items: [
        {
          garmentName: { bn: 'শার্ট', en: 'Shirt' },
          wearer: 'Rahim',
          group: 'unfinished',
          stageLabel: { bn: 'সেলাই', en: 'Stitching' },
          trialDate: '2026-10-07',
          deliveryDate: '2026-10-10',
        },
      ],
    });
    const serialized = JSON.stringify(view);
    for (const secret of ['customer is difficult', 'secret', 'tailor-1', 'chest', '70000', '100000']) {
      expect(serialized).not.toContain(secret);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/links.test.ts`

Expected: FAIL with `Error: Cannot find module './links'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/links.ts`:

```ts
import type { Label } from './label';
import type { Order, StatusLink } from './model';
import { itemSummaryGroup, orderClosedAt } from './orders';
import { stageByKey, type SummaryGroup } from './stages';

const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Encodes random bytes as an unguessable URL-safe token. Needs at least 16 bytes (128 bits). */
export function tokenFromBytes(bytes: Uint8Array): string {
  if (bytes.length < 16) throw new Error('Status link tokens need at least 16 random bytes');
  let bits = 0;
  let value = 0;
  let token = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 6) {
      bits -= 6;
      token += BASE64URL[(value >> bits) & 63];
    }
  }
  if (bits > 0) token += BASE64URL[(value << (6 - bits)) & 63];
  return token;
}

/** The newest link that has not been revoked. */
export function activeLink(order: Order): StatusLink | null {
  for (let i = order.links.length - 1; i >= 0; i--) {
    const link = order.links[i]!;
    if (!link.revokedAt) return link;
  }
  return null;
}

export type LinkState = 'active' | 'revoked' | 'expired' | 'unknown';

/** Links stop working when revoked, or `expiryDays` after the order is fully delivered or cancelled. */
export function linkState(order: Order, token: string, now: string, expiryDays: number): LinkState {
  const link = order.links.find((l) => l.token === token);
  if (!link) return 'unknown';
  if (link.revokedAt) return 'revoked';
  const closedAt = orderClosedAt(order);
  if (closedAt && Date.parse(now) - Date.parse(closedAt) > expiryDays * DAY_MS) return 'expired';
  return 'active';
}

export function findOrderByToken(orders: Iterable<Order>, token: string): Order | null {
  for (const order of orders) {
    if (order.links.some((l) => l.token === token)) return order;
  }
  return null;
}

export interface ShopContact {
  name: string;
  phone: string;
  address: string;
}

/** Exactly what a customer may see. No measurements, prices, payments, notes or staff. */
export interface PublicOrderView {
  shop: ShopContact;
  orderNumber: string;
  lastUpdatedAt: string;
  items: Array<{
    garmentName: Label;
    wearer: string | null;
    group: SummaryGroup;
    stageLabel: Label;
    trialDate: string | null;
    deliveryDate: string | null;
  }>;
}

export function publicOrderView(order: Order, shop: ShopContact): PublicOrderView {
  return {
    shop: { name: shop.name, phone: shop.phone, address: shop.address },
    orderNumber: order.number,
    lastUpdatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      garmentName: item.garmentName,
      wearer: item.wearer,
      group: itemSummaryGroup(item),
      stageLabel: stageByKey(item.stages, item.stageKey).label,
      trialDate: item.trialDate,
      deliveryDate: item.deliveryDate,
    })),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/links.test.ts`

Expected: PASS, 8 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/links.ts packages/domain/src/links.test.ts
git commit -m "feat(domain): add status link tokens, expiry and public view"
```

### Task 14: Work lists

The dashboard and production lists: trials today, deliveries today, overdue garments, ready for pickup, outstanding balances, and work per worker. Dates use Dhaka time (UTC+6).

**Files:**
- Create: `packages/domain/src/worklists.ts`
- Test: `packages/domain/src/worklists.test.ts`

**Interfaces:**
- Consumes: `Order`, `OrderItem`; `Poisha`; `itemSummaryGroup`; `balanceDue`.
- Produces:
  - `todayInDhaka(now: Date): string` (YYYY-MM-DD)
  - `interface ItemRef { order: Order; item: OrderItem }`
  - `trialsOn(orders, date): ItemRef[]`, `deliveriesOn(orders, date): ItemRef[]`, `overdueItems(orders, today): ItemRef[]`
  - `readyForPickup(orders): Order[]`, `outstandingBalances(orders): Array<{ order; balance }>`
  - `itemsForWorker(orders, workerId: string | null): ItemRef[]`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/worklists.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { makeItem, makeOrder, makePayment } from './testing/fixtures';
import {
  deliveriesOn,
  itemsForWorker,
  outstandingBalances,
  overdueItems,
  readyForPickup,
  todayInDhaka,
  trialsOn,
} from './worklists';

const cancelled = { reason: 'r', at: 'x', by: 'y' };

const orders = [
  makeOrder({
    id: 'o1',
    number: 'A-0001',
    items: [
      makeItem({ id: 'a', stageKey: 'stitching', trialDate: '2026-10-03', deliveryDate: '2026-10-01', assignedTo: 't1' }),
      makeItem({ id: 'b', stageKey: 'ready', deliveryDate: '2026-10-03' }),
      makeItem({ id: 'c', stageKey: 'cutting', deliveryDate: '2026-10-03', cancelled }),
    ],
    payments: [makePayment({ amount: 50000 })],
  }),
  makeOrder({
    id: 'o2',
    number: 'A-0002',
    items: [
      makeItem({ id: 'd', stageKey: 'booked', trialDate: '2026-10-03', deliveryDate: '2026-09-28', assignedTo: null }),
      makeItem({ id: 'e', stageKey: 'delivered', deliveryDate: '2026-09-01' }),
    ],
    payments: [makePayment({ amount: 140000 })],
  }),
];

const ids = (refs: Array<{ item: { id: string } }>) => refs.map((r) => r.item.id);

describe('todayInDhaka', () => {
  it('uses Dhaka time, which is UTC+6', () => {
    expect(todayInDhaka(new Date('2026-10-03T17:59:00.000Z'))).toBe('2026-10-03');
    expect(todayInDhaka(new Date('2026-10-03T18:00:00.000Z'))).toBe('2026-10-04');
  });
});

describe('work lists', () => {
  it('lists unfinished trials for a date', () => {
    expect(ids(trialsOn(orders, '2026-10-03'))).toEqual(['a', 'd']);
  });

  it('lists deliveries due on a date, excluding cancelled and delivered items', () => {
    expect(ids(deliveriesOn(orders, '2026-10-03'))).toEqual(['b']);
  });

  it('lists overdue unfinished items, oldest first', () => {
    expect(ids(overdueItems(orders, '2026-10-03'))).toEqual(['d', 'a']);
  });

  it('lists orders with something ready to collect', () => {
    expect(readyForPickup(orders).map((o) => o.id)).toEqual(['o1']);
  });

  it('lists outstanding balances, largest first', () => {
    expect(outstandingBalances(orders).map((r) => [r.order.id, r.balance])).toEqual([['o1', 90000]]);
  });

  it('lists unfinished work for a worker or unassigned work', () => {
    expect(ids(itemsForWorker(orders, 't1'))).toEqual(['a']);
    expect(ids(itemsForWorker(orders, null))).toEqual(['d']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/worklists.test.ts`

Expected: FAIL with `Error: Cannot find module './worklists'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/worklists.ts`:

```ts
import type { Order, OrderItem } from './model';
import type { Poisha } from './money';
import { itemSummaryGroup } from './orders';
import { balanceDue } from './payments';

/** Bangladesh is UTC+6 with no daylight saving. */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Today's date in Dhaka as YYYY-MM-DD. */
export function todayInDhaka(now: Date): string {
  return new Date(now.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

export interface ItemRef {
  order: Order;
  item: OrderItem;
}

function items(orders: Order[], keep: (item: OrderItem) => boolean): ItemRef[] {
  const refs: ItemRef[] = [];
  for (const order of orders) {
    for (const item of order.items) {
      if (keep(item)) refs.push({ order, item });
    }
  }
  return refs;
}

const byNumber = (a: ItemRef, b: ItemRef) => a.order.number.localeCompare(b.order.number);

/** Unfinished items with a trial on the given date. */
export function trialsOn(orders: Order[], date: string): ItemRef[] {
  return items(orders, (i) => itemSummaryGroup(i) === 'unfinished' && i.trialDate === date).sort(byNumber);
}

/** Items promised for the given date that have not been handed over yet. */
export function deliveriesOn(orders: Order[], date: string): ItemRef[] {
  return items(orders, (i) => {
    const group = itemSummaryGroup(i);
    return (group === 'unfinished' || group === 'ready') && i.deliveryDate === date;
  }).sort(byNumber);
}

/** Unfinished items whose delivery date has passed, oldest first. */
export function overdueItems(orders: Order[], today: string): ItemRef[] {
  return items(
    orders,
    (i) => itemSummaryGroup(i) === 'unfinished' && i.deliveryDate !== null && i.deliveryDate < today,
  ).sort((a, b) => a.item.deliveryDate!.localeCompare(b.item.deliveryDate!) || byNumber(a, b));
}

/** Orders with at least one garment ready to collect. */
export function readyForPickup(orders: Order[]): Order[] {
  return orders
    .filter((o) => o.items.some((i) => itemSummaryGroup(i) === 'ready'))
    .sort((a, b) => a.number.localeCompare(b.number));
}

/** Orders where the customer still owes money, largest first. */
export function outstandingBalances(orders: Order[]): Array<{ order: Order; balance: Poisha }> {
  return orders
    .map((order) => ({ order, balance: balanceDue(order) }))
    .filter((r) => r.balance > 0)
    .sort((a, b) => b.balance - a.balance || a.order.number.localeCompare(b.order.number));
}

/** Unfinished items assigned to a worker; pass null for unassigned items. */
export function itemsForWorker(orders: Order[], workerId: string | null): ItemRef[] {
  return items(orders, (i) => itemSummaryGroup(i) === 'unfinished' && i.assignedTo === workerId).sort(byNumber);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/worklists.test.ts`

Expected: PASS, 7 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/worklists.ts packages/domain/src/worklists.test.ts
git commit -m "feat(domain): add dashboard and production work lists"
```

### Task 15: Sync and review queue

The sync model the demo simulates and the pilot server will implement: push events (re-sending is always safe), pull by cursor, stale edits and invalid events go to a review queue, and a reviewer keeps the current value or re-applies theirs.

**Files:**
- Create: `packages/domain/src/sync.ts`
- Test: `packages/domain/src/sync.test.ts`

**Interfaces:**
- Consumes: `applyEvent`, `replay`; `isEditEvent`, `DomainEvent`, `EditEvent`; `emptyState`, `ShopState`; `nextOrderNumber` (tests only).
- Produces:
  - `interface ReviewItem { event; outcome: 'conflict' | 'rejected'; reason; currentVersion: number | null }`
  - `interface SyncServer { log: DomainEvent[]; state: ShopState; review: ReviewItem[] }`
  - `interface PushOutcome { eventId; outcome; reason? }`
  - `createServer(events = []): SyncServer`
  - `pushEvents(server, events): { server; results: PushOutcome[] }`
  - `pullEvents(server, cursor): { events; cursor }`
  - `currentVersionOf(state, event: EditEvent): number | null`
  - `type Resolution = 'keepCurrent' | 'applyMine'`, `resolveReview(server, eventId, resolution, meta: { id; at }): { server; result: PushOutcome | null }`
  - `interface DeviceSyncState { pending: DomainEvent[]; cursor: number }`, `syncDevice(server, device)`
  - `deviceView(syncedEvents, pending): ShopState`
  - `type SyncStatus = 'online' | 'offline' | 'syncing' | 'needs-attention'`, `syncStatus({ online, syncing, reviewCount })`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/sync.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { DomainEvent } from './events';
import { nextOrderNumber } from './numbering';
import {
  createServer,
  deviceView,
  pullEvents,
  pushEvents,
  resolveReview,
  syncDevice,
  syncStatus,
} from './sync';
import { eventFactory, newCustomer, newOrder } from './testing/fixtures';

const payment = (id: string) => ({
  id,
  amount: 100000,
  method: 'cash' as const,
  reference: '',
  kind: 'advance' as const,
  corrects: null,
  reason: '',
});

function baseServer() {
  const setup = eventFactory('dev-setup');
  return createServer([
    setup({ type: 'customer.created', customer: newCustomer() }),
    setup({ type: 'order.created', order: newOrder() }),
  ]);
}

describe('pushEvents', () => {
  it('never duplicates orders or payments when the same events are sent twice', () => {
    const ev = eventFactory('dev-A');
    const batch: DomainEvent[] = [
      ev({ type: 'order.created', order: newOrder({ id: 'o2', number: 'A-0002' }) }),
      ev({ type: 'payment.recorded', orderId: 'o2', payment: payment('p1') }),
    ];
    const first = pushEvents(baseServer(), batch);
    const second = pushEvents(first.server, batch);

    expect(first.results.map((r) => r.outcome)).toEqual(['applied', 'applied']);
    expect(second.results.map((r) => r.outcome)).toEqual(['duplicate', 'duplicate']);
    expect(second.server.log).toHaveLength(4);
    expect(Object.keys(second.server.state.orders)).toEqual(['o1', 'o2']);
    expect(second.server.state.orders.o2!.payments).toHaveLength(1);
  });

  it('accepts orders created offline on two devices, because each has its own series', () => {
    const server = baseServer();
    const existing = Object.values(server.state.orders).map((o) => o.number);
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const fromA = a({ type: 'order.created', order: newOrder({ id: 'oa', number: nextOrderNumber(existing, 'A') }) });
    const fromB = b({ type: 'order.created', order: newOrder({ id: 'ob', number: nextOrderNumber(existing, 'B') }) });

    const result = pushEvents(pushEvents(server, [fromA]).server, [fromB]);
    expect(result.results[0]!.outcome).toBe('applied');
    expect(Object.values(result.server.state.orders).map((o) => o.number).sort()).toEqual(['A-0001', 'A-0002', 'B-0001']);
  });

  it('sends a stale edit to review and keeps the newer value', () => {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const server = pushEvents(baseServer(), [
      a({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01811111111' } }),
    ]).server;
    const stale = b({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01922222222' } });

    const result = pushEvents(server, [stale]);
    expect(result.results).toEqual([{ eventId: stale.id, outcome: 'conflict', reason: 'stale-edit' }]);
    expect(result.server.review).toEqual([{ event: stale, outcome: 'conflict', reason: 'stale-edit', currentVersion: 2 }]);
    expect(result.server.state.customers.c1!.phone).toBe('01811111111');
  });

  it('does not queue the same event for review twice', () => {
    const ev = eventFactory('dev-A');
    const bad = ev({ type: 'payment.recorded', orderId: 'nope', payment: payment('p1') });
    const once = pushEvents(baseServer(), [bad]);
    const twice = pushEvents(once.server, [bad]);
    expect(twice.results).toEqual([{ eventId: bad.id, outcome: 'rejected', reason: 'unknown-order' }]);
    expect(twice.server.review).toHaveLength(1);
  });
});

describe('resolveReview', () => {
  function serverWithConflict() {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    const updated = pushEvents(baseServer(), [
      a({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01811111111' } }),
    ]).server;
    const stale = b({ type: 'customer.updated', customerId: 'c1', baseVersion: 1, changes: { phone: '01922222222' } });
    return { server: pushEvents(updated, [stale]).server, stale };
  }

  it('keeps the current value and clears the review item', () => {
    const { server, stale } = serverWithConflict();
    const resolved = resolveReview(server, stale.id, 'keepCurrent', { id: 'r1', at: '2026-10-03T06:00:00.000Z' });
    expect(resolved.result).toBeNull();
    expect(resolved.server.review).toEqual([]);
    expect(resolved.server.state.customers.c1!.phone).toBe('01811111111');
  });

  it('re-applies the waiting edit on top of the current version', () => {
    const { server, stale } = serverWithConflict();
    const resolved = resolveReview(server, stale.id, 'applyMine', { id: 'r1', at: '2026-10-03T06:00:00.000Z' });
    expect(resolved.result).toEqual({ eventId: 'r1', outcome: 'applied' });
    expect(resolved.server.review).toEqual([]);
    expect(resolved.server.state.customers.c1).toMatchObject({ phone: '01922222222', version: 3 });
    expect(resolved.server.log.at(-1)).toMatchObject({ id: 'r1', baseVersion: 2, deviceId: 'dev-B' });
  });

  it('refuses to re-apply rejected events and unknown ids', () => {
    const ev = eventFactory('dev-A');
    const bad = ev({ type: 'payment.recorded', orderId: 'nope', payment: payment('p1') });
    const server = pushEvents(baseServer(), [bad]).server;
    const meta = { id: 'r1', at: '2026-10-03T06:00:00.000Z' };
    expect(() => resolveReview(server, bad.id, 'applyMine', meta)).toThrow('Only stale edits can be re-applied');
    expect(() => resolveReview(server, 'missing', 'keepCurrent', meta)).toThrow('No review item for event missing');
    expect(resolveReview(server, bad.id, 'keepCurrent', meta).server.review).toEqual([]);
  });
});

describe('device sync', () => {
  it('pulls only events after the cursor', () => {
    const server = baseServer();
    expect(pullEvents(server, 0).events).toHaveLength(2);
    expect(pullEvents(server, 2)).toEqual({ events: [], cursor: 2 });
  });

  it('pushes pending events, pulls events from other devices, and clears pending', () => {
    const a = eventFactory('dev-A');
    const b = eventFactory('dev-B');
    let server = baseServer();
    const fromB = b({ type: 'payment.recorded', orderId: 'o1', payment: payment('pb') });
    server = pushEvents(server, [fromB]).server;

    const fromA = a({ type: 'item.stageChanged', orderId: 'o1', itemId: 'i1', to: 'cutting', reason: '' });
    const synced = syncDevice(server, { pending: [fromA], cursor: 2 });

    expect(synced.results).toEqual([{ eventId: fromA.id, outcome: 'applied' }]);
    expect(synced.pulled.map((e) => e.id)).toEqual([fromB.id, fromA.id]);
    expect(synced.device).toEqual({ pending: [], cursor: 4 });
  });

  it('clears pending after a retry when the first attempt reached the server', () => {
    const ev = eventFactory('dev-A');
    const pending = [ev({ type: 'payment.recorded', orderId: 'o1', payment: payment('p1') })];
    const reached = pushEvents(baseServer(), pending).server;
    const retry = syncDevice(reached, { pending, cursor: 2 });
    expect(retry.results[0]!.outcome).toBe('duplicate');
    expect(retry.server.state.orders.o1!.payments).toHaveLength(1);
    expect(retry.device.pending).toEqual([]);
  });

  it('shows pending local changes on top of synced data', () => {
    const server = baseServer();
    const ev = eventFactory('dev-A');
    const pending = [ev({ type: 'payment.recorded', orderId: 'o1', payment: payment('p1') })];
    expect(deviceView(server.log, pending).orders.o1!.payments).toHaveLength(1);
    expect(deviceView(server.log, []).orders.o1!.payments).toHaveLength(0);
  });
});

describe('syncStatus', () => {
  it('derives the indicator', () => {
    expect(syncStatus({ online: false, syncing: false, reviewCount: 3 })).toBe('offline');
    expect(syncStatus({ online: true, syncing: true, reviewCount: 3 })).toBe('syncing');
    expect(syncStatus({ online: true, syncing: false, reviewCount: 1 })).toBe('needs-attention');
    expect(syncStatus({ online: true, syncing: false, reviewCount: 0 })).toBe('online');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/sync.test.ts`

Expected: FAIL with `Error: Cannot find module './sync'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/sync.ts`:

```ts
import { applyEvent, replay } from './apply';
import { isEditEvent, type DomainEvent, type EditEvent } from './events';
import { emptyState, type ShopState } from './model';

/** An event the server could not apply, waiting for a person to decide. */
export interface ReviewItem {
  event: DomainEvent;
  outcome: 'conflict' | 'rejected';
  /** 'stale-edit' for conflicts, otherwise the rejection reason. */
  reason: string;
  currentVersion: number | null;
}

/** The shared copy every device syncs with. In the demo it lives in the same browser. */
export interface SyncServer {
  log: DomainEvent[];
  state: ShopState;
  review: ReviewItem[];
}

export interface PushOutcome {
  eventId: string;
  outcome: 'applied' | 'duplicate' | 'conflict' | 'rejected';
  reason?: string;
}

export function createServer(events: DomainEvent[] = []): SyncServer {
  return pushEvents({ log: [], state: emptyState(), review: [] }, events).server;
}

/**
 * Applies events sent by a device. Re-sending is always safe: events already applied
 * come back as 'duplicate', and events already waiting for review are not queued twice.
 */
export function pushEvents(server: SyncServer, events: DomainEvent[]): { server: SyncServer; results: PushOutcome[] } {
  let { state } = server;
  const log = [...server.log];
  const review = [...server.review];
  const results: PushOutcome[] = [];

  for (const event of events) {
    const waiting = review.find((r) => r.event.id === event.id);
    if (waiting) {
      results.push({ eventId: event.id, outcome: waiting.outcome, reason: waiting.reason });
      continue;
    }

    const result = applyEvent(state, event);
    switch (result.kind) {
      case 'applied':
        state = result.state;
        log.push(event);
        results.push({ eventId: event.id, outcome: 'applied' });
        break;
      case 'duplicate':
        results.push({ eventId: event.id, outcome: 'duplicate' });
        break;
      case 'conflict':
        review.push({ event, outcome: 'conflict', reason: 'stale-edit', currentVersion: result.currentVersion });
        results.push({ eventId: event.id, outcome: 'conflict', reason: 'stale-edit' });
        break;
      case 'rejected':
        review.push({ event, outcome: 'rejected', reason: result.reason, currentVersion: null });
        results.push({ eventId: event.id, outcome: 'rejected', reason: result.reason });
        break;
    }
  }

  return { server: { log, state, review }, results };
}

/** Events applied on the server after `cursor`, and the new cursor. */
export function pullEvents(server: SyncServer, cursor: number): { events: DomainEvent[]; cursor: number } {
  return { events: server.log.slice(cursor), cursor: server.log.length };
}

/** The version an edit event would need to be based on to apply now. */
export function currentVersionOf(state: ShopState, event: EditEvent): number | null {
  switch (event.type) {
    case 'customer.updated':
      return state.customers[event.customerId]?.version ?? null;
    case 'order.discountSet':
      return state.orders[event.orderId]?.version ?? null;
    case 'item.assigned':
    case 'item.updated':
      return state.orders[event.orderId]?.items.find((i) => i.id === event.itemId)?.version ?? null;
  }
}

export type Resolution = 'keepCurrent' | 'applyMine';

/**
 * Settles a review item. 'keepCurrent' drops the waiting change. 'applyMine' re-issues a
 * stale edit as a new event based on the current version, so it overwrites on purpose.
 */
export function resolveReview(
  server: SyncServer,
  eventId: string,
  resolution: Resolution,
  meta: { id: string; at: string },
): { server: SyncServer; result: PushOutcome | null } {
  const item = server.review.find((r) => r.event.id === eventId);
  if (!item) throw new Error(`No review item for event ${eventId}`);
  const remaining = { ...server, review: server.review.filter((r) => r.event.id !== eventId) };
  if (resolution === 'keepCurrent') return { server: remaining, result: null };

  const { event } = item;
  if (item.outcome !== 'conflict' || !isEditEvent(event)) {
    throw new Error('Only stale edits can be re-applied');
  }
  const baseVersion = currentVersionOf(remaining.state, event);
  if (baseVersion === null) throw new Error('The edited record no longer exists');
  const rebased = { ...event, ...meta, baseVersion };
  const pushed = pushEvents(remaining, [rebased]);
  return { server: pushed.server, result: pushed.results[0]! };
}

/** What a device keeps between syncs. */
export interface DeviceSyncState {
  /** Events made on this device that the server has not seen yet. */
  pending: DomainEvent[];
  /** How far into the server log this device has pulled. */
  cursor: number;
}

/** Sends pending events, then pulls everything new. Afterwards nothing is pending. */
export function syncDevice(
  server: SyncServer,
  device: DeviceSyncState,
): { server: SyncServer; device: DeviceSyncState; results: PushOutcome[]; pulled: DomainEvent[] } {
  const pushed = pushEvents(server, device.pending);
  const pulled = pullEvents(pushed.server, device.cursor);
  return {
    server: pushed.server,
    device: { pending: [], cursor: pulled.cursor },
    results: pushed.results,
    pulled: pulled.events,
  };
}

/** The state a device shows: synced events with its own pending events on top. */
export function deviceView(syncedEvents: DomainEvent[], pending: DomainEvent[]): ShopState {
  return replay([...syncedEvents, ...pending]).state;
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'needs-attention';

export function syncStatus(input: { online: boolean; syncing: boolean; reviewCount: number }): SyncStatus {
  if (!input.online) return 'offline';
  if (input.syncing) return 'syncing';
  if (input.reviewCount > 0) return 'needs-attention';
  return 'online';
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/sync.test.ts`

Expected: PASS, 12 tests.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit -p tsconfig.json`

Expected: exits 0 with no output.

- [ ] **Step 6: Commit**

```bash
git add packages/domain/src/sync.ts packages/domain/src/sync.test.ts
git commit -m "feat(domain): add idempotent sync with review queue"
```

### Task 16: Public API and final verification

One entry point (`@darzikhata/domain`) for the web app, then a full test and type-check run.

**Files:**
- Create: `packages/domain/src/index.ts`
- Test: `packages/domain/src/index.test.ts`

**Interfaces:**
- Consumes: Every module above.
- Produces:
  - `import { ... } from '@darzikhata/domain'` exposes all modules; test helpers stay under `@darzikhata/domain/testing`

- [ ] **Step 1: Write the failing test**

`packages/domain/src/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as domain from './index';

describe('public API', () => {
  it('exports the main entry points', () => {
    for (const name of [
      'applyEvent',
      'replay',
      'formatTaka',
      'parseMeasurement',
      'nextOrderNumber',
      'moneySummary',
      'searchCustomers',
      'publicOrderView',
      'pushEvents',
      'syncDevice',
      'trialsOn',
      'STARTER_TEMPLATES',
      'DEFAULT_ROLES',
    ]) {
      expect(domain, name).toHaveProperty(name);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/index.test.ts`

Expected: FAIL with `Error: Cannot find module './index'`.

- [ ] **Step 3: Write the implementation**

`packages/domain/src/index.ts`:

```ts
export * from './apply';
export * from './digits';
export * from './events';
export * from './label';
export * from './links';
export * from './measurements';
export * from './model';
export * from './money';
export * from './numbering';
export * from './orders';
export * from './payments';
export * from './permissions';
export * from './search';
export * from './stages';
export * from './sync';
export * from './templates';
export * from './worklists';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/index.test.ts`

Expected: PASS, 1 tests.

- [ ] **Step 5: Run the full suite and type check**

Run (repo root): `npm test`

Expected: `Test Files  19 passed (19)` and `Tests  160 passed (160)`.

Run (repo root): `npm run typecheck`

Expected: exits 0 with no errors.

- [ ] **Step 6: Check for em dashes**

Run (repo root): `git grep -n "—" -- packages`

Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add packages/domain/src/index.ts packages/domain/src/index.test.ts
git commit -m "feat(domain): expose public API"
```

---

## After this plan

When all 16 tasks are committed, write Plan 2 (web foundation) against the real exports of `@darzikhata/domain`.
