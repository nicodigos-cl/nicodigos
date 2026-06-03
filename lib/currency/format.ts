import { APP_CURRENCY } from "@/lib/currency/constants";

/** CLP with explicit code (e.g. CLP 32.400) — avoids $ looking like USD. */
const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: APP_CURRENCY,
  currencyDisplay: "code",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** EUR with € symbol (de-DE). */
const eurFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatWithCurrency(
  value: { toString(): string } | string | number | null | undefined,
  currency: string,
): string {
  if (value == null) {
    return currency === APP_CURRENCY
      ? clpFormatter.format(0)
      : currency === "EUR"
        ? eurFormatter.format(0)
        : new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency,
            currencyDisplay: "code",
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(0);
  }

  const amount = typeof value === "number" ? value : Number(value.toString());
  const safe = Number.isFinite(amount) ? amount : 0;

  if (currency === APP_CURRENCY) {
    return clpFormatter.format(safe);
  }

  if (currency === "EUR") {
    return eurFormatter.format(safe);
  }

  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency,
    currencyDisplay: "code",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatMoney(
  value: { toString(): string } | string | number | null | undefined,
  currency: string = APP_CURRENCY,
): string {
  return formatWithCurrency(value, currency);
}

export function formatSourceMoney(
  value: { toString(): string } | string | number | null | undefined,
  sourceCurrency = "EUR",
): string {
  return formatWithCurrency(value, sourceCurrency);
}
