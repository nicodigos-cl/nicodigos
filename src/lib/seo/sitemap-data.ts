import "server-only";

import { ProductStatus } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

export type SitemapUrlEntry = {
  slug: string;
  updatedAt: Date;
};

export async function getSitemapProducts(): Promise<SitemapUrlEntry[]> {
  return prisma.product.findMany({
    where: { status: ProductStatus.ACTIVE },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getSitemapCategories(): Promise<SitemapUrlEntry[]> {
  return prisma.category.findMany({
    where: {
      products: {
        some: {
          product: { status: ProductStatus.ACTIVE },
        },
      },
    },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}
