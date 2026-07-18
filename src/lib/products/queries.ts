import type { Prisma } from "@/generated/prisma/client";
import { ProductKeyStatus, ProductStatus } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import { decimalToString, productCodeFromSlug } from "@/lib/products/format";
import { getProductStock } from "@/lib/products/stock";
import { getVisualProductStatus } from "@/lib/products/status";
import type {
  CategoryOptionDto,
  ProductDetailDto,
  ProductKeysPageResult,
  ProductListItemDto,
  ProductsPageResult,
  StoreProductCardDto,
} from "@/types/products";
import type {
  ProductKeysQuery,
  ProductsListQuery,
  ProductsSortField,
} from "@/lib/validations/products";

function buildOrderBy(
  sort: ProductsSortField,
  order: "asc" | "desc",
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: order };
    case "price":
      return { price: order };
    case "qty":
      return { qty: order };
    case "status":
      return { status: order };
    case "createdAt":
      return { createdAt: order };
    case "updatedAt":
      return { updatedAt: order };
  }
}

function buildProductsWhere(
  input: ProductsListQuery,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: "insensitive" } },
      { slug: { contains: input.q, mode: "insensitive" } },
      { description: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.deliveryMethod) {
    where.deliveryMethod = input.deliveryMethod;
  }

  if (input.category) {
    where.categories = {
      some: {
        OR: [
          { categoryId: input.category },
          { category: { slug: input.category } },
        ],
      },
    };
  }

  return where;
}

function toListItemDto(product: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImageUrl: string | null;
  status: ProductStatus;
  deliveryMethod: "SMM" | "KINGUIN" | "MANUAL";
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  currency: string;
  qty: number;
  textQty: number | null;
  isFeatured: boolean;
  isOffer: boolean;
  isPreorder: boolean;
  createdAt: Date;
  updatedAt: Date;
  categories: {
    category: { id: string; name: string; slug: string };
  }[];
  assets: { url: string; thumbnailUrl: string | null; sortOrder: number }[];
  _count: { keys: number };
  availableKeysCount: number;
  defaultOfferAvailableQty: number | null;
}): ProductListItemDto {
  const stock = getProductStock({
    deliveryMethod: product.deliveryMethod,
    qty: product.qty,
    textQty: product.textQty,
    availableKeysCount: product.availableKeysCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty: product.defaultOfferAvailableQty,
  });

  const price = decimalToString(product.price) ?? "0";
  const compareAtPrice = decimalToString(product.compareAtPrice);
  const firstImage = product.assets[0];
  const thumbnailUrl =
    product.coverImageUrl ??
    firstImage?.thumbnailUrl ??
    firstImage?.url ??
    null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    code: productCodeFromSlug(product.slug),
    description: product.description,
    coverImageUrl: product.coverImageUrl,
    thumbnailUrl,
    status: product.status,
    visualStatus: getVisualProductStatus(product.status, stock.available),
    deliveryMethod: product.deliveryMethod,
    price,
    compareAtPrice,
    basePrice: compareAtPrice ?? price,
    offerPrice: product.isOffer ? price : null,
    currency: product.currency,
    qty: product.qty,
    textQty: product.textQty,
    isFeatured: product.isFeatured,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
    stockAvailable: stock.available,
    stockLabel: stock.label,
    categories: product.categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function getProductsPage(
  input: ProductsListQuery,
): Promise<ProductsPageResult> {
  const where = buildProductsWhere(input);
  const orderBy = buildOrderBy(input.sort, input.order);
  const skip = (input.page - 1) * input.pageSize;

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: input.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        coverImageUrl: true,
        status: true,
        deliveryMethod: true,
        price: true,
        compareAtPrice: true,
        currency: true,
        qty: true,
        textQty: true,
        isFeatured: true,
        isOffer: true,
        isPreorder: true,
        createdAt: true,
        updatedAt: true,
        categories: {
          select: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        assets: {
          where: { type: "IMAGE" },
          select: { url: true, thumbnailUrl: true, sortOrder: true },
          orderBy: { sortOrder: "asc" },
          take: 1,
        },
        _count: {
          select: { keys: true },
        },
        offers: {
          where: { isDefault: true },
          select: { availableQty: true, qty: true },
          take: 1,
        },
      },
    }),
  ]);

  const productIds = products.map((product) => product.id);
  const availableKeyGroups =
    productIds.length === 0
      ? []
      : await prisma.productKey.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            status: ProductKeyStatus.AVAILABLE,
          },
          _count: { _all: true },
        });

  const availableKeysByProduct = new Map(
    availableKeyGroups.map((group) => [group.productId, group._count._all]),
  );

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  const items = products.map((product) => {
    const defaultOffer = product.offers[0];
    return toListItemDto({
      ...product,
      availableKeysCount: availableKeysByProduct.get(product.id) ?? 0,
      defaultOfferAvailableQty:
        defaultOffer?.availableQty ?? defaultOffer?.qty ?? null,
      _count: product._count,
    });
  });

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages,
  };
}

export async function getProductById(
  productId: string,
): Promise<ProductDetailDto | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImageUrl: true,
      status: true,
      deliveryMethod: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      qty: true,
      textQty: true,
      isFeatured: true,
      isOffer: true,
      isPreorder: true,
      originalName: true,
      platform: true,
      genres: true,
      languages: true,
      developers: true,
      publishers: true,
      tags: true,
      regionId: true,
      regionalLimitations: true,
      countryLimitation: true,
      releaseDate: true,
      activationDetails: true,
      ageRating: true,
      sourceCostPrice: true,
      createdAt: true,
      updatedAt: true,
      categories: {
        select: {
          categoryId: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      assets: {
        select: {
          id: true,
          type: true,
          url: true,
          objectKey: true,
          youtubeId: true,
          mimeType: true,
          fileName: true,
          sizeBytes: true,
          thumbnailUrl: true,
          altText: true,
          sortOrder: true,
          isCover: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { keys: true },
      },
      offers: {
        where: { isDefault: true },
        select: { availableQty: true, qty: true },
        take: 1,
      },
    },
  });

  if (!product) {
    return null;
  }

  const availableKeysCount = await prisma.productKey.count({
    where: {
      productId: product.id,
      status: ProductKeyStatus.AVAILABLE,
    },
  });

  const defaultOffer = product.offers[0];
  const stock = getProductStock({
    deliveryMethod: product.deliveryMethod,
    qty: product.qty,
    textQty: product.textQty,
    availableKeysCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty:
      defaultOffer?.availableQty ?? defaultOffer?.qty ?? null,
  });

  const price = decimalToString(product.price) ?? "0";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    code: productCodeFromSlug(product.slug),
    description: product.description,
    coverImageUrl: product.coverImageUrl,
    status: product.status,
    visualStatus: getVisualProductStatus(product.status, stock.available),
    deliveryMethod: product.deliveryMethod,
    price,
    compareAtPrice: decimalToString(product.compareAtPrice),
    currency: product.currency,
    qty: product.qty,
    textQty: product.textQty,
    isFeatured: product.isFeatured,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
    originalName: product.originalName,
    platform: product.platform,
    genres: product.genres,
    languages: product.languages,
    developers: product.developers,
    publishers: product.publishers,
    tags: product.tags,
    regionId: product.regionId,
    regionalLimitations: product.regionalLimitations,
    countryLimitation: product.countryLimitation,
    releaseDate: product.releaseDate?.toISOString() ?? null,
    activationDetails: product.activationDetails,
    ageRating: product.ageRating,
    sourceCostPrice: decimalToString(product.sourceCostPrice),
    categoryIds: product.categories.map((item) => item.categoryId),
    categories: product.categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
    })),
    images: product.assets
      .filter((asset) => asset.type === "IMAGE")
      .map((image) => ({
        id: image.id,
        url: image.url,
        thumbnailUrl: image.thumbnailUrl,
        sortOrder: image.sortOrder,
      })),
    assets: product.assets.map((asset) => ({
      ...asset,
      localId: asset.id,
      sizeBytes: asset.sizeBytes == null ? null : Number(asset.sizeBytes),
    })),
    availableKeysCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty:
      defaultOffer?.availableQty ?? defaultOffer?.qty ?? null,
    stockAvailable: stock.available,
    stockLabel: stock.label,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

export async function getProductKeysPage(
  productId: string,
  input: ProductKeysQuery,
): Promise<ProductKeysPageResult> {
  const where: Prisma.ProductKeyWhereInput = {
    productId,
  };

  if (input.keysQuery) {
    where.code = {
      contains: input.keysQuery,
      mode: "insensitive",
    };
  }

  if (input.keysStatus) {
    where.status = input.keysStatus;
  }

  const skip = (input.keysPage - 1) * input.keysPageSize;

  const [total, keys] = await prisma.$transaction([
    prisma.productKey.count({ where }),
    prisma.productKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: input.keysPageSize,
      select: {
        id: true,
        code: true,
        status: true,
        createdAt: true,
        orderItemId: true,
        _count: {
          select: { deliveryKeys: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.keysPageSize));

  return {
    items: keys.map((key) => ({
      id: key.id,
      code: key.code,
      status: key.status,
      createdAt: key.createdAt.toISOString(),
      orderItemId: key.orderItemId,
      canRevoke:
        key.status !== ProductKeyStatus.REVOKED &&
        key.status !== ProductKeyStatus.SOLD,
    })),
    total,
    page: input.keysPage,
    pageSize: input.keysPageSize,
    totalPages,
  };
}

export async function getCategoryOptions(): Promise<CategoryOptionDto[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return categories;
}

function toStoreProductCard(product: {
  id: string;
  name: string;
  slug: string;
  coverImageUrl: string | null;
  price: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  currency: string;
  isOffer: boolean;
  deliveryMethod: "SMM" | "KINGUIN" | "MANUAL";
  categories: {
    category: { name: string };
  }[];
  assets: Array<{ url: string; thumbnailUrl: string | null }>;
}): StoreProductCardDto {
  const imageUrl =
    product.coverImageUrl ??
    product.assets[0]?.thumbnailUrl ??
    product.assets[0]?.url ??
    null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    href: `/productos/${product.slug}`,
    imageUrl,
    price: decimalToString(product.price) ?? "0",
    compareAtPrice: decimalToString(product.compareAtPrice),
    currency: product.currency,
    isOffer: product.isOffer,
    categoryName: product.categories[0]?.category.name ?? null,
    deliveryMethod: product.deliveryMethod,
  };
}

const storeProductCardSelect = {
  id: true,
  name: true,
  slug: true,
  coverImageUrl: true,
  price: true,
  compareAtPrice: true,
  currency: true,
  isOffer: true,
  deliveryMethod: true,
  categories: {
    take: 1,
    orderBy: { createdAt: "asc" as const },
    select: { category: { select: { name: true } } },
  },
  assets: {
    where: { type: "IMAGE" as const },
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true, thumbnailUrl: true },
  },
} as const;

/**
 * Popular storefront products: featured first, then recent ACTIVE to fill.
 */
export async function getPopularStoreProducts(
  limit = 8,
): Promise<StoreProductCardDto[]> {
  const featured = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      isFeatured: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: storeProductCardSelect,
  });

  if (featured.length >= limit) {
    return featured.map(toStoreProductCard);
  }

  const remaining = limit - featured.length;
  const featuredIds = featured.map((product) => product.id);

  const fillers = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      id: featuredIds.length > 0 ? { notIn: featuredIds } : undefined,
    },
    orderBy: [{ isOffer: "desc" }, { updatedAt: "desc" }],
    take: remaining,
    select: storeProductCardSelect,
  });

  return [...featured, ...fillers].map(toStoreProductCard);
}
