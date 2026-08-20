# Security

## Authentication

- Passwords hashed with **bcrypt**, cost factor 12 (`server/src/lib/password.ts`). Never logged, never
  returned in any API response (`sanitizeUser` strips `passwordHash` before every response).
- Sessions use **short-lived JWT access tokens** (15 min) plus **long-lived, rotating, revocable refresh
  tokens** (30 days), both delivered as `httpOnly`, `sameSite=lax` cookies — never accessible to
  JavaScript, which removes them as an XSS exfiltration target. `secure: true` is automatic when
  `NODE_ENV=production`.
- Refresh tokens are stored server-side (`RefreshToken` table) so any individual token can be revoked
  (logout revokes the one used; password reset revokes *all* of a user's tokens, forcing re-login on
  every device).
- Forgot-password (`POST /auth/forgot-password`) always returns the same 200 response whether or not the
  email is registered, so the endpoint can't be used to enumerate accounts.
- Reset tokens are cryptographically random (`crypto.randomBytes(32)`), single-use (`usedAt` checked),
  and expire after 1 hour.

## Authorization

- **Tenant isolation**: `requireBusiness` middleware re-verifies the caller's `Membership` against the
  database on *every* request — the `X-Business-Id` header is a claim the server independently checks,
  never a trusted grant. See `server/src/middleware/tenant.ts` and the isolation tests in
  `server/tests/multiTenancy.test.ts`.
- **RBAC**: `requireModule(module, "read"|"write")` enforces the permission table in
  `server/src/lib/permissions.ts` on the server for every protected route. The frontend's mirrored
  permission table (`client/src/lib/permissions.ts`) only controls what's *shown* — it is explicitly not
  trusted as a security boundary, and the RBAC test suite (`server/tests/rbac.test.ts`) verifies the
  server rejects out-of-role actions even when attempted directly against the API.
- Business IDs, product IDs, etc. supplied by the client are always used as a `WHERE` filter combined
  with `businessId`, never trusted alone — e.g. `prisma.product.findFirst({where: {id, businessId}})`,
  so requesting another tenant's record ID returns 404, not another tenant's data.

## Input validation

Every mutating endpoint validates its body with a **Zod** schema (`server/src/validators/*.ts`) before
touching the database; validation failures return `400 VALIDATION_ERROR` with field-level details. This
is a defense-in-depth layer on top of Prisma's own type safety and database constraints.

## Injection & XSS

- **SQL injection**: all queries go through Prisma's parameterized query builder. The few `$queryRaw`
  calls (used for cross-column comparisons and aggregate reports Prisma's builder can't express) use
  tagged-template interpolation, which Prisma parameterizes automatically — never raw string
  concatenation of user input.
- **XSS**: React escapes all rendered content by default; the app does not use `dangerouslySetInnerHTML`
  anywhere. Session tokens live only in `httpOnly` cookies, so even a hypothetical XSS bug couldn't steal
  a session token via `document.cookie`.
- **CSRF**: cookies are `sameSite=lax`, which blocks cross-site form/script-triggered state-changing
  requests from other origins in modern browsers; the API also only accepts `application/json` bodies
  (no implicit form-encoded submission), further limiting classic CSRF vectors.

## Transport & headers

- `helmet()` sets standard security headers (X-Content-Type-Options, X-Frame-Options, etc.).
- CORS is locked to a single configured origin (`APP_URL`), with credentials enabled only for that
  origin.
- `trust proxy` is enabled so rate limiting and secure-cookie detection work correctly behind a reverse
  proxy/load balancer in production.

## Rate limiting

`express-rate-limit` caps authentication endpoints at 50 requests/15min/IP (mitigating credential
stuffing/brute force) and general API traffic at 300 requests/min/IP.

## Secrets

- `server/.env.example` documents every required variable with no real values.
- `.gitignore` excludes `.env` files, build output, and logs at the repo root and in both `client/` and
  `server/`.
- `JWT_SECRET` / `JWT_REFRESH_SECRET` ship with obviously-fake development defaults
  (`dev-insecure-secret-change-me`) that must be overridden in any non-local environment — the README
  and docker-compose call this out explicitly.

## What's intentionally out of scope for this environment

File uploads (product images, receipts) accept a URL string rather than a real upload pipeline, since no
object storage is configured here — this avoids introducing an unvalidated file-upload attack surface
(path traversal, content-type spoofing, storage exhaustion) for a feature with nowhere real to store
files yet. See the README's "Known limitations" section.
