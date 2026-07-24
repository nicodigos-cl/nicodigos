# Arquitectura

Nicodigos es un ecommerce digital en CLP orientado a Chile: catálogo propio, fulfillment por keys manuales, paneles SMM y API Kinguin, pagos con Flow.cl, y panel admin.

## Stack

| Capa           | Tecnología                                               |
| -------------- | -------------------------------------------------------- |
| App            | Next.js 16 (App Router), React 19, Bun                   |
| UI             | Tailwind CSS 4, shadcn / Base UI, TanStack Table & Query |
| Datos          | PostgreSQL + Prisma 7 (`@prisma/adapter-pg`)             |
| Auth           | Better Auth (email/password + OTP, OAuth opcional)       |
| Pagos          | Flow.cl (`@nicotordev/flowcl-pagos`)                     |
| Media          | Cloudflare R2 (presigned upload)                         |
| Cache / jobs   | Redis (USD/EUR → CLP) + BullMQ + live support pub/sub    |
| Email / push   | Resend + React Email; OneSignal web push                 |
| Live support   | WebSocket gateway dedicado (`scripts/support-ws.ts`)     |
| Deploy         | Railway (web + delivery worker + support-ws)             |
| Observabilidad | Pino + Sentry                                            |

## Dominio

```
Usuario → Catálogo / Carrito → Checkout (Flow) → Order + Payment
                                              ↓
                                    Delivery por método:
                                      • MANUAL  → ProductKey / DeliveryCredential
                                      • KINGUIN → ESA API
                                      • SMM     → panel remoto
```

### Catálogo

- **Category**: árbol (`parentId`) con assets en R2.
- **Product**: precio en CLP, `deliveryMethod` (`MANUAL` \| `KINGUIN` \| `SMM`), estado `DRAFT` / `ACTIVE` / `ARCHIVED`.
- Productos SMM/Kinguin guardan ids remotos, costo fuente y **markup %** para reprecio al sincronizar.
- **Asset**: imágenes/video/YouTube ligados a product o category.
- **ProductKey** / **ProductAccount**: inventario MANUAL (keys y cuentas; reserva opcional en checkout).
- **ProductOffer**: ofertas Kinguin (precio EUR, qty, default offer).

### Comercio

- **Cart** por usuario o invitado (token aleatorio en cookie HTTP-only; solo el hash se persiste). **Wishlist** por usuario. Ítems SMM llevan payload (`CartItemSmm`: link, username, etc.).
- **Order** → **OrderItem** (+ `OrderItemSmm` si aplica) → **Delivery** (+ keys/credentials/events) → **Payment**.
- **OutboxEvent**: puente transaccional hacia BullMQ tras confirmar pago.

### Comunicaciones

- Hilos email / live chat (`CommunicationThread` / `CommunicationMessage`).
- Webhooks Resend, cron `process-communications`, templates y audiencias.
- Web push OneSignal (`WebPushNotification` + preferencias de usuario).

### Proveedores externos

| Integración                      | Rol                                                        |
| -------------------------------- | ---------------------------------------------------------- |
| **SmmProvider** / **SmmService** | Cache del catálogo remoto del panel; sync por cron         |
| **Kinguin**                      | Import/search ESA; sync de ofertas, stock y precios        |
| **Flow**                         | Link de pago, webhook/confirmación, retorno checkout       |
| **OpenAI**                       | Prefill/traducción al convertir servicios SMM en productos |
| **Resend** / **OneSignal**       | Email transaccional/soporte y push                         |

## Estructura del repo

```
src/
  app/                 # App Router (store, admin, auth, api)
    api/
      auth/[...all]    # Better Auth
      payments/flow    # callbacks Flow
      webhooks/resend   # inbound/delivery email
      webhooks/kinguin # ESA product.update / order.status
      support/         # tickets WS
      cron/*           # sync, cleanup, outbox, communications
  components/
    admin/ store/ ui/
  lib/
    actions/           # Server Actions
    */queries.ts       # Lecturas Prisma
    validations/       # Zod
    events/            # Bus + handlers
    kinguin/           # import, sync, offers, balance
    auth/ flow/ r2/ …
  emails/
  generated/prisma/
prisma/
  schema.prisma
  migrations/
scripts/               # Cron pollers, delivery-worker, support-ws
railway.toml           # Web (Railpack + standalone)
railway.delivery.toml  # Worker BullMQ
railway.ws.toml        # Gateway WS
docs/
public/
```

## Flujos clave

### Sync SMM → reprecio

1. Cron `sync-smm-services` llama `syncAllProvidersServices`.
2. Cambios de rate emiten `smm.service.rate_changed` en el bus de dominio.
3. Handler actualiza productos ligados: `usdToClp(rate)` + `applyMarkupPct` → nuevo `price`.
4. Se persiste `ProductPriceChangeEvent` (auditoría corta; cleanup por cron).

### Sync Kinguin → stock y reprecio

1. Cron `sync-kinguin-products` sincroniza **productos ya importados** (no el catálogo remoto completo).
2. Por cada producto: GET ESA → pick cheapest offer → upsert `ProductOffer` → actualizar `Product.qty` / costo / markup.
3. Sin ofertas o producto 404 → `ARCHIVED`.
4. Stock comprable: ver [Stock Kinguin](#stock-kinguin).

### Checkout

1. Actions de carrito mutan `Cart` / `CartItem`; un invitado conserva el carrito mediante una cookie HTTP-only.
2. En checkout, el invitado indica nombre/email y verifica un OTP. La sesión passwordless resultante vincula la orden al email confirmado.
3. `checkoutFromCartAction` / `startCheckoutPaymentAction` crean `Order` + `Payment` (con `accessToken`) e inician Flow. El return de Flow y los emails de estado usan `/checkout/[orderId]?s=<token>`; tras validar el secret se setea cookie HTTP-only para live-status sin sesión.
4. Confirmación Flow marca pago, crea `Delivery` y `OutboxEvent` en una sola transacción.
5. El publisher de outbox encola `delivery.fulfill`; el worker consulta PostgreSQL y ejecuta MANUAL, SMM o Kinguin.
6. PostgreSQL conserva el estado auditable; Redis solo transporta `{ deliveryId }`.

### Fulfillment asíncrono

- Cola `delivery`: asignación de keys y solicitudes remotas, con retry/backoff.
- Cola `email`: notificaciones del ciclo de entrega.
- `OutboxEvent` evita perder el job entre el commit del pago y Redis.
- `Delivery.idempotencyKey`, el claim de estado y las referencias externas protegen contra duplicados.
- SMM sin respuesta concluyente pasa a `MANUAL_REVIEW`; no se repite una compra incierta.
- Kinguin: errores de negocio (4xx, fondos, oferta/precio) pasan a `MANUAL_REVIEW` + email a `ADMIN_EMAILS`; solo se reintentan 429/5xx/timeouts. Antes de crear, concilia por `orderExternalId`.
- Credenciales MANUAL sensibles van en `DeliveryCredential` (AES-GCM con `DELIVERY_SECRETS_KEY`).

### Admin

- Rutas bajo `/admin/*` protegidas con `requireAdminSession`.
- Rol `ADMIN` se asigna automáticamente si el email (o dominio) está en `ADMIN_EMAILS`.
- Comunicaciones en `/admin/communications`.

### Soporte en vivo (Railway)

- Persistencia en `CommunicationThread` / `CommunicationMessage` con `channel = LIVE_CHAT`.
- Next.js mint ticket HMAC (`POST /api/support/ws-ticket`) y publica eventos a Redis `support:events`.
- El **mismo** gateway (`scripts/support-ws.ts` en `wss://ws.nicodigos.cl/ws`) también sirve estado de checkout: ticket `scope: order` (`POST /api/orders/[orderId]/ws-ticket`) y canal Redis `orders:events`.
- Deploy: un servicio WSS; vars `SUPPORT_WS_SECRET`, `REDIS_URL`, `NEXT_PUBLIC_SUPPORT_WS_URL`.

### Deploy Railway

Tres procesos (ver [env.md](./env.md#railway-tres-servicios)):

1. **Web** — Next standalone + `prisma migrate deploy` en pre-deploy.
2. **Delivery worker** — `scripts/delivery-worker.ts`.
3. **Support WS** — `scripts/support-ws.ts` + healthcheck `/health`.

Programar crons HTTP con `CRON_SECRET` (sobre todo `publish-outbox` y `process-communications`).

## Stock Kinguin

La API ESA distingue:

| Campo oferta | Significado |
| --- | --- |
| `qty` / `textQty` | Stock **total** comprable (físico + declarado) |
| `availableQty` / `availableTextQty` | Stock **físico** subido a Kinguin |

En sandbox es común ver `qty: 10` y `availableQty: 0` (stock declarado sin keys físicas). Eso **sí** se puede comprar vía ESA.

Reglas en código (`src/lib/kinguin/offers.ts`, `src/lib/products/stock.ts`):

- `offerAvailableQty` / `resolvePersistedOfferQty` → `Math.max(físico, total)`.
- Sync escribe ese valor en `Product.qty` y conserva `ProductOffer.availableQty` / `qty` / `textQty`.
- UI store/admin usa `getProductStock` (máximo entre oferta default y `Product.qty` / `textQty`).

No usar solo `availableQty ?? qty`: con `availableQty === 0` el `??` no cae a `qty` y el producto aparece “Sin stock”.

## Variables de entorno

Detalle completo: [env.md](./env.md) y `.env.example`.
