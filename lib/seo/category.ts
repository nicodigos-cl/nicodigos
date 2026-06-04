import type { Metadata } from "next";

import type { SeoMetadataDocument } from "@/lib/seo/metadata";
import { mergeSeoMetadata } from "@/lib/seo/metadata";
import { storeRoutes } from "@/lib/store/navigation";

type CategorySeoInput = {
  name: string;
  slug: string;
  description: string | null;
  bannerUrl: string | null;
  imageUrl: string | null;
};

export function buildDefaultCategorySeoMetadata(
  category: CategorySeoInput,
): SeoMetadataDocument {
  const plainDescription =
    category.description
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() ?? null;
  const description =
    plainDescription ||
    `Keys y juegos digitales de ${category.name} en Chile. Compra en Nicodigos con entrega al tiro y precio en pesos chilenos.`;
  const imageUrl = category.bannerUrl ?? category.imageUrl;
  const path = storeRoutes.category(category.slug);

  const metadata: Metadata = {
    title: category.name,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: category.name,
      description,
      type: "website",
      url: path,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: category.name }] } : {}),
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: category.name,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };

  return metadata;
}

export function resolveCategorySeoMetadata(
  category: CategorySeoInput,
  override: SeoMetadataDocument | null | undefined,
): SeoMetadataDocument {
  return mergeSeoMetadata(buildDefaultCategorySeoMetadata(category), override);
}
