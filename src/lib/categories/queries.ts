import type { Prisma } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import type {
  CategoriesListQuery,
  CategoriesSortField,
} from "@/lib/validations/categories";
import type {
  CategoriesPageResult,
  CategoryDetailDto,
  CategoryListItemDto,
  CategoryParentOptionDto,
  CategoryTreeNodeDto,
  StoreNavCategoryDto,
} from "@/types/categories";

/** Storefront category landing page. */
export function categoryHref(slug: string): string {
  return `/categories/${encodeURIComponent(slug)}`;
}

function buildOrderBy(
  sort: CategoriesSortField,
  order: "asc" | "desc",
): Prisma.CategoryOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: order };
    case "sortOrder":
      return { sortOrder: order };
    case "createdAt":
      return { createdAt: order };
    case "updatedAt":
      return { updatedAt: order };
    case "productsCount":
      return { products: { _count: order } };
  }
}

function toListItem(category: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  parent: { name: string } | null;
  _count: { products: number; children: number };
  assets: Array<{
    id: string;
    type: "IMAGE" | "VIDEO" | "YOUTUBE";
    url: string;
    objectKey: string | null;
    youtubeId: string | null;
    mimeType: string | null;
    fileName: string | null;
    sizeBytes: bigint | null;
    thumbnailUrl: string | null;
    altText: string | null;
    sortOrder: number;
    isCover: boolean;
  }>;
}): CategoryListItemDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    sortOrder: category.sortOrder,
    productsCount: category._count.products,
    childrenCount: category._count.children,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    assets: category.assets.map((asset) => ({
      ...asset,
      localId: asset.id,
      sizeBytes: asset.sizeBytes == null ? null : Number(asset.sizeBytes),
    })),
  };
}

const categoryListSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  imageUrl: true,
  parentId: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  parent: { select: { name: true } },
  _count: { select: { products: true, children: true } },
  assets: { orderBy: { sortOrder: "asc" as const } },
} as const;

export async function getCategoriesPage(
  input: CategoriesListQuery,
): Promise<CategoriesPageResult> {
  const where: Prisma.CategoryWhereInput = {};

  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: "insensitive" } },
      { slug: { contains: input.q, mode: "insensitive" } },
      { description: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.parentId === "root") {
    where.parentId = null;
  } else if (input.parentId) {
    where.parentId = input.parentId;
  }

  const skip = (input.page - 1) * input.pageSize;

  const [total, categories] = await prisma.$transaction([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: buildOrderBy(input.sort, input.order),
      skip,
      take: input.pageSize,
      select: categoryListSelect,
    }),
  ]);

  return {
    items: categories.map(toListItem),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

/** Full category tree for admin DnD (ordered by sortOrder). */
export async function getCategoriesTree(
  search?: string,
): Promise<CategoryTreeNodeDto[]> {
  const q = search?.trim();
  const categories = await prisma.category.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { slug: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      sortOrder: true,
      _count: { select: { products: true } },
    },
  });

  if (q) {
    // Flat filtered list as roots (search mode — no nesting).
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      productsCount: category._count.products,
      children: [],
    }));
  }

  const byParent = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const siblings = byParent.get(category.parentId) ?? [];
    siblings.push(category);
    byParent.set(category.parentId, siblings);
  }

  function build(parentId: string | null): CategoryTreeNodeDto[] {
    return (byParent.get(parentId) ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      productsCount: category._count.products,
      children: build(category.id),
    }));
  }

  return build(null);
}

export async function getCategoryById(
  id: string,
): Promise<CategoryDetailDto | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    select: categoryListSelect,
  });

  if (!category) {
    return null;
  }

  return toListItem(category);
}

/** Resolve a storefront category by slug (or id) for catalog breadcrumbs. */
export async function getCategoryBySlug(
  slug: string,
): Promise<Pick<CategoryDetailDto, "id" | "name" | "slug"> | null> {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return category;
}

/** Collect `rootId` and all descendant ids (BFS). */
export async function getCategoryDescendantIds(
  rootId: string,
): Promise<Set<string>> {
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });

  const childrenByParent = new Map<string | null, string[]>();
  for (const row of all) {
    const siblings = childrenByParent.get(row.parentId) ?? [];
    siblings.push(row.id);
    childrenByParent.set(row.parentId, siblings);
  }

  const result = new Set<string>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const childId of childrenByParent.get(current) ?? []) {
      if (!result.has(childId)) {
        result.add(childId);
        queue.push(childId);
      }
    }
  }

  return result;
}

export async function getCategoryParentOptions(
  excludeId?: string,
): Promise<CategoryParentOptionDto[]> {
  const excluded = excludeId
    ? await getCategoryDescendantIds(excludeId)
    : new Set<string>();

  const categories = await prisma.category.findMany({
    where: excluded.size > 0 ? { id: { notIn: [...excluded] } } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  return categories;
}

/** Root categories with one level of children for the store header. */
export async function getStoreNavCategories(): Promise<StoreNavCategoryDto[]> {
  const roots = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
    },
  });

  return roots.map((root) => ({
    id: root.id,
    name: root.name,
    slug: root.slug,
    href: categoryHref(root.slug),
    imageUrl: root.imageUrl,
    children: root.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      href: categoryHref(child.slug),
      imageUrl: child.imageUrl,
      children: [],
    })),
  }));
}

export type StoreCategoryTreeDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productsCount: number;
  children: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    productsCount: number;
  }[];
};

/** Get the root categories and all children with product count and description for categories page. */
export async function getStoreCategoriesPageData(): Promise<StoreCategoryTreeDto[]> {
  const categories = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      _count: { select: { products: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    description: cat.description,
    imageUrl: cat.imageUrl,
    productsCount: cat._count.products,
    children: cat.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      description: child.description,
      imageUrl: child.imageUrl,
      productsCount: child._count.products,
    })),
  }));
}

export type StoreCategoryDetailDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId: string | null;
  parent: { id: string; name: string; slug: string } | null;
  children: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    productsCount: number;
  }[];
};

/** Get a single category by slug, with parent and children data for detail/landing page. */
export async function getStoreCategoryDetail(
  slug: string,
): Promise<StoreCategoryDetailDto | null> {
  const category = await prisma.category.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      parentId: true,
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      children: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          imageUrl: true,
          _count: { select: { products: true } },
        },
      },
    },
  });

  if (!category) return null;

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    parentId: category.parentId,
    parent: category.parent,
    children: category.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      description: child.description,
      imageUrl: child.imageUrl,
      productsCount: child._count.products,
    })),
  };
}


