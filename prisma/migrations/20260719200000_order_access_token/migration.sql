-- Capability URL token so guests can open /checkout/[orderId]?s=… without a session.
ALTER TABLE "order" ADD COLUMN "accessToken" TEXT;

-- 64 hex chars without requiring pgcrypto.
UPDATE "order"
SET "accessToken" =
  md5(random()::text || id || clock_timestamp()::text)
  || md5(random()::text || id || clock_timestamp()::text)
WHERE "accessToken" IS NULL;

ALTER TABLE "order" ALTER COLUMN "accessToken" SET NOT NULL;

CREATE UNIQUE INDEX "order_accessToken_key" ON "order"("accessToken");
