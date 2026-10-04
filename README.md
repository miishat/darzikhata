# DarziKhata (demo)

A clickable, installable prototype of DarziKhata, a record book for tailoring shops: customers and their measurements, orders garment by garment, money taken and owed, work lists, and status links for customers. It is in Bangla first, with English.

It is a demo. Everything is stored in your own browser, seeded with three sample shops, and can be reset at any time. There is no real server, sign-in or sync: an in-browser stand-in shows how offline work and sync behave.

## Run it

Node 22.12 or newer.

```bash
npm install
cd apps/web
npm run dev
```

Open the address it prints and choose a sample shop. Demo PINs follow the staff list order: 1111, 2222, 3333 and so on.

To show it to someone, turn on **Presenter mode** under More: it walks through seven scenarios step by step.

## Check it

From the repo root:

```bash
npm test            # unit tests for the domain package and the web app
npm run typecheck
```

End-to-end tests (presenter scenarios 1, 3 and 4, at phone and laptop widths), from `apps/web`:

```bash
npx playwright install chromium   # once
npm run e2e
```

## Layout

- `packages/domain`: the business rules in plain TypeScript (money, numbering, measurements, stages, permissions, search, sync, status links). No browser code.
- `apps/web`: the React app (PWA). `src/data` is the only code that touches storage.
- `docs/superpowers`: the design spec and the implementation plans.

## Deploy

The site is static. On Netlify, add the repository as a new site; `netlify.toml` sets the build command, the publish folder and the single-page fallback, so no settings need typing. Every push to `main` then deploys. The app is installable from the deployed address and works offline after the first visit.
