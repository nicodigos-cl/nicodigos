/**
 * Regenerates src/lib/chile/divisions-data.ts from chilean-territorial-divisions.
 * Run: bun scripts/generate-chile-divisions.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  getComunaByCode,
  getComunaOptions,
  getRegionByNumber,
  getRegionOptions,
} from "chilean-territorial-divisions";

const regions = getRegionOptions().map((option) => ({
  label: option.label,
  value: option.value,
  name: getRegionByNumber(option.value)?.region ?? option.label,
}));

const comunasByRegion = Object.fromEntries(
  regions.map((region) => [
    region.value,
    getComunaOptions(region.value).map((option) => ({
      label: option.label,
      value: option.value,
      name: getComunaByCode(option.value)?.comuna.name ?? option.label,
    })),
  ]),
);

const comunaIndex = Object.fromEntries(
  Object.values(comunasByRegion)
    .flat()
    .map((comuna) => [comuna.value, comuna.name]),
);

const regionIndex = Object.fromEntries(
  regions.map((region) => [region.value, region.name]),
);

const outPath = resolve("src/lib/chile/divisions-data.ts");
const file = `/* Auto-generated from chilean-territorial-divisions — do not edit by hand.
 * Regenerate: bun scripts/generate-chile-divisions.ts
 */

export type ChileSelectOption = {
  label: string;
  value: string;
  name: string;
};

export const CHILE_REGIONS: ChileSelectOption[] = ${JSON.stringify(regions, null, 2)};

export const CHILE_COMUNAS_BY_REGION: Record<string, ChileSelectOption[]> = ${JSON.stringify(comunasByRegion, null, 2)};

export const CHILE_REGION_NAME_BY_NUMBER: Record<string, string> = ${JSON.stringify(regionIndex, null, 2)};

export const CHILE_COMUNA_NAME_BY_CODE: Record<string, string> = ${JSON.stringify(comunaIndex, null, 2)};
`;

writeFileSync(outPath, file);
console.log(`Wrote ${outPath} (${regions.length} regions)`);
