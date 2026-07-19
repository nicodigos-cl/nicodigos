# Variables de entorno

Fuente de verdad: [`.env.example`](../.env.example). Nunca commitear `.env`.

## Arranque mínimo (local)

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | PostgreSQL (base dedicada `nicodigos_store`) |
| `BETTER_AUTH_SECRET` | Secret de Better Auth |
| `BETTER_AUTH_URL` | Origen de la app (`http://localhost:3000`) |
| `CRON_SECRET` | Bearer para `/api/cron/*` |
| `REDIS_URL` | FX cache, BullMQ, pub/sub de soporte |

El resto es por feature. Sin Flow no hay checkout; sin R2 no hay uploads; sin Kinguin/SMM no hay sync de esos proveedores.

## Catálogo

### App y auth

| Variable | Notas |
| --- | --- |
| `BETTER_AUTH_SECRET` | Obligatorio |
| `BETTER_AUTH_URL` | URL pública de la app (auth callbacks) |
| `NEXT_PUBLIC_APP_URL` | Opcional; callbacks Flow return/confirm |
| `ADMIN_EMAILS` | Emails y/o dominios admin (coma) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile (keys de test en example) |
| `GOOGLE_CLIENT_*` / `GITHUB_CLIENT_*` | OAuth opcional |

### Base de datos

| Variable | Notas |
| --- | --- |
| `DATABASE_URL` | Runtime + migraciones (en Railway: URL **privada**) |
| `DATABASE_PUBLIC_URL` | Solo build/prerender en Railway (red privada no existe en build) |

```bash
# Fresh local
createdb nicodigos_store
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nicodigos_store
bunx --bun prisma migrate deploy
```

### Pagos Flow.cl

| Variable | Notas |
| --- | --- |
| `FLOW_API_KEY` / `FLOW_SECRET_KEY` | Credenciales Flow |
| `FLOW_ENVIRONMENT` | `sandbox` \| `production` |

### Kinguin ESA

| Variable | Notas |
| --- | --- |
| `KINGUIN_API_KEY` | Header `X-Api-Key` |
| `KINGUIN_ENVIRONMENT` | `production` (default en client) \| `sandbox` |
| `KINGUIN_API_BASE` | Override opcional del gateway |

Sandbox: `https://gateway.sandbox.kinguin.net/esa/api`  
Prod: `https://gateway.kinguin.net/esa/api`

Credenciales sandbox ≠ producción. Ver [arquitectura → stock Kinguin](./architecture.md#stock-kinguin).

### Email (Resend)

| Variable | Notas |
| --- | --- |
| `RESEND_API_KEY` | Envío |
| `RESEND_FROM` | Remitente verificado |
| `RESEND_WEBHOOK_SECRET` | Firma `whsec_…` para `POST /api/webhooks/resend` |

### OneSignal (web push)

| Variable | Notas |
| --- | --- |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | Solo App ID público |
| `ONESIGNAL_APP_ID` | App ID server |
| `ONESIGNAL_REST_API_KEY` | REST privada |
| `ONESIGNAL_ORGANIZATION_API_KEY` | No usada hoy |

### Delivery secrets (MANUAL)

| Variable | Notas |
| --- | --- |
| `DELIVERY_SECRETS_KEY` | Material AES-256-GCM (32+ chars). Necesaria para guardar/revelar credenciales MANUAL |

### Media (Cloudflare R2)

| Variable | Notas |
| --- | --- |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | S3 API |
| `R2_BUCKET` | Bucket |
| `R2_PUBLIC_URL` | URL pública o custom domain |

### Redis / workers

| Variable | Notas |
| --- | --- |
| `REDIS_URL` | Obligatorio para FX, BullMQ y live support |
| `BULLMQ_PREFIX` | Prefijo de colas (default interno) |
| `DELIVERY_WORKER_CONCURRENCY` | Concurrencia fulfillment |
| `EMAIL_WORKER_CONCURRENCY` | Concurrencia emails de delivery |
| `DELIVERY_RECONCILE_DELAY_MS` | Delay reconcile |
| `DELIVERY_RECONCILE_MAX_ATTEMPTS` | Tope de intentos reconcile |

### Live support WebSocket

| Variable | Notas |
| --- | --- |
| `SUPPORT_WS_SECRET` | HMAC tickets + auth del gateway |
| `NEXT_PUBLIC_SUPPORT_WS_URL` | `ws://127.0.0.1:3011/ws` local; `wss://…` en prod |
| `PORT` | Puerto del gateway (`3011` típico) |

### Crons

| Variable | Notas |
| --- | --- |
| `CRON_SECRET` | `Authorization: Bearer …` |
| `PRICE_CHANGE_EVENT_RETENTION_DAYS` | Default `7` |
| `CRON_BASE_URL` | Base URL de pollers locales |
| `CRON_*_INTERVAL_MS` / `CRON_*_INITIAL_DELAY_MS` | Pollers en `scripts/dev-crons.ts` |

Endpoints:

- `/api/cron/sync-smm-services`
- `/api/cron/sync-kinguin-products`
- `/api/cron/cleanup-price-change-events`
- `/api/cron/process-communications`
- `/api/cron/publish-outbox`

### OpenAI

| Variable | Notas |
| --- | --- |
| `OPENAI_API_KEY` | Prefill/traducción SMM → producto |
| `OPENAI_MODEL` | Default `gpt-5-nano` |

### Logging / Sentry

| Variable | Notas |
| --- | --- |
| `LOG_LEVEL` | `fatal`…`trace` (Pino) |
| `SERVICE_NAME` | Tag de logs |
| `SERVICE_VERSION` | Opcional |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | DSN server / client |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | En Railway suele venir de `RAILWAY_ENVIRONMENT_NAME` |
| `SENTRY_TRACES_SAMPLE_RATE` | `0`–`1` (default errores only) |
| `SENTRY_AUTH_TOKEN` | Upload de source maps / CI |

## Railway (tres servicios)

Config-as-code:

| Servicio | Config | Rol |
| --- | --- | --- |
| Web (Next) | `railway.toml` | App + prerender; migrate en pre-deploy |
| Delivery worker | `railway.delivery.toml` | BullMQ fulfillment + email |
| Support WS | `railway.ws.toml` | Gateway WebSocket |

Notas web:

- Build usa `DATABASE_PUBLIC_URL` (prerender).
- Runtime y `prisma migrate deploy` usan `DATABASE_URL` privada.
- Start: standalone `.next/standalone/server.js` (incluye `public/` y `.next/static` copiados en build).

El proceso web **no** consume colas BullMQ: hace falta el worker de delivery + cron `publish-outbox`.
