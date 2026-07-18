-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('EMAIL', 'WEB_PUSH');

-- CreateEnum
CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "CommunicationKind" AS ENUM ('OPERATIONAL', 'MARKETING', 'SECURITY', 'SUPPORT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CommunicationThreadStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'ARCHIVED', 'SPAM');

-- CreateEnum
CREATE TYPE "CommunicationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EmailMessageStatus" AS ENUM ('DRAFT', 'QUEUED', 'ACCEPTED', 'SENT', 'DELIVERED', 'DELAYED', 'BOUNCED', 'COMPLAINED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebPushStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'SENT', 'PARTIALLY_SENT', 'FAILED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CommunicationAudienceType" AS ENUM ('ALL_ELIGIBLE', 'SPECIFIC_USERS', 'INTERNAL_SEGMENT', 'ONESIGNAL_SEGMENT');

-- CreateEnum
CREATE TYPE "CommunicationTemplateChannel" AS ENUM ('EMAIL', 'WEB_PUSH');

-- CreateEnum
CREATE TYPE "CommunicationTemplateStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WebPushPermissionStatus" AS ENUM ('UNSUPPORTED', 'DEFAULT', 'GRANTED', 'DENIED', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "communication_threads" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "CommunicationThreadStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "CommunicationPriority" NOT NULL DEFAULT 'NORMAL',
    "category" TEXT,
    "userId" TEXT,
    "orderId" TEXT,
    "deliveryId" TEXT,
    "assignedUserId" TEXT,
    "assignedEmail" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "lastInboundAt" TIMESTAMP(3),
    "lastOutboundAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "spamAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT,
    "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL',
    "direction" "CommunicationDirection" NOT NULL,
    "kind" "CommunicationKind" NOT NULL DEFAULT 'SUPPORT',
    "status" "EmailMessageStatus" NOT NULL,
    "provider" TEXT,
    "externalId" TEXT,
    "idempotencyKey" TEXT,
    "fromAddress" TEXT,
    "fromName" TEXT,
    "toAddresses" JSONB NOT NULL,
    "ccAddresses" JSONB,
    "bccAddresses" JSONB,
    "replyToAddress" TEXT,
    "subject" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "sanitizedHtml" TEXT,
    "remoteImages" BOOLEAN NOT NULL DEFAULT false,
    "providerMetadata" JSONB,
    "sentByUserId" TEXT,
    "sentByEmail" TEXT,
    "templateVersionId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_internal_notes" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "authorEmail" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerId" TEXT,
    "objectKey" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "contentId" TEXT,
    "inline" BOOLEAN NOT NULL DEFAULT false,
    "scanStatus" TEXT NOT NULL DEFAULT 'NOT_AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_email_events" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "safeMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_notifications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "kind" "CommunicationKind" NOT NULL,
    "status" "WebPushStatus" NOT NULL DEFAULT 'DRAFT',
    "targetUrl" TEXT,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "buttons" JSONB,
    "data" JSONB NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'es',
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "ttlSeconds" INTEGER,
    "audienceType" "CommunicationAudienceType" NOT NULL,
    "audienceDefinition" JSONB NOT NULL,
    "estimatedRecipients" INTEGER,
    "excludedRecipients" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "idempotencyKey" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "queuedAt" TIMESTAMP(3),
    "sendingAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "recipients" INTEGER NOT NULL DEFAULT 0,
    "successful" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "delivered" INTEGER NOT NULL DEFAULT 0,
    "clicked" INTEGER NOT NULL DEFAULT 0,
    "lastProviderSyncAt" TIMESTAMP(3),
    "providerError" TEXT,
    "replacedNotificationId" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedByEmail" TEXT,
    "templateVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_push_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "channel" "CommunicationTemplateChannel" NOT NULL,
    "kind" "CommunicationKind" NOT NULL,
    "status" "CommunicationTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedByEmail" TEXT,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_template_versions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "subject" TEXT,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "textContent" TEXT,
    "variables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "changeReason" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_audience_segments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "definition" JSONB NOT NULL,
    "estimatedRecipients" INTEGER,
    "excludedRecipients" INTEGER NOT NULL DEFAULT 0,
    "estimatedAt" TIMESTAMP(3),
    "createdByUserId" TEXT NOT NULL,
    "createdByEmail" TEXT NOT NULL,
    "updatedByUserId" TEXT,
    "updatedByEmail" TEXT,
    "archivedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_audience_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketingEmail" BOOLEAN NOT NULL DEFAULT false,
    "webPushEnabled" BOOLEAN NOT NULL DEFAULT false,
    "orders" BOOLEAN NOT NULL DEFAULT true,
    "payments" BOOLEAN NOT NULL DEFAULT true,
    "deliveries" BOOLEAN NOT NULL DEFAULT true,
    "smm" BOOLEAN NOT NULL DEFAULT true,
    "security" BOOLEAN NOT NULL DEFAULT true,
    "newProducts" BOOLEAN NOT NULL DEFAULT false,
    "promotions" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsentAt" TIMESTAMP(3),
    "marketingOptOutAt" TIMESTAMP(3),
    "consentSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'ONESIGNAL',
    "providerSubscriptionId" TEXT,
    "providerSubscriptionHash" TEXT,
    "permissionStatus" "WebPushPermissionStatus" NOT NULL DEFAULT 'DEFAULT',
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "browser" TEXT,
    "platform" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "subscribedAt" TIMESTAMP(3),
    "unsubscribedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_audit_events" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "channel" "CommunicationChannel",
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "statusBefore" TEXT,
    "statusAfter" TEXT,
    "audienceSummary" JSONB,
    "estimatedRecipients" INTEGER,
    "affectedRecipients" INTEGER,
    "maskedRecipient" TEXT,
    "externalIdSuffix" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorCode" TEXT,
    "safeMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceExternalId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PROCESSED',
    "errorCode" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "communication_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "communication_threads_status_lastMessageAt_idx" ON "communication_threads"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "communication_threads_userId_lastMessageAt_idx" ON "communication_threads"("userId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "communication_threads_assignedUserId_status_idx" ON "communication_threads"("assignedUserId", "status");

-- CreateIndex
CREATE INDEX "communication_threads_orderId_idx" ON "communication_threads"("orderId");

-- CreateIndex
CREATE INDEX "communication_threads_deliveryId_idx" ON "communication_threads"("deliveryId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_messages_idempotencyKey_key" ON "communication_messages"("idempotencyKey");

-- CreateIndex
CREATE INDEX "communication_messages_threadId_createdAt_idx" ON "communication_messages"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_messages_status_createdAt_idx" ON "communication_messages"("status", "createdAt");

-- CreateIndex
CREATE INDEX "communication_messages_scheduledAt_status_idx" ON "communication_messages"("scheduledAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "communication_messages_provider_externalId_key" ON "communication_messages"("provider", "externalId");

-- CreateIndex
CREATE INDEX "communication_internal_notes_threadId_createdAt_idx" ON "communication_internal_notes"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_attachments_messageId_idx" ON "communication_attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_email_events_providerEventId_key" ON "communication_email_events"("providerEventId");

-- CreateIndex
CREATE INDEX "communication_email_events_messageId_occurredAt_idx" ON "communication_email_events"("messageId", "occurredAt");

-- CreateIndex
CREATE INDEX "communication_email_events_type_occurredAt_idx" ON "communication_email_events"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_notifications_externalId_key" ON "web_push_notifications"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_notifications_idempotencyKey_key" ON "web_push_notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "web_push_notifications_status_scheduledAt_idx" ON "web_push_notifications"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "web_push_notifications_createdByUserId_createdAt_idx" ON "web_push_notifications"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "web_push_notifications_createdAt_idx" ON "web_push_notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "communication_templates_slug_key" ON "communication_templates"("slug");

-- CreateIndex
CREATE INDEX "communication_templates_channel_status_idx" ON "communication_templates"("channel", "status");

-- CreateIndex
CREATE INDEX "communication_template_versions_templateId_createdAt_idx" ON "communication_template_versions"("templateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "communication_template_versions_templateId_version_key" ON "communication_template_versions"("templateId", "version");

-- CreateIndex
CREATE INDEX "communication_audience_segments_archivedAt_updatedAt_idx" ON "communication_audience_segments"("archivedAt", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_userId_key" ON "communication_preferences"("userId");

-- CreateIndex
CREATE INDEX "communication_preferences_marketingEmail_idx" ON "communication_preferences"("marketingEmail");

-- CreateIndex
CREATE INDEX "communication_preferences_webPushEnabled_idx" ON "communication_preferences"("webPushEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_providerSubscriptionId_key" ON "web_push_subscriptions"("providerSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "web_push_subscriptions_providerSubscriptionHash_key" ON "web_push_subscriptions"("providerSubscriptionHash");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_userId_optedIn_idx" ON "web_push_subscriptions"("userId", "optedIn");

-- CreateIndex
CREATE INDEX "web_push_subscriptions_permissionStatus_idx" ON "web_push_subscriptions"("permissionStatus");

-- CreateIndex
CREATE INDEX "communication_audit_events_resourceType_resourceId_createdA_idx" ON "communication_audit_events"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_audit_events_actorUserId_createdAt_idx" ON "communication_audit_events"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "communication_audit_events_action_createdAt_idx" ON "communication_audit_events"("action", "createdAt");

-- CreateIndex
CREATE INDEX "communication_webhook_events_provider_eventType_receivedAt_idx" ON "communication_webhook_events"("provider", "eventType", "receivedAt");

-- CreateIndex
CREATE INDEX "communication_webhook_events_status_receivedAt_idx" ON "communication_webhook_events"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "communication_webhook_events_provider_externalEventId_key" ON "communication_webhook_events"("provider", "externalEventId");

-- AddForeignKey
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_threads" ADD CONSTRAINT "communication_threads_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "delivery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "communication_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_internal_notes" ADD CONSTRAINT "communication_internal_notes_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "communication_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_attachments" ADD CONSTRAINT "communication_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_email_events" ADD CONSTRAINT "communication_email_events_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "communication_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_notifications" ADD CONSTRAINT "web_push_notifications_templateVersionId_fkey" FOREIGN KEY ("templateVersionId") REFERENCES "communication_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_template_versions" ADD CONSTRAINT "communication_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "web_push_subscriptions" ADD CONSTRAINT "web_push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
