# Changelog

All notable changes to DarziKhata are listed here, newest first. The project has no tagged releases yet, so entries are grouped by milestone and dated by when the work landed.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Phone garment card shows a tinted status band with the current stage, "step n of m", the due countdown and a segmented progress bar, so the stage is no longer repeated in a pill and a tracker.
- Trial date and assigned worker appear as small labelled tiles, side by side when both exist.
- A delivered garment's footer says when it was delivered, with the more-actions button beside it, instead of a lone button.
- The order status line on the phone shows a status pill, the garment counts and one coloured segment per garment.
- The phone header shows a person icon for the signed-in user in place of an initial.
- New tilted-shears app icon, shown in the sidebar, the phone header and the sign-in page.
- Popups on a phone are bottom sheets: full width, flush to the bottom edge, with rounded top corners, a drag handle and a slide-up. Desktop keeps the centred card.
- Menu rows have a tinted icon and a chevron.
- A cancelled garment on the phone has the more-actions menu beside its reason.

### Changed
- The job slip on a desktop reads as a chart: the shop and the title like the receipt, then the order number, the customer with their phone, and the order date. Each garment shows who wears it and who is making it, its trial and delivery dates as blocks (delivery filled in black), its measurements as one strip of cells with the names above and big numbers below and the unit written once, and its design, fabric and fitting changes underneath. Phones keep the list.
- The printed work list on a desktop is laid out like the receipt: the shop and the title at the top, then the print date, any filters, and how many garments and how many are late. Each group's garments are split into Late, This Week and Later by delivery date, and each row starts with the delivery date as a calendar block (filled in black when late). The garment's stages follow as a row of circles with the done ones filled and the current one ringed, so a worker can fill each one in with a pen as it is finished. Phones keep the plain table.
- On a desktop, opening an order or a customer from the list no longer makes the page jump: the order panel opens out from the right edge while the list makes room, and the customer list narrows smoothly to its column as the profile fades in. Moving between records inside an open panel stays still, and there is no motion when the system asks for less.
- The order list's search box shrinks (down to a limit) before the sort control has to wrap to a second line.
- On a desktop, the order's More menu and each garment's menu open as a popup that grows out of the button, like the account menu. A header names the order (with the customer, date and branch) or the garment (with who wears it and its stage); the actions sit as rows in labelled cards: the order's papers, the order's actions, and the garment's actions with Cancel in a card of its own. There is no Close button; Esc or a click outside closes it. Phones keep the sheet.
- The desktop review queue:
  - The waiting changes are listed on the left with who made them, when, and how many fields differ (or that the server refused the change). The chosen one fills the right.
  - Each field reads as one line: what the record holds now, an arrow, and what the change wanted. Ticking Take New on some fields and pressing Save My Picks keeps just those, replacing the separate Merge by Hand step.
  - A View Profile or View Order button beside the name opens the record, and the explanation sits as a note above the fields so both panel headers line up.
  - Settling a change shows the result at the top of the list; an empty queue shows a tick and "Nothing to review". Phones keep the list of cards.
- The desktop order page (opened full size from the order beside the list):
  - The customer leads the header with their name, phone, a Call button and a View Profile link; the order number, its status and who took it sit on the right.
  - A strip of key numbers follows: how many garments are ready, the next delivery, and the total, paid and amount owed for staff who may see money.
  - Tabs show the garments, the money or the status link one at a time. Beside them are the receipt, job slip and tags as joined icons, then Share Status Link (which opens the link tab) and Order Again.
  - Garments are the same blocks as in the order panel, two or three across, under a heading per wearer when the order names who wears what.
  - The header, numbers and tabs stay in place while only the section below scrolls. A bar along the bottom shows the amount owed and progress, with Hand Over (asking which garment when several are ready) and Take Payment.
- Print pages and the status page on a desktop:
  - Print pages have one toolbar along the top: back and the page's name, tabs between the order's receipt, job slip and fabric tags (the receipt only for staff who may see money), then Share, the paper's language and Print. The paper shows as an A4 sheet.
  - The receipt is a cash memo: the shop's name centred at the top, the order and customer, each garment with a dotted line out to its price, the totals with the amount owed boxed, and a tear-off slip at the bottom for the customer to bring when collecting, with the order number, the number of garments, the next delivery date and the amount owed.
  - The customer's status page is a navy banner with the shop, a Call the Shop button and the language button, then the headline and one bar per garment. Each garment is a card whose steps (making, ready, delivered) run top to bottom, with the trial and delivery dates.
  - Phones are unchanged.
- Account and sync popups on a desktop:
  - The account popup shows who is signed in with Switch User, then language, colour theme and screen layout always in view instead of rows that expand, then the demo controls.
  - The sync popup shows the status with the online switch, a full-width Sync Now button with what is waiting, a highlighted link when changes need review, and the other-device button with its hint centred under it.
  - Neither popup shows a title, since the first line already says what it is; screen readers still announce it.
  - Both grow out of the button that opened them while the page dims, and they shrink away on closing. Only the card moves, grown as one picture and drawn sharp once it lands, so its text does not jitter. The Reset Demo Data and Choose Another Sample Shop confirms do the same. Reduced motion turns this off. Phones are unchanged.
- Settings editors on a desktop:
  - Garments are a table with each garment's price, measurement count, stages and status. Opening one slides its editor in from the right with three tabs: Name and Price, Measurement Fields, and Stages. Fields sit under their group, with an inch / cm toggle on each. Stages sit in three boxes (In Progress, Ready, Delivered), each with its own Add button, so stages always stay in the order tracking needs. A refused save opens the tab with the problem.
  - Staff are a table where a person's role and on/off switch save at once. The pencil opens their name, PIN, role and branches in a side panel, where each role card says what that role can use.
  - Branches are a list beside the chosen branch's editor, with its devices (each can move to another branch) and the people who work there.
  - The side panel glides in from the right while the page dims, and slides away when it closes or saves. With unsaved changes, the question to leave shows over the open panel first. Reduced-motion settings turn the movement off.
  - Phones keep the existing screens.
- On a desktop, taking a payment, refunding, changing the discount, adjusting the price and correcting a payment open in one wider window. The amount is in large type with suggested amounts under it (the full balance, half, round amounts, 5% or 10% off, no discount), the payment method is a row of tiles, and the TrxID box only appears for bKash, Nagad or bank. Beside it, the order's billed total, paid and balance show their old and new values as you type, with one line on where the order will stand after saving, and the save button names the amount. Phones keep the smaller sheets.
- Taking measurements on a desktop fills the window. A bar across the top has the title, the customer and a tab for each garment with when it was last measured. Below it, one grid puts the new values beside up to five earlier versions, newest first, with values that moved between versions in amber and a badge on each new value that differs from the last one. Clicking any earlier value copies it into the new column, and "Use These" above a column copies that whole version. Enter moves to the next field. Measured from, notes, how many changed and how many are still missing, Cancel and Save sit at the bottom.
- The desktop customer form (new and edit) is a card as tall as the window: name and the other-script name, phone and gender, household side by side, notes below, and Cancel and Save at the bottom with a note when there are unsaved changes. Beside it, a preview shows the profile as it will look while you type (avatar, name, phone, gender and household, and who else is in that household), and for a saved customer their orders, open orders, what they owe, their last visit and when each garment was last measured.
- The desktop new order form fills the window in three parts. A bar across the top has the title and the customer: a search with results under it and a New Customer button, a new customer's fields in one row, or the chosen customer with Profile and Change Customer links (Change opens a search) and tiles for what they owe, their open orders and their last visit. Below it, the garments are tiles with price, measurement status and wearer, plus an Add Garment tile with the list of garments, over the chosen garment's measurements and details. Beside them, a receipt lists each garment and its price as it is typed, with discount, advance and notes, and the totals and Save stay in view at the bottom.
- The desktop work page opens on the list, and the view switch shows List first and Board second. Choosing Board is remembered on the device, so leaving Work and coming back shows the board again until the list is chosen.
- The desktop sidebar's header shows the shop name with the branch and app name under it, level with the top bar and with a line below that continues the top bar's edge. Menu items are larger, Payments and Settings sit below a plain line instead of an "Accounts & Shop" title, and a tab on the sidebar's edge folds it to a narrow rail of icons with short names, counts as small badges (late work in the usual amber), a sync dot and the person's avatar. The choice is remembered on the device. Desktop Home now fills the width like the other pages, so it uses the room the rail frees.
- The desktop top bar's search fills the free space, has a search icon and says what it finds (order number, customer name or phone). Beside it are a বাংলা | English switch, a button that steps the colour theme through light, dark and match device, and New Customer next to New Order.
- Desktop Home fits the screen: the four lists fill the space under today's panel with coloured headers and icons, show as many rows as fit, and end in a "See n More" link instead of scrolling. Today's deliveries open in Orders with today's date already set.
- Settings sections are cards: the shop details are grouped into name, contact, status links, measurement privacy and a receipt preview, with Save and Discard changes at the bottom; garments show their price, measurement and stage counts and their stages in order, and the whole card opens the editor; staff show their role, branches and whether they are active; each branch lists its own devices, each with a select to move it. On a desktop the four sections are tiles above one full-height card, each tile saying what is in it.
- The desktop payments page is one full-height card: tiles for money due, credit due and money taken today switch the list, and each row shows the customer, a paid bar, the last payment and the balance. Clicking a row opens the customer beside the list: what they owe across all their orders, their orders with the picked one checked, its garments, price breakdown and payments (each with a correct button), and Take payment, refund, discount and price adjustment at the bottom.
- The desktop work page is one full-height card: worker tiles show each person's count and how many are late, board and list are a toggle in the header, each board column and the list scroll inside the card, clicking a card or row ticks it, late garments are tinted, and the selection's actions sit in the card's footer.
- The desktop orders page is one card as tall as the window: the view tabs are tiles with an icon and a large count (Late and Owed in amber, Owed with the total), the filters sit under them, and the table scrolls inside the card with its header in view, the range and page buttons at the bottom. An open order sits beside it in a wider panel of its own; the table then drops the delivery and worker columns and shows the time left under each order number.
- The desktop customers page is a directory: a full-width list with phone, garments measured, orders (with how many are open), last visit and what each customer owes, plus filter tiles with counts for all customers, those who owe money (with the total) and those with open orders. Opening a customer narrows the list to a column and shows their profile beside it, with a close button. The list and the profile are cards as tall as the window that scroll on their own, and the profile's header and actions stay in view.
- Phone payments page shows one card per unpaid order (customer, order number, amount due, paid bar) under a total, so nothing scrolls sideways; the page title is dropped on phones.
- The customer screen on a phone has the same kind of bar: what they owe, tinted "new measurement" and "order again" buttons and a chevron. It starts hidden as a small "new measurement" tab on the tab bar's edge.
- In that customer bar, "new measurement" now sits to the right of "order again".
- The sample shop picker opens with a navy header holding the app's mark and name, the language button, the title and a line on what the demo is. Each shop is a full-width row with an icon, its name and what it shows, and the note about the demo sits centred under them.
- English labels, buttons and headings use title case, for example "Open This Shop" and "Work Lists".
- The sync sheet on a phone is a settings-style list: an online switch with the last sync time, "sync now" with the waiting count, and a review row when something needs checking. It has no title, no demo heading and no Close button on a phone.
- The account sheet on a phone shows the signed-in person with an avatar, payments and settings as icon rows, language, theme and layout as rows that expand in place, and switches for the measurement keypad and presenter mode. It has no title and no Close button.
- The drag handle on a bottom sheet stays in view while the sheet scrolls.
- The customer list on a phone has a rounded search box with a "+" button beside it, and each customer is a card with an avatar and, for staff who can see money, what they owe.
- Headings, big figures, money and the keypad use Noto Serif Bengali instead of Anek Bangla. Body text stays in Noto Sans Bengali.
- Bangla measurements are written as decimals (৩৮.৫) instead of ½ ¼ ¾, which no Bangla font has, so they looked English beside Bangla digits. The keypad's fraction keys type .২৫, .৫ and .৭৫ in Bangla, and English keeps the fraction signs. Typed fractions such as ৩৮ ১/২ are still understood.
- The phone payment bar shows only while there is a balance to take. A fully paid order has no bar, and receipt printing stays in the more menu.
- The phone payment bar is attached to the tab bar, with no gap, showing the balance, a tinted print button and a tinted "take payment" button. It starts hidden as a small balance tab on the tab bar's edge, and the chevron opens or hides the whole bar. While it is open, New order is a regular-sized tab; when hidden or absent it is raised as before.
- The status link popup has one heading instead of two.
- The more menu sheet on a phone has no title and no Close button; tapping outside closes it.
- A cancelled garment on the phone shows just the reason, without the "Cancelled:" prefix.
- The order list no longer shows the "n orders" line; the status chips already carry the counts.
- The phone payment bar is a single soft button, "Take payment" with the amount owed, next to print. Hand over is no longer in the bar; each ready garment has its own Hand over button, and a production supervisor with no money access sees no bar.
- The garment's main action is one filled button named for the next stage, with the notes and history row below it.
- Customer profile tabs and the garment chips on the measurements screen share the full width on a phone.
- The desktop order panel centres each garment's title, stage pill and more-actions button on one line.
- The take payment buttons no longer carry an icon.

### Fixed
- The New Customer plus button beside the narrowed customer list shows a full-size plus; it had been squeezed to a dot.
- The Open Full Page button in the order beside the list is the same size as the More and Close buttons next to it, so the three line up.
- The desktop customer directory card keeps its full height when the list is short.
- The desktop customer profile panel shows the customer's second name under their name.
- Switching garments on the measurement page no longer keeps the previous garment's values in the form.
- On the desktop new order form, a newly added garment is chosen in the same click, so typing straight into its measurements can no longer land on the previous garment (which left the new one missing a measurement and the order refused on save).
- Taking new measurements for a customer on a phone uses the in-app keypad when it is on, instead of always opening the phone's keyboard.
- The desktop garment menu no longer offers Cancel on a garment that is already cancelled.
- The payment bar no longer covers the top of the raised New order button, and pages leave room for both.
- Switching user no longer signs the current person out first. The picker opens with the person still signed in and has a Cancel button, and they are only switched once a PIN is entered.

## 2026-10-04: Dark mode refinement

### Added
- Refined dark mode tokens, plus raised-layer, focus, chip and paid-track tokens.
- Browser bar and installed-app colour follow the chosen theme.
- The orders table groups an order's garments by stage.
- Tests that check dark and light token contrast and block colour drift.

### Changed
- The app opens in light mode unless a theme was chosen on this device.
- The compact language button spells out বাংলা.

### Fixed
- Printing stays on white, including with the Device theme on a dark phone.
- Scrolling dialogs stay crisp in light mode, and the dialog edge shows in dark mode only.
- The welcome title stays light blue.

## 2026-10-04: Mobile and desktop redesign

### Added
- Redesign colour tokens, a tone palette for stages and the Anek Bangla display font, with shared components: stage pill, due label, avatar, paid bar, chips, tracker and keypad.
- Phone shell with a raised New order tab bar and an account menu.
- Phone Home with a today panel, money cards and one combined to-do list.
- Phone orders list with status chips, a trial filter, a sort sheet and redesigned cards.
- Phone order detail with a money card, garment cards and a bottom action bar.
- Phone work list with a three-step switch and one-tap move-on cards.
- Phone customer profile with a header, number strip, tabs, change badges and a bottom bar.
- Measurement tile grid with an optional keypad on the phone order flow, and a setting in More to turn the keypad on or off.
- Customer-facing status page with a ready headline, a segment bar and a pinned call button.
- Desktop sidebar with counts, sync status and the signed-in person, and a slimmer top bar.
- Desktop view tabs, filter chips, selectable tables, a richer order side panel and a three-column order form with measurement status and change highlights.
- Desktop work board with worker chips, a board and list switch and a selection bar.
- Desktop Home with a today panel, a money card and four lists, and a printable work list for today.
- Desktop customers page with a profile header, stat tiles and a measurement comparison table.
- Order drafts are kept automatically, with a worker pick per garment.
- Deploy of the static app to GitHub Pages under a base path.

### Fixed
- Many accessibility and polish fixes from review: view tab arrow keys, filter popover closing on focus loss, dialogs owning Escape, close buttons on action sheets, focus rings, truncation and dark-mode row contrast.

### Removed
- Netlify deploy. GitHub Pages is the only deploy for now.

## 2026-10-03: Colour scheme and digits

### Changed
- Blue and slate colour scheme, with a light, dark or device theme switch in More.
- Noto Sans Bengali is used so Bangla digits, including 1, look standard.

## 2026-10-03: Demo layer

### Added
- Sync with an in-browser demo server, with a sample conflict in every shop, a sync status in the header with an online switch, and a review queue for changes that clashed.
- Presenter mode with guided scenarios, and tests that run them end to end at phone and laptop widths.
- CI that runs every check.

### Fixed
- Repeat orders show the measurement confirmation, demo reset copy is honest, and pending changes sync on reload.
- Dialogs render in the page body so the bottom bar cannot cover them.

## 2026-10-03: Operations

### Added
- Dashboard with today's lists and money.
- Work lists with previewed batch assignment and stage moves, and a printable work list.
- Status links: create, share and turn off, with a public page for customers.
- Group orders shown by wearer with each wearer's progress.
- Settings for shop details, link expiry and the measurement restriction.
- Editors for garment templates, measurement fields and stages, for staff (with self-protection), and for branches and devices, with a per-device branch switcher.

### Fixed
- A batch keeps going when one garment fails to save.
- Customer profile orders are scoped to the chosen branch, and Settings shows for staff managers.

## 2026-10-03: Core workflows

### Added
- Customer list and profile with households and order history, and a customer form with stale-edit protection.
- Measurements per garment with versions, comparison and snapshots.
- Order entry: step by step on the phone, three columns on desktop, with repeat orders and device photos.
- Orders list with filters, paging and a detail panel; garment cards with stage moves, hand-over, cancellation and fitting changes.
- Payments, refunds and corrections, plus a payments page.
- Receipt, job slip and fabric tag print layouts with sharing.
- Global search with `/` and `N` shortcuts on desktop.

### Fixed
- Order save guards against a double submit, unreadable money input and bad quantities.
- Hand-over needs confirmation when delivering through the stage picker.

## 2026-10-03: Foundation

### Added
- Domain package: money in integer poisha, measurements and versions, configurable garment stages and templates, roles with capabilities and staff PIN checks, cross-script customer search, per-device order numbering, an append-only event log with idempotent sync and a review queue, status link tokens and dashboard and work lists.
- Web app: three sample shops generated from domain events, an IndexedDB event store with demo start and PIN sign-in, Bangla-first i18n with money and date formatting, a UI kit with a Bangla number field and PIN pad, role-based navigation, desktop and mobile shells, and an installable PWA build.
