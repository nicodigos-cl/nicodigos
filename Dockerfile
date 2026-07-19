# syntax=docker/dockerfile:1

# Etapa 1: Dependencias
FROM oven/bun:1.3-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Etapa 2: Construcción (Builder)
FROM oven/bun:1.3-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Railway injects service variables as Docker build args, but only when
# declared here. See: https://docs.railway.com/guides/dockerfiles#using-variables-at-build-time
#
# Private networking is unavailable during build, so Next.js prerender must
# use DATABASE_PUBLIC_URL. Runtime still uses DATABASE_URL (private).
# See: https://docs.railway.com/reference/private-networking#caveats
ARG DATABASE_URL
ARG DATABASE_PUBLIC_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ARG NEXT_PUBLIC_ONESIGNAL_APP_ID
ARG NEXT_PUBLIC_SUPPORT_WS_URL
ARG SENTRY_DSN
ARG SENTRY_AUTH_TOKEN
ARG CI

ENV DATABASE_URL=$DATABASE_URL
ENV DATABASE_PUBLIC_URL=$DATABASE_PUBLIC_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_ONESIGNAL_APP_ID=$NEXT_PUBLIC_ONESIGNAL_APP_ID
ENV NEXT_PUBLIC_SUPPORT_WS_URL=$NEXT_PUBLIC_SUPPORT_WS_URL
ENV SENTRY_DSN=$SENTRY_DSN
ENV SENTRY_AUTH_TOKEN=$SENTRY_AUTH_TOKEN
ENV CI=$CI

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bunx --bun prisma generate
# Prefer public DB URL for prerender; private URL is not reachable at build time.
RUN DATABASE_URL="${DATABASE_PUBLIC_URL:-$DATABASE_URL}" bun run build

# Etapa 3: Producción (Runner) — .next/standalone
FROM oven/bun:1.3-alpine AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S -g 1001 nodejs \
  && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["bun", "server.js"]
