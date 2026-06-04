import type { Metadata } from "next";

import type { SeoMetadataDocument } from "@/lib/seo/metadata";
import { mergeSeoMetadata } from "@/lib/seo/metadata";
import { storeRoutes } from "@/lib/store/navigation";

export function buildDefaultHomeSeoMetadata(): SeoMetadataDocument {
  const description =
    "Compra keys, gift cards y licencias digitales con entrega instantánea, stock verificado y soporte en Chile.";

  const metadata: Metadata = {
    title: "Nicodigos — Keys, gift cards y licencias digitales",
    description,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: "Nicodigos — Marketplace digital en Chile",
      description,
      type: "website",
      url: storeRoutes.home,
    },
    twitter: {
      card: "summary_large_image",
      title: "Nicodigos",
      description,
    },
  };

  return metadata;
}

export function resolveHomeSeoMetadata(
  override: SeoMetadataDocument | null | undefined,
): SeoMetadataDocument {
  return mergeSeoMetadata(buildDefaultHomeSeoMetadata(), override);
}
