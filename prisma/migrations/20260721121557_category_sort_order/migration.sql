-- AlterTable
ALTER TABLE "category" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- Backfill sibling order (stable by name within each parent group)
WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY "parentId"
      ORDER BY name ASC, id ASC
    ) - 1)::integer AS rn
  FROM "category"
)
UPDATE "category" AS c
SET "sortOrder" = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

-- CreateIndex
CREATE INDEX "category_parentId_sortOrder_idx" ON "category"("parentId", "sortOrder");
