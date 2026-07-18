import type { DeliveryMethod } from "@/generated/prisma/client";

export type ProductStockInput = {
  deliveryMethod: DeliveryMethod;
  qty: number;
  textQty: number | null;
  availableKeysCount: number;
  totalKeysCount: number;
  defaultOfferAvailableQty: number | null;
};

export type ProductStockInfo = {
  available: number;
  totalKeys: number | null;
  label: string;
  isOutOfStock: boolean;
};

/**
 * Domain stock visible in admin UI.
 * Does not invent an "unlimited" rule when qty is zero.
 */
export function getProductStock(input: ProductStockInput): ProductStockInfo {
  switch (input.deliveryMethod) {
    case "MANUAL": {
      const available = input.availableKeysCount;
      const totalKeys = input.totalKeysCount;

      if (available <= 0) {
        return {
          available: 0,
          totalKeys,
          label: totalKeys > 0 ? `Agotado · ${totalKeys} keys` : "Agotado",
          isOutOfStock: true,
        };
      }

      return {
        available,
        totalKeys,
        label: `${available} disp. · ${totalKeys} keys`,
        isOutOfStock: false,
      };
    }
    case "KINGUIN": {
      const available = input.defaultOfferAvailableQty ?? input.qty;

      return {
        available,
        totalKeys: null,
        label: available <= 0 ? "Agotado" : String(available),
        isOutOfStock: available <= 0,
      };
    }
    case "SMM": {
      const available = input.qty;
      const textQty = input.textQty;

      if (available <= 0 && (textQty == null || textQty <= 0)) {
        return {
          available: 0,
          totalKeys: null,
          label: "Agotado",
          isOutOfStock: true,
        };
      }

      if (textQty != null) {
        return {
          available,
          totalKeys: null,
          label: `${available} · texto ${textQty}`,
          isOutOfStock: available <= 0,
        };
      }

      return {
        available,
        totalKeys: null,
        label: String(available),
        isOutOfStock: available <= 0,
      };
    }
  }
}
