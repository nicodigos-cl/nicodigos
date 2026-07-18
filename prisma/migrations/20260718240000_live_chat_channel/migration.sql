-- AlterEnum
ALTER TYPE "CommunicationChannel" ADD VALUE 'LIVE_CHAT';

-- AlterTable
ALTER TABLE "communication_threads" ADD COLUMN "channel" "CommunicationChannel" NOT NULL DEFAULT 'EMAIL';

-- CreateIndex
CREATE INDEX "communication_threads_channel_status_lastMessageAt_idx" ON "communication_threads"("channel", "status", "lastMessageAt");
