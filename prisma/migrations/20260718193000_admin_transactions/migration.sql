ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REJECTED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'EXPIRED';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PARTIALLY_REFUNDED';

CREATE TYPE "PaymentEventType" AS ENUM ('CREATED', 'SESSION_STARTED', 'CALLBACK_RECEIVED', 'WEBHOOK_RECEIVED', 'PROVIDER_STATUS_CHECKED', 'STATUS_CHANGED', 'ORDER_MARKED_PAID', 'FULFILLMENT_STARTED', 'RECONCILED', 'CONFIRMATION_REPROCESSED', 'REVIEW_MARKED', 'REVIEW_RESOLVED', 'NOTE_ADDED', 'REFUND_REQUESTED', 'REFUND_STATUS_CHECKED', 'REFUND_COMPLETED', 'MANUAL_CORRECTION', 'ERROR');
CREATE TYPE "PaymentEventSource" AS ENUM ('SYSTEM', 'CALLBACK', 'WEBHOOK', 'PROVIDER', 'ADMIN');
CREATE TYPE "PaymentEventResult" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED', 'IGNORED');
CREATE TYPE "PaymentReviewPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "PaymentRefundStatus" AS ENUM ('CREATED', 'ACCEPTED', 'REJECTED', 'REFUNDED', 'CANCELLED', 'ERROR');

ALTER TABLE "payment"
  ADD COLUMN "flowOrder" INTEGER,
  ADD COLUMN "commerceOrder" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "payerEmail" TEXT,
  ADD COLUMN "providerStatus" TEXT,
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "expiresAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "lastProviderCheckAt" TIMESTAMP(3),
  ADD COLUMN "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "safeMetadata" JSONB,
  ADD COLUMN "requiresReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewPriority" "PaymentReviewPriority",
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "reviewNote" TEXT,
  ADD COLUMN "reviewActorUserId" TEXT,
  ADD COLUMN "reviewActorEmail" TEXT,
  ADD COLUMN "reviewCreatedAt" TIMESTAMP(3),
  ADD COLUMN "reviewResolvedAt" TIMESTAMP(3);

UPDATE "payment" SET "commerceOrder" = "orderId" WHERE "commerceOrder" IS NULL;

CREATE TABLE "payment_event" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "type" "PaymentEventType" NOT NULL,
  "source" "PaymentEventSource" NOT NULL DEFAULT 'SYSTEM',
  "result" "PaymentEventResult" NOT NULL DEFAULT 'SUCCESS',
  "statusBefore" "PaymentStatus",
  "statusAfter" "PaymentStatus",
  "message" TEXT,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "providerRef" TEXT,
  "errorCode" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "payment_refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "PaymentRefundStatus" NOT NULL DEFAULT 'CREATED',
  "refundCommerceOrder" TEXT NOT NULL,
  "flowRefundOrder" TEXT,
  "providerToken" TEXT,
  "providerMessage" TEXT,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_refund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_provider_externalId_key" ON "payment"("provider", "externalId");
CREATE INDEX "payment_flowOrder_idx" ON "payment"("flowOrder");
CREATE INDEX "payment_commerceOrder_idx" ON "payment"("commerceOrder");
CREATE INDEX "payment_requiresReview_reviewPriority_idx" ON "payment"("requiresReview", "reviewPriority");
CREATE INDEX "payment_createdAt_idx" ON "payment"("createdAt");
CREATE UNIQUE INDEX "payment_event_idempotencyKey_key" ON "payment_event"("idempotencyKey");
CREATE INDEX "payment_event_paymentId_createdAt_idx" ON "payment_event"("paymentId", "createdAt");
CREATE INDEX "payment_event_type_createdAt_idx" ON "payment_event"("type", "createdAt");
CREATE INDEX "payment_event_actorUserId_idx" ON "payment_event"("actorUserId");
CREATE UNIQUE INDEX "payment_refund_refundCommerceOrder_key" ON "payment_refund"("refundCommerceOrder");
CREATE UNIQUE INDEX "payment_refund_providerToken_key" ON "payment_refund"("providerToken");
CREATE INDEX "payment_refund_paymentId_status_idx" ON "payment_refund"("paymentId", "status");
CREATE INDEX "payment_refund_status_requestedAt_idx" ON "payment_refund"("status", "requestedAt");

ALTER TABLE "payment_event" ADD CONSTRAINT "payment_event_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_refund" ADD CONSTRAINT "payment_refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
