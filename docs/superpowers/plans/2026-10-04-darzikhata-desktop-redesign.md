# DarziKhata Desktop Redesign Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Work task by task, and keep `npm test`, `npm run typecheck` and `npm run e2e` green at the end of every task.

**Goal:** Give the desktop layout (1024 px and wider) the look and structure of the approved desktop mockups: a sidebar with icons, counts, sync status and the signed-in person; a slimmer top bar; a Home page led by the navy "আজকের কাজ" panel; an Orders table with view tabs, filter chips and a richer side panel; a three-column New Order form with change highlights; a stage board for work with a bulk action bar; and a customer page with a measurement comparison table.

**Mockups:** [DarziKhata Redesign canvas](https://claude.ai/artifact/KQskM4rB8rtAWA3p2Aor1p), page **ডেস্কটপ**. The top row shows the desktop before this plan; the second and third rows show the five target screens; the last row shows the sidebar and top bar components.

**Architecture:** No change to the domain package or the data layer. The work is in `apps/web`, inside the desktop branches that already exist (`kind === 'desktop'` from `useShell()`, `DesktopShell.tsx`, `OrderTable.tsx`, `DesktopOrderForm.tsx`, `WorkGroupTable.tsx`). Phone layouts are left to the mobile plan.

**Tech Stack:** Unchanged from the mobile plan (`lucide-react`, `@fontsource/anek-bangla`). Nothing new.

**Builds on:** [Mobile Redesign Plan](./2026-10-04-darzikhata-mobile-redesign.md), Tasks 1 to 3 (tokens and fonts, pure helpers, shared components). Those three tasks are shared: do them once, then either plan can continue. This plan never repeats them.

## How this plan is written

Like the mobile plan, this plan is light. Each task gives the files it touches, what it provides to later tasks, the visible text and accessible names tests rely on, and done-conditions. Full code is given only for the pure helpers. Components follow the patterns already in `apps/web`.

## Global Constraints

Everything in the mobile plan's Global Constraints applies (colour always has a second signal, one primary action per view, dark mode kept, icons decorative, accessible names stable unless a task says otherwise), together with the earlier plans' constraints (strings from the dictionaries, colours from CSS variables, no em dashes, money never recorded by the keyboard alone, order lists read `useScopedState()`).

New in this plan:

- **Pointer and keyboard both work.** Every desktop action has a mouse path and a keyboard path. Keyboard shortcuts never fire while typing or while a dialog is open (the rule already in `shell/shortcuts.ts`).
- **No shortcut records money or delivers.** Shortcuts may move selection, focus search or open a screen. Saving an order with an advance, taking a payment and handing over always need a deliberate click or Enter on that button.
- **No drag and drop for stage changes.** The work board moves garments only through explicit buttons with a preview and confirmation, as the spec requires for bulk changes. Dragging is too easy to do by accident on a shared shop computer.
- **Desktop density.** Body text 14 to 15 px, table rows about 56 px with two lines, controls 36 to 44 px high. Touch-size controls stay on the phone layout.
- **Fluid widths.** Layouts are built with flex-wrap and auto-fit grids so they work from 1024 px to 1920 px. The content area caps at about 1240 px on Home; tables use the full width.
- **Filters stay in the address.** View tabs, filter chips and sort keep living in the URL search params, as filters do now, so Back and refresh keep them.

## File structure

```
apps/web/src/
  shell/
    DesktopShell.tsx                     (modify) new sidebar, slimmer top bar
    DesktopSidebar.tsx                   brand, shop and branch, nav with icons and counts, sync, user
    navCounts.ts                         open orders and late garments for the sidebar (pure)
    navCounts.test.ts
    SyncStatus.tsx                       (modify) a sidebar variant of the sync button
    GlobalSearch.tsx                     (modify) larger field with the "/" hint inside
    shortcuts.ts                         (modify) arrow keys and Escape in the orders table
    useShortcuts.ts                      (modify)
  ui/
    ViewTabs.tsx                         underline tabs with counts, role="tablist"
    FilterButton.tsx                     dashed "+ কারিগর" button that opens a popover
    FilterChip.tsx                       active filter with a remove button
    Kbd.tsx                              keyboard hint
    SelectionBar.tsx                     floating navy bar for bulk actions
    desktop-ui.test.tsx
  features/
    dashboard/DashboardPage.tsx          (modify) desktop: today panel with sub-lines, money card, four lists
    dashboard/dashboard.ts               (modify) tile sub-lines (pure)
    orders/OrdersPage.tsx                (modify) view tabs, filter row, side panel width
    orders/OrderFilters.tsx              (modify) desktop filter row
    orders/orderViews.ts                 view definitions and counts (pure)
    orders/orderViews.test.ts
    orders/OrderTable.tsx                (modify) customer cell, stage pills, due, worker, owed
    orders/OrderDetail.tsx               (modify) compact panel variant
    orders/DesktopOrderForm.tsx          (modify) three columns as in the mockup
    orders/entry/CustomerPicker.tsx      (modify) selected customer card
    orders/entry/ItemMeasurements.tsx    (modify) desktop field grid with change highlight
    orders/entry/DraftSummary.tsx        (modify) summary column, missing-field warning
    work/WorkPage.tsx                    (modify) board and list switch, worker chips
    work/WorkBoard.tsx                   stage columns with cards
    work/workBoard.ts                    garments grouped into columns (pure)
    work/workBoard.test.ts
    work/WorkGroupTable.tsx              (modify) kept as the list view, restyled
    customers/CustomersPage.tsx          (modify) list and profile side by side
    customers/CustomerList.tsx           (modify) avatar rows with balance
    customers/CustomerProfile.tsx        (modify) desktop header, stat tiles, two columns
    customers/MeasurementTable.tsx       (modify) comparison table: current, previous, order snapshot
    customers/measurementView.ts         (modify) comparison columns and deltas (pure)
```

---

## Task 1: Sidebar and top bar

**Files:** `shell/DesktopShell.tsx`, new `shell/DesktopSidebar.tsx`, new `shell/navCounts.ts` with test, `shell/SyncStatus.tsx`, `shell/GlobalSearch.tsx`.

**Provides:** the frame every other desktop task sits in.

- [ ] `navCounts(state, today)` returns `{ openOrders, lateGarments }` from the scoped state. Tests: counts only unfinished items, respects the branch scope, a garment due today is not late.
- [ ] Sidebar, 240 px wide, top to bottom:
  - brand mark (scissors icon in a navy square), app name in the display font, the demo badge;
  - a shop and branch button that opens the existing `BranchSwitcher` as a menu;
  - main nav with icons: Home, Orders (count of open orders), Customers and measurements, Work list (late count in an orange badge, for example `৬ দেরি`);
  - a small section label `হিসাব ও দোকান`, then Payments and Settings;
  - at the bottom: the sync status as a full-width button (green when synced, amber when it needs attention, with the last sync time), then the signed-in person (avatar, name, role) as the switch user button;
  - More stays reachable from the person menu.
- [ ] Active item: `bg-brand-soft text-brand-strong font-semibold`, `aria-current="page"`.
- [ ] Top bar keeps only: global search (wider, with a `/` hint inside the field), the language switch as a compact `EN` / `বাং` button, and New Order with an `N` hint. The shop name, branch switcher, sync button and user move to the sidebar.
- [ ] Keep `data-tour="new-order"` and `data-tour="nav-*"`.

Accessible names: the New Order link loses its `+` (same change as the mobile plan, Task 4). The sync button keeps its current accessible name. Update `e2e/offline-sync.spec.ts` if it finds the sync button by position in the header.

**Done when:** at 1024, 1440 and 1920 px the top bar has three controls, the sidebar counts match the dashboard, and the presenter tour still finds every target.

---

## Task 2: Desktop parts

**Files:** `ui/ViewTabs.tsx`, `ui/FilterButton.tsx`, `ui/FilterChip.tsx`, `ui/Kbd.tsx`, `ui/SelectionBar.tsx`, `ui/desktop-ui.test.tsx`.

**Provides:** the pieces Tasks 4 to 6 use.

- **`ViewTabs`** `({ label, views, value, onChange })`: `role="tablist"`; each tab a `<button role="tab" aria-selected>` with the label and a count badge; selected tab has a 3 px brand underline; arrow keys move between tabs.
- **`FilterButton`** `({ label, children })`: dashed outline button with a plus icon; opens a small popover (built on `ui/Dialog.tsx` semantics, non-modal) holding the filter's options.
- **`FilterChip`** `({ label, onRemove })`: brand-soft chip; the remove button's accessible name is `{label} সরান`.
- **`Kbd`**: inline keyboard hint, `aria-hidden` when the same key is already in the control's accessible description.
- **`SelectionBar`** `({ count, children, onClear })`: `role="region"` named `বাছাই করা পোশাক`; floats centred at the bottom of the content area; navy background; shows `{n}টি পোশাক বাছাই করা`; holds action buttons and a clear button. Appears only when `count > 0`.

Tests: tab arrow-key movement and `aria-selected`; chip remove calls `onRemove`; selection bar hidden at zero and announces the count.

**Done when:** the component tests pass; nothing on screen has changed yet.

---

## Task 3: Home

**Files:** `features/dashboard/DashboardPage.tsx`, `features/dashboard/dashboard.ts` (and its test).

- [ ] Extend `dashboardModel` with one sub-line per tile:
  - trials today: the time of the first trial, or nothing;
  - deliveries today: how many of today's orders still have money owed;
  - ready to collect: total owed on ready orders;
  - late: age in days of the oldest late garment.
  Tests for each, including the empty case.
- [ ] Heading row: today's date above `শুভ সকাল, {name}` (time of day from the shop clock), and a secondary `আজকের কাজের তালিকা প্রিন্ট` button that opens the existing work list print page filtered to today.
- [ ] A row with two blocks that wrap on narrow screens: the navy today panel (four tiles, the late tile in warn colours) and the money card (`আজ জমা` with the payment count and a cash / bKash / Nagad / bank split, then `মোট বাকি` with the order count). The money card shows only with `money.view`.
- [ ] Below, a two-column grid of the four lists (trials today, deliveries today, late, ready to collect). Each list: header with title, count badge (orange for late) and `সব দেখুন`; at most five rows; each row is one link with `Avatar`, name, garment and order number, and on the right a time, a `StagePill`, a `DueLabel` or the owed amount.
- [ ] Keep the region names, including `নেওয়ার জন্য রেডি`, so `e2e/collect-one.spec.ts` (laptop project) keeps working.

**Done when:** at 1440 by 900 the panel, money card and the first three rows of each list are visible without scrolling.

---

## Task 4: Orders table and side panel

**Files:** `features/orders/orderViews.ts` with test, `OrdersPage.tsx`, `OrderFilters.tsx`, `OrderTable.tsx`, `OrderDetail.tsx`, `shell/shortcuts.ts`, `shell/useShortcuts.ts`.

- [ ] `orderViews.ts` defines the views (All, Open, Trial, Ready, Late, Owed) as predicates over an order, plus `countViews(orders, today)`. The existing status filter and owed checkbox map onto these views, so the URL keeps one `view` param. Tests: each predicate; counts add up; an order can be in several views.
- [ ] Filter row: a search field scoped to the table (the global search stays in the top bar), `FilterButton`s for worker and delivery date range, `FilterChip`s for every active filter including the branch, and the sort control on the right.
- [ ] Table columns: Customer (avatar, name, order number under it), Garments and stage (one `StagePill` per garment), Delivery (date with `DueLabel` under it), Worker (`ঠিক হয়নি` in warn colour when unassigned), Owed (amount in `text-warn`, or `পরিশোধিত` in `text-ok`). Total moves into the side panel. Financial columns still hide without `money.view`.
- [ ] Rows: the whole row selects the order (`aria-selected`), the customer name is a link for screen readers; the selected row has a light brand background. Pagination stays, restyled as `১–২০, মোট ৪০` with previous and next.
- [ ] Keyboard: with focus in the table, Up and Down move the selection and open it in the panel; Enter opens the full order page; Escape closes the panel. A hint line under the table shows these keys.
- [ ] Side panel (keeps the region name `অর্ডারের বিস্তারিত`), about 400 px wide:
  - header: order number, date taken, by whom and branch; buttons to open the full page and an overflow menu (receipt, job slip, fabric tag, order again);
  - customer row with avatar, phone and a call button;
  - money block: total, `PaidBar`, paid and owed, a `হিসাব` link to the full history;
  - one block per garment: title, `StagePill`, a six-segment progress strip, the next-stage button and an overflow menu for other stages, fitting changes, edit and cancel;
  - footer: `হস্তান্তর` (secondary) and `টাকা নিন` (primary), with the same show and hide rules as the phone bottom bar.
- [ ] The per-garment `হস্তান্তর করুন` buttons and the confirmation dialog keep their names (the scenario 3 test clicks them inside the panel).

**Done when:** the first eight orders and the panel fit at 1440 by 900; filters survive opening an order and coming back; `OrdersPage.test.tsx` and the laptop e2e projects pass after updating filter queries to tab names.

---

## Task 5: New order form

**Files:** `features/orders/DesktopOrderForm.tsx`, `entry/CustomerPicker.tsx`, `entry/ItemHeader.tsx`, `entry/ItemMeasurements.tsx`, `entry/ItemDetails.tsx`, `entry/DraftSummary.tsx`.

- [ ] Header row: back link, `নতুন অর্ডার`, and a muted note that the number is issued on save and the draft is kept automatically (the draft behaviour already exists).
- [ ] Left column (about 300 px):
  - customer card: once picked, shows avatar, name, phone and the number of earlier orders, with `বদলান`; before that, the existing search and `নতুন কাস্টমার`;
  - garment list: one row per item with an icon, title, price and a measurement status line (`৮টি মাপ ভরা` in `text-ok`, or `২টি মাপ বাকি` in `text-warn-ink`); the selected item has a brand outline;
  - quick add buttons, one dashed chip per active template (`+ শার্ট`, `+ প্যান্ট` ...), in place of the select plus button.
- [ ] Centre column (fluid), for the selected item:
  - title, an inline wearer label field, and the body or sample switch;
  - a note that the last version's values are filled in and that `৩৮ ১/২` and `৩৮½` both work;
  - one fieldset per measurement group, fields in an auto-fill grid of about 130 px; a value that differs from the previous version gets a warn outline and `আগে ৩৬¾` under it; validation errors stay next to the field;
  - design note and photos side by side; then trial date, delivery date, worker and price in one row.
- [ ] Right column (about 320 px, sticky): items with prices, discount, total, advance with the payment method group, `বাকি থাকবে` in `text-warn`, a `role="alert"` line listing items with missing required measurements, the primary `অর্ডার সেভ করে রসিদ দেখান` button, and a quiet `খসড়া বাতিল`.
- [ ] No keyboard shortcut saves the order. Tab order runs left column, centre fields in reading order, then the summary.
- [ ] The unsaved-change guard keeps working.

Accessible names: the save button text changes. Update `DesktopOrderForm.test.tsx` and the laptop path in `e2e/helpers.ts`.

**Done when:** a two-garment order can be entered with the keyboard alone up to the save button; the missing-field warning matches the per-field errors.

---

## Task 6: Work board

**Files:** `features/work/workBoard.ts` with test, new `features/work/WorkBoard.tsx`, `WorkPage.tsx`, `WorkGroupTable.tsx`, `batchDialogs.tsx`.

- [ ] `workBoard(rows, stagesByTemplate)` groups garments into columns by stage. Templates have different stage lists, so columns are the union in a stable order: each template's stages merged by key, ordered by their first position. Garments whose template lacks a column's stage never appear there. Tests: shirt plus bridal stages merge into one ordered list; optional stages appear only when a garment is in them; delivered and cancelled garments are left out.
- [ ] Toolbar: title with `চলছে` and `দেরি` counts, a `বোর্ড | তালিকা` switch (kept in the URL), and the print button.
- [ ] Worker chips with counts: All, each worker with an avatar, and `কারিগর ঠিক হয়নি` in warn colours. These replace the worker dropdown; grouping by worker stays available in the list view.
- [ ] Board: one column per stage with a coloured dot, title and count; cards show a checkbox, garment, order and customer, the worker (or a dashed `কারিগর নেই`) and a `DueLabel`. A column shows ten cards, then `+{n}টি আরও` expands it. Columns scroll sideways inside their box when they do not fit.
- [ ] Selecting cards shows the `SelectionBar` with `কারিগর ঠিক করুন` and `ধাপ বদলান`. Both open the existing batch dialogs, which keep their preview, confirmation and per-garment result.
- [ ] List view: the current `WorkGroupTable`, restyled with stage pills and due labels; checkbox and group selection names stay the same.

**Done when:** a manager can assign three garments to a worker from the board in three clicks plus confirmation; `WorkPage.test.tsx` passes with the list view as the default in tests (or updated to the board's names).

---

## Task 7: Customers and measurement comparison

**Files:** `features/customers/CustomersPage.tsx`, `CustomerList.tsx`, `CustomerProfile.tsx`, `MeasurementTable.tsx`, `measurementView.ts` (and its test).

- [ ] Extend `measurementView.ts` with `comparisonColumns(profile, orders)`: the current version, the previous version, and the snapshot from the most recent order that used this template, each with its date, source and who took it; and per field the value in each column and the delta of current against previous. Tests: no previous version; a field added to the template later; a snapshot equal to the current version shows no delta.
- [ ] List column (about 300 px): title with a new customer button, search field (`নাম বা ফোন (বাংলা/English)`), rows with avatar, name, phone and owed amount; the selected row has a brand-soft background and `aria-current`.
- [ ] Profile header card: large avatar, name, phone, household and first visit; call button, `তথ্য বদলান` and the primary `আবার অর্ডার`; a row of four stat tiles (orders, total order value, owed in warn colours, last visit). Total order value is labelled as order value, never as profit, as the spec requires.
- [ ] Below, two columns that wrap:
  - Measurements: garment chips, `নতুন মাপ নিন`, and the comparison table (columns current, previous, order snapshot; the current column tinted; deltas as small warn badges; a caption explaining the columns). Female customers' measurements still follow `measurements.view.female`.
  - Recent orders: four rows with order number, amount or owed, garments and a `StagePill`, then `সব {n}টি`.

**Done when:** the comparison table renders for a customer with one, two and three versions; `Measurements.test.tsx` and `CustomersPage.test.tsx` pass after updating table queries.

---

## Task 8: Polish and check

- [ ] Run through every desktop screen at 1024, 1280, 1440 and 1920 px, light and dark.
- [ ] Keyboard pass: every screen usable with Tab, Shift+Tab, Enter, Space, Escape and the arrow keys where stated; visible focus everywhere.
- [ ] Check that switching layout under More (mobile or desktop override) still works on every screen.
- [ ] Check print pages are unaffected (the sidebar and top bar are `no-print`).
- [ ] Update `README.md` if any presenter step text changed.
- [ ] Run the full check:

```bash
npm test
npm run typecheck
cd apps/web && npm run e2e
```

**Done when:** all three pass at both Playwright widths and the screens match the mockups.
