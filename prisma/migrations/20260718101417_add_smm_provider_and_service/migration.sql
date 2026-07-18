-- CreateEnum
CREATE TYPE "SmmProviderStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateTable
CREATE TABLE "smm_provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "status" "SmmProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "smm_service" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "remoteServiceId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rate" DECIMAL(12,4) NOT NULL,
    "min" INTEGER NOT NULL,
    "max" INTEGER NOT NULL,
    "refill" BOOLEAN NOT NULL DEFAULT false,
    "cancel" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "smm_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "smm_provider_slug_key" ON "smm_provider"("slug");

-- CreateIndex
CREATE INDEX "smm_provider_status_idx" ON "smm_provider"("status");

-- CreateIndex
CREATE INDEX "smm_provider_slug_idx" ON "smm_provider"("slug");

-- CreateIndex
CREATE INDEX "smm_service_providerId_category_idx" ON "smm_service"("providerId", "category");

-- CreateIndex
CREATE INDEX "smm_service_providerId_name_idx" ON "smm_service"("providerId", "name");

-- CreateIndex
CREATE INDEX "smm_service_remoteServiceId_idx" ON "smm_service"("remoteServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "smm_service_providerId_remoteServiceId_key" ON "smm_service"("providerId", "remoteServiceId");

-- AddForeignKey
ALTER TABLE "smm_service" ADD CONSTRAINT "smm_service_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "smm_provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
