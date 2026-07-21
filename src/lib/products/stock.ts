import type { DeliveryMethod } from "@/generated/prisma/client";

/** Sentinel for SMM “always available”; order qty is gated by smmMin/smmMax. */
export const SMM_UNLIMITED_STOCK = 1_000_000_000;

export type ProductStockInput = {
  deliveryMethod: DeliveryMethod;
  qty: number;
  textQty: number | null;
  availableKeysCount: number;
  availableAccountsCount?: number;
  totalKeysCount: number;
  defaultOfferAvailableQty: number | null;
  smmMin?: number | null;
  smmMax?: number | null;
};

export type ProductStockInfo = {
  available: number;
  totalKeys: number | null;
  label: string;
  isOutOfStock: boolean;
};

/**
 * Domain stock visible in admin / store UI.
 * SMM is always in stock; order limits live on smmMin/smmMax.
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
      const min = input.smmMin;
      const max = input.smmMax;
      const range =
        min != null && max != null
          ? ` · pedido ${min.toLocaleString("es-CL")}–${max.toLocaleString("es-CL")}`
          : min != null
            ? ` · mín. ${min.toLocaleString("es-CL")}`
            : max != null
              ? ` · máx. ${max.toLocaleString("es-CL")}`
              : "";

      return {
        available: SMM_UNLIMITED_STOCK,
        totalKeys: null,
        label: `Ilimitado${range}`,
        isOutOfStock: false,
      };
    }
  }
}
