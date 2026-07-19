-- AlterTable
ALTER TABLE "product_key" ADD COLUMN     "reservedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "product_account" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "status" "ProductKeyStatus" NOT NULL DEFAULT 'AVAILABLE',
    "contentType" "DeliveryContentType" NOT NULL DEFAULT 'USERNAME_PASSWORD',
    "label" TEXT,
    "username" TEXT,
    "email" TEXT,
    "passwordEncrypted" TEXT,
    "tokenEncrypted" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "orderItemId" TEXT,
    "reservedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_account_productId_status_idx" ON "product_account"("productId", "status");

-- CreateIndex
CREATE INDEX "product_account_orderItemId_idx" ON "product_account"("orderItemId");

-- CreateIndex
CREATE INDEX "product_account_status_reservedUntil_idx" ON "product_account"("status", "reservedUntil");

-- CreateIndex
CREATE INDEX "product_key_status_reservedUntil_idx" ON "product_key"("status", "reservedUntil");

-- AddForeignKey
ALTER TABLE "product_account" ADD CONSTRAINT "product_account_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_account" ADD CONSTRAINT "product_account_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;
