# DarziKhata — Product Idea Details

Version: 0.3 • Date: 3 October 2026 • Status: proposed pilot specification

## 1. Product concept

DarziKhata is a Bangla-first app for tailoring businesses of all sizes and types in Bangladesh, from individual tailors to large tailoring shops, specialist studios, boutiques, production workshops, and multi-branch tailoring businesses. It keeps customer measurements, garment orders, production progress, delivery dates, and payments in one place, with separately designed mobile and desktop experiences.

**Core promise:** Find the right measurements, know what needs finishing, and know what each customer owes.

The first product is an installable web app with separately designed mobile and desktop interfaces sharing the same backend, shop records, permissions, and business rules. Desktop is a complete workspace for laptop and computer use, with its own navigation, information density, and keyboard/mouse workflows; it must not merely enlarge the mobile interface. Customers receive receipts and status links without needing an account or app installation. AI is a development aid; AI features are not required to use the product.

## 2. Target users and problems

The product serves all kinds of tailoring businesses; business size is not an eligibility restriction. Target segments include:

- Individual tailors and small neighborhood shops.
- Medium and large tailoring shops with several counters and workers.
- Men's, women's, and mixed-garment tailoring businesses.
- Bespoke suit, bridal, occasion-wear, designer, and boutique studios.
- Alteration and repair specialists.
- Uniform and group-order tailoring businesses, with measurements and delivery progress tracked per wearer or garment where required.
- Central production workshops and multi-branch businesses.

Buyers include owners and business administrators. Daily users may include branch managers, counter staff, measurement specialists, cutting masters, tailors, production supervisors, and accounts staff. Permissions must reflect their responsibilities.

The pilot can introduce capabilities in stages, but it must recruit varied tailoring businesses and must not define the product permanently around a small, single-location shop. Advanced branch and production features require their own validation before claiming complete support for those operations.

Problems to validate with pilot shops:

- Measurements are scattered across notebooks and hard to retrieve.
- Order details, fabric identification, and design instructions get separated.
- Staff struggle to see upcoming trials, overdue garments, and unfinished work.
- Advance payments and remaining balances are hard to reconcile.
- Customers repeatedly call to ask whether clothes are ready.
- Owners cannot easily see which worker has which garments.
- Larger teams need clear handovers between measurement, cutting, stitching, trial, quality checking, and delivery.
- Specialist and group-order businesses need their own garment fields, milestones, and wearer-level tracking.
- Multi-branch businesses need controlled access to shared records and visibility into work moving between branches and workshops.

These are product hypotheses, not findings from completed customer interviews.

## 3. Main workflow

1. Search for a customer by name, phone number, or order number; create a customer if needed.
2. Select each garment, quantity, measurements, design notes, and optional reference/fabric photos.
3. Enter item prices, trial date if needed, delivery date, and any advance payment.
4. Save the order and issue a numbered receipt, printable or shareable.
5. Assign garments to workers and update progress.
6. Use today's work list to prioritize trials and deliveries.
7. Record collection, remaining payments, and garment handover.
8. For repeat orders, reuse a previous measurement profile only after confirming it is still appropriate.

Example: A customer orders two shirts and one panjabi for ৳2,400, pays ৳1,000, and receives a receipt showing a ৳1,400 balance. Staff can track each garment separately. Collecting one shirt must not mark the whole order delivered.

## 4. First-version features

### Shop setup and staff access

- Shop name, contact details, address, logo, currency in BDT, and local date/time handling.
- Configurable garment types and prices.
- Owner controls staff membership and permissions.
- Each shop's data is isolated from every other shop.
- Owner: all shop functions. Counter staff: customers, orders, receipts, collections. Tailor: assigned garment instructions and progress, without financial access by default.
- Model the business as an organization with one or more branches/workshops; independent businesses remain isolated, while access within an organization is explicitly scoped. A single-location business starts with a default branch. Full branch-transfer and consolidated-reporting workflows are staged as described in Section 9.
- Add manager, measurement/cutting, production-supervisor, and accounts permissions as validated roles, without requiring a solo tailor to configure a complex organization.

### Customers and measurements

- Customer name, optional contact number, preferences, and order history.
- Configurable garment-specific templates, with starting examples such as shirt, pant, panjabi, and salwar kameez. Do not hard-code these as the only supported garments; validate additional templates for suits, bridal garments, uniforms, and alterations with relevant businesses.
- Measurement units displayed explicitly; changes must not silently reinterpret saved values.
- Custom measurement fields for a shop's terminology.
- Measurement versions carry dates and notes. Each order retains its own measurement snapshot, so editing the customer profile does not change historical orders.
- Customer records are never merged automatically merely because they share a phone number.

### Orders and garment details

- Searchable order reference and clear item-level quantities and prices.
- Reference photos, fabric identification, special instructions, and alterations.
- Trial and promised delivery dates, worker assignment, and progress per garment.
- Default statuses: Booked → Cutting → Stitching → Trial, if needed → Ready → Delivered. Allow business-specific garment stages and optional trial/quality-check steps without forcing alterations or specialist work through irrelevant stages. Preserve a common distinction between unfinished, ready, cancelled, and delivered items for reporting.
- Cancellation and rework are explicitly recorded. Skipped trial stages are allowed.
- Order summaries show partial completion and partial delivery accurately.
- Support simple grouped orders with wearer labels and garment-level measurement snapshots, assignments, and delivery progress. Advanced contract, bulk-pricing, and batch-production controls are later scope.

### Payments and receipts

- Record cash and manually confirmed bKash/Nagad/bank payments with amount, date, method, and optional reference.
- Record advances, partial payments, refunds, and price adjustments with reasons.
- Derive the balance from the order total and payment history; do not maintain an independently editable balance field.
- Preserve a correction history instead of silently overwriting a payment.
- Distinguish money collected from order value. Do not label either as profit without recording relevant costs.
- Bangla/English printable receipts and PDF downloads with shop details, garments, dates, total, payments, and balance.
- Payment recording does not imply a direct payment-provider integration.

### Dashboard and work lists

- Trials today, deliveries today, overdue garments, ready-for-pickup orders, and outstanding balances.
- Filters by date, worker, status, and customer; scope branch/workshop views according to access as multi-branch workflows become available.
- Show actual status and date clearly; sorting priority does not predict whether a deadline is feasible.

### Customer status links

- Staff can share a private, unguessable, revocable order link through their usual messaging app.
- Customer view shows garment summary, progress, trial/delivery dates, and shop contact information.
- Measurements, internal notes, and other customers' information remain private.
- Public status shows the last successful update time. New links and updates need an online connection.
- Automated SMS and WhatsApp messaging are later integrations; manual sharing is sufficient for the pilot.

## 5. Offline behavior and reliability

Single-device offline operations are part of the proposed first paid pilot: view previously downloaded shop records, create customers/orders, record payments, and update progress after initial online setup and synchronization.

- Show Online, Offline, Syncing, or Needs attention; show unsynced changes and last successful sync.
- Persist edits locally before acknowledging a save. Give offline orders a stable temporary reference that remains traceable after sync.
- Queue changes and retry safely; repeated synchronization must not duplicate orders or payments.
- For the pilot, designate one device for offline writes per shop. Other devices must not independently edit the same records offline.
- This is a pilot synchronization limit, not a restriction on target business size. Larger teams can work concurrently online with stale-edit checks. Validate their offline requirements before claiming support for simultaneous offline counter or branch operations.
- Detect stale/conflicting edits at sync and request a review rather than silently losing a change.
- Cached files/photos are only available if downloaded. Queue new uploads where supported and show failures.
- Initial login, new-device access, current cross-device data, and customer-link updates require connectivity.
- Offline data can be lost if a device is lost or browser storage is cleared. Explain pending-sync status and offer exports/recovery guidance.

Use managed hosting, HTTPS, monitored errors, and alerts for outages. No promise of literal 100% uptime. Maintain database backups, a separate policy for uploaded files, and test restoration before relying on the system for live shop records. Offline mode keeps supported local functions operating during connection or backend interruptions; it does not keep all online services available.

## 6. User experience

- Bangla default, English optional; support Bangla and English names and search.
- Comfortable touch targets, readable text, few required fields, and straightforward terms.
- Allow customization of garment templates without requiring technical knowledge.
- Make repeat ordering faster than new ordering.
- Installation optional; access through a browser link. Optimize for affordable Android phones.
- Printed/PDF text must render Bangla correctly.
- Aim for repeat-customer order entry within one minute, measured with real tailors; this is a target to test.
- Keep common tasks simple for individual tailors while exposing additional roles, configurable garment stages, group orders, and branch/workshop controls when the business needs them.

### Desktop-specific interface

Desktop is a first-version requirement, not a later add-on. Design and review desktop and mobile screens separately while keeping their core capabilities consistent.

- **Application layout:** Persistent sidebar for Dashboard, Orders, Customers & Measurements, Work Lists, Payments, and Settings, with entries shown according to permissions. A top bar contains global customer/order search, New Order, language selection, and connection/sync status. Keep the active shop and signed-in user visible.
- **Dashboard:** Use the available width for summary cards and simultaneous lists of deliveries, trials, overdue work, and ready orders. Show actionable rows with customer, order, date, and progress rather than stretching a single mobile card column. Financial cards remain permission-controlled.
- **Order workspace:** Provide sortable, paginated tables with order reference, customer, garment summary, trial/delivery dates, progress, assigned workers, total, and balance. Financial columns are hidden for users without access. Support combined filters, clear empty states, and visible active filters. Keep the search, scroll position, and filters when opening and closing an order detail panel.
- **Order entry:** Use a multi-column form with customer information and garment items alongside an order/payment summary. Group related measurement fields logically, display units beside values, and allow several garment items to be entered without repeatedly leaving the screen. Show validation errors next to the relevant field and protect unsaved edits when navigating away.
- **Customer workspace:** Show a searchable customer list beside the selected customer's profile, garment measurement tabs, and order history. Distinguish current measurements from historical order snapshots. Reference photos and older measurements can be reviewed beside the active form without overwriting it.
- **Production work lists:** Provide date-based tables grouped or filtered by worker and garment stage, with trial and delivery dates visible together. Staff can inspect several assignments without opening each order. Include an explicit preview and confirmation for permitted batch worker assignment or status changes, with a result for every selected garment. Do not bulk-create payments or silently mark whole orders delivered.
- **Payment workspace:** Provide searchable order balances and payment history with clear totals and correction/refund actions according to role. Financial changes require explicit submission; table navigation or keyboard shortcuts must never record a payment automatically.
- **Keyboard and mouse:** Support logical Tab navigation, visible focus, keyboard-operable menus/dialogs, and documented shortcuts for search and New Order that do not override browser/OS shortcuts or activate while typing. Enter confirms the currently focused control only; Escape closes a dialog with unsaved-change protection. Essential actions must not depend on hover.
- **Printing and exports:** Provide print previews and layouts for A4 receipts, measurement/job slips, and filtered work lists. Keep sidebar/navigation out of printed output, repeat table headers across pages, and preserve readable Bangla text. Support browser printing and PDF download; specialized thermal-printer integration is later scope.
- **Desktop offline use:** A desktop can be the shop's designated offline-writing device under Section 5. Display locally saved/pending changes and per-record sync problems clearly. Opening the app on a second computer must not imply that unsynced changes from the first device are already available.
- **Window behavior and accessibility:** Verify the interface at common laptop and large-monitor widths, including browser zoom. Adapt side panels and navigation when space is limited; allow horizontal scrolling within wide tables rather than clipping controls or forcing whole-page scrolling. Support keyboard-only use and readable contrast.

The mobile interface remains touch-oriented, with compact navigation, camera-friendly input, and sequential forms. Desktop and mobile expose the same authorized core operations; their layouts and interaction patterns are intentionally different. This does not require a native desktop installer or change the initial web-app delivery model.

## 7. Product differentiation to validate

Existing tailoring software already covers many basic features. DarziKhata should compete on demonstrated ease of use and operational reliability:

1. Fast phone-based order entry.
2. Measurement templates that match local shop practices.
3. Practical offline entry with visible sync status.
4. Simple customer status links.
5. Easy onboarding from existing notebooks, initially assisted and manual.

Later, test a capacity planner that estimates whether a new order can meet its date using remaining work and worker availability. It must explain assumptions and allow owner overrides; it cannot guarantee delivery.

## 8. Monetization hypothesis

Test an entry-level monthly subscription of ৳300–৳700, initially around ৳500 for the core product. This is a starting pricing hypothesis, not a fixed price for every business size. Validate additional pricing for larger teams, multiple branches, higher usage, and advanced workflows. Final pricing and staff limits depend on pilot feedback. Optional paid onboarding can cover measurement entry or data migration. Messaging charges, if added, should be priced separately and disclosed.

Do not build multiple subscription tiers before establishing willingness to pay. Hosting, support, and messaging costs must fit the revenue from actual paying shops.

## 9. Later scope

Worker piece-rate wages, material inventory, automated messaging, direct payments, full multi-branch administration and consolidated reporting, branch/workshop transfers with handover history, advanced uniform/group-order contract and batch-production tools, full multi-device offline editing, customer booking, notebook OCR, and capacity prediction. These extend a product intended for all tailoring businesses; they do not narrow its audience to small shops.

Avoid a tailoring marketplace, full ERP, native mobile apps, or AI body-measurement estimation in the initial product.

## 10. Foundation for future apps

Build DarziKhata as a standalone app with reusable modules for shop accounts, permissions, localization, UI components, notifications, file handling, PDF/export utilities, monitoring, and offline synchronization primitives. Reuse data and business logic across platform-specific desktop and mobile views; shared components must not force identical page layouts or navigation.

Keep garment measurements, tailoring workflow, and delivery-capacity rules in DarziKhata. Later products get separate deployments and databases initially. Share mature packages as common needs emerge in the second app; avoid copying security-critical fixes across unrelated codebases or forcing every app into a universal business schema.

## 11. Pilot and acceptance criteria

Recruit five varied tailoring businesses, including a small shop, a larger staffed operation, and a specialist or group-order business, and use real orders for at least one complete order-to-collection cycle. Include a multi-branch operator in discovery and validate branch workflows before advertising that capability as complete. Begin with setup, customer/measurement entry, orders, payments, work lists, and receipts; add customer links and offline writes before calling the pilot offline-capable.

Release checks:

- One shop cannot retrieve another shop's data or files.
- Updating measurements does not alter past orders.
- Partial payments, refunds, cancellations, and partial deliveries behave correctly.
- Offline saves survive an app restart and sync without duplicate money records.
- Conflicting updates are visible and recoverable.
- Shared links expose only the intended information and can be revoked.
- Receipt totals and Bangla rendering are correct.
- Database and uploaded-file recovery procedures are demonstrated.
- Desktop and mobile are reviewed as distinct interfaces, and the same authorized core tasks can be completed on both.
- Desktop order search, filters, detail panels, keyboard entry, and permission-controlled columns work at laptop and large-monitor widths and with browser zoom.
- Desktop receipts and work lists print without application navigation, clipped columns, missing Bangla characters, or incorrect totals.
- Batch actions confirm the selected garments, obey permissions, and report partial failures; keyboard shortcuts do not trigger unintended financial changes.
- Offline changes on the designated desktop persist across restart and sync safely under the same single-device rules as mobile.
- Different tailoring businesses can configure garment fields and applicable stages without code changes; skipped stages do not corrupt progress reporting.
- Group-order garments retain the correct wearer and measurements, and partial deliveries remain accurate.
- Multiple authorized staff can work online without silently overwriting stale edits; organization isolation and role permissions remain enforced.

Pilot success targets: at least three of five shops voluntarily pay to continue; staff use the app for most eligible new orders; repeat-order entry is faster than their previous method; no unexplained balances or lost orders. These are proposed decision thresholds, not forecasts.

## 12. Decisions to validate before implementation

Exact garment fields and stages for each tailoring segment, required receipt formats, supported payment corrections, role and branch permissions, group-order needs, device-sharing practices, concurrent online editing, whether single-device offline entry is sufficient for each pilot business, and willingness to pay across business sizes. Start with customer interviews and a clickable workflow, then implement a usable pilot that tests the core workflow across varied businesses.
