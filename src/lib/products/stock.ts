import type { DeliveryMethod } from "@/generated/prisma/client";

export type ProductStockInput = {
  deliveryMethod: DeliveryMethod;
  qty: number;
  textQty: number | null;
  availableKeysCount: number;
  availableAccountsCount?: number;
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
      const available =
        input.availableKeysCount + (input.availableAccountsCount ?? 0);
      const totalKeys = input.totalKeysCount;

      if (available <= 0) {
        return {
          available: 0,
          totalKeys,
          label: totalKeys > 0 ? `Agotado · ${totalKeys} keys` : "Agotado",
          isOutOfStock: true,
        };
      }

      const accounts = input.availableAccountsCount ?? 0;
      const label =
        accounts > 0
          ? `${available} disp. · ${input.availableKeysCount} keys · ${accounts} cuentas`
          : `${available} disp. · ${totalKeys} keys`;

      return {
        available,
        totalKeys,
        label,
        isOutOfStock: false,
      };
    }
    case "KINGUIN": {
      // Offer rows may lack text-key qty until re-sync; product.qty/textQty are authoritative fallbacks.
      const available = Math.max(
        input.defaultOfferAvailableQty ?? 0,
        input.textQty ?? 0,
        input.qty,
      );

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
