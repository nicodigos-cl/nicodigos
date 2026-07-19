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
  // qty/textQty = total buyable (physical + declared).
  // availableQty/availableTextQty = physical only.
  // Buyers can purchase declared stock, so use the max.
  return Math.max(
    offer.availableQty ?? 0,
    offer.availableTextQty ?? 0,
    offer.qty ?? 0,
    offer.textQty ?? 0,
  );
}

/** Persistable available qty for ProductOffer (text keys use availableTextQty). */
export function offerPersistAvailableQty(offer: KinguinOffer): number | null {
  const physical = offer.availableQty ?? offer.availableTextQty;
  if (physical != null) return physical;
  return null;
}

/**
 * Resolve buyable stock from a persisted ProductOffer row.
 * Mirrors offerAvailableQty: physical fields alone can be 0 while qty still sells.
 */
export function resolvePersistedOfferQty(offer: {
  availableQty: number | null;
  qty: number;
  textQty: number;
}): number {
  return Math.max(offer.availableQty ?? 0, offer.qty, offer.textQty);
}

export function parseReleaseDate(value: string | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
