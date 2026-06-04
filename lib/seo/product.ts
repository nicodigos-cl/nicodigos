import type { Metadata } from "next";

import type { SeoMetadataDocument } from "@/lib/seo/metadata";
import { mergeSeoMetadata } from "@/lib/seo/metadata";
import { storeRoutes } from "@/lib/store/navigation";

type ProductSeoInput = {
  name: string;
  platform: string;
  coverImageUrl: string | null;
  slug: string;
};

export function buildDefaultProductSeoMetadata(
  product: ProductSeoInput,
): SeoMetadataDocument {
  const description = `${product.name} — ${product.platform}. Entrega digital en Chile.`;
  const path = storeRoutes.product(product.slug);

  const metadata: Metadata = {
    title: product.name,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      url: path,
      ...(product.coverImageUrl
        ? { images: [{ url: product.coverImageUrl, alt: product.name }] }
        : {}),
    },
    twitter: {
      card: product.coverImageUrl ? "summary_large_image" : "summary",
      title: product.name,
      description,
      ...(product.coverImageUrl ? { images: [product.coverImageUrl] } : {}),
    },
  };

  return metadata;
}

export function resolveProductSeoMetadata(
  product: ProductSeoInput,
  override: SeoMetadataDocument | null | undefined,
): SeoMetadataDocument {
  return mergeSeoMetadata(buildDefaultProductSeoMetadata(product), override);
}
