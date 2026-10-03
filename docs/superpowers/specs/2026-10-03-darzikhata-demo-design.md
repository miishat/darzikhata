# DarziKhata Demo: Design

Date: 3 October 2026
Status: approved design, ready for implementation planning
Source spec: [DarziKhata Idea Details v0.3](../../product/DarziKhata-Idea-Details-v0.3.md)

## 1. Purpose

Build a frontend-only, clickable prototype of DarziKhata for customer interviews with varied tailoring businesses (Section 12 of the source spec: "start with customer interviews and a clickable workflow").

The demo covers the full first-version scope of the source spec, with group orders and branches at a basic level. It must:

- Run as a hosted, installable web app (PWA) that tailors can open on their own phones, and that works offline once loaded.
- Store all data locally in the visitor's browser, seeded with realistic demo shops, with a reset action.
- Provide a presenter mode with guided scenarios for in-person demonstrations.
- Implement the business rules for real (balances, measurement snapshots, garment stages, numbering, permissions, sync semantics) in a pure domain package that carries forward unchanged into the pilot.

The demo is not the pilot. It has no backend, no real authentication, and no real cross-device sync.

## 2. Spec v0.4 changes adopted

These changes to the v0.3 idea spec were reviewed and accepted. They apply to the demo and to the future pilot.

1. **Per-device order number series.** Each device has a series letter (`A`, `B`, ...). Order numbers look like `A-0142`. Numbers issued offline are final, never temporary, because customers keep printed receipts.
2. **Discounts.** Orders support a discount (ছাড়) with an optional reason.
3. **Integer money.** All amounts are stored as integer poisha. Display is in taka with Bangla or English digits.
4. **Credit due on overpayment.** When cancellation leaves payments exceeding the total, the order shows credit due. Staff explicitly choose to refund it or keep it as credit. Nothing is automatic.
5. **Owner login plus staff PIN switching.** The owner signs in to the shop. Staff switch identity on a shared device with a short PIN. (In the demo, sign-in is simulated.)
6. **Bangla input rules.** Numeric inputs accept Bangla digits (০-৯) and English digits. Search normalizes digits. Measurements accept fractions (৩৮½, 15¼, 38 1/2) and store exact decimal values. Name search matches across Bangla and English scripts using a transliteration key.
7. **Measurement source.** Each measurement version records whether it was taken from the body or from a sample garment.
8. **Household grouping.** Customers may belong to a household (for example, family members who share one phone number). This is grouping only, never merging.
9. **Restricted women's measurements.** Shops can restrict who can view measurements of female customers via a dedicated permission.
10. **Status link expiry.** Status links expire automatically a configurable number of days after the order is fully delivered or cancelled (default 30), in addition to manual revocation.
11. **Fitting adjustments.** Changes requested at a trial are recorded on the garment as adjustment entries, without editing the original measurement snapshot.
12. **Fabric/job tag.** A small printable tag carries the order number, garment, wearer label, and delivery date, to travel with the fabric through production.
13. **Offline sync rule.** Append-only events (create customer, create order, record payment, stage change, add note) always apply on sync and are idempotent. Edits to existing records carry the base version they were made against; if the record has changed since, the edit goes to a review queue instead of overwriting.

## 3. Technology

- React + TypeScript + Vite, PWA via `vite-plugin-pwa`.
- Dexie (IndexedDB) for local storage.
- Tailwind CSS with a small in-house component kit.
- Bangla font: Noto Sans Bengali or Hind Siliguri, self-hosted and subset, cached for offline use.
- React Router for routing.
- Vitest for unit tests, React Testing Library for component tests, Playwright for end-to-end tests.
- npm workspaces monorepo.
- Static hosting on Cloudflare Pages or Netlify (choice deferred to deployment).

## 4. Architecture

```
darzikhata/
  packages/domain/      pure TypeScript, no UI, no browser APIs, Vitest tests
    money.ts            integer poisha, order totals, discounts, derived balance, credit due
    numbering.ts        per-device order-number series
    measurements.ts     templates, fields, units, fraction parsing, versions, snapshots
    stages.ts           configurable stages per garment type, mapping to summary groups
    orders.ts           orders, items, wearer labels, partial delivery, cancel, rework, adjustments
    payments.ts         advance, payment, refund, correction (append-only)
    permissions.ts      roles as capability sets
    search.ts           digit normalization, transliteration keys, matching
    sync.ts             events with client IDs, idempotent apply, stale-edit detection
    links.ts            status link tokens, expiry, revocation, public view projection
  apps/web/             React + Vite PWA
    data/               Dexie database and repositories (the only storage boundary)
    seed/               demo shop generators
    i18n/               bn (default) and en dictionaries
    ui/                 component kit, including the Bangla numeric input
    mobile/             mobile shell, navigation, step-based flows
    desktop/            desktop shell, sidebar, tables, side panels
    features/           screens shared by both shells where layout does not differ
    print/              receipt, job slip, fabric tag, work-list print layouts
    presenter/          guided scenarios
```

Rules:

- **Event log as source of truth.** Every mutation is a domain event appended to a local log. Current state is a projection of the log. This gives correction history, idempotent sync, and the same model the pilot server will use.
- **Repository boundary.** UI code never touches Dexie directly. It calls repositories in `data/`. The pilot replaces this layer with a server API.
- **Domain purity.** `packages/domain` imports nothing from React, Dexie, or browser globals. Time and ID generation are injected so tests are deterministic.
- **Shell selection.** Desktop shell at viewport width 1024px and above, mobile shell below. A manual override in settings persists per device.
- **Simulated sync.** An online/offline toggle and a "simulate another device's edit" action exercise sync status and the review queue without a backend.

## 5. Domain model

### 5.1 Organization and access

- `Organization` has one or more `Branch` records. A single-location business has one default branch.
- `Device`: id, name, series letter, branch.
- `Staff`: id, name, PIN, role, branch scope (all branches or a list).
- `Role` is a named set of capabilities. Capabilities include:
  `orders.view`, `orders.create`, `orders.edit`, `orders.cancel`,
  `customers.view`, `customers.edit`,
  `measurements.view`, `measurements.view.female`, `measurements.edit`,
  `money.view`, `payments.record`, `payments.correct`, `payments.refund`,
  `work.view.assigned`, `work.view.all`, `work.assign`, `work.updateStage`,
  `links.manage`, `settings.edit`, `staff.manage`, `branches.view.all`.
- Default roles: Owner (all), Manager, Counter, Measurement/Cutting, Production Supervisor, Tailor (assigned work only, no money), Accounts.

### 5.2 Customers

- `Customer`: id, name (Bangla and/or English), optional phone, optional `householdId`, gender (for the restricted-measurement rule), preferences/notes, created at.
- `Household`: id, label (for example "Rahman family"). Grouping only.
- Customers are never merged automatically.

### 5.3 Garment templates and stages

- `GarmentTemplate` (per organization): id, name (bn/en), default price, measurement fields, stage list, active flag.
- `MeasurementField`: key, label (bn/en), unit (`inch` or `cm`), group (for example body, sleeve, bottom), required flag, order.
- `Stage`: key, label (bn/en), optional flag, summary group.
- Summary groups: `unfinished`, `ready`, `delivered`, `cancelled`.
- Example stage lists:
  - Shirt: Booked, Cutting, Stitching, Trial (optional), Ready, Delivered.
  - Bridal: Booked, Cutting, Embroidery, Stitching, Trial (optional), QC (optional), Ready, Delivered.
  - Alteration: Booked, Working, Ready, Delivered.
- Skipping an optional stage is allowed and does not corrupt summary reporting.

### 5.4 Measurements

- `MeasurementProfile`: customer + template, with ordered `MeasurementVersion[]`.
- `MeasurementVersion`: id, date, values (field key to number), unit per value, source (`body` or `sample`), notes, taken by.
- Values are stored as decimal numbers. Fractions are an input and display concern only.
- Units are stored per value. Changing a template's unit affects new entries only and never reinterprets saved values.

### 5.5 Orders and items

- `Order`: id, number, customer, branch, created at, created by, discount (amount and reason), notes, price adjustments, status link (token, created at, revoked at, expiry days).
- `OrderItem`: one per physical garment (two shirts are two items). Fields: template, price, wearer label (optional), measurement snapshot (frozen copy of values, units, source, version id), design notes, fabric note, photos, assigned worker, current stage, stage history, trial date, delivery date, fitting adjustments, rework entries, cancellation (reason, by, at).
- Order total = sum of non-cancelled item prices − discount ± price adjustments.
- Order progress is derived from item summary groups (for example "2 of 3 ready, 1 delivered"). Delivering one item never marks the whole order delivered.

### 5.6 Payments

- `Payment`: id, order, amount (poisha), method (`cash`, `bkash`, `nagad`, `bank`), reference, date, kind (`advance`, `payment`, `refund`, `correction`), corrects (payment id, for corrections), reason, recorded by.
- Amounts on `advance`, `payment`, and `refund` records are positive. A `correction` carries a signed amount (the delta to the record it corrects, for example −50000 poisha when ৳1,000 was entered instead of ৳500).
- Net paid = sum of advances and payments + sum of correction deltas − sum of refunds.
- Balance = total − net paid.
- Negative balance is shown as credit due.
- Payments are never edited or deleted. Corrections and refunds are new records with reasons.
- The UI distinguishes order value from money collected and never labels either as profit.

### 5.7 Sync

- `Event`: id (client-generated UUID), type, payload, device id, staff id, timestamp, entity id, base version (for edits).
- Applying an event whose id was already applied is a no-op.
- Append-only event types always apply.
- Edit event types apply only if the entity's current version equals the base version. Otherwise the event goes to the review queue with both versions visible. A reviewer keeps theirs, keeps the other, or merges manually.
- Sync status values: Online, Offline, Syncing, Needs attention. The status bar shows the unsynced count and last successful sync time.

### 5.8 Status links

- Token: 128-bit random, URL-safe.
- Public projection: shop name and contact, order number, garment names with summary progress, trial and delivery dates, last updated time. Never measurements, prices, payments, notes, or other customers.
- A link is invalid if revoked, or if the order has been fully delivered or cancelled for longer than the expiry period.

## 6. Screens

### 6.1 Mobile

- Bottom tab bar: Home, Orders, Customers, Work, More. Center New Order action.
- Step-based new order flow: customer, garment and measurements (grouped fields, Bangla numeric keypad), design notes and camera photos, prices/discount/dates/advance, review, receipt and share.
- Repeat order: from the customer page, "Order again" copies the previous order's items and asks the user to confirm that the measurements are still valid before snapshotting them.

### 6.2 Desktop

- Persistent sidebar with permission-filtered entries: Dashboard, Orders, Customers & Measurements, Work Lists, Payments, Settings.
- Top bar: global search (`/`), New Order (`N`, inactive while typing), language switch, sync status, active shop, branch, and user.
- Dashboard: summary cards and four simultaneous lists (trials today, deliveries today, overdue, ready for pickup). Financial cards require `money.view`.
- Orders: sortable, filterable, paginated table with visible active filters. Clicking a row opens a right-side detail panel. Filters, search, and scroll position persist. Financial columns are hidden without `money.view`.
- Order entry: three regions. Customer and item list on the left, measurement groups in the center, sticky order/payment summary on the right. Validation errors appear next to fields. Unsaved-change guard on navigation.
- Customers: list beside the profile, measurement tabs per garment, current version versus historical versions and order snapshots side by side, order history.
- Work lists: grouped by worker and stage. Multi-select for assignment or stage change, with a preview listing every selected garment, explicit confirmation, and a per-garment result. No bulk payments and no bulk delivery.
- Payments: open balances table, payment history per order, refund and correction dialogs. Every financial action requires explicit submission. Keyboard navigation never records a payment.
- Keyboard: logical tab order, visible focus, keyboard-operable dialogs and menus, Enter activates only the focused control, Escape closes dialogs with an unsaved-change guard.

### 6.3 Shared

- Settings: shop details, garment template editor (fields, units, groups, prices), stage editor, staff and roles, branches, devices, link expiry, shell override, language.
- Review queue for sync conflicts.
- Print previews and print layouts: A4 receipt (Bangla/English), job slip, fabric tag, filtered work list. Navigation is hidden in print, table headers repeat across pages.

### 6.4 Public status page

- Route `/s/:token`, rendered without app navigation.
- Shows the public projection or a "link expired or revoked" message.

### 6.5 Group orders (basic)

- Items can carry wearer labels.
- Order detail groups items by wearer and shows per-wearer delivery progress.

### 6.6 Branches (basic)

- Branch switcher in the top bar (desktop) and More menu (mobile).
- Branch filter on lists. Staff with a branch scope see only their branches' work.

## 7. Demo layer

### 7.1 Seed shops

Chosen from a picker on first launch:

1. **Rahman Tailors**: solo men's tailor. Shirt, pant, panjabi. Owner only.
2. **Nakshi Boutique**: women's wear. Salwar kameez, blouse, bridal lehenga. Four staff. Trial and QC stages. Restricted women's measurements enabled.
3. **Uniform House**: two branches (shop and workshop). School uniform group order with 12 wearers and partial deliveries.

Each shop has around 30 customers and 40 orders across all stages, mixed payments including one refund and one correction, some overdue garments, and one pending review-queue conflict. Seed data is generated relative to the current date so "today" lists are always populated.

### 7.2 Reset

"Reset demo data" in More/Settings clears the local database and reseeds the selected shop.

### 7.3 Presenter mode

A floating, collapsible panel with scripted scenarios. Each scenario is a checklist that highlights the next control. Steps can be skipped.

1. New customer orders 2 shirts and 1 panjabi for ৳2,400 and pays ৳1,000 up front; the receipt shows a ৳1,400 balance.
2. Repeat order with the measurement-confirmation prompt.
3. Collect one garment; the order stays open.
4. Go offline, create an order and a payment, sync, resolve a conflict.
5. Share a status link, view it as the customer, revoke it.
6. Switch to the tailor PIN; no money is visible.
7. Customize a garment template and its stages.

### 7.4 Simulated device

- Online/offline toggle.
- "Simulate another device's edit" creates a stale-edit conflict for the currently open record.
- Sync runs against an in-browser "server" log that lives in a separate Dexie table, so idempotency and conflict detection are exercised by the real domain code.

### 7.5 Sharing and printing

- Status links are in-app routes. In the demo they resolve only in the same browser, and the UI says so.
- Share uses the Web Share API with a copy-link fallback.
- Print uses the browser print dialog with print stylesheets. "Save as PDF" in the browser produces correct Bangla text.

### 7.6 Labeling

The header shows "DarziKhata (ডেমো)" so the demo is never mistaken for a live system.

## 8. Testing and quality

### 8.1 Domain tests (test-first)

- Balance with partial payments, refunds, corrections, discounts, cancellations, and credit due.
- Editing a measurement profile does not change existing order snapshots.
- Delivering one item leaves the order open, and progress counts are correct.
- Skipped optional stages map correctly to summary groups.
- Applying the same events twice creates no duplicate orders or payments.
- A stale edit goes to the review queue and does not overwrite.
- Tailor role cannot see money; restricted female measurements are hidden without the capability.
- Digit normalization, fraction parsing, transliteration search.
- Status link expiry and revocation; public projection contains no private fields.
- Order numbering is sequential per device series and never collides across devices.

### 8.2 Web tests

- Component tests for the Bangla numeric input and the order-entry flow.
- Playwright end-to-end tests for presenter scenarios 1, 3, and 4 at 375px and 1366px widths.

### 8.3 Manual checks before completion

- Bangla rendering in print preview and "Save as PDF".
- Desktop at 1366px, 1920px, and 150% browser zoom.
- Keyboard-only order entry on desktop.
- Installed PWA on a real Android Chrome device, including offline launch.

### 8.4 Performance budget

- Initial JavaScript under roughly 250 KB gzipped.
- Routes lazy-loaded.
- Bengali font subset and cached by the service worker.
- Photos compressed client-side before storage.

## 9. Deployment

Static build deployed to Cloudflare Pages or Netlify from git. The PWA is installable and works offline after first load.

## 10. Out of scope for the demo

- Real backend, authentication, and cross-device sync.
- Automated SMS or WhatsApp messaging.
- Payment provider integrations.
- Capacity planning.
- Notebook OCR import.
- Worker wages, inventory, consolidated multi-branch reporting, branch transfers.
