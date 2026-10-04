# DarziKhata Mobile Redesign Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Work task by task, and keep `npm test`, `npm run typecheck` and `npm run e2e` green at the end of every task.

**Goal:** Give the phone layout the look and structure of the approved mockups: a navy and blue palette with meaning in colour (stage colours, orange for late and owed), icons on every navigation item, a tab bar with a built-in New Order button, filter chips instead of dropdowns, stage pills and due labels on every list, an order screen with a stage tracker and pinned money actions, and a Bangla measurement keypad.

**Mockups:** [DarziKhata Mobile Redesign canvas](https://claude.ai/artifact/KQskM4rB8rtAWA3p2Aor1p). The top row shows the app before this plan; the second row shows the seven target screens and the tab bar component.

**Architecture:** No change to the domain package or the data layer. The work is in `apps/web`: new colour and font tokens in `index.css`, a handful of new shared components in `src/ui/`, and screen-by-screen layout changes. The desktop shell picks up the new tokens and shared components for free; its own layout (sidebar, tables, side panels, desktop order form) is covered by a separate desktop plan.

**Tech Stack:** Unchanged, plus two runtime dependencies in `apps/web`: `lucide-react` (stroke icons in the same style as the mockups) and `@fontsource/anek-bangla` (headings and numbers).

**Builds on:** `main` after the blue theme and Bangla digits merges.

## How this plan is written

Like Plans 3 to 5, this plan is light. Each task gives the files it touches, what it provides to later tasks, the visible text and accessible names tests rely on, and done-conditions. Full code is given only for the tokens and the pure helpers. Components follow the patterns already in `apps/web` (`ui/Button.tsx` for variants, `ui/ChoiceGroup.tsx` for grouped toggles, `ui/Dialog.tsx` for sheets and dialogs).

## Global Constraints

Everything in the earlier plans' Global Constraints still applies: every visible string comes from `i18n/bn.ts` and `i18n/en.ts`; colours come from the CSS variables, never hex values in components; no em dashes; accessible names are the contract; money is never recorded by the keyboard alone; lists of orders read `useScopedState()`.

New in this plan:

- **Colour always has a second signal.** A stage or late state is never shown by colour alone. Every pill carries its label, and late and owed carry an icon or the word.
- **Touch targets.** Every tappable control on the phone layout is at least 44 by 44 px (`min-h-11 min-w-11`).
- **One primary action per screen.** Each screen has at most one filled blue button visible at a time. Everything else is secondary, ghost or in an overflow menu.
- **Dark mode is kept.** Every new token gets a dark value in both dark blocks of `index.css`.
- **Accessible names that tests use stay the same** unless a task says otherwise. When a task changes one, it lists the tests to update.
- **Icons are decorative.** Icons get `aria-hidden="true"`; icon-only buttons get an `aria-label` from the dictionaries.

## File structure

```
apps/web/
  package.json                           (modify) lucide-react, @fontsource/anek-bangla
  src/
    index.css                            (modify) tokens, display font
    ui/
      StagePill.tsx                      coloured pill for a garment's current stage
      stageTone.ts                       stage to tone mapping (pure)
      stageTone.test.ts
      DueLabel.tsx                       "৩ দিন বাকি" / "২ দিন দেরি" / "আজ"
      dueText.ts                         days until or past a date (pure)
      dueText.test.ts
      Avatar.tsx                         initials in a tinted circle
      avatarTone.ts                      stable tint per customer id (pure)
      PaidBar.tsx                        paid versus owed bar
      ChipGroup.tsx                      horizontal, scrollable filter chips
      IconButton.tsx                     44 px round icon-only button
      BottomBar.tsx                      pinned action bar for detail screens
      StageTracker.tsx                   horizontal stage steps for one garment
      MeasureKeypad.tsx                  Bangla digits, ¼ ½ ¾, back, next
      ui-redesign.test.tsx
    shell/
      MobileShell.tsx                    (modify) header, tab bar with icons and centre button
      AccountMenu.tsx                    avatar menu: switch user, More, settings
      nav.ts                             (modify) icon per nav item
    features/
      dashboard/DashboardPage.tsx        (modify) today panel, money cards, "এখন যা করতে হবে"
      orders/OrderFilters.tsx            (modify) search pill and chips on phones
      orders/OrderCards.tsx              (modify) avatar, stage pills, due label
      orders/OrderDetail.tsx             (modify) customer row, money card, garment cards, bottom bar
      orders/ItemCard.tsx                (modify) stage tracker, measurement summary row
      orders/entry/ItemMeasurements.tsx  (modify) tile grid and keypad on phones
      customers/CustomerProfile.tsx      (modify) profile header, stats, tabs
      customers/MeasurementSection.tsx   (modify) change badges against the previous version
      work/WorkPage.tsx                  (modify) stage tabs and job cards on phones
      links/StatusPage.tsx               (modify) customer-facing status page
```

---

## Task 1: Tokens and fonts

**Files:** `apps/web/package.json`, `src/index.css`

**Provides:** the colour names and the display font every later task uses.

- [ ] Install the new dependencies:

```bash
npm i lucide-react @fontsource/anek-bangla -w apps/web
```

- [ ] Import the display font in `index.css` next to the existing font imports:

```css
@import '@fontsource/anek-bangla/bengali-600.css';
@import '@fontsource/anek-bangla/bengali-700.css';
@import '@fontsource/anek-bangla/latin-600.css';
@import '@fontsource/anek-bangla/latin-700.css';
```

- [ ] Replace the light values in `:root` and add the new tokens:

```css
:root {
  --brand: #1f4fd8;
  --brand-strong: #163ba6;
  --brand-soft: #e7eeff;
  --navy: #13235b;
  --navy-raised: #1e3375;
  --on-navy-muted: #b9c6f0;
  --accent: #b45309;
  --surface: #f4f6fb;
  --panel: #ffffff;
  --ink: #0e1630;
  --muted: #5a6478;
  --line: #e3e7f0;
  --danger: #b91c1c;
  --on-brand: #ffffff;

  /* late and money owed */
  --warn: #b4380b;
  --warn-soft: #ffedd5;
  --warn-ink: #9a3412;
  /* money collected, synced, ready */
  --ok: #0f6b5f;
  --ok-soft: #ecfaf6;

  /* stage tones: soft background, readable text, solid dot */
  --tone-booked-bg: #eef1f6;   --tone-booked-fg: #4a5468;   --tone-booked-dot: #8a93a6;
  --tone-cutting-bg: #ede9fe;  --tone-cutting-fg: #5b21b6;  --tone-cutting-dot: #7c3aed;
  --tone-working-bg: #e7eeff;  --tone-working-fg: #163ba6;  --tone-working-dot: #1f4fd8;
  --tone-trial-bg: #fef3c7;    --tone-trial-fg: #92400e;    --tone-trial-dot: #d97706;
  --tone-ready-bg: #ccfbf1;    --tone-ready-fg: #115e59;    --tone-ready-dot: #0d9488;
  --tone-done-bg: #eef1f6;     --tone-done-fg: #4a5468;     --tone-done-dot: #8a93a6;
  --tone-cancelled-bg: #fee2e2; --tone-cancelled-fg: #991b1b; --tone-cancelled-dot: #dc2626;
  color-scheme: light;
}
```

- [ ] Give every new token a dark value, in both the `prefers-color-scheme: dark` block and the `[data-theme='dark']` block. Suggested starting point: `--navy: #0f1a44`, `--navy-raised: #1a2a63`, `--warn: #fb923c`, `--warn-soft: #3b1d0c`, `--warn-ink: #fdba74`, `--ok: #5eead4`, `--ok-soft: #0b2b27`; tone backgrounds become the 900 shade of the same hue and tone text the 200 shade.
- [ ] Register them in `@theme inline` so Tailwind classes exist (`bg-navy`, `text-warn`, `bg-tone-ready-bg` and so on), and add the display font:

```css
@theme inline {
  --font-sans: 'Noto Sans Bengali', 'Hind Siliguri', system-ui, sans-serif;
  --font-display: 'Anek Bangla', 'Noto Sans Bengali', system-ui, sans-serif;
  --color-navy: var(--navy);
  --color-navy-raised: var(--navy-raised);
  --color-on-navy-muted: var(--on-navy-muted);
  --color-warn: var(--warn);
  --color-warn-soft: var(--warn-soft);
  --color-warn-ink: var(--warn-ink);
  --color-ok: var(--ok);
  --color-ok-soft: var(--ok-soft);
  /* ...one line per tone token, same pattern... */
}
```

- [ ] Check in the browser that Bangla digits, including ১, still look standard in both fonts (the reason for the last font change).

**Done when:** the app looks the same apart from the new blue, the lighter grey background and the darker text; tests and type check pass; dark mode still switches.

---

## Task 2: Pure helpers

**Files:** `src/ui/stageTone.ts`, `src/ui/dueText.ts`, `src/ui/avatarTone.ts`, with tests.

**Provides:** the rules the visual components follow, tested without rendering.

Stages are configurable per shop, so tone cannot rely on fixed keys alone. Use the summary group first, then well-known keys, then position:

```ts
import type { Stage, SummaryGroup } from '@darzikhata/domain';

export type Tone = 'booked' | 'cutting' | 'working' | 'trial' | 'ready' | 'done' | 'cancelled';

const BY_KEY: Record<string, Tone> = {
  booked: 'booked',
  cutting: 'cutting',
  trial: 'trial',
  qc: 'trial',
};

/** Colour family for a garment's current stage. */
export function stageTone(stage: Stage | undefined, group: SummaryGroup, index: number): Tone {
  if (group === 'cancelled') return 'cancelled';
  if (group === 'delivered') return 'done';
  if (group === 'ready') return 'ready';
  if (stage && BY_KEY[stage.key]) return BY_KEY[stage.key]!;
  return index === 0 ? 'booked' : 'working';
}
```

```ts
export type Due =
  | { kind: 'late'; days: number }
  | { kind: 'today' }
  | { kind: 'tomorrow' }
  | { kind: 'left'; days: number };

/** Whole days between today and a date (YYYY-MM-DD), both in shop time. */
export function dueFrom(date: string, today: string): Due { /* ... */ }
```

`avatarTone(id)` returns one of six tint pairs from a stable hash of the id, so a customer keeps the same colour everywhere.

Tests to write:

- `stageTone`: each summary group; `trial` and `qc` keys; first stage with an unknown key is `booked`; any other unfinished unknown key is `working`.
- `dueFrom`: late by 2, today, tomorrow, 9 days left, across a month end.
- `avatarTone`: same id gives the same tone; a spread of ids uses more than one tone.

Dictionary entries (bn / en):

| key | bn | en |
| --- | --- | --- |
| `due.late` | `{n} দিন দেরি` | `{n} days late` |
| `due.today` | `আজ` | `Today` |
| `due.tomorrow` | `কাল` | `Tomorrow` |
| `due.left` | `{n} দিন বাকি` | `{n} days left` |

**Done when:** the new unit tests pass.

---

## Task 3: Shared components

**Files:** the `src/ui/` components listed above, `src/ui/ui-redesign.test.tsx`.

**Provides:** the building blocks for Tasks 4 to 9.

- **`StagePill`** `({ label, tone })`: rounded pill with a 7 px dot and the label; classes from the tone tokens.
- **`DueLabel`** `({ date })`: uses `dueFrom` and `useToday()`. `late` gets `bg-warn-soft text-warn-ink font-semibold` and an alert icon; others are muted text.
- **`Avatar`** `({ id, name, size })`: first one or two letters of the name (Bangla aware: take the first grapheme cluster plus a following vowel sign, so "মোহাম্মদ" shows "মো"); `aria-hidden` because the name is always next to it.
- **`PaidBar`** `({ paid, total })`: `role="img"` with an accessible name such as "৫০০ টাকার মধ্যে ২০০ টাকা জমা"; teal fill on a warn-soft track. Hidden when the person lacks `money.view`.
- **`ChipGroup`** `({ label, options, value, onChange })`: `role="group"` with an accessible name; each chip a `<button aria-pressed>` with an optional count; scrolls sideways with no visible scrollbar; selected chip is navy.
- **`IconButton`** `({ label, icon, ...})`: 44 px round button, `aria-label={label}`.
- **`BottomBar`**: fixed to the bottom on phones, above the safe area, white with a top border. Pages using it add bottom padding so content is never hidden.
- **`StageTracker`** `({ stages, currentKey })`: an `<ol aria-label>` of steps; done steps show a check, the current step has `aria-current="step"` and a ring, skipped optional stages are drawn dashed. Shows at most six steps; longer lists (bridal has eight) collapse the done ones into a "+২" step.
- **`MeasureKeypad`** `({ onKey, onNext, label, previous })`: 4 by 4 grid of `১ ২ ৩ ¼ / ৪ ৫ ৬ ½ / ৭ ৮ ৯ ¾ / ⌫ ০ . পরের`; keys 50 px high; fraction keys replace an existing fraction; back deletes one character; each key has an accessible name (`অর্ধেক`, `মুছুন`, `পরের মাপ`).

Tests: each component's accessible name and role; `ChipGroup` calls `onChange` and sets `aria-pressed`; `StageTracker` marks the right step current and collapses long lists; `MeasureKeypad` builds `৩৮½` from `৩`, `৮`, `½`, and replaces `½` with `¾`.

**Done when:** the component tests pass; nothing on screen has changed yet.

---

## Task 4: Phone shell

**Files:** `shell/MobileShell.tsx`, `shell/nav.ts`, new `shell/AccountMenu.tsx`.

- [ ] Add an `icon` to each `NavItem` in `nav.ts` (`Home`, `ClipboardList`, `Users`, `Scissors`, `Wallet`, `Settings` from `lucide-react`).
- [ ] Header: shop name in the display font, the sync button as a small pill (green when synced, amber when it needs attention), and the user's initial in a navy circle that opens `AccountMenu`.
- [ ] `AccountMenu` (a sheet built on `ui/Dialog.tsx`): switch user, payments and settings when permitted, everything currently on the More page, and the theme and language switches.
- [ ] Tab bar: Home, Orders, New order (centre), Customers, Work. Each tab is an icon over a label; the active tab's icon sits in a `bg-brand-soft` pill and the label turns `text-brand-strong`. The centre button is a 58 px rounded square in `bg-brand`, raised 22 px above the bar with a white ring. Tabs the role cannot see drop out; the grid adjusts.
- [ ] Remove the floating New Order button and reduce `main`'s bottom padding to the bar height plus 16 px.
- [ ] Keep `data-tour="new-order"` and `data-tour="nav-*"` on the new controls.

Accessible names changed: the New Order link was `+ নতুন অর্ডার`; it becomes `নতুন অর্ডার`. Update `e2e/first-order.spec.ts` and any unit test that looks for the plus sign. The More tab moves into the account menu: update `e2e` helpers and tests that click `আরও`, so they open the account menu (accessible name `অ্যাকাউন্ট ও আরও`) first.

**Done when:** at 390 px wide, no content sits under a floating button; every tab is reachable with one thumb; the presenter tour still finds `new-order`.

---

## Task 5: Home

**Files:** `features/dashboard/DashboardPage.tsx`.

- [ ] Top: a navy "আজকের কাজ" panel with today's date and four tiles (trials today, deliveries today, ready to collect, late). Each tile is a link to the matching Orders filter. The late tile uses `bg-warn-soft text-warn-ink`, so it stands out from the other three.
- [ ] Below: two money cards, "আজ জমা" and "মোট বাকি" (owed in `text-warn`), only with `money.view`. Each links to Payments.
- [ ] Then "এখন যা করতে হবে": one list mixing today's trials, today's deliveries and the oldest late garments, at most six rows, each with `Avatar`, name, garment and order number, and a `StagePill` or `DueLabel` on the right. "সব দেখুন" links to Orders.
- [ ] The four separate lists stay on desktop (the desktop plan reworks them); on phones they are replaced by the panel and the combined list.
- [ ] Order numbers stop being underlined links; the whole row is the link.

Keep the region name `নেওয়ার জন্য রেডি` reachable for `e2e/collect-one.spec.ts`: on phones it becomes the accessible name of the ready tile's target, so update the test to tap the ready tile, then the order.

**Done when:** Home fits above the tab bar at 390 by 844 without scrolling for a typical day; the four counts match the old cards.

---

## Task 6: Orders list

**Files:** `features/orders/OrderFilters.tsx`, `features/orders/OrderCards.tsx`.

- [ ] On phones, filters become: one rounded search field (placeholder `নাম, ফোন বা অর্ডার নম্বর`), then a `ChipGroup` with All, Open, Trial, Ready, Late and Owed, each with its count. Sort moves into a small button in the page header that opens a sheet.
- [ ] The status `<select>` and the owed checkbox stay on desktop.
- [ ] Each card: `Avatar`, customer name, order number and garment count; on the right the balance owed in `text-warn` with "বাকি" under it, or "পরিশোধিত" in `text-ok`; then one `StagePill` per garment (`শার্ট ১ · সেলাই`); then the delivery date and a `DueLabel`.
- [ ] Filters still persist across navigation, as they do now.

**Done when:** the filters take one row plus the search field; the first order card is visible without scrolling; existing `OrdersPage.test.tsx` filter tests pass after switching to the chip names.

---

## Task 7: Order detail

**Files:** `features/orders/OrderDetail.tsx`, `features/orders/ItemCard.tsx`, `features/payments/OrderMoney.tsx`.

- [ ] Header: back button, order number in the display font, date taken and by whom; on the right a share button (status link) and an overflow menu holding Print receipt, Job slip, Fabric tag and Order again.
- [ ] Customer row: `Avatar`, name (links to the profile), phone, and round call and message buttons (`tel:` and `sms:` links).
- [ ] Money card: total with discount note, `PaidBar`, paid and owed amounts. A "হিসাব" link opens the full history and the refund, discount and price adjustment actions in a sheet. The card's own buttons go away.
- [ ] Each garment card: garment icon, title, delivery date with `DueLabel`, `StagePill`; then `StageTracker`; then chips for trial date and assigned worker (an unassigned worker shows as an amber "কারিগর ঠিক করুন" link); then a one-line measurement summary that opens the full table; then one outlined button for the next stage (`সেলাই শেষ, ট্রায়ালে দিন`). Other stage moves, fitting changes, edit and cancel move into the card's overflow menu.
- [ ] `BottomBar` with a print icon button, `হস্তান্তর` (secondary) and `টাকা নিন` (primary). With nothing owed, Take payment is hidden and Hand over becomes primary. With nothing ready, Hand over is hidden.

Accessible names `হস্তান্তর করুন` (per garment) and `হস্তান্তর নিশ্চিত করুন` (dialog) stay. The bottom bar's Hand over opens a picker when more than one garment is ready.

**Done when:** at most one filled button is visible; the order screen fits the customer, money and first garment in one phone screen; `e2e/collect-one.spec.ts` passes.

---

## Task 8: New order measurements

**Files:** `features/orders/entry/ItemMeasurements.tsx`, `features/orders/MobileOrderSteps.tsx`.

- [ ] Progress: a five-segment bar under the header, in place of "ধাপ ১/৫" text alone (keep the text for screen readers).
- [ ] Garment chips across the top (`শার্ট ১`, `প্যান্ট ১`, `+`), and a two-option body or sample switch.
- [ ] Fields become a three-column grid of tiles grouped by the template's field groups. Each tile shows the label, the value in the display font, and, when the value differs from the previous version, "আগে ৩৮¼" in `text-warn-ink`.
- [ ] Tiles open the `MeasureKeypad` pinned at the bottom (`inputmode="none"` on the field so the system keyboard stays closed). "পরের" moves to the next field, and from the last field to the next step.
- [ ] A setting under the account menu turns the keypad off for people who prefer the system keyboard.
- [ ] Parsing stays in the domain (`parseMeasurement`); the keypad only builds the text.

**Done when:** a full shirt can be measured without the system keyboard; the e2e first order still passes (it types into fields, which must keep working).

---

## Task 9: Customer profile, work list, status page

**Files:** `features/customers/CustomerProfile.tsx`, `features/customers/MeasurementSection.tsx`, `features/work/WorkPage.tsx`, `features/links/StatusPage.tsx`.

- [ ] **Customer:** centred header with a large `Avatar`, name, phone and household; call and message buttons; a three-number strip (orders, owed, last visit); tabs for Measurements, Orders and Money; garment chips; the current measurement version with change badges (`+½`) against the previous version; `BottomBar` with `নতুন মাপ` and `আবার অর্ডার`.
- [ ] **Work, on phones:** a three-way stage switch with counts in place of the dropdowns; one large card per garment with a garment icon, title, order and wearer, a `DueLabel`, the design note, a `মাপ` button and one big next-stage button. Multi-select and bulk assignment stay on desktop.
- [ ] **Status page:** navy header with the shop's initial, name and area; "৩টির মধ্যে ১টি রেডি" as the headline with a segment bar; one row per garment with a coloured icon and plain-language state; trial and delivery dates; last updated time and the note that prices and measurements are not shown; a pinned "দোকানে কল করুন" button.

**Done when:** a tailor signed in with the Tailor role can mark work done with one tap per garment; the status page passes `StatusPage.test.tsx` after updating its text queries.

---

## Task 10: Polish and check

- [ ] Run through every screen at 360, 390 and 430 px wide, light and dark.
- [ ] Check contrast on every new text and background pair (4.5:1 for body text). The muted grey on the grey background is the most likely to fail.
- [ ] Check focus rings on chips, tiles and keypad keys.
- [ ] Update `README.md` if any presenter step text changed.
- [ ] Run the full check:

```bash
npm test
npm run typecheck
cd apps/web && npm run e2e
```

**Done when:** all three pass and the screens match the mockups.
