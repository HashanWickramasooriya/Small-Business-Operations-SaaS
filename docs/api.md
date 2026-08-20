# API overview

Base URL: `/api`. All responses are JSON. Errors follow a consistent shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid input", "details": { "...": "..." } } }
```

## Auth (`/api/auth`) — no tenant context required

| Method | Path | Notes |
|---|---|---|
| POST | `/register` | `{fullName, email, password}` → creates user, issues session cookies |
| POST | `/login` | `{email, password}` |
| POST | `/logout` | Revokes the current refresh token |
| POST | `/refresh` | Rotates access + refresh tokens using the refresh cookie |
| POST | `/forgot-password` | `{email}` — always 200; never reveals if the email exists |
| POST | `/reset-password` | `{token, password}` — single-use, 1-hour-expiring token |
| GET | `/me` | Current user + all business memberships (requires auth) |

Session tokens are delivered as `httpOnly` cookies (`accessToken`, `refreshToken`) — never in the
response body — so they're inert against XSS token theft.

## Businesses (`/api/businesses`) — requires auth

| Method | Path | Notes |
|---|---|---|
| POST | `/` | Create a business; caller becomes its Owner |
| GET | `/:businessId` | Business profile (requires membership) |
| PATCH | `/:businessId` | Update profile (Owner, `settings` write) |
| PATCH | `/:businessId/onboarding` | Advance/complete the onboarding wizard |
| GET | `/:businessId/members` | List team members (`employees` read) |
| POST | `/:businessId/members` | Invite a member (Owner or Manager) |
| PATCH | `/:businessId/members/:memberId` | Change role/status (Owner only) |
| DELETE | `/:businessId/members/:memberId` | Remove a member (Owner only; cannot remove the Owner) |

## Every other resource — requires auth + `X-Business-Id` header (or `:businessId` param)

All mounted at `/api/businesses/:businessId/<resource>`, all protected by `requireBusiness` (tenant
membership check) then `requireModule(<module>, "read"|"write")` (RBAC):

- **`/products`** — list (search/category/status/low-stock filters, pagination, sorting), get, create,
  update, archive/restore, bulk CSV-style import.
- **`/categories`** — list, create, delete.
- **`/inventory`** — `/movements` (paginated ledger, optional productId filter), `/low-stock`, `/adjust`
  (signed manual adjustment).
- **`/customers`** — list (search, pagination), get (includes recent sales + lifetime summary), create,
  update, delete.
- **`/suppliers`** — list, get (includes supplied products + purchase history), create, update, delete.
- **`/purchases`** — list (status filter), get, create (starts in `DRAFT`), `/status` (workflow
  transition), `/receive` (partial or full stock receipt).
- **`/sales`** — list (status/date filters, pagination), get, create (the POS checkout endpoint — computes
  totals server-side, decrements stock, records payment), `/refund` (partial or full, restores stock).
- **`/expenses`** — `/categories`, list (category/date filters, pagination, running total), create,
  update, delete.
- **`/reports`** — `/sales`, `/revenue`, `/inventory`, `/product-performance`, `/customers`, `/expenses`,
  `/employee-activity`, all accepting `?preset=today|yesterday|last7days|last30days|thisMonth|lastMonth|custom&from&to`.
- **`/activity`** — paginated audit log, optional `entityType` filter.
- **`/notifications`** — list (`?unreadOnly=true`), mark one read, mark all read.
- **`/settings`** — get/update business preferences (invoice prefix, thresholds, notification toggles).
- **`/search`** — global search across products/customers/suppliers/sales/employees, permission-filtered.
- **`/dashboard`** — the aggregated stat cards + chart data behind the main dashboard.

Full request/response shapes are enforced by the Zod schemas in `server/src/validators/*.ts` and the TS
types in `client/src/types/index.ts`, which mirror them.

## Rate limits

- Auth endpoints: 50 requests / 15 minutes / IP.
- Everything else under `/api`: 300 requests / minute / IP.

## Health check

`GET /api/health` → `{status: "ok", time: "<ISO timestamp>"}` — unauthenticated, used for container/
load-balancer health probes.
