-- CreateEnum
CREATE TYPE "PriceChangeDirection" AS ENUM ('UP', 'DOWN');

-- CreateTable
CREATE TABLE "product_price_change_event" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "oldPrice" DECIMAL(12,2) NOT NULL,
    "newPrice" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "changePct" DECIMAL(12,4) NOT NULL,
    "direction" "PriceChangeDirection" NOT NULL,
    "oldSmmRate" DECIMAL(18,6),
    "newSmmRate" DECIMAL(18,6),
    "smmMarkupPct" DECIMAL(8,2),
    "remoteServiceId" INTEGER,
    "providerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_change_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_change_event_createdAt_idx" ON "product_price_change_event"("createdAt");

-- CreateIndex
CREATE INDEX "product_price_change_event_productId_createdAt_idx" ON "product_price_change_event"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "product_price_change_event_direction_createdAt_idx" ON "product_price_change_event"("direction", "createdAt");

-- AddForeignKey
ALTER TABLE "product_price_change_event" ADD CONSTRAINT "product_price_change_event_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
