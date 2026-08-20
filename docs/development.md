# Development guide

## Day-to-day workflow

```bash
# backend, with hot reload (tsx watch)
cd server && npm run dev

# frontend, with hot reload (Vite)
cd client && npm run dev
```

The frontend dev server proxies `/api` to `http://localhost:4000` (see `client/vite.config.ts`), so you
never need to configure a separate API base URL in development.

## Adding a new resource end-to-end

This codebase follows one consistent pattern for every feature module; copy it rather than inventing a
new shape:

1. **Schema** — add/extend a model in `server/prisma/schema.prisma`, always with a `businessId String`
   foreign key (`onDelete: Cascade`) if it's tenant-scoped, plus an `@@index([businessId, ...])` for any
   field you'll filter/sort by. Run `npx prisma migrate dev --name <description>`.
2. **Validator** — add a Zod schema in `server/src/validators/<resource>.validators.ts`.
3. **Controller** — add handlers in `server/src/controllers/<resource>.controller.ts`. Always scope
   Prisma queries by `req.businessId`, never trust an ID from the client alone. Wrap multi-step writes in
   `prisma.$transaction`. Call `logActivity(...)` for anything worth auditing.
4. **Route** — add `server/src/routes/<resource>.routes.ts` with
   `Router({ mergeParams: true })`, then `router.use(requireAuth, requireBusiness, requireModule("<module>"))`,
   adding `requireModule("<module>", "write")` per-route for mutations. Mount it in `server/src/app.ts`
   under `/api/businesses/:businessId/<resource>`.
5. **Permissions** — if this is a genuinely new module (not an existing one like `products`), add it to
   the `Module` union and `MODULE_ACCESS`/`WRITE_ACCESS` tables in **both**
   `server/src/lib/permissions.ts` (enforced) and `client/src/lib/permissions.ts` (mirrored for the UI).
6. **Frontend types** — add/extend the matching interface in `client/src/types/index.ts`.
7. **Frontend page** — add `client/src/pages/app/<resource>/<Resource>Page.tsx`, using
   `useQuery`/`useMutation` against `api` from `client/src/lib/api.ts`, the shared `DataTable`/`Modal`/
   `ConfirmDialog`/`Badge`/`States` components, and `useToast()` for feedback. Register the route in
   `client/src/App.tsx` and add a sidebar entry in `client/src/components/layout/Sidebar.tsx` (guarded by
   `canAccessModule`).
8. **Tests** — add `server/tests/<resource>.test.ts` following the existing pattern in
   `server/tests/helpers.ts` (`registerAndLogin`, `createBusinessForAgent`, `withBusiness`).

## Code style

- TypeScript `strict: true` on both client and server — don't weaken it to silence an error; fix the
  type.
- No unexplained comments — code should read clearly from names; comment only non-obvious *why*, not
  *what*.
- Prefer editing an existing file over creating a new abstraction; three similar lines beat a premature
  helper.
- Every mutating UI action must call a real endpoint and reflect its real result — no placeholder
  buttons, no hardcoded "looks-like-data" once a real endpoint exists for it.

## Useful commands

```bash
# Prisma
npx prisma studio              # browse the database visually
npx prisma migrate reset       # drop, recreate, migrate, and reseed (development only, destructive)
npx prisma format               # normalize schema.prisma formatting

# Type-checking without emitting
cd server && npx tsc -p tsconfig.json --noEmit
cd client && npx tsc -b
```
