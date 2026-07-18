<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Nicodigos — agent guide

Store digital (CLP, Chile): keys, SMM panels, Kinguin ESA, Flow.cl, Better Auth, Prisma 7 / PostgreSQL.

## Read first

| Doc | When |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | Domain flows, folder layout, integrations |
| [docs/patterns.md](docs/patterns.md) | How to write actions, queries, events, crons |
| [docs/prisma.md](docs/prisma.md) | Schema map, migrations, client usage |
| [README.md](README.md) | Setup, env, scripts |
| `.env.example` | Required env vars |

Prefer extending existing patterns over new layers.

## Hard rules

1. **Mutations** → `src/lib/actions/*` with `"use server"` and `ActionResult<T>` (`success` / `message` / `fieldErrors`). Auth → parse → Zod → Prisma → `revalidatePath`.
2. **Validation** → Zod in `src/lib/validations/*` only; do not duplicate schemas in UI.
3. **Reads** → `src/lib/*/queries.ts`; keep heavy logic out of components.
4. **Prisma** → import from `@/generated/prisma/*` and `src/lib/prisma.ts`. Never edit `src/generated/prisma`. New models need a migration.
5. **Auth** → `requireSession` / `requireAdminSession` from `src/lib/auth/session.ts`. Admin via `ADMIN_EMAILS`.
6. **Money / FX** → CLP integers via `applyMarkupPct` + `usdToClp` / `eurToClp`; persist markup % on products for sync reprice.
7. **Side effects from sync** → domain events in `src/lib/events/*`, not inline in sync loops.
8. **Crons** → `app/api/cron/*` behind `CRON_SECRET`; register event handlers in the route entry.
9. **Uploads** → R2 presigned flow in `src/lib/actions/assets.ts` + `src/lib/r2.ts`.
10. **Types** → check package types under `node_modules` when changing TS/TSX APIs (Next, Prisma, Better Auth, etc.).
11. **Secrets** → never commit `.env`; update `.env.example` when adding config.
12. **Commits / PRs** → only when the user asks.

## Layout cheat sheet

```
src/app/           # App Router (store, admin, auth, api)
src/lib/actions/   # Server Actions
src/lib/validations/
src/lib/*/queries.ts
src/lib/events/    # Domain bus + handlers
src/components/{admin,store,ui}
prisma/schema.prisma
src/generated/prisma/
```

## Commands

```bash
bun run dev
bunx --bun prisma migrate dev --name <name>
bunx --bun prisma generate
bunx --bun prisma migrate deploy
```
