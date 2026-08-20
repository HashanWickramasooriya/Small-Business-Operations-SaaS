# Architecture

## High level

```
┌─────────────────┐        HTTPS/JSON         ┌──────────────────┐        SQL        ┌────────────┐
│  React SPA       │  ───────────────────────▶ │  Express API      │ ─────────────────▶ │ PostgreSQL │
│  (client/)       │  ◀─────────────────────── │  (server/)         │ ◀───────────────── │            │
└─────────────────┘     cookies: access +      └──────────────────┘   Prisma ORM        └────────────┘
                         refresh JWT (httpOnly)
```

The frontend never talks to the database directly and never makes authorization decisions that matter —
it only reflects what the API allows, and the API independently re-checks everything.

## Backend layering

```
routes/        Express Router per resource; wires middleware in the right order:
                requireAuth -> requireBusiness -> requireModule(module, "read"|"write") -> controller
controllers/    Parse/validate input (Zod), call services/Prisma, shape the HTTP response.
                Controllers are the only layer allowed to touch `req`/`res`.
services/       Cross-cutting business logic reused by multiple controllers:
                - inventory.service.ts: the single choke point for every stock mutation
                  (keeps Product.stock and the InventoryMovement ledger from ever drifting apart,
                  and triggers low/out-of-stock notifications).
                - activityLog.service.ts / notification.service.ts: shared audit + notification writes.
validators/     Zod schemas — one source of truth for what a valid request body looks like,
                shared between "is this valid" and the inferred TS type.
middleware/     auth.ts (JWT verification), tenant.ts (business resolution + RBAC), errorHandler.ts.
lib/            Small framework-free utilities: prisma client singleton, JWT/password helpers,
                the ApiError class, the RBAC permission table, asyncHandler wrapper.
```

### Why services exist separately from controllers

Anything that must stay consistent across multiple call sites — most importantly "how does stock ever
change" — lives in a service, not copy-pasted into each controller. `recordInventoryMovement` is called
from product creation (initial stock), sales (decrement), purchases (increment on receipt), refunds
(increment), and manual adjustments — all five paths guarantee an `InventoryMovement` row is written in
the same transaction as the stock change, so the movement history is always a truthful audit trail of
`Product.stock`, never just a display convenience.

### Transactions

Every mutation that touches more than one table runs inside `prisma.$transaction`, e.g.:

- **Sale creation**: create Sale + SaleItems, decrement stock per line (with movement rows), optionally
  bump a customer's outstanding balance, write an activity log entry — all or nothing.
- **Purchase receiving**: increment `PurchaseItem.quantityReceived`, increment `Product.stock`, recompute
  the purchase's overall status (partially/fully received) — all or nothing.
- **Business creation**: create the Business, the Owner's Membership, default BusinessSettings, and the
  eight default expense categories — all or nothing, so a partially-created business can never exist.

## Frontend layering

```
pages/          Route-level components, one per URL. Own their data fetching (TanStack Query) and
                 compose smaller pieces. Grouped by domain: marketing/, auth/, onboarding/, app/{feature}/.
components/      Reusable, presentation-focused pieces: components/ui (DataTable, Modal, ConfirmDialog,
                 Badge, States) has no app-specific knowledge; components/layout has the shell
                 (Sidebar, Topbar, PublicLayout); GlobalSearch and Toast are cross-cutting features.
hooks/           useAuth (session + active business + role), useTheme (light/dark/system).
lib/             api.ts (axios instance, tenant header injection, 401->refresh->retry interceptor),
                 permissions.ts (UI-only mirror of the server's RBAC table), format.ts (currency/date).
types/           TS interfaces mirroring the API's JSON shapes.
```

### Tenant header injection

`client/src/lib/api.ts` keeps the "active business id" in memory + `localStorage` and attaches it as an
`X-Business-Id` header to every request via an axios request interceptor — so feature pages never have
to remember to pass it themselves. The server treats that header as a *claim*, not a *grant*: `requireBusiness`
re-verifies the caller's membership on that exact id before anything downstream can query the database.

### Auth/session refresh

Access tokens are short-lived (15 min). An axios response interceptor catches a single `401`, calls
`/api/auth/refresh` (which validates the refresh cookie and rotates both tokens), and retries the
original request exactly once — so a user's session survives token expiry transparently as long as their
refresh token (30 days) is still valid.

## Cross-cutting: RBAC enforcement point

RBAC is enforced in exactly one place per request: the `requireModule` middleware, using the table in
`server/src/lib/permissions.ts`. No controller re-implements or second-guesses that decision. This makes
the whole permission model auditable by reading one file, and prevents the classic drift where a new
route quietly forgets to add its own check.
