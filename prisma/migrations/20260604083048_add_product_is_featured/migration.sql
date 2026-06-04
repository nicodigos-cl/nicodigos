-- AlterTable
ALTER TABLE "product" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "product_isFeatured_idx" ON "product"("isFeatured");
