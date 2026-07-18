ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'QUEUED' AFTER 'PENDING';
ALTER TYPE "DeliveryStatus" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW' AFTER 'FAILED';

CREATE TYPE "OutboxEventType" AS ENUM ('DELIVERY_REQUESTED');
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

ALTER TABLE "delivery"
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "queuedAt" TIMESTAMP(3),
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "failedAt" TIMESTAMP(3),
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "delivery_idempotencyKey_key" ON "delivery"("idempotencyKey");

CREATE TABLE "outbox_event" (
  "id" TEXT NOT NULL,
  "type" "OutboxEventType" NOT NULL,
  "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
  "aggregateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processingAt" TIMESTAMP(3),
  "publishedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "outbox_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outbox_event_idempotencyKey_key" ON "outbox_event"("idempotencyKey");
CREATE INDEX "outbox_event_status_availableAt_idx" ON "outbox_event"("status", "availableAt");
CREATE INDEX "outbox_event_type_aggregateId_idx" ON "outbox_event"("type", "aggregateId");
