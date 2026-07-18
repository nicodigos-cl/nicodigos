import "server-only";

import type { KinguinOffer, KinguinProduct } from "@/types/kinguin";

/** Pick cheapest offer by EUR price; prefer cheapestOfferId when present. */
export function pickCheapestOffer(
  product: KinguinProduct,
): KinguinOffer | null {
  const offers = product.offers ?? [];
  if (offers.length === 0) {
    return null;
  }

  const preferredId = product.cheapestOfferId?.[0];
  if (preferredId) {
    const preferred = offers.find((offer) => offer.offerId === preferredId);
    if (preferred) {
      return preferred;
    }
  }

  return [...offers].sort((a, b) => a.price - b.price)[0] ?? null;
}

export function offerAvailableQty(offer: KinguinOffer): number {
  return (
    offer.availableQty ??
    offer.availableTextQty ??
    offer.qty ??
    offer.textQty ??
    0
  );
}

export function parseReleaseDate(value: string | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
