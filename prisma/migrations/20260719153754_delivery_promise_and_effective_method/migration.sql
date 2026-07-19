-- AlterEnum
CREATE TYPE "DeliveryPromise" AS ENUM ('INSTANT', 'DELAYED_12_24H', 'UNAVAILABLE');

-- AlterTable
ALTER TABLE "order_item" ADD COLUMN "deliveryPromise" "DeliveryPromise",
ADD COLUMN "estimatedCostAmount" DECIMAL(14,6),
ADD COLUMN "estimatedCostCurrency" TEXT;

-- AlterTable
ALTER TABLE "delivery" ADD COLUMN "effectiveDeliveryMethod" "DeliveryMethod";
