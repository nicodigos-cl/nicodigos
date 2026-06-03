-- AlterTable
ALTER TABLE "product" ADD COLUMN "sourceCostPrice" DECIMAL(10,2),
ADD COLUMN "sourceCurrency" TEXT NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "product_offer" ADD COLUMN "sourceCostPrice" DECIMAL(10,2),
ADD COLUMN "sourceCurrency" TEXT NOT NULL DEFAULT 'EUR';

-- AlterTable
ALTER TABLE "user_preferences" ALTER COLUMN "currency" SET DEFAULT 'CLP';

-- AlterTable
ALTER TABLE "order" ALTER COLUMN "currency" SET DEFAULT 'CLP';

-- Backfill: treat existing stored prices as source EUR until re-synced
UPDATE "product" SET "sourceCostPrice" = "costPrice", "sourceCurrency" = 'EUR' WHERE "sourceCostPrice" IS NULL;

UPDATE "product_offer" SET "sourceCostPrice" = "costPrice", "sourceCurrency" = 'EUR' WHERE "sourceCostPrice" IS NULL;
