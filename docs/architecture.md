# Arquitectura

Nicodigos es un ecommerce digital en CLP orientado a Chile: catálogo propio, fulfillment por keys manuales, paneles SMM y API Kinguin, pagos con Flow.cl, y panel admin.

## Stack

| Capa | Tecnología |
| --- | --- |
| App | Next.js 16 (App Router), React 19, Bun |
| UI | Tailwind CSS 4, shadcn / Base UI, TanStack Table & Query |
| Datos | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`) |
| Auth | Better Auth (email/password + OTP, OAuth opcional) |
| Pagos | Flow.cl (`@nicotordev/flowcl-pagos`) |
| Media | Cloudflare R2 (presigned upload) |
| Cache FX | Redis (USD/EUR → CLP) |
| Email | Resend + React Email |
| Observabilidad | Pino + Highlight.io |

## Dominio

```
Usuario → Catálogo / Carrito → Checkout (Flow) → Order + Payment
                                              ↓
                                    Delivery por método:
                                      • MANUAL  → ProductKey
                                      • KINGUIN → ESA API
                                      • SMM     → panel remoto
```

### Catálogo

- **Category**: árbol (`parentId`) con assets en R2.
- **Product**: precio en CLP, `deliveryMethod` (`MANUAL` \| `KINGUIN` \| `SMM`), estado `DRAFT` / `ACTIVE` / `ARCHIVED`.
- Productos SMM/Kinguin guardan ids remotos, costo fuente y **markup %** para reprecio al sincronizar.
- **Asset**: imágenes/video/YouTube ligados a product o category.
- **ProductKey**: inventario de keys para delivery manual.

### Comercio

- **Cart** / **Wishlist** por usuario. Ítems SMM llevan payload (`CartItemSmm`: link, username, etc.).
- **Order** → **OrderItem** (+ `OrderItemSmm` si aplica) → **Delivery** (+ keys/events) → **Payment**.

### Proveedores externos

| Integración | Rol |
| --- | --- |
| **SmmProvider** / **SmmService** | Cache del catálogo remoto del panel; sync por cron |
| **Kinguin** | Import/search de productos ESA; sync de ofertas y precios |
| **Flow** | Link de pago, webhook/confirmación, retorno checkout |
| **OpenAI** | Prefill/traducción al convertir servicios SMM en productos |

## Estructura del repo

```
src/
  app/                 # Rutas App Router
    (store)            # página, cart, checkout, dashboard
    admin/             # panel (products, categories, orders, …)
    auth/              # login, register, OTP, reset
    api/
      auth/[...all]    # Better Auth
      payments/flow    # callbacks Flow
      cron/*           # sync SMM/Kinguin + cleanup eventos
  components/
    admin/ store/ ui/  # UI por superficie
  lib/
    actions/           # Server Actions (mutaciones)
    */queries.ts       # Lecturas Prisma (server)
    validations/       # Zod schemas
    events/            # Bus de dominio + handlers
    auth/ flow/ r2/ …  # Integraciones
  emails/              # Plantillas React Email
  generated/prisma/    # Client Prisma (generado)
prisma/
  schema.prisma
  migrations/
scripts/               # Pollers de cron en desarrollo
public/logo.webp       # Marca
```

## Flujos clave

### Sync SMM → reprecio

1. Cron `sync-smm-services` llama `syncAllProvidersServices`.
2. Cambios de rate emiten `smm.service.rate_changed` en el bus de dominio.
3. Handler actualiza productos ligados: `usdToClp(rate)` + `applyMarkupPct` → nuevo `price`.
4. Se persiste `ProductPriceChangeEvent` (auditoría corta; cleanup por cron).

### Checkout

1. Actions de carrito mutan `Cart` / `CartItem`.
2. `checkoutFromCartAction` / `startCheckoutPaymentAction` crean `Order` + `Payment` e inician Flow.
3. Confirmación Flow marca pago y dispara fulfillment según `deliveryMethod`.

### Admin

- Rutas bajo `/admin/*` protegidas con `requireAdminSession`.
- Rol `ADMIN` se asigna automáticamente si el email (o dominio) está en `ADMIN_EMAILS`.

## Variables de entorno

Ver `.env.example`. Obligatorias en práctica: `DATABASE_URL`, `BETTER_AUTH_*`, `CRON_SECRET`, y según features: Flow, R2, Kinguin, Redis, Resend, OpenAI.
