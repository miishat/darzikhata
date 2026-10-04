# DarziKhata (demo)

A clickable, installable prototype of DarziKhata, a record book for tailoring shops: customers and their measurements, orders garment by garment, money taken and owed, work lists, and status links for customers. It is in Bangla first, with English.

It is a demo. Everything is stored in your own browser, seeded with three sample shops, and can be reset at any time. There is no real server, sign-in or sync: an in-browser stand-in shows how offline work and sync behave.

## Layout

- `packages/domain`: the business rules in plain TypeScript (money, numbering, measurements, stages, permissions, search, sync, status links). No browser code.
- `apps/web`: the React app (PWA). `src/data` is the only code that touches storage.
- `docs/superpowers`: the design spec and the implementation plans.
