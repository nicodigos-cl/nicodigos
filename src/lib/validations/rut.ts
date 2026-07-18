/**
 * Chilean RUT helpers. Normalized form: "12345678-9" (body digits + hyphen + DV).
 */

const RUT_BODY_RE = /^\d{7,8}$/;

export function normalizeRut(input: string): string | null {
  const cleaned = input
    .trim()
    .toUpperCase()
    .replace(/\./g, "")
    .replace(/\s+/g, "")
    .replace(/-/g, "");

  if (cleaned.length < 8 || cleaned.length > 9) {
    return null;
  }

  const body = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);

  if (!RUT_BODY_RE.test(body)) {
    return null;
  }

  if (!/^[0-9K]$/.test(dv)) {
    return null;
  }

  return `${body}-${dv}`;
}

export function isValidRut(input: string): boolean {
  const normalized = normalizeRut(input);
  if (!normalized) {
    return false;
  }

  const [body, dv] = normalized.split("-");
  let sum = 0;
  let multiplier = 2;

  for (let i = body.length - 1; i >= 0; i -= 1) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = 11 - (sum % 11);
  const expected =
    remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);

  return expected === dv;
}
