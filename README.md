# Carpet Cleaners Supply — POS

Internal point-of-sale system: invoicing, inventory, customers, vendors,
purchase orders, and accounts receivable for Carpet Cleaners Supply.

Built with Next.js (App Router), Prisma, and Postgres (Neon, via Vercel's
Marketplace integration). Deployed on Vercel at
`carpet-cleaner-s-supply/pos-app`.

## Features

- **Login** — username/password, session cookies, two tiers (Owner/Manager,
  Staff) with server-enforced permissions (not just hidden UI).
- **Items** — inventory with cost/price/stock, low-stock flagging, CSV
  import/export.
- **Customers** — contact info, billing/shipping addresses, account
  statements (a full chronological ledger of every charge, payment, and
  return), CSV import/export.
- **Invoices** — walk-in/phone sales, draft-then-close workflow, paid-now or
  charge-to-account (with an optional deposit), race-safe stock decrement,
  print and email (opens a prefilled draft in your own mail client — nothing
  is sent server-side).
- **Estimates** — quotes that convert to an invoice without ever touching
  stock or balance until they do.
- **Payments & the credit ledger** — record a payment, apply it across
  multiple open invoices oldest-first, track and re-apply unapplied credit
  from overpayments, void a payment (Owner/Manager only).
- **Returns** — restock, refund by cash/card/check or account credit, void a
  return.
- **Vendors & Purchase Orders** — draft → ordered → partial/received
  lifecycle; lines lock once receiving starts; CSV import/export.
- **Dashboard** — KPIs (Total A/R is dollar-figure-visible to Owner/Manager
  only, per an explicit access-tier decision), low-stock alerts, activity
  log, employee management.
- **Admin tools** (Owner/Manager only) — A/R Aging, Inventory Valuation,
  Recalculate Balances (rebuilds every balance from transaction history —
  use if something looks off, not routinely).

## Getting started

```bash
npm install
```

You'll need a `.env` with a Postgres connection. If a Neon database is
already connected to this Vercel project, pull it with:

```bash
npx vercel link
npx vercel env pull .env --environment=preview
```

**Important:** if `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` are
scoped to both Preview and Production together (check with
`npx vercel env ls`), local dev and Production share one database. Point
`.env` at a separate Neon branch for local work — see "Environments" below.

Run the initial migration and seed a login:

```bash
npx prisma migrate deploy
node scripts/seed-user.js youradminusername "Your Name" OWNER_MANAGER
```

(Omit the password argument to get a random temporary one printed once —
there's no way to recover it after, only reset it via the script again or
from `/account` once logged in.)

```bash
npm run dev
```

## Testing

```bash
npm test
```

Real integration tests against a running dev server and a real database —
see `tests/README.md`. **Never point `TEST_BASE_URL` / `.env` at production**
— every test creates and cleans up its own data, but it's still live writes.

CI (`.github/workflows/test.yml`) runs lint, build, and the full test suite
on every push/PR to `main`, against a throwaway Postgres container it
provisions itself — entirely separate from the real Neon database, no
secrets required.

## Environments

The Neon integration on this Vercel project ties `POSTGRES_*` / `DATABASE_URL`
together across Preview and Production by default — there's no per-environment
branch mapping exposed in the dashboard for this integration. Local dev
currently points `.env` at a separate Neon branch (`preview`) created and
wired in manually; Production is untouched. Deployed Preview builds (from a
PR/branch) still share Production's database — known, deferred, lower
priority since most testing happens locally.

## Known gaps / deferred

- No real outbound email (Print/Email open a local mail-client draft, matching
  the original prototype's design — nothing is sent server-side).
- No per-vendor pricing for the same item — confirmed not needed; each item
  has exactly one vendor and one cost.
- Deployed Preview deployments share Production's database (see above).

## Project history

This replaced an in-browser-only prototype (`pos-app.jsx` in the parent
folder) that stored everything in memory. `server-readiness-prep.md` and
`user-permissions-spec.md` (also in the parent folder) were the specs this
build worked from — every validation, atomic transaction, and permission rule
they call out is implemented and covered by the test suite.
