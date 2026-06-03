-- New products default to draft (not published)
ALTER TABLE "product" ALTER COLUMN "isActive" SET DEFAULT false;
