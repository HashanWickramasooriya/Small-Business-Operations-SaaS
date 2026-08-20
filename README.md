# BusinessOS

**Run your business. Control your operations. Grow with confidence.**

BusinessOS is a multi-tenant Small Business Operations SaaS platform. It gives retail stores, mini
supermarkets, grocery stores, clothing/electronics stores, pharmacies, cafés, and small wholesalers a
single system to manage products, inventory, sales (POS), customers, suppliers, purchases, expenses,
employees, reports, and business settings.

---

## Contents

- [Overview](#overview)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Multi-tenancy](#multi-tenancy)
- [Roles & permissions (RBAC)](#roles--permissions-rbac)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database & seeding](#database--seeding)
- [Testing](#testing)
- [Docker](#docker)
- [Security](#security)
- [Deployment notes](#deployment-notes)
- [Known limitations](#known-limitations)
- [Roadmap / future improvements](#roadmap--future-improvements)

---

## Overview

Every business that signs up gets an isolated workspace ("business"/tenant). Owners invite teammates
with scoped roles (Owner, Manager, Cashier, Accountant, Staff), and every request is authorized against
the caller's real membership on the target business — never against client-supplied trust.

Core modules: Dashboard & analytics, POS/Sales, Products & Categories, Inventory (stock movements,
low-stock alerts), Purchases (draft → ordered → received workflow), Customers, Suppliers, Expenses,
Employees, Reports, Activity/audit log, Notifications, Settings. Plus a full public marketing site
(home, features, pricing, about, contact) and authentication (register/login/logout/forgot-reset
password) with onboarding.

## Tech stack

**Frontend** — React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query, React Hook
Form, Recharts, Axios, lucide-react icons.

**Backend** — Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Zod validation, JWT (access +
refresh tokens) in httpOnly cookies, bcrypt password hashing, Helmet, CORS, rate limiting.

**Testing** — Vitest + Supertest (backend integration tests against a real Postgres database).

**DevOps** — Docker, Docker Compose, multi-stage Dockerfiles, nginx for the built frontend.

## Architecture

```
client/   React SPA (Vite) — marketing site + authenticated app
server/   Express REST API — controllers -> services -> Prisma
          middleware/  auth (JWT), tenant resolution + RBAC
          controllers/ HTTP request/response handling
          services/    shared business logic (inventory ledger, notifications, activity log)
          validators/  Zod schemas per resource
          routes/      Express routers, one per resource, mounted under /api
prisma/   schema.prisma (single source of truth for the data model), seed.ts
```

Requests flow: `route → requireAuth → requireBusiness (tenant resolution) → requireModule (RBAC) →
controller → zod validation → prisma (scoped by businessId) → response`. Every mutating flow that
touches more than one table (sales, purchases, inventory adjustments, business creation) runs inside a
`prisma.$transaction` so partial failures can't corrupt state.

See [`docs/architecture.md`](docs/architecture.md), [`docs/database.md`](docs/database.md),
[`docs/api.md`](docs/api.md), [`docs/security.md`](docs/security.md), and
[`docs/testing.md`](docs/testing.md) for more detail.

## Multi-tenancy

Every business-owned table carries a `businessId` foreign key. The `requireBusiness` middleware
(`server/src/middleware/tenant.ts`) resolves the active business from the `X-Business-Id` header (or a
`:businessId` route param) and — on **every single request** — re-verifies in the database that the
authenticated user has an active `Membership` on that business before setting `req.businessId`. Every
controller then filters its Prisma queries by `req.businessId`, never by anything the client claims.
This is enforced server-side; the frontend's business switcher is a convenience, not a security
boundary. See the multi-tenancy isolation tests in `server/tests/multiTenancy.test.ts`.

## Roles & permissions (RBAC)

| Role | Access |
|---|---|
| **Owner** | Everything, including employee management and business settings |
| **Manager** | Dashboard, POS/Sales, Products, Inventory, Purchases, Customers, Suppliers, Reports, Activity |
| **Cashier** | Dashboard, POS, Sales, Customers |
| **Accountant** | Dashboard, Expenses, Purchases, Reports |
| **Staff** | Dashboard only |

Permissions are defined once in `server/src/lib/permissions.ts` (module read access + per-module write
access) and enforced by the `requireModule(module, "read"|"write")` middleware on every protected route
— never only hidden in the UI. The frontend mirrors the same table in
`client/src/lib/permissions.ts` purely to drive what's shown, since the API independently re-checks
everything.

## Project structure

```
Small Business Operations SaaS/
├── client/                 React frontend
│   ├── src/
│   │   ├── components/     layout (Sidebar, Topbar, PublicLayout), ui kit, GlobalSearch, Toast
│   │   ├── hooks/          useAuth, useTheme
│   │   ├── lib/            api client, permissions, formatting
│   │   ├── pages/          marketing/, auth/, onboarding/, app/{feature}/
│   │   └── types/          shared TS types mirroring the API
│   └── Dockerfile, nginx.conf
├── server/                 Express API
│   ├── prisma/             schema.prisma, seed.ts
│   ├── src/
│   │   ├── controllers/, services/, validators/, routes/, middleware/, lib/
│   └── tests/               Vitest + Supertest integration tests
├── docs/                   architecture, database, api, security, testing, development
├── docker-compose.yml
└── README.md
```

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use the provided `docker-compose.yml` to run just the database)

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
# edit server/.env if your DATABASE_URL or ports differ
```

### 3. Start PostgreSQL

Easiest with Docker:

```bash
docker compose up -d postgres
```

Or point `DATABASE_URL` in `server/.env` at any Postgres 14+ instance you already have running.

### 4. Run database migrations and seed demo data

```bash
cd server
npx prisma migrate dev --name init
npm run seed
```

This creates a demo business ("FreshMart") with realistic products, customers, suppliers, sales,
expenses, and inventory history, plus four demo logins (see console output), all using the password
`Password123`:

- `owner@freshmart.demo` — Owner
- `manager@freshmart.demo` — Manager
- `cashier@freshmart.demo` — Cashier
- `accountant@freshmart.demo` — Accountant

### 5. Run the app

```bash
# terminal 1
cd server && npm run dev      # http://localhost:4000

# terminal 2
cd client && npm run dev      # http://localhost:5173
```

Visit `http://localhost:5173`, log in with a demo account (or register your own and go through
onboarding), and you're in.

## Environment variables

See [`server/.env.example`](server/.env.example). No client-side environment variables are required in
development — Vite proxies `/api` to `http://localhost:4000` (see `client/vite.config.ts`); in
production, nginx proxies `/api` to the `server` container (see `client/nginx.conf`).

## Database & seeding

The Prisma schema (`server/prisma/schema.prisma`) is the single source of truth for the data model:
User, RefreshToken, PasswordResetToken, Business, Membership, BusinessSettings, Category, Product,
InventoryMovement, Customer, Supplier, Purchase, PurchaseItem, Sale, SaleItem, ExpenseCategory,
Expense, ActivityLog, Notification. See [`docs/database.md`](docs/database.md) for the full breakdown
of relationships, indexes, and constraints.

Re-seed at any time with `npm run seed` (uses `upsert`, safe to re-run).

## Testing

```bash
cd server
# requires a running Postgres reachable via DATABASE_URL, migrated with `prisma migrate deploy`
npm test
```

Backend integration tests (Vitest + Supertest, hitting the real Express app + a real Postgres database,
truncated between tests) cover: authentication (register/login/invalid login/logout/password reset),
products (creation, duplicate SKU, validation, archive), inventory (adjustments, low-stock detection),
sales/POS (total calculation with tax and discount, stock reduction, insufficient-stock rejection,
refunds), purchases (status workflow, partial/full receiving increasing stock), expenses (validation,
report totals), multi-tenancy isolation (Business A cannot read/write Business B's data under any
circumstance, including header spoofing), and RBAC (every role's allowed and denied actions). See
[`docs/testing.md`](docs/testing.md).

## Docker

```bash
docker compose up --build
```

Brings up Postgres, the API (migrates on boot, then serves on `:4000`), and the frontend (built and
served via nginx on `:5173`, proxying `/api` to the server container). Set `JWT_SECRET` and
`JWT_REFRESH_SECRET` in your shell or a `.env` file next to `docker-compose.yml` before running in
anything beyond local evaluation.

## Security

- Passwords hashed with bcrypt (cost factor 12); never stored or logged in plaintext.
- Auth via short-lived JWT access tokens + long-lived, rotating, revocable refresh tokens, both in
  `httpOnly`, `sameSite=lax` cookies (never exposed to JS, mitigating XSS token theft).
- Every request re-validates tenant membership server-side — see [Multi-tenancy](#multi-tenancy).
- Every input is validated with Zod at the API boundary; Prisma's parameterized queries prevent SQL
  injection (the few raw queries use tagged-template `$queryRaw`, which is parameterized, never string
  concatenation).
- `helmet` sets standard security headers; CORS is locked to `APP_URL`; per-route rate limiting on auth
  endpoints (50/15min) and the general API (300/min).
- Forgot-password never reveals whether an email is registered; reset tokens are single-use and expire
  in 1 hour; resetting a password revokes all existing refresh tokens (forces re-login everywhere).
- No secrets are committed — see `.gitignore` and `server/.env.example`.

Full write-up in [`docs/security.md`](docs/security.md).

## Deployment notes

- Run `npx prisma migrate deploy` (not `migrate dev`) in production — already wired into the server
  Docker image's start command.
- Put the API behind HTTPS and set `secure: true` cookies (already automatic when `NODE_ENV=production`).
- Set strong, unique `JWT_SECRET` / `JWT_REFRESH_SECRET` values (e.g. `openssl rand -hex 32`).
- Point `APP_URL` at your real frontend origin so CORS and cookie scoping are correct.

## Known limitations

This is a complete, working product core — not a hollow demo — but a few things are intentionally
architected-but-not-wired, and the UI is honest about it rather than faking functionality:

- **Email delivery** isn't connected to a provider. Password-reset tokens are generated and stored for
  real (single-use, expiring) but the reset link is only surfaced in the API response in non-production
  environments rather than emailed. Wiring in a provider (Postmark/SES/etc.) is a small, isolated change
  in `server/src/controllers/auth.controller.ts`.
- **Billing/payments** are architected (a `plan` field on `Business`, pricing page, upgrade CTAs) but no
  payment provider (Stripe, etc.) is integrated — there is nothing to charge against in this environment.
- **File uploads** (product images, receipts, logos) accept a URL string rather than a real upload
  pipeline; there's no object storage configured in this environment.
- **A user's own profile editing** (name/email/password self-service, distinct from business settings)
  has no backend endpoint yet — the Settings page says so rather than showing a button that does nothing.

## Roadmap / future improvements

- Real transactional email (password reset, invitations, low-stock digests).
- Payment provider integration for the pricing tiers.
- Object storage-backed uploads for product images, receipts, and business logos.
- Self-service user profile editing (name/email/password) and email verification.
- WebSocket-based live updates for POS/inventory across multiple concurrent terminals.
- End-to-end (browser) tests in addition to the current API integration test suite.
