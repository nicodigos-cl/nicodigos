-- Allow a cart to belong either to an authenticated user or to a guest token.
ALTER TABLE "cart" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "cart" ADD COLUMN "guestTokenHash" TEXT;

CREATE UNIQUE INDEX "cart_guestTokenHash_key" ON "cart"("guestTokenHash");

ALTER TABLE "cart" ADD CONSTRAINT "cart_owner_check"
CHECK (
  ("userId" IS NOT NULL AND "guestTokenHash" IS NULL)
  OR ("userId" IS NULL AND "guestTokenHash" IS NOT NULL)
);
