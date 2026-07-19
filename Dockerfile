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

# Prisma generate needs a URL present; real credentials are injected at runtime.
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nicodigos?schema=public"
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN bunx --bun prisma generate
RUN bun run build

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
