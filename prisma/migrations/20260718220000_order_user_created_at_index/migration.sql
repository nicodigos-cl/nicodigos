-- Improve customer order listing by user + recency
CREATE INDEX IF NOT EXISTS "order_userId_createdAt_idx" ON "order"("userId", "createdAt");
