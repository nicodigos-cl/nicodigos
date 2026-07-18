# Patrones de código

Convenciones que el repo ya usa. Preferir extender estos patrones antes de inventar capas nuevas.

## 1. Capas por responsabilidad

| Capa | Ubicación | Rol |
| --- | --- | --- |
| **Validación** | `src/lib/validations/*` | Schemas Zod; única fuente de forma de input |
| **Mutación** | `src/lib/actions/*` | `"use server"`; auth → parse → validate → Prisma → `revalidatePath` |
| **Lectura** | `src/lib/*/queries.ts` | Queries Prisma reutilizables desde RSC / actions |
| **Dominio puro** | `src/lib/fx/*`, format helpers | Sin I/O; usable en client y server |
| **Integración** | `src/lib/flow`, `r2`, `kinguin`, `smm-*` | Clients y sync externos |
| **UI** | `src/components/{admin,store,ui}` | Presentación; llama actions / hooks |

No meter lógica de negocio pesada en componentes. Las páginas admin suelen ser Server Components que leen con queries y delegan mutaciones a actions.

## 2. Server Actions → `ActionResult<T>`

Todas las mutaciones exportan un resultado discriminado:

```ts
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };
```

Patrón típico (ver `categories.ts`, `products.ts`):

1. `"use server"` al inicio del módulo.
2. Auth: `requireSession()` o `requireAdminSession()`; devolver `unauthorized()` si falla.
3. Input: aceptar `unknown` o `FormData` con campo `payload` JSON (`parseSubmission`).
4. `schema.safeParse` → `validationError` con `flattenError` de Zod.
5. Reglas de dominio (jerarquía, stock, etc.) antes de escribir.
6. `prisma` o `prisma.$transaction` para writes atómicos.
7. `revalidatePath` de las rutas afectadas.
8. Mapear errores Prisma conocidos (`P2002` slug duplicado, etc.) a mensajes de UI.

El cliente inspecciona `result.success` y muestra `message` / `fieldErrors` (forms con react-hook-form + resolvers).

## 3. Auth y roles

- **Better Auth** en `src/lib/auth.ts` + route `app/api/auth/[...all]`.
- Sesión server: `getSession` / `requireSession` / `requireAdminSession` (`src/lib/auth/session.ts`).
- Cliente: `src/lib/auth-client.ts`.
- `User.role`: `USER` \| `ADMIN`. Admin por allowlist `ADMIN_EMAILS` (email o dominio) en hooks de create user/session.
- Captcha Turnstile en flujos auth; OTP por email (React Email).

## 4. Prisma client singleton

```ts
// src/lib/prisma.ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
```

- Client generado en `src/generated/prisma` (no editar a mano).
- Adapter `pg` + `DATABASE_URL`.
- Singleton en `globalThis` en desarrollo para evitar hot-reload leaks.
- Tipos/enums: `@/generated/prisma/client` o `@/generated/prisma/enums`.

Detalle del modelo: [prisma.md](./prisma.md).

## 5. Eventos de dominio (in-process)

Bus tipado en `src/lib/events/bus.ts`:

```ts
onDomainEvent("smm.service.rate_changed", handler);
await emitDomainEvent("smm.service.rate_changed", payload);
```

- Handlers registrados al entrar a rutas cron (p. ej. `registerSmmProductPriceHandlers()`).
- Errores de handler se loguean; no tumban el emisor.
- Efectos laterales (reprecio, `ProductPriceChangeEvent`) viven en handlers, no en el sync crudo.

## 6. Crons

- Endpoints `app/api/cron/*` con `Authorization: Bearer CRON_SECRET` (también header Vercel).
- `runtime = "nodejs"`, `dynamic = "force-dynamic"`, `maxDuration` alto para syncs largos.
- En local: `bun scripts/dev-crons.ts` (o scripts por job) junto a `bun run dev`.

Jobs actuales: sync SMM, sync Kinguin, cleanup de `ProductPriceChangeEvent`.

## 7. Precio y FX

- Costos SMM en USD → `usdToClp` (Redis cache).
- Costos Kinguin en EUR → `eurToClp`.
- Markup: `applyMarkupPct(baseClp, markupPct)` → precio entero CLP.
- Persistir `smmMarkupPct` / `kinguinMarkupPct` en el producto para reaplicar en sync.

## 8. Uploads R2

1. Action `createAssetUploadAction` → presigned PUT.
2. Browser sube directo al bucket (CORS en R2).
3. URL pública (`R2_PUBLIC_URL`) se guarda en `Asset` / `coverImageUrl`.
4. Discard / delete limpia object key cuando corresponde.

## 9. UI y formularios

- shadcn components en `src/components/ui`.
- Admin: shell + sidebar + data-tables TanStack.
- Forms: react-hook-form + Zod resolvers + Turnstile donde aplica.
- Feedback: Sonner toasts; estados de loading en botones de action.

## 10. Logging y observabilidad

- `createLogger({ module: "…" })` (Pino) en crons, syncs, events, pagos.
- Highlight.io vía instrumentation / project id.
- No loguear secrets ni bodies de pago completos.

## Checklist al agregar un feature

1. Modelos / migración Prisma si hay persistencia.
2. Zod schema en `validations/`.
3. Queries de lectura en `lib/<dominio>/queries.ts`.
4. Actions con `ActionResult` + auth + `revalidatePath`.
5. UI en `components/` + ruta en `app/`.
6. Cron/evento solo si hay sync o side-effect asíncrono.
7. Actualizar `.env.example` si hay nueva config.
