# DarziKhata Dark Mode Refinement Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Keep `npm test`, `npm run typecheck` and `npm run e2e` green at the end of every task.

**Goal:** Bring dark mode up to the same standard as the light redesign. The dark values added during the redesign were a first pass. They pass text contrast, but the layout loses structure in dark: large primary buttons glare, the navy panel and selected chips vanish into the background, orange warnings turn muddy brown, the paid bar's track disappears, and floating bars and dialogs rely on shadows that do not show on dark surfaces.

**Mockups:** [DarziKhata Redesign canvas](https://claude.ai/artifact/KQskM4rB8rtAWA3p2Aor1p), page **ডার্ক মোড**: the colour table, real screenshots of the app in dark mode today beside the same screens with the proposed values, and a second comparison of the navy ground against the neutral slate ground this plan uses. The colour table and the first comparison show the earlier navy ground; where they differ, the values in this plan win.

**Architecture:** Mostly token values in `apps/web/src/index.css`, plus a few new tokens where one token was doing two jobs that only clash in dark (`--brand` as both a fill and a text colour, `--navy` as both a panel and a selected state). Light mode looks the same after this plan: every new token's light value equals what the light theme uses today.

**Builds on:** `main` with both redesign plans merged.

## Research behind the choices

- **Desaturate, do not invert.** Material's dark theme guidance: saturated colours vibrate on dark surfaces; use lighter, less saturated tones (around the 200 tone) for colour that sits on dark, and keep text and key colours at 4.5:1 or better. ([Material Design: dark theme](https://m2.material.io/design/color/dark-theme.html))
- **Elevation is lightness, not shadow.** Shadows are close to invisible on dark surfaces, so higher layers (dialogs, sheets, menus, floating bars) get a lighter surface and a hairline border. (Same source; also [LogRocket: dark mode best practices](https://blog.logrocket.com/ux-design/dark-mode-ui-design-best-practices-and-examples/))
- **Status colours use a muted fill plus a stronger border.** GitHub's Primer dark theme pairs each status colour's subtle background with a muted border so attention and severe states still read as orange, not brown. ([Primer color usage](https://primer.style/product/getting-started/foundations/color-usage/))
- **A near-neutral ground lets colour carry meaning.** The first-pass dark ground was a saturated navy (about 45 to 50% saturation), so the page, cards, the navy panel, selected rows, the selected nav item, the blue stage pill and the buttons were all blue and blended together. The ground is now a slate with only a hint of blue (hue about 220, saturation about 25%), the way GitHub's and Material's dark themes keep a quiet base so the brand colour and status colours stand out. This was compared side by side on the canvas ("Background: navy vs neutral slate") and chosen.
- **Dark mode is not better for everyone.** Light text on dark can blur ("halation"), especially for people with astigmatism, and dark screens glare in bright light such as a shop front in daytime. So the app keeps following the device setting by default and keeps the manual Light / Dark / Device switch. ([Stéphanie Walter: dark mode and accessibility](https://stephaniewalter.design/blog/dark-mode-accessibility-myth-debunked/), [BOIA](https://www.boia.org/blog/dark-mode-can-improve-text-readability-but-not-for-everyone))

## What is wrong today (measured)

| Problem | Today | Measured |
| --- | --- | --- |
| Primary buttons and the centre `+` are large pastel blocks (`#60a5fa`) with dark text | glare, and unlike the light theme's identity | text 7.4:1, fine; the problem is brightness and area |
| Hover on primary buttons uses `--brand-strong` (`#93c5fd`) under white-on-brand logic | after the fix below, white text on a pale hover would fail | would be under 2:1 |
| Navy "আজকের কাজ" panel against the page | `#0f1a44` on `#0b1220` | 1.1:1, the panel's edge disappears |
| Selected filter chip (`bg-navy`) | almost the same as an unselected chip | the selected state is lost |
| Late tile, warnings, sync pill (`--warn-soft #3b1d0c`) | reads as brown, not orange | edge 1.1:1 against the card |
| Paid bar's unpaid track | `#3b1d0c` on `#121b2e` | 1.1:1, the bar looks shorter than it is |
| Paid amount and "synced" (`--ok #5eead4`) | neon | 11.6:1, louder than anything else on screen |
| Amber and pink avatars | very dark brown and maroon | muddy |
| Dialogs, sheets, the selection bar, popovers | same surface as cards, shadow only | no visible layering |
| Browser bar and installed app colour | `theme-color` `#2563eb` (the old blue) in both modes | bright blue strip above a dark app |

## Global Constraints

The earlier plans' constraints apply. New in this plan:

- **Light mode must not change.** Every new token's light value reproduces today's light look. A screenshot check at the end compares light screens before and after.
- **Contrast is tested, not eyeballed.** A unit test reads the token values from `index.css` and checks the pairs below in both themes.
- **No hex values in components.** New colours go through tokens, as before.

---

## Task 1: Token values and new tokens

**Files:** `apps/web/src/index.css`

- [ ] Add these tokens to `:root` (light values keep today's look) and register each in `@theme inline` (`--color-brand-hover`, `--color-focus`, and so on):

```css
:root {
  --brand-hover: #163ba6;        /* what primary hover uses today */
  --focus: #1f4fd8;              /* what outline-brand draws today */
  --panel-raised: #ffffff;
  --navy-line: transparent;
  --chip-selected: var(--navy);
  --on-chip-selected: #ffffff;
  --on-chip-selected-muted: var(--on-navy-muted);
  --warn-line: transparent;
  --paid-track: var(--warn-soft);
  --scrim: rgb(0 0 0 / 0.4);
}
```

- [ ] Replace the dark values, in both the `prefers-color-scheme: dark` block and the `[data-theme='dark']` block:

```css
  --surface: #0f131a;
  --panel: #181e29;
  --panel-raised: #202734;
  --line: #2d3442;
  --ink: #e6ebf4;
  --muted: #9aa6ba;
  --brand: #3563e0;
  --brand-hover: #2c55c8;
  --brand-strong: #9ab8ff;
  --brand-soft: #1d2d5e;
  --on-brand: #ffffff;
  --focus: #8fb0ff;
  --navy: #172552;
  --navy-raised: #22336a;
  --navy-line: #2c3d78;
  --on-navy: #f1f5ff;
  --on-navy-muted: #c3cdee;
  --chip-selected: #dbe4ff;
  --on-chip-selected: #0e1630;
  --on-chip-selected-muted: #3a4868;
  --warn: #f7924a;
  --warn-soft: #3a2418;
  --warn-ink: #fbbf8a;
  --warn-line: #8a4a24;
  --paid-track: #8a4a24;
  --ok: #4fd1b5;
  --ok-soft: #10302b;
  --danger: #f68a8a;
  --accent: #f5c04a;
  --scrim: rgb(0 0 0 / 0.6);

  --tone-booked-bg: #222b3f;    --tone-booked-fg: #cbd3df;    --tone-booked-dot: #8f9bb0;
  --tone-cutting-bg: #2c2656;   --tone-cutting-fg: #d6ceff;   --tone-cutting-dot: #a48cf5;
  --tone-working-bg: #1f3168;   --tone-working-fg: #c7d6ff;   --tone-working-dot: #6f95f5;
  --tone-trial-bg: #3b2f12;     --tone-trial-fg: #fcd98a;     --tone-trial-dot: #e8b23a;
  --tone-ready-bg: #133f3b;     --tone-ready-fg: #9eeee0;     --tone-ready-dot: #3cc4ac;
  --tone-done-bg: #222b3f;      --tone-done-fg: #cbd3df;      --tone-done-dot: #8f9bb0;
  --tone-cancelled-bg: #43201f; --tone-cancelled-fg: #fdc4c4; --tone-cancelled-dot: #ef7f7f;

  --avatar-1-bg: #22366e; --avatar-1-fg: #c7d7fe;
  --avatar-2-bg: #33296b; --avatar-2-fg: #ddd6fe;
  --avatar-3-bg: #164a46; --avatar-3-fg: #a7f3e4;
  --avatar-4-bg: #4a3a14; --avatar-4-fg: #fde68a;
  --avatar-5-bg: #4e2140; --avatar-5-fg: #fbcfe8;
  --avatar-6-bg: #1d4a2e; --avatar-6-fg: #bbf7d0;
```

- [ ] Move the two duplicated dark blocks into one shared rule so they cannot drift, for example by listing both selectors on one block:

```css
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) { /* dark values */ }
}
:root[data-theme='dark'] { /* same values */ }
```

  If a shared block is not possible without a preprocessor, add a test (Task 4) that fails when the two blocks differ.

**Done when:** the app builds, light mode is unchanged, and dark mode picks up the new values.

---

## Task 2: Use the new tokens where one token did two jobs

**Files:** listed per step.

- [ ] **Primary hover:** `ui/Button.tsx` and the hand-written primary buttons (`features/work/MobileWorkPage.tsx` and any other `hover:bg-brand-strong`) use `hover:bg-brand-hover`. `ui/StageStrip.tsx` keeps `bg-brand-strong` for the current segment (it is a fill on a dark track, which is correct).
- [ ] **Focus rings:** replace `outline-brand` with `outline-focus` everywhere (86 places, a mechanical change), and `ring-brand` with `ring-focus` where it marks focus.
- [ ] **Selected chips:** `ui/ChipGroup.tsx` uses `bg-chip-selected text-on-chip-selected border-chip-selected` for the selected chip, and `text-on-chip-selected-muted` for its count. The worker chips and the person chips on the work board follow the same rule.
- [ ] **Navy blocks:** the today panel (`features/dashboard/DashboardPage.tsx`, both layouts), the status page header (`features/links/StatusPage.tsx`) and `ui/SelectionBar.tsx` get `border border-navy-line`.
- [ ] **Warn surfaces:** every `bg-warn-soft` block (late tile, sync pill when it needs attention, "কারিগর ঠিক করুন", worker-missing chips, the missing-measurement alert, the late badge in the sidebar) gets `border border-warn-line`.
- [ ] **Paid bar:** `ui/PaidBar.tsx` uses `bg-paid-track` for the unpaid part.
- [ ] **Raised layers:** `ui/Dialog.tsx`, `ui/FilterButton.tsx` popover, `shell/GlobalSearch.tsx` results, the account menu sheet and `ui/SelectionBar.tsx` use `bg-panel-raised` and `border border-line`; keep the shadow for light mode. The dialog backdrop uses `bg-scrim` in place of `bg-black/40`.
- [ ] **Centre New Order button:** its white ring (`border-panel` or similar) stays the panel colour in dark, so it reads as cut out of the bar; check it is not hard-coded white.
- [ ] **Welcome title:** `features/welcome/WelcomePage.tsx` uses `text-brand` for text, which would fall to 3.2:1 with the new fill colour; change it to `text-brand-strong`.

**Done when:** a search for `outline-brand`, `hover:bg-brand-strong`, `bg-black/` and `text-brand"` in `src` (outside tests) finds nothing.

---

## Task 3: Browser bar and installed app colour

**Files:** `apps/web/index.html`, `apps/web/vite.config.ts`, `apps/web/src/shell/theme.ts` (with its test).

- [ ] Replace the single `theme-color` meta with one per scheme:

```html
<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f6fb" />
<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0f131a" />
```

- [ ] When a person picks Light or Dark by hand, `applyTheme` also sets both metas' `content` to that theme's surface colour; Device restores the two original values.
- [ ] In the PWA manifest, set `theme_color: '#13235b'` (navy) and `background_color: '#f4f6fb'`. The manifest cannot follow the device theme; the metas above take over once the app is open.

Tests: `applyTheme('dark')` sets both metas to `#0f131a`; `applyTheme('auto')` restores the media-specific values.

**Done when:** on an Android phone in dark mode the status bar matches the app, and switching the theme in More updates it.

---

## Task 4: Contrast test

**Files:** new `apps/web/src/theme/contrast.test.ts`.

- [ ] Read `index.css` as text, pull the light block and the dark block into maps, and resolve `var()` references.
- [ ] Check in both themes (WCAG ratios):

| Pair | Minimum |
| --- | --- |
| `ink` on `surface`, `panel`, `panel-raised` | 4.5 |
| `muted` on `surface`, `panel` | 4.5 |
| `on-brand` on `brand` and on `brand-hover` | 4.5 |
| `brand-strong` on `panel` | 4.5 |
| `on-navy` and `on-navy-muted` on `navy` and `navy-raised` | 4.5 |
| `on-chip-selected` on `chip-selected` | 4.5 |
| `warn`, `warn-ink` on `panel`; `warn-ink` on `warn-soft` | 4.5 |
| `ok` on `panel`; `danger` on `panel` | 4.5 |
| each `tone-*-fg` on its `tone-*-bg`; each `avatar-*-fg` on its `avatar-*-bg` | 4.5 |
| `focus` on `surface` and `panel` | 3 |
| `brand` on `panel` (button edge) | 3 |
| `ok` on `paid-track` (bar fill against track) | 3 |

- [ ] If the two dark blocks are still separate, assert they are identical.

The proposed values were measured while writing this plan: white on `brand` 5.2:1, `ink` on `panel` 14:1, `brand-strong` on `panel` 8.5:1, `focus` on `surface` 8.7:1, `muted` on `panel` 6.8:1, `brand` against `panel` 3.2:1, the stage pills 8.5:1 to 9.6:1, `ok` against `paid-track` 3.6:1.

**Done when:** the test passes, and fails if any value above is changed to break its pair.

---

## Task 5: Check by eye

- [ ] Screenshot every screen at 390 by 844 and 1440 by 900 in light and dark (the Playwright projects can take these with `colorScheme`). Compare light before and after: they must match.
- [ ] Look at dark mode on a real phone in a dim room and near a window. Large blue areas should not glare; orange should read as orange.
- [ ] Check printing from dark mode: print pages still force light colours.

**Done when:** the dark screens match the "নিউট্রাল" screenshots on the canvas (the navy vs neutral slate comparison), and light screens are unchanged.
