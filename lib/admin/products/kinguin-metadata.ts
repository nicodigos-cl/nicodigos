import type { Prisma } from "@/lib/generated/prisma/client";
import { resolveKinguinRegionName } from "@/lib/kinguin/regions";
import type { KinguinProduct } from "@/types/kinguin";

export type ProductKinguinMetadata = {
  regionalLimitations: string | null;
  regionId: number | null;
  regionName: string | null;
  countryLimitations: string[];
  activationDetails: string | null;
  languages: string[];
  developers: string[];
  publishers: string[];
  releaseDate: string | null;
  ageRating: string | null;
  systemRequirements?: Prisma.InputJsonValue;
  steamAppId: string | null;
};

function nonEmptyStrings(values: string[] | undefined): string[] {
  return (values ?? []).map((v) => v.trim()).filter(Boolean);
}

export async function mapKinguinProductMetadata(
  product: KinguinProduct,
): Promise<ProductKinguinMetadata> {
  const regionName = await resolveKinguinRegionName(
    product.regionId,
    product.regionalLimitations,
  );

  const systemRequirements =
    product.systemRequirements?.length > 0
      ? (product.systemRequirements as Prisma.InputJsonValue)
      : undefined;

  return {
    regionalLimitations: product.regionalLimitations?.trim() || null,
    regionId: product.regionId ?? null,
    regionName,
    countryLimitations: nonEmptyStrings(product.countryLimitation),
    activationDetails: product.activationDetails?.trim() || null,
    languages: nonEmptyStrings(product.languages),
    developers: nonEmptyStrings(product.developers),
    publishers: nonEmptyStrings(product.publishers),
    releaseDate: product.releaseDate?.trim() || null,
    ageRating: product.ageRating?.trim() || null,
    systemRequirements,
    steamAppId: product.steam?.trim() || null,
  };
}
