CREATE TYPE "UserAccountStatus" AS ENUM ('ACTIVE', 'RESTRICTED', 'SUSPENDED', 'ANONYMIZED');
CREATE TYPE "UserAdminNoteCategory" AS ENUM ('SUPPORT', 'RISK', 'FRAUD', 'BILLING', 'DELIVERY', 'REFUND', 'OTHER');
CREATE TYPE "UserAdminNotePriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "UserAdminEventType" AS ENUM (
  'ACCOUNT_CREATED',
  'EMAIL_VERIFIED',
  'PROFILE_UPDATED',
  'BILLING_UPDATED',
  'ROLE_CHANGED',
  'ACCOUNT_RESTRICTED',
  'ACCOUNT_SUSPENDED',
  'ACCOUNT_RESTORED',
  'SESSION_REVOKED',
  'SESSIONS_REVOKED_ALL',
  'PASSWORD_RESET_SENT',
  'EMAIL_VERIFICATION_SENT',
  'NOTE_ADDED',
  'NOTE_UPDATED',
  'NOTE_RESOLVED',
  'NOTE_REOPENED',
  'NOTE_DELETED',
  'REVIEW_MARKED',
  'REVIEW_RESOLVED',
  'ANONYMIZED',
  'OAUTH_UNLINKED'
);

ALTER TABLE "user"
  ADD COLUMN "accountStatus" "UserAccountStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspensionReason" TEXT,
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedByUserId" TEXT,
  ADD COLUMN "suspensionEndsAt" TIMESTAMP(3),
  ADD COLUMN "requiresReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReason" TEXT,
  ADD COLUMN "lastActivityAt" TIMESTAMP(3),
  ADD COLUMN "anonymizedAt" TIMESTAMP(3);

CREATE INDEX "user_role_idx" ON "user"("role");
CREATE INDEX "user_accountStatus_idx" ON "user"("accountStatus");
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");
CREATE INDEX "user_lastActivityAt_idx" ON "user"("lastActivityAt");
CREATE INDEX "user_requiresReview_idx" ON "user"("requiresReview");

CREATE TABLE "user_admin_notes" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "authorEmail" TEXT,
  "category" "UserAdminNoteCategory" NOT NULL,
  "priority" "UserAdminNotePriority" NOT NULL DEFAULT 'MEDIUM',
  "content" TEXT NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_admin_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_admin_events" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "UserAdminEventType" NOT NULL,
  "actorUserId" TEXT,
  "actorEmail" TEXT,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_admin_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "user_admin_notes_userId_createdAt_idx" ON "user_admin_notes"("userId", "createdAt");
CREATE INDEX "user_admin_notes_userId_resolvedAt_idx" ON "user_admin_notes"("userId", "resolvedAt");
CREATE INDEX "user_admin_events_userId_createdAt_idx" ON "user_admin_events"("userId", "createdAt");
CREATE INDEX "user_admin_events_type_createdAt_idx" ON "user_admin_events"("type", "createdAt");

ALTER TABLE "user_admin_notes" ADD CONSTRAINT "user_admin_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_admin_events" ADD CONSTRAINT "user_admin_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
