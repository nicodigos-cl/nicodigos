<p align="center">
  <img src="public/logo.webp" alt="Nicodigos" width="120" height="120" />
</p>

<h1 align="center">Nicodigos</h1>

<p align="center">
  Store de productos digitales en Chile: keys, servicios SMM y catálogo Kinguin,<br />
  con checkout Flow.cl, panel admin y sync de proveedores.
</p>

<p align="center">
  <a href="docs/README.md">Documentación</a> ·
  <a href="docs/architecture.md">Arquitectura</a> ·
  <a href="docs/patterns.md">Patrones</a> ·
  <a href="docs/prisma.md">Prisma</a>
</p>

---

## Qué es

Nicodigos es una aplicación **Next.js 16** (App Router) + **Prisma 7** / PostgreSQL para vender y entregar productos digitales:

- Catálogo con categorías, assets (R2) e inventario de keys
- Tres métodos de entrega: **MANUAL**, **SMM** (paneles) y **KINGUIN** (ESA API)
- Carrito, wishlist, órdenes, deliveries y pagos **Flow.cl**
- Auth con **Better Auth** (email/OTP, OAuth opcional) y roles `USER` / `ADMIN`
- Crons de sync (SMM / Kinguin) que actualizan rates y reprecian con markup + FX (Redis)

## Stack

| Área | Tecnología |
| --- | --- |
| Runtime | Bun, Next.js 16, React 19 |
| DB | PostgreSQL, Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Better Auth + Prisma adapter |
| Pagos | Flow.cl (`@nicotordev/flowcl-pagos`) |
| Media | Cloudflare R2 (S3 API) |
| UI | Tailwind 4, shadcn / Base UI, TanStack Query & Table |
| Email | Resend + React Email |

## Requisitos

- Bun
- PostgreSQL
- Redis (cache USD/EUR → CLP)
- Credenciales opcionales según feature: Flow, R2, Kinguin, Resend, OpenAI, Highlight

## Setup

```bash
bun install
cp .env.example .env
# Editar DATABASE_URL, BETTER_AUTH_*, CRON_SECRET, etc.

# Base dedicada recomendada
# createdb nicodigos_store

bunx --bun prisma migrate deploy
bunx --bun prisma generate

bun run dev          # Next + pollers de cron
# o solo web:
bun run dev:web
```

Abrir [http://localhost:3000](http://localhost:3000). Admin: `/admin` (emails/dominios en `ADMIN_EMAILS`).

## Scripts útiles

| Script | Descripción |
| --- | --- |
| `bun run dev` | Web + todos los crons en local |
| `bun run cron:sync-smm:once` | Una pasada de sync SMM |
| `bun run cron:sync-kinguin:once` | Una pasada de sync Kinguin |
| `bun run cron:cleanup-price-events:once` | Limpia eventos de precio viejos |
| `bun run build` / `bun run start` | Producción |

## Lógica del dominio (resumen)

```
Catálogo (Product) ──deliveryMethod──► MANUAL | SMM | KINGUIN
        │
        ▼
Carrito → Checkout Flow → Order + Payment → Delivery
                                              │
                    sync crons ◄── SmmProvider / Kinguin ESA
                         │
                         ▼
              domain events → reprecio + ProductPriceChangeEvent
```

Mutaciones van por **Server Actions** (`src/lib/actions`) con `ActionResult<T>`; lecturas por **queries**; reglas de sync/reprecio por **eventos de dominio**. Detalle en [docs/patterns.md](docs/patterns.md) y [docs/prisma.md](docs/prisma.md).

## Prisma

Schema en `prisma/schema.prisma`, client generado en `src/generated/prisma`, singleton en `src/lib/prisma.ts`.

```bash
bunx --bun prisma migrate dev --name my_change
bunx --bun prisma studio
```

## Cloudflare R2

Imágenes de producto/categoría suben con URL firmada al bucket S3-compatible. Variables:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://media.example.com
```

CORS del bucket (origen = tu admin):

```json
[
  {
    "AllowedOrigins": ["https://example.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type", "Cache-Control"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Documentación

- [Índice docs](docs/README.md)
- [Arquitectura y flujos](docs/architecture.md)
- [Patrones de código](docs/patterns.md)
- [Modelo Prisma](docs/prisma.md)

## Licencia

Proyecto privado (`private: true` en `package.json`).
