-- AlterTable
ALTER TABLE "product" ADD COLUMN     "isOffer" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "product_isOffer_idx" ON "product"("isOffer");
