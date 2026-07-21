import type { Prisma } from "@/generated/prisma/client";
import { ProductKeyStatus, ProductStatus } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import { decimalToString, productCodeFromSlug } from "@/lib/products/format";
import { smmUsesPerThousandPricing } from "@/lib/products/smm-pricing";
import { getProductStock } from "@/lib/products/stock";
import { getVisualProductStatus } from "@/lib/products/status";
import { BULK_EXPORT_SELECTION_LIMIT } from "@/lib/smm-services/constants";
import {
  canAffordKinguinPurchase,
  getCachedKinguinBalance,
  getCachedKinguinRegionName,
} from "@/lib/kinguin/balance";
import { resolvePersistedOfferQty } from "@/lib/kinguin/offers";
import {
  calculateDeliveryPromise,
  deliveryPromiseCustomerCopy,
  deliveryPromiseLabel,
} from "@/lib/delivery-promise/calculate";
import { getKinguinBalance } from "@/lib/providers/kinguin-balance";
import { getSmmProviderBalanceByApiUrl } from "@/lib/providers/smm-balance";
import type { ProviderBalanceSnapshot } from "@/lib/providers/balance-types";
import type {
  CategoryOptionDto,
  ProductDetailDto,
  ProductKeysPageResult,
  ProductAccountsPageResult,
  ProductListItemDto,
  ProductsPageResult,
  StoreCatalogPageResult,
  StoreCatalogPriceBounds,
  StoreProductCardDto,
  StoreProductDetailDto,
  StoreProductDetailSectionDto,
  StoreProductImageDto,
} from "@/types/products";
import type {
  StoreCatalogQuery,
  StoreCatalogSortField,
} from "@/lib/validations/catalog";
import type {
  ProductAccountsQuery,
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

/** Products matching list filters, capped for bulk select/export. */
export async function getProductsForBulkQuery(
  input: ProductsListQuery,
  limit: number,
): Promise<ProductListItemDto[]> {
  const where = buildProductsWhere(input);
  const orderBy = buildOrderBy(input.sort, input.order);
  const take = Math.min(Math.max(1, limit), BULK_EXPORT_SELECTION_LIMIT);

  const products = await prisma.product.findMany({
    where,
    orderBy,
    take,
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
      smmMin: true,
      smmMax: true,
      isFeatured: true,
      isOffer: true,
      isPreorder: true,
      createdAt: true,
      updatedAt: true,
      categories: {
        select: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      assets: {
        where: { type: "IMAGE" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, thumbnailUrl: true, sortOrder: true },
      },
      _count: { select: { keys: true } },
    },
  });

  return products.map((product) =>
    toListItemDto({
      ...product,
      availableKeysCount: 0,
      availableAccountsCount: 0,
      defaultOfferAvailableQty: null,
    }),
  );
}

export async function getProductsByIdsForBulk(
  productIds: string[],
): Promise<ProductListItemDto[]> {
  if (productIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
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
      smmMin: true,
      smmMax: true,
      isFeatured: true,
      isOffer: true,
      isPreorder: true,
      createdAt: true,
      updatedAt: true,
      categories: {
        select: {
          category: { select: { id: true, name: true, slug: true } },
        },
      },
      assets: {
        where: { type: "IMAGE" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, thumbnailUrl: true, sortOrder: true },
      },
      _count: { select: { keys: true } },
    },
  });

  const byId = new Map(
    products.map((product) => [
      product.id,
      toListItemDto({
        ...product,
        availableKeysCount: 0,
        availableAccountsCount: 0,
        defaultOfferAvailableQty: null,
      }),
    ]),
  );

  return productIds
    .map((id) => byId.get(id))
    .filter((item): item is ProductListItemDto => item != null);
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
  smmMin?: number | null;
  smmMax?: number | null;
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
  availableAccountsCount?: number;
  defaultOfferAvailableQty: number | null;
}): ProductListItemDto {
  const stock = getProductStock({
    deliveryMethod: product.deliveryMethod,
    qty: product.qty,
    textQty: product.textQty,
    availableKeysCount: product.availableKeysCount,
    availableAccountsCount: product.availableAccountsCount ?? 0,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty: product.defaultOfferAvailableQty,
    smmMin: product.smmMin,
    smmMax: product.smmMax,
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
        smmMin: true,
        smmMax: true,
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
          select: { availableQty: true, qty: true, textQty: true },
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
  const availableAccountGroups =
    productIds.length === 0
      ? []
      : await prisma.productAccount.groupBy({
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
  const availableAccountsByProduct = new Map(
    availableAccountGroups.map((group) => [group.productId, group._count._all]),
  );

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  const items = products.map((product) => {
    const defaultOffer = product.offers[0];
    return toListItemDto({
      ...product,
      availableKeysCount: availableKeysByProduct.get(product.id) ?? 0,
      availableAccountsCount: availableAccountsByProduct.get(product.id) ?? 0,
      defaultOfferAvailableQty: defaultOffer
        ? resolvePersistedOfferQty(defaultOffer)
        : null,
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
      smmMin: true,
      smmMax: true,
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
        select: { availableQty: true, qty: true, textQty: true },
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
  const availableAccountsCount = await prisma.productAccount.count({
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
    availableAccountsCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty: defaultOffer
      ? resolvePersistedOfferQty(defaultOffer)
      : null,
    smmMin: product.smmMin,
    smmMax: product.smmMax,
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
    defaultOfferAvailableQty: defaultOffer
      ? resolvePersistedOfferQty(defaultOffer)
      : null,
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

export async function getProductAccountsPage(
  productId: string,
  input: ProductAccountsQuery,
): Promise<ProductAccountsPageResult> {
  const where: Prisma.ProductAccountWhereInput = { productId };
  if (input.accountsStatus) where.status = input.accountsStatus;

  const skip = (input.accountsPage - 1) * input.accountsPageSize;
  const [total, accounts] = await prisma.$transaction([
    prisma.productAccount.count({ where }),
    prisma.productAccount.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: input.accountsPageSize,
      select: {
        id: true,
        status: true,
        label: true,
        username: true,
        email: true,
        url: true,
        createdAt: true,
        orderItemId: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.accountsPageSize));
  return {
    items: accounts.map((account) => ({
      id: account.id,
      status: account.status,
      label: account.label,
      username: account.username,
      email: account.email,
      url: account.url,
      createdAt: account.createdAt.toISOString(),
      orderItemId: account.orderItemId,
      canRevoke:
        account.status !== ProductKeyStatus.REVOKED &&
        account.status !== ProductKeyStatus.SOLD,
    })),
    total,
    page: input.accountsPage,
    pageSize: input.accountsPageSize,
    totalPages,
  };
}

export async function getCategoryOptions(): Promise<CategoryOptionDto[]> {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
  deliveryPromise?: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE";
  deliveryDelayed?: boolean;
}): StoreProductCardDto {
  const imageUrl =
    product.coverImageUrl ??
    product.assets[0]?.thumbnailUrl ??
    product.assets[0]?.url ??
    null;
  const deliveryPromise = product.deliveryPromise ?? "INSTANT";

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    href: `/products/${product.slug}`,
    imageUrl,
    price: decimalToString(product.price) ?? "0",
    compareAtPrice: decimalToString(product.compareAtPrice),
    currency: product.currency,
    isOffer: product.isOffer,
    categoryName: product.categories[0]?.category.name ?? null,
    deliveryMethod: product.deliveryMethod,
    deliveryPromise,
    deliveryDelayed:
      product.deliveryDelayed ?? deliveryPromise === "DELAYED_12_24H",
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
  qty: true,
  textQty: true,
  sourceCostPrice: true,
  smmRate: true,
  smmServiceType: true,
  smmApiUrl: true,
  smmMin: true,
  smmMax: true,
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
  offers: {
    where: { isDefault: true },
    take: 1,
    select: { availableQty: true, qty: true, textQty: true },
  },
  _count: { select: { keys: true } },
} as const;

async function enrichStoreProductCards(
  products: Array<{
    id: string;
    name: string;
    slug: string;
    coverImageUrl: string | null;
    price: { toString(): string };
    compareAtPrice: { toString(): string } | null;
    currency: string;
    isOffer: boolean;
    deliveryMethod: "SMM" | "KINGUIN" | "MANUAL";
    qty: number;
    textQty: number | null;
    sourceCostPrice: { toString(): string } | null;
    smmRate: { toString(): string } | null;
    smmServiceType: string | null;
    smmApiUrl: string | null;
    smmMin: number | null;
    smmMax: number | null;
    categories: { category: { name: string } }[];
    assets: Array<{ url: string; thumbnailUrl: string | null }>;
    offers: Array<{
      availableQty: number | null;
      qty: number;
      textQty: number;
    }>;
    _count: { keys: number };
  }>,
): Promise<StoreProductCardDto[]> {
  if (products.length === 0) return [];

  const needsKinguin = products.some((p) => p.deliveryMethod === "KINGUIN");
  const smmUrls = [
    ...new Set(
      products
        .filter((p) => p.deliveryMethod === "SMM" && p.smmApiUrl)
        .map((p) => p.smmApiUrl as string),
    ),
  ];

  const [kinguinBalance, ...smmBalances] = await Promise.all([
    needsKinguin ? getKinguinBalance() : Promise.resolve(null),
    ...smmUrls.map((url) => getSmmProviderBalanceByApiUrl(url)),
  ]);

  const smmByUrl = new Map<string, ProviderBalanceSnapshot | null>();
  smmUrls.forEach((url, index) => {
    smmByUrl.set(url, smmBalances[index] ?? null);
  });

  const manualInventoryCounts = await Promise.all(
    products
      .filter((p) => p.deliveryMethod === "MANUAL")
      .map(async (p) => {
        const [keys, accounts] = await Promise.all([
          prisma.productKey.count({
            where: { productId: p.id, status: ProductKeyStatus.AVAILABLE },
          }),
          prisma.productAccount.count({
            where: { productId: p.id, status: ProductKeyStatus.AVAILABLE },
          }),
        ]);
        return [p.id, { keys, accounts }] as const;
      }),
  );
  const inventoryByProduct = new Map(manualInventoryCounts);

  return products.map((product) => {
    const defaultOffer = product.offers[0];
    const inventory = inventoryByProduct.get(product.id);
    const stock = getProductStock({
      deliveryMethod: product.deliveryMethod,
      qty: product.qty,
      textQty: product.textQty,
      availableKeysCount: inventory?.keys ?? 0,
      availableAccountsCount: inventory?.accounts ?? 0,
      totalKeysCount: product._count.keys,
      defaultOfferAvailableQty: defaultOffer
        ? resolvePersistedOfferQty(defaultOffer)
        : null,
      smmMin: product.smmMin,
      smmMax: product.smmMax,
    });

    const estimate = calculateDeliveryPromise({
      product: {
        deliveryMethod: product.deliveryMethod,
        quantity: 1,
        stockAvailable: stock.available,
        sourceCostEur: product.sourceCostPrice
          ? Number.parseFloat(product.sourceCostPrice.toString())
          : null,
        smmRateUsd: product.smmRate
          ? Number.parseFloat(product.smmRate.toString())
          : null,
        smmServiceType: product.smmServiceType,
        smmApiUrl: product.smmApiUrl,
      },
      kinguinBalance,
      smmBalance: product.smmApiUrl ? smmByUrl.get(product.smmApiUrl) : null,
    });

    return toStoreProductCard({
      ...product,
      deliveryPromise: estimate.promise,
      deliveryDelayed: estimate.promise === "DELAYED_12_24H",
    });
  });
}

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
    return enrichStoreProductCards(featured);
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

  return enrichStoreProductCards([...featured, ...fillers]);
}

/**
 * Trending / offer-led strip for the home carousel (below CTA).
 */
export async function getTrendingStoreProducts(
  limit = 12,
): Promise<StoreProductCardDto[]> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
    },
    orderBy: [
      { isOffer: "desc" },
      { isFeatured: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit,
    select: storeProductCardSelect,
  });

  return enrichStoreProductCards(products);
}

/** Newest active products by creation date. */
export async function getNewStoreProducts(
  limit = 12,
): Promise<StoreProductCardDto[]> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: storeProductCardSelect,
  });

  return enrichStoreProductCards(products);
}

/** Active products marked as offers. */
export async function getOfferStoreProducts(
  limit = 12,
): Promise<StoreProductCardDto[]> {
  const offers = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      isOffer: true,
    },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: storeProductCardSelect,
  });

  if (offers.length >= limit) {
    return enrichStoreProductCards(offers);
  }

  const offerIds = offers.map((product) => product.id);
  const fillers = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      id: offerIds.length > 0 ? { notIn: offerIds } : undefined,
      compareAtPrice: { not: null },
    },
    orderBy: { updatedAt: "desc" },
    take: limit - offers.length,
    select: storeProductCardSelect,
  });

  return enrichStoreProductCards([...offers, ...fillers]);
}

function storeDeliveryLabel(
  method: "SMM" | "KINGUIN" | "MANUAL",
  options?: { delayed?: boolean },
): string {
  switch (method) {
    case "SMM":
      return options?.delayed
        ? "Servicio SMM · 12–24 h"
        : "Servicio SMM · minutos a horas";
    case "KINGUIN":
      return options?.delayed ? "Entrega 12–24 h" : "Entrega inmediata";
    case "MANUAL":
      return "Key digital · 12–24 h";
  }
}

function buildRegionAvailabilityLabel(input: {
  regionName: string | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
}): string | null {
  if (input.regionalLimitations?.trim()) {
    return input.regionalLimitations.trim();
  }
  if (input.regionName) {
    return input.regionName;
  }
  if (input.countryLimitation.length > 0) {
    return `Disponible en: ${input.countryLimitation.join(", ")}`;
  }
  return null;
}

function buildStoreDetailSections(product: {
  deliveryMethod: "SMM" | "KINGUIN" | "MANUAL";
  deliveryEta: string;
  platform: string | null;
  genres: string[];
  languages: string[];
  developers: string[];
  publishers: string[];
  tags: string[];
  regionName: string | null;
  regionalLimitations: string | null;
  countryLimitation: string[];
  activationDetails: string | null;
  ageRating: string | null;
  releaseDate: Date | null;
  isPreorder: boolean;
  stockLabel: string;
  smmMin: number | null;
  smmMax: number | null;
}): StoreProductDetailSectionDto[] {
  const sections: StoreProductDetailSectionDto[] = [];

  const deliveryItems = [
    `Método: ${storeDeliveryLabel(product.deliveryMethod)}`,
    `Tiempo de entrega: ${product.deliveryEta}`,
    `Disponibilidad: ${product.stockLabel}`,
  ];
  if (product.smmMin != null || product.smmMax != null) {
    deliveryItems.push(
      product.smmMin != null && product.smmMax != null
        ? `Cantidad permitida: ${product.smmMin.toLocaleString("es-CL")} – ${product.smmMax.toLocaleString("es-CL")}`
        : product.smmMin != null
          ? `Cantidad mínima: ${product.smmMin.toLocaleString("es-CL")}`
          : `Cantidad máxima: ${product.smmMax!.toLocaleString("es-CL")}`,
    );
  }
  if (product.isPreorder) {
    deliveryItems.push("Producto en preventa");
  }
  if (product.releaseDate) {
    deliveryItems.push(
      `Fecha de lanzamiento: ${product.releaseDate.toLocaleDateString("es-CL")}`,
    );
  }
  sections.push({ name: "Entrega", items: deliveryItems });

  const detailItems: string[] = [];
  if (product.platform) detailItems.push(`Plataforma: ${product.platform}`);
  if (product.genres.length > 0) {
    detailItems.push(`Géneros: ${product.genres.join(", ")}`);
  }
  if (product.languages.length > 0) {
    detailItems.push(`Idiomas: ${product.languages.join(", ")}`);
  }
  if (product.developers.length > 0) {
    detailItems.push(`Desarrolladores: ${product.developers.join(", ")}`);
  }
  if (product.publishers.length > 0) {
    detailItems.push(`Publishers: ${product.publishers.join(", ")}`);
  }
  if (product.tags.length > 0) {
    detailItems.push(`Tags: ${product.tags.join(", ")}`);
  }
  if (product.ageRating) {
    detailItems.push(`Clasificación: ${product.ageRating}`);
  }
  if (detailItems.length > 0) {
    sections.push({ name: "Detalles", items: detailItems });
  }

  if (product.activationDetails) {
    sections.push({
      name: "Activación",
      items: product.activationDetails
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
    });
  }

  const regionItems: string[] = [];
  if (product.regionName) {
    regionItems.push(`Región: ${product.regionName}`);
  }
  if (product.regionalLimitations) {
    regionItems.push(product.regionalLimitations);
  }
  if (product.countryLimitation.length > 0) {
    regionItems.push(`Países: ${product.countryLimitation.join(", ")}`);
  }
  if (regionItems.length > 0) {
    sections.push({ name: "Región", items: regionItems });
  }

  return sections;
}

function toStoreProductImages(product: {
  name: string;
  coverImageUrl: string | null;
  assets: Array<{
    id: string;
    type: "IMAGE" | "VIDEO" | "YOUTUBE";
    url: string;
    thumbnailUrl: string | null;
    altText: string | null;
    sortOrder: number;
    isCover: boolean;
  }>;
}): StoreProductImageDto[] {
  const images = product.assets.map((asset, index) => {
    let label = "Imagen";
    if (asset.type === "VIDEO") label = "Video";
    if (asset.type === "YOUTUBE") label = "YouTube";
    return {
      id: asset.id,
      name: asset.altText ?? `${label} ${index + 1}`,
      src: asset.url,
      alt: asset.altText ?? product.name,
      type: asset.type,
      thumbnailUrl: asset.thumbnailUrl,
    };
  });

  if (images.length > 0) {
    return images;
  }

  if (product.coverImageUrl) {
    return [
      {
        id: "cover",
        name: "Portada",
        src: product.coverImageUrl,
        alt: product.name,
        type: "IMAGE",
      },
    ];
  }

  return [];
}

export async function getStoreProductBySlug(
  slug: string,
): Promise<StoreProductDetailDto | null> {
  const product = await prisma.product.findFirst({
    where: {
      slug,
      status: ProductStatus.ACTIVE,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      coverImageUrl: true,
      deliveryMethod: true,
      price: true,
      compareAtPrice: true,
      currency: true,
      qty: true,
      textQty: true,
      isOffer: true,
      isPreorder: true,
      metacriticScore: true,
      platform: true,
      genres: true,
      languages: true,
      developers: true,
      publishers: true,
      tags: true,
      regionId: true,
      regionalLimitations: true,
      countryLimitation: true,
      activationDetails: true,
      ageRating: true,
      releaseDate: true,
      sourceCostPrice: true,
      smmServiceType: true,
      smmRate: true,
      smmApiUrl: true,
      smmMin: true,
      smmMax: true,
      categories: {
        select: {
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
          thumbnailUrl: true,
          altText: true,
          sortOrder: true,
          isCover: true,
        },
        orderBy: [{ isCover: "desc" }, { sortOrder: "asc" }],
      },
      _count: {
        select: { keys: true },
      },
      offers: {
        where: { isDefault: true },
        select: { availableQty: true, qty: true, textQty: true },
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
  const availableAccountsCount = await prisma.productAccount.count({
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
    availableAccountsCount,
    totalKeysCount: product._count.keys,
    defaultOfferAvailableQty: defaultOffer
      ? resolvePersistedOfferQty(defaultOffer)
      : null,
    smmMin: product.smmMin,
    smmMax: product.smmMax,
  });

  const isKinguin = product.deliveryMethod === "KINGUIN";
  const sourceCostEur = decimalToString(product.sourceCostPrice);
  const sourceCostNumber =
    sourceCostEur != null ? Number.parseFloat(sourceCostEur) : null;

  const [kinguinBalance, regionName, smmBalance] = await Promise.all([
    isKinguin ? getKinguinBalance() : Promise.resolve(null),
    getCachedKinguinRegionName(product.regionId),
    product.deliveryMethod === "SMM" && product.smmApiUrl
      ? getSmmProviderBalanceByApiUrl(product.smmApiUrl)
      : Promise.resolve(null),
  ]);

  const promiseEstimate = calculateDeliveryPromise({
    product: {
      deliveryMethod: product.deliveryMethod,
      quantity: 1,
      stockAvailable: stock.available,
      sourceCostEur: sourceCostNumber,
      smmRateUsd: product.smmRate
        ? Number.parseFloat(product.smmRate.toString())
        : null,
      smmServiceType: product.smmServiceType,
      smmApiUrl: product.smmApiUrl,
    },
    kinguinBalance,
    smmBalance,
  });
  const deliveryDelayed = promiseEstimate.promise === "DELAYED_12_24H";
  const deliveryEta = deliveryPromiseLabel(
    promiseEstimate.promise,
    product.deliveryMethod,
  );
  const priceIsPerThousand =
    product.deliveryMethod === "SMM" &&
    smmUsesPerThousandPricing(product.smmServiceType);

  const regionAvailabilityLabel = buildRegionAvailabilityLabel({
    regionName,
    regionalLimitations: product.regionalLimitations,
    countryLimitation: product.countryLimitation,
  });

  const maxOrderQuantity =
    product.deliveryMethod === "SMM"
      ? (product.smmMax ?? 1_000_000)
      : Math.max(1, stock.available);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    href: `/products/${product.slug}`,
    description: product.description,
    price: decimalToString(product.price) ?? "0",
    compareAtPrice: decimalToString(product.compareAtPrice),
    currency: product.currency,
    priceIsPerThousand,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
    deliveryMethod: product.deliveryMethod,
    deliveryLabel: storeDeliveryLabel(product.deliveryMethod, {
      delayed: deliveryDelayed,
    }),
    deliveryEta,
    deliveryDelayed,
    deliveryPromise: promiseEstimate.promise,
    stockAvailable: stock.available,
    stockLabel: stock.label,
    inStock: stock.available > 0,
    maxOrderQuantity,
    metacriticScore: product.metacriticScore,
    platform: product.platform,
    genres: product.genres,
    languages: product.languages,
    developers: product.developers,
    publishers: product.publishers,
    tags: product.tags,
    regionId: product.regionId,
    regionName,
    regionalLimitations: product.regionalLimitations,
    countryLimitation: product.countryLimitation,
    regionAvailabilityLabel,
    activationDetails: product.activationDetails,
    ageRating: product.ageRating,
    releaseDate: product.releaseDate?.toISOString() ?? null,
    categories: product.categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
    })),
    images: toStoreProductImages(product),
    detailSections: buildStoreDetailSections({
      deliveryMethod: product.deliveryMethod,
      deliveryEta,
      platform: product.platform,
      genres: product.genres,
      languages: product.languages,
      developers: product.developers,
      publishers: product.publishers,
      tags: product.tags,
      regionName,
      regionalLimitations: product.regionalLimitations,
      countryLimitation: product.countryLimitation,
      activationDetails: product.activationDetails,
      ageRating: product.ageRating,
      releaseDate: product.releaseDate,
      isPreorder: product.isPreorder,
      stockLabel: stock.label,
      smmMin: product.smmMin,
      smmMax: product.smmMax,
    }),
    smmServiceType: product.smmServiceType,
    smmMin: product.smmMin,
    smmMax: product.smmMax,
  };
}

function buildStoreCatalogOrderBy(
  sort: StoreCatalogSortField,
  order: "asc" | "desc",
):
  | Prisma.ProductOrderByWithRelationInput
  | Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "name":
      return { name: order };
    case "price":
      return { price: order };
    case "createdAt":
      return { createdAt: order };
    case "updatedAt":
      return { updatedAt: order };
    case "relevance":
      return [
        { isFeatured: "desc" },
        { isOffer: "desc" },
        { updatedAt: "desc" },
      ];
  }
}

function buildInStockWhere(): Prisma.ProductWhereInput {
  return {
    OR: [
      {
        deliveryMethod: "MANUAL",
        OR: [
          { keys: { some: { status: ProductKeyStatus.AVAILABLE } } },
          { accounts: { some: { status: ProductKeyStatus.AVAILABLE } } },
        ],
      },
      {
        deliveryMethod: "SMM",
      },
      {
        deliveryMethod: "KINGUIN",
        OR: [
          { qty: { gt: 0 } },
          { textQty: { gt: 0 } },
          {
            offers: {
              some: {
                isDefault: true,
                OR: [
                  { availableQty: { gt: 0 } },
                  { qty: { gt: 0 } },
                  { textQty: { gt: 0 } },
                ],
              },
            },
          },
        ],
      },
    ],
  };
}

async function resolveCatalogCategoryIds(
  categoryParam: string,
): Promise<string[] | null> {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ slug: categoryParam }, { id: categoryParam }],
    },
    select: {
      id: true,
      children: { select: { id: true } },
    },
  });

  if (!category) {
    return null;
  }

  return [category.id, ...category.children.map((child) => child.id)];
}

async function buildStoreCatalogWhere(
  input: StoreCatalogQuery,
): Promise<Prisma.ProductWhereInput> {
  const and: Prisma.ProductWhereInput[] = [];

  if (input.q) {
    and.push({
      OR: [
        { name: { contains: input.q, mode: "insensitive" } },
        { slug: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
      ],
    });
  }

  if (input.deliveryMethod) {
    and.push({ deliveryMethod: input.deliveryMethod });
  }

  if (input.offers) {
    and.push({ isOffer: true });
  }

  if (input.minPrice != null || input.maxPrice != null) {
    and.push({
      price: {
        ...(input.minPrice != null ? { gte: input.minPrice } : {}),
        ...(input.maxPrice != null ? { lte: input.maxPrice } : {}),
      },
    });
  }

  if (input.availability === "in_stock") {
    and.push(buildInStockWhere());
  } else if (input.availability === "out_of_stock") {
    and.push({ NOT: buildInStockWhere() });
  }

  if (input.category) {
    const categoryIds = await resolveCatalogCategoryIds(input.category);
    if (categoryIds == null) {
      and.push({ id: { in: [] } });
    } else {
      and.push({
        categories: {
          some: { categoryId: { in: categoryIds } },
        },
      });
    }
  }

  return {
    status: ProductStatus.ACTIVE,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}

/** Active catalog price floor/ceiling for the storefront filter slider. */
export async function getStoreCatalogPriceBounds(): Promise<StoreCatalogPriceBounds> {
  const aggregate = await prisma.product.aggregate({
    where: { status: ProductStatus.ACTIVE },
    _min: { price: true },
    _max: { price: true },
  });

  const min = Math.max(
    0,
    Math.floor(Number(aggregate._min.price?.toString() ?? "0")),
  );
  const max = Math.max(
    min,
    Math.ceil(Number(aggregate._max.price?.toString() ?? "0")),
  );

  return {
    min,
    max: max === min ? min + 1 : max,
  };
}

/** Paginated storefront catalog with URL-driven filters. */
export async function getStoreCatalogPage(
  input: StoreCatalogQuery,
): Promise<StoreCatalogPageResult> {
  const where = await buildStoreCatalogWhere(input);
  const orderBy = buildStoreCatalogOrderBy(input.sort, input.order);
  const skip = (input.page - 1) * input.pageSize;

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: input.pageSize,
      select: storeProductCardSelect,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / input.pageSize));

  return {
    items: await enrichStoreProductCards(products),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages,
  };
}

export async function getRelatedStoreProducts(
  productId: string,
  categoryIds: string[],
  limit = 4,
): Promise<StoreProductCardDto[]> {
  if (categoryIds.length === 0) {
    const products = await prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        id: { not: productId },
      },
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: limit,
      select: storeProductCardSelect,
    });
    return enrichStoreProductCards(products);
  }

  const related = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      id: { not: productId },
      categories: {
        some: { categoryId: { in: categoryIds } },
      },
    },
    orderBy: [
      { isOffer: "desc" },
      { isFeatured: "desc" },
      { updatedAt: "desc" },
    ],
    take: limit,
    select: storeProductCardSelect,
  });

  if (related.length >= limit) {
    return enrichStoreProductCards(related);
  }

  const relatedIds = related.map((product) => product.id);
  const fillers = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      id: {
        notIn: [productId, ...relatedIds],
      },
    },
    orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
    take: limit - related.length,
    select: storeProductCardSelect,
  });

  return enrichStoreProductCards([...related, ...fillers]);
}
