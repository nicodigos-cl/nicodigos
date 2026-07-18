-- CreateEnum
CREATE TYPE "DeliveryContentType" AS ENUM (
  'PRODUCT_KEY',
  'CODE',
  'PIN',
  'USERNAME_PASSWORD',
  'EMAIL_PASSWORD',
  'TOKEN',
  'URL',
  'INSTRUCTIONS',
  'FREE_TEXT',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "DeliveryNotificationType" AS ENUM ('COMPLETED', 'FAILED', 'PROCESSING');

-- CreateEnum
CREATE TYPE "DeliveryNotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable Delivery
ALTER TABLE "delivery"
  ADD COLUMN "customerMessage" TEXT,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

CREATE INDEX "delivery_createdAt_idx" ON "delivery"("createdAt");
CREATE INDEX "delivery_updatedAt_idx" ON "delivery"("updatedAt");

-- AlterTable DeliveryKey
ALTER TABLE "delivery_key"
  ADD COLUMN "contentType" "DeliveryContentType" NOT NULL DEFAULT 'PRODUCT_KEY',
  ADD COLUMN "label" TEXT,
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "isSecret" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX IF EXISTS "delivery_key_externalKeyId_idx";
DROP INDEX IF EXISTS "delivery_key_productKeyId_idx";
CREATE UNIQUE INDEX "delivery_key_externalKeyId_key" ON "delivery_key"("externalKeyId");
CREATE UNIQUE INDEX "delivery_key_productKeyId_key" ON "delivery_key"("productKeyId");

-- AlterTable DeliveryEvent
ALTER TABLE "delivery_event"
  ADD COLUMN "actorUserId" TEXT,
  ADD COLUMN "actorEmail" TEXT;

CREATE INDEX "delivery_event_actorUserId_idx" ON "delivery_event"("actorUserId");

-- CreateTable DeliveryCredential
CREATE TABLE "delivery_credential" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "contentType" "DeliveryContentType" NOT NULL DEFAULT 'USERNAME_PASSWORD',
  "label" TEXT,
  "username" TEXT,
  "email" TEXT,
  "passwordEncrypted" TEXT,
  "tokenEncrypted" TEXT,
  "url" TEXT,
  "notes" TEXT,
  "instructions" TEXT,
  "isSecret" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_credential_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "delivery_credential_deliveryId_idx" ON "delivery_credential"("deliveryId");

ALTER TABLE "delivery_credential"
  ADD CONSTRAINT "delivery_credential_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable DeliveryNotification
CREATE TABLE "delivery_notification" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "type" "DeliveryNotificationType" NOT NULL,
  "status" "DeliveryNotificationStatus" NOT NULL DEFAULT 'PENDING',
  "recipient" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "resendId" TEXT,
  "errorMessage" TEXT,
  "isResend" BOOLEAN NOT NULL DEFAULT false,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "delivery_notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "delivery_notification_idempotencyKey_key" ON "delivery_notification"("idempotencyKey");
CREATE INDEX "delivery_notification_deliveryId_type_idx" ON "delivery_notification"("deliveryId", "type");
CREATE INDEX "delivery_notification_status_idx" ON "delivery_notification"("status");

ALTER TABLE "delivery_notification"
  ADD CONSTRAINT "delivery_notification_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
