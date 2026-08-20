# Database

Source of truth: [`server/prisma/schema.prisma`](../server/prisma/schema.prisma). PostgreSQL, accessed
exclusively through Prisma (no raw SQL except a handful of read-only `$queryRaw` aggregate queries for
things Prisma's query builder can't express, such as comparing two columns on the same row).

## Entity overview

| Model | Purpose | Tenant-scoped? |
|---|---|---|
| `User` | A person who can log in. Global — one user can belong to many businesses. | No |
| `RefreshToken` | Rotating, revocable session tokens tied to a `User`. | No |
| `PasswordResetToken` | Single-use, expiring password reset tokens. | No |
| `Business` | A tenant/workspace. Everything else hangs off `businessId`. | — (the tenant root) |
| `Membership` | Join table: `User` ↔ `Business` with a `Role` and `MembershipStatus`. | Yes |
| `BusinessSettings` | 1:1 with `Business` — invoice/receipt/notification preferences. | Yes |
| `Category` | Product category, unique per business+name. | Yes |
| `Product` | Catalog item: pricing, stock, min-stock threshold, supplier link. | Yes |
| `InventoryMovement` | Append-only ledger of every stock change (see below). | Yes |
| `Customer` | CRM record with a running `outstandingBalance`. | Yes |
| `Supplier` | Vendor record with a running `outstandingAmount`. | Yes |
| `Purchase` / `PurchaseItem` | Purchase orders and their line items, with `quantityReceived` tracked per line for partial receiving. | Yes |
| `Sale` / `SaleItem` | POS transactions and their line items. | Yes |
| `ExpenseCategory` / `Expense` | Expense tracking, categorized. | Yes |
| `ActivityLog` | Append-only audit trail of significant actions. | Yes |
| `Notification` | In-app notifications (low stock, large expense, etc.). | Yes |

## Why `InventoryMovement` is append-only

`Product.stock` is a denormalized running total for fast reads (product lists, POS, dashboards all need
it instantly). `InventoryMovement` is the ledger that explains *how* it got there — every row is signed
(`+50` for a purchase receipt, `-3` for a sale, `-2` for a manual write-off) and typed
(`PURCHASE | SALE | RETURN | ADJUSTMENT | INITIAL`). The two are kept consistent by construction: nothing
writes to `Product.stock` except `inventory.service.ts#recordInventoryMovement`, which always writes both
in the same transaction. This is what makes the Inventory page's movement history trustworthy rather than
just a display feature.

## Multi-tenancy at the schema level

Every tenant-scoped model has a non-nullable `businessId` foreign key with `onDelete: Cascade` back to
`Business`, and most have a `@@index([businessId, ...])` composite index so tenant-scoped list queries
(which always filter by `businessId` first) stay fast as data grows. There is deliberately no
"soft global" query path that could return cross-tenant rows — every repository/controller method takes
`businessId` as a required filter, not an optional one.

## Notable constraints

- `Product` — `@@unique([businessId, sku])`: SKUs are unique per business, not globally (two tenants
  can both use `SKU-001` without conflict).
- `Category` / `ExpenseCategory` — `@@unique([businessId, name])`.
- `Membership` — `@@unique([userId, businessId])`: a user can only have one role per business.
- `Business.slug` — globally unique (used for potential future subdomain/URL routing).
- Money fields use `Decimal` (not `Float`) to avoid floating-point rounding errors in totals — e.g.
  `Product.sellingPrice Decimal @db.Decimal(12, 2)`.

## Migrations

```bash
cd server
npx prisma migrate dev --name <description>   # development: creates + applies a migration
npx prisma migrate deploy                      # production: applies pending migrations only
npx prisma studio                               # visual browser for the current database
```
