-- CreateEnum
CREATE TYPE "InvoiceDocumentType" AS ENUM ('BOLETA', 'FACTURA');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressLine2" TEXT,
ADD COLUMN     "businessActivity" TEXT,
ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "commune" TEXT,
ADD COLUMN     "invoiceType" "InvoiceDocumentType" NOT NULL DEFAULT 'BOLETA',
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "rut" TEXT;

-- CreateIndex
CREATE INDEX "user_rut_idx" ON "user"("rut");
