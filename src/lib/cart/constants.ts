/** Minimum cart / checkout total in CLP (integer pesos). */
export const CART_MIN_TOTAL_CLP = 5_000;

export function parseCartTotalClp(subtotal: string | number): number {
  const value =
    typeof subtotal === "number"
      ? subtotal
      : Number.parseFloat(String(subtotal).replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

export function cartMeetsMinimumTotal(subtotal: string | number): boolean {
  return parseCartTotalClp(subtotal) >= CART_MIN_TOTAL_CLP;
}

export function cartMinimumTotalMessage(currency = "CLP"): string {
  const formatted = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(CART_MIN_TOTAL_CLP);
  return `El monto mínimo de compra es ${formatted}.`;
}
