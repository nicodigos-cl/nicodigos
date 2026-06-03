-- CreateTable
CREATE TABLE "product_video" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "ProductImageSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_video_productId_sortOrder_idx" ON "product_video"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "product_video" ADD CONSTRAINT "product_video_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
