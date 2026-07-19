import {
  CHILE_COMUNA_NAME_BY_CODE,
  CHILE_COMUNAS_BY_REGION,
  CHILE_REGION_NAME_BY_NUMBER,
  CHILE_REGIONS,
  type ChileSelectOption,
} from "@/lib/chile/divisions-data";

export type { ChileSelectOption };

/** Región → comuna (sin provincia ni ciudad). Ciudad no es división oficial en Chile. */

export function chileRegionOptions(): ChileSelectOption[] {
  return CHILE_REGIONS;
}

export function chileComunaOptions(regionNumber: string): ChileSelectOption[] {
  if (!regionNumber) return [];
  return CHILE_COMUNAS_BY_REGION[regionNumber] ?? [];
}

/** Resolve stored region text (name or Roman numeral) to region_number. */
export function resolveChileRegionNumber(
  stored: string | null | undefined,
): string {
  const value = stored?.trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  if (CHILE_REGION_NAME_BY_NUMBER[upper]) return upper;

  const byLabel = CHILE_REGIONS.find(
    (option) =>
      option.label.toLowerCase() === value.toLowerCase() ||
      option.name.toLowerCase() === value.toLowerCase(),
  );
  if (byLabel) return byLabel.value;

  const partial = CHILE_REGIONS.find(
    (option) =>
      option.name.toLowerCase().includes(value.toLowerCase()) ||
      option.label.toLowerCase().includes(value.toLowerCase()),
  );
  return partial?.value ?? "";
}

export function chileRegionName(regionNumber: string): string {
  return CHILE_REGION_NAME_BY_NUMBER[regionNumber] ?? "";
}

export function chileComunaName(cutCode: string): string {
  return CHILE_COMUNA_NAME_BY_CODE[cutCode] ?? "";
}

/** Match a stored commune name to its CUT code within a region. */
export function resolveChileComunaCode(
  regionNumber: string,
  storedCommune: string | null | undefined,
): string {
  const name = storedCommune?.trim();
  if (!regionNumber || !name) return "";

  const options = chileComunaOptions(regionNumber);
  const exact = options.find(
    (option) => option.label.toLowerCase() === name.toLowerCase(),
  );
  if (exact) return exact.value;

  const partial = options.find((option) =>
    option.label.toLowerCase().includes(name.toLowerCase()),
  );
  return partial?.value ?? "";
}

export function chileRegionCount(): number {
  return CHILE_REGIONS.length;
}
