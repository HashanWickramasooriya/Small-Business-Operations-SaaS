# Testing

## Backend integration tests

**Stack**: Vitest + Supertest, run against the real Express app (`createApp()`) and a real PostgreSQL
database — not mocks. This is a deliberate choice: the highest-risk logic in this app (tenant isolation,
RBAC, inventory ledger consistency, transactional sale/purchase math) only means something when verified
against real database behavior (transactions, constraints, concurrent-safe increments).

### Running

```bash
cd server
# 1. Point DATABASE_URL (in .env, or inline) at a database dedicated to testing — tests TRUNCATE
#    all tables between runs, so never point this at a database with data you care about.
# 2. Make sure the schema is migrated onto that database:
npx prisma migrate deploy
# 3. Run the suite:
npm test
```

### Structure

- `tests/setup.ts` — connects Prisma once for the whole run; exports `resetDatabase()`, which truncates
  every tenant-scoped table (with `RESTART IDENTITY CASCADE`) between tests so each test starts from a
  clean slate without needing a full migrate/reset cycle per test.
- `tests/helpers.ts` — `registerAndLogin()` (creates a real user via the real `/api/auth/register`
  endpoint and returns an authenticated `supertest` agent whose cookies persist across requests),
  `createBusinessForAgent()`, `addMemberWithRole()` (seeds a membership directly for RBAC test setup),
  and `withBusiness()` (wraps an agent to auto-attach the `X-Business-Id` header).
- One file per concern:
  - `auth.test.ts` — registration validation, duplicate email, login success/failure, session
    lifecycle (`/me`, logout), forgot/reset-password flow including the "don't leak whether an email
    exists" behavior and that a reset revokes the old password.
  - `products.test.ts` — creation (with the initial-stock → `InventoryMovement` side effect), duplicate
    SKU rejection, required-field validation, archive/restore, and that `PATCH` cannot be used to
    silently change stock (must go through inventory adjustment).
  - `inventory.test.ts` — positive/negative manual adjustments, zero-quantity rejection, low-stock
    detection and the resulting notification.
  - `sales.test.ts` — tax/discount total calculation, order-level discount, insufficient-stock
    rejection, the `SALE` inventory movement side effect, and refund restoring stock.
  - `purchases.test.ts` — draft creation, invalid status-transition rejection, stock only increasing on
    receipt (not on "ordered"), and partial receiving.
  - `expenses.test.ts` — creation, validation (amount, category), and that created expenses roll up
    correctly into the expense report total.
  - `multiTenancy.test.ts` — the most important suite: verifies Business A's owner cannot read Business
    A's data through Business B's session, that fetching another tenant's record by ID 404s rather than
    ever returning it, and that supplying a valid-looking `X-Business-Id` header for a business the
    caller has no membership on is rejected regardless.
  - `rbac.test.ts` — for each role (Owner, Manager, Cashier, Accountant, Staff), asserts both what it
    *can* do and what it's correctly *forbidden* from doing, including that only an Owner can change
    another member's role or remove the Owner's own membership.

### Why truncate-between-tests instead of one transaction per test

Several flows under test (business creation, sale creation) are themselves multi-statement transactions
inside the app code; nesting the app's own transactions inside an outer test-transaction adds complexity
without much benefit at this scale. Truncating tenant-scoped tables between tests is simple, fast enough
for an integration suite of this size, and exercises the exact same code path a real request would.

## Frontend

The frontend is currently verified via TypeScript's compiler (`tsc -b`) and a production build
(`npm run build`) as a correctness gate — both must pass with zero errors, which catches the majority of
integration mistakes (wrong prop shapes, missing exports, type drift between the API and the client's
`types/`) before they'd ever reach a browser. Component/unit tests (Vitest + React Testing Library,
already present as dependencies in `client/package.json`) are a natural next addition — see the README's
roadmap.

## Manual QA checklist

Before considering a change complete, exercise the golden path in a real browser: register → onboarding
→ add a product → make a POS sale → confirm inventory decremented → create an expense → view the
dashboard → generate a report → invite a teammate with a different role and confirm their sidebar/access
matches that role.
