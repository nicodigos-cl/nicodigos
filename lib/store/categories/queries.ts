import prisma from "@/lib/prisma";
import { seoMetadataFromRelation } from "@/lib/seo/metadata";
import type { SeoMetadataDocument } from "@/lib/seo/metadata";
import { CATALOG_PAGE_SIZE } from "@/lib/store/products";
import { mapStorefrontProductCard } from "@/lib/store/home/map-product";
import type { StorefrontProductCardsPage } from "@/lib/store/home/types";
import { storefrontProductCardSelect } from "@/lib/store/product-card-query";

export type StorefrontCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  productCount: number;
};

export type StorefrontNavCategory = {
  name: string;
  slug: string;
};

export type StorefrontCategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  descriptionPreview: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  productCount: number;
  seoMetadata: SeoMetadataDocument | null;
};

const activeProductWhere = {
  isActive: true,
  qty: { gt: 0 },
} as const;

function categoryDescriptionPreview(
  html: string | null,
  maxLength = 120,
): string | null {
  if (!html) {
    return null;
  }

  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) {
    return null;
  }

  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

export async function getStorefrontCategoryBySlug(
  slug: string,
): Promise<StorefrontCategoryDetail | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      _count: {
        select: {
          products: {
            where: activeProductWhere,
          },
        },
      },
      seoMetadata: {
        select: {
          document: true,
        },
      },
    },
  });

  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    descriptionPreview: categoryDescriptionPreview(category.description),
    imageUrl: category.imageUrl,
    bannerUrl: category.bannerUrl,
    productCount: category._count.products,
    seoMetadata: seoMetadataFromRelation(category.seoMetadata),
  };
}

export async function getStorefrontCategoryProductsPage(
  categorySlug: string,
  page = 1,
  pageSize = CATALOG_PAGE_SIZE,
): Promise<StorefrontProductCardsPage | null> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { id: true },
  });

  if (!category) {
    return null;
  }

  const where = {
    ...activeProductWhere,
    categoryId: category.id,
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const skip = (safePage - 1) * pageSize;

  const products = await prisma.product.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }],
    take: pageSize,
    skip,
    select: storefrontProductCardSelect,
  });

  return {
    products: products.map((row) =>
      mapStorefrontProductCard(
        row as Parameters<typeof mapStorefrontProductCard>[0],
      ),
    ),
    total,
    page: safePage,
    pageSize,
    totalPages,
  };
}

export async function getStorefrontCategories(): Promise<StorefrontCategory[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          products: {
            where: {
              isActive: true,
              qty: { gt: 0 },
            },
          },
        },
      },
    },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: categoryDescriptionPreview(category.description),
    imageUrl: category.imageUrl,
    bannerUrl: category.bannerUrl,
    productCount: category._count.products,
  }));
}

export async function getStorefrontNavCategories(
  limit = 8,
): Promise<StorefrontNavCategory[]> {
  const categories = await prisma.category.findMany({
    where: {
      products: {
        some: activeProductWhere,
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    take: limit,
    select: {
      name: true,
      slug: true,
    },
  });

  return categories;
}
