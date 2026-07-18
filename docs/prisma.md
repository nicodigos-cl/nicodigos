# Prisma

PostgreSQL + Prisma 7 con client generado fuera de `node_modules`.

## Configuración

| Archivo | Uso |
| --- | --- |
| `prisma/schema.prisma` | Modelos, enums, `@@map` a snake_case |
| `prisma.config.ts` | Path de schema/migrations + `DATABASE_URL` |
| `src/lib/prisma.ts` | Singleton `PrismaClient` + adapter `PrismaPg` |
| `src/generated/prisma/` | Output del generator (`prisma-client`) |

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

La URL vive en `prisma.config.ts` (`env("DATABASE_URL")`), no en el bloque `datasource` del schema (Prisma 7).

## Comandos

```bash
# Generar client tras cambiar el schema
bunx --bun prisma generate

# Desarrollo: crear migración + aplicar
bunx --bun prisma migrate dev --name describe_the_change

# Producción / CI / DB fresca
bunx --bun prisma migrate deploy

# Explorar datos
bunx --bun prisma studio
```

Usar una base dedicada (`nicodigos_store`); no reutilizar schemas de otros ecommerce.

## Mapa del modelo

### Auth (Better Auth)

`User`, `Session`, `Account`, `Verification` — tablas mapeadas a `user`, `session`, etc.

Campos de negocio en `User`:

- `role` (`USER` \| `ADMIN`)
- Facturación Chile: `rut`, `invoiceType` (`BOLETA` \| `FACTURA`), `businessName`, `businessActivity`, dirección

### Catálogo

```
Category (árbol)
    ↔ ProductCategory ↔ Product
                          ├─ Asset
                          ├─ ProductKey
                          ├─ ProductOffer (Kinguin)
                          ├─ ProductSystemRequirement
                          └─ ProductPriceChangeEvent
```

`Product.deliveryMethod`: `SMM` \| `KINGUIN` \| `MANUAL`.

Campos de sync importantes:

- SMM: `smmApiUrl`, `smmServiceId`, `smmRate`, `smmMarkupPct`, …
- Kinguin: `kinguinProductId`, `kinguinId`, `kinguinOfferId`, `kinguinMarkupPct`, …

### Proveedores SMM

```
SmmProvider 1─* SmmService  (cache remoto, unique providerId+remoteServiceId)
```

### Pedidos y entrega

```
Order 1─* OrderItem 1─0..1 OrderItemSmm
                    1─0..1 Delivery 1─* DeliveryKey
                                   1─* DeliveryEvent
Order 1─* Payment
OutboxEvent → entrega transaccional hacia BullMQ
```

### Carrito y wishlist

```
User 1─0..1 Cart 1─* CartItem 1─0..1 CartItemSmm
User 1─0..1 Wishlist 1─* WishlistItem
```

`CartItem` **no** tiene unique `(cartId, productId)`: el mismo producto SMM puede repetirse con links distintos.

## Convenciones del schema

1. **IDs**: `cuid()` en modelos de negocio; Better Auth trae sus propios ids string.
2. **Tablas**: `@@map("snake_case")` siempre.
3. **Dinero**: `Decimal` con precisión explícita (`@db.Decimal(12, 2)` precios CLP; rates SMM más anchos).
4. **Enums** en Prisma para estados de dominio (no strings sueltos).
5. **Cascades**: borrar provider → services; borrar order → items/payments; producto → assets/keys; user → cart/wishlist. Pedidos usan `Restrict` hacia `User`/`Product` donde no debe borrarse historia.
6. **Índices**: status, slugs, foreign keys de listados admin, y pares de sync (`smmServiceId`, `kinguinId`, …).

## Uso en código

```ts
import prisma from "@/lib/prisma";
import { ProductStatus, Prisma } from "@/generated/prisma/client";

const products = await prisma.product.findMany({
  where: { status: ProductStatus.ACTIVE },
});

// Transacciones para writes multi-tabla
await prisma.$transaction(async (tx) => {
  // …
});
```

Errores conocidos a mapear en actions:

- `P2002` — unique violation (slug, email, key code, …)
- `P2025` — record not found en update/delete

## Migraciones

- Una carpeta por migración en `prisma/migrations/<timestamp>_<name>/`.
- No editar migraciones ya aplicadas en shared/prod; crear una nueva.
- Tras pull: `bunx --bun prisma migrate deploy` + `bunx --bun prisma generate` si el client cambió.

## Relación con el resto del repo

| Concern | Dónde vive la lógica |
| --- | --- |
| CRUD admin | `src/lib/actions/*` |
| Lecturas listados | `src/lib/*/queries.ts` |
| Reprecio por sync | `src/lib/events/handlers/*` |
| Cleanup eventos precio | cron `cleanup-price-change-events` |
| Publicación de fulfillment | `OutboxEvent` + cron `publish-outbox` |
| Soporte en vivo | `src/lib/support-live/*` + `scripts/support-ws.ts` |
