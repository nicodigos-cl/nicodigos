CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO', 'YOUTUBE');

CREATE TABLE "asset" (
    "id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "url" TEXT NOT NULL,
    "objectKey" TEXT,
    "youtubeId" TEXT,
    "mimeType" TEXT,
    "fileName" TEXT,
    "sizeBytes" BIGINT,
    "thumbnailUrl" TEXT,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "productId" TEXT,
    "categoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

INSERT INTO "asset" ("id", "type", "url", "thumbnailUrl", "sortOrder", "isCover", "productId", "createdAt", "updatedAt")
SELECT "id", 'IMAGE'::"AssetType", "url", "thumbnailUrl", "sortOrder",
       EXISTS (SELECT 1 FROM "product" p WHERE p."id" = pi."productId" AND p."coverImageUrl" = pi."url"),
       "productId", "createdAt", "updatedAt"
FROM "product_image" pi;

INSERT INTO "asset" ("id", "type", "url", "youtubeId", "sortOrder", "productId", "createdAt", "updatedAt")
SELECT "id", 'YOUTUBE'::"AssetType", 'https://www.youtube.com/watch?v=' || "videoId", "videoId", "sortOrder", "productId", "createdAt", "updatedAt"
FROM "product_video";

INSERT INTO "asset" ("id", "type", "url", "sortOrder", "isCover", "productId", "createdAt", "updatedAt")
SELECT 'legacy-cover-' || p."id", 'IMAGE'::"AssetType", p."coverImageUrl", -1, true, p."id", p."createdAt", p."updatedAt"
FROM "product" p
WHERE p."coverImageUrl" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "product_image" pi WHERE pi."productId" = p."id" AND pi."url" = p."coverImageUrl");

INSERT INTO "asset" ("id", "type", "url", "sortOrder", "isCover", "categoryId", "createdAt", "updatedAt")
SELECT 'legacy-category-' || c."id", 'IMAGE'::"AssetType", c."imageUrl", 0, true, c."id", c."createdAt", c."updatedAt"
FROM "category" c WHERE c."imageUrl" IS NOT NULL;

DROP TABLE "product_video";
DROP TABLE "product_image";

CREATE UNIQUE INDEX "asset_objectKey_key" ON "asset"("objectKey");
CREATE INDEX "asset_productId_sortOrder_idx" ON "asset"("productId", "sortOrder");
CREATE INDEX "asset_categoryId_sortOrder_idx" ON "asset"("categoryId", "sortOrder");
ALTER TABLE "asset" ADD CONSTRAINT "asset_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset" ADD CONSTRAINT "asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "asset" ADD CONSTRAINT "asset_owner_check" CHECK (("productId" IS NOT NULL)::int + ("categoryId" IS NOT NULL)::int = 1);
