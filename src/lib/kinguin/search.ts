import "server-only";

import { getKinguinClient } from "@/lib/kinguin-client";
import prisma from "@/lib/prisma";
import type { KinguinSearchQuery } from "@/lib/validations/kinguin";
import type { KinguinProduct } from "@/types/kinguin";
import type {
  KinguinSearchHitDto,
  KinguinSearchPageResult,
} from "@/types/kinguin-admin";

function mapSearchHit(
  product: KinguinProduct,
  imported: Map<number, string>,
): KinguinSearchHitDto {
  const localProductId = imported.get(product.kinguinId) ?? null;
  return {
    kinguinId: product.kinguinId,
    productId: product.productId,
    name: product.name,
    platform: product.platform ?? null,
    priceEur:
      typeof product.price === "number" && Number.isFinite(product.price)
        ? product.price
        : null,
    offersCount: product.offersCount ?? product.offers?.length ?? 0,
    qty: product.qty ?? product.totalQty ?? 0,
    coverUrl: product.images?.cover?.url ?? null,
    coverThumbnailUrl:
      product.images?.cover?.thumbnail ?? product.images?.cover?.url ?? null,
    alreadyImported: localProductId != null,
    localProductId,
  };
}

/** Live search against Kinguin ESA — does not cache the catalog. */
export async function searchKinguinProducts(
  input: KinguinSearchQuery,
): Promise<KinguinSearchPageResult> {
  const q = input.q?.trim() ?? "";
  if (!q) {
    return {
      items: [],
      total: 0,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: 1,
      q: "",
    };
  }

  const client = getKinguinClient();
  const response = await client.searchProducts({
    name: q,
    page: input.page,
    limit: input.pageSize,
  });

  const kinguinIds = response.results.map((item) => item.kinguinId);
  const existing =
    kinguinIds.length > 0
      ? await prisma.product.findMany({
          where: { kinguinId: { in: kinguinIds } },
          select: { id: true, kinguinId: true },
        })
      : [];

  const imported = new Map(
    existing
      .filter((row) => row.kinguinId != null)
      .map((row) => [row.kinguinId as number, row.id]),
  );

  const total = response.item_count ?? response.results.length;

  return {
    items: response.results.map((item) => mapSearchHit(item, imported)),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    q,
  };
}
