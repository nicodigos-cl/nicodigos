export function productCodeFromSlug(slug: string): string {
  return slug;
}

export function formatMoney(
  amount: string | number,
  currency: string,
  locale = "es-CL",
): string {
  const value =
    typeof amount === "number" ? amount : Number.parseFloat(amount);

  if (!Number.isFinite(value)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "CLP",
      maximumFractionDigits: currency === "CLP" ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function calculateMarginPercent(
  price: number,
  cost: number | null,
): number | null {
  if (cost == null || !Number.isFinite(cost) || !Number.isFinite(price)) {
    return null;
  }

  if (price === 0) {
    return null;
  }

  return ((price - cost) / price) * 100;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function decimalToString(
  value: { toString(): string } | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }

  return value.toString();
}

export function parseOptionalNumber(value: string | null | undefined): number | null {
  if (value == null || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
