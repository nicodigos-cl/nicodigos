"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import type { StoreNavCategoryDto } from "@/types/categories";

export type CategoriesResponse = {
  categories: StoreNavCategoryDto[];
};

export const categoryKeys = {
  all: ["categories"] as const,
  nav: () => [...categoryKeys.all, "nav"] as const,
  list: () => [...categoryKeys.all, "list"] as const,
  detail: (slug: string) => [...categoryKeys.all, "detail", slug] as const,
};

async function fetchStoreNavCategories(): Promise<StoreNavCategoryDto[]> {
  const response = await fetch("/api/categories");

  if (!response.ok) {
    throw new Error("No se pudieron cargar las categorías");
  }

  const data = (await response.json()) as CategoriesResponse;
  return data.categories;
}

function flattenCategories(
  categories: StoreNavCategoryDto[],
): StoreNavCategoryDto[] {
  const result: StoreNavCategoryDto[] = [];

  for (const category of categories) {
    result.push(category);
    if (category.children.length > 0) {
      result.push(...flattenCategories(category.children));
    }
  }

  return result;
}

function findCategoryBySlug(
  categories: StoreNavCategoryDto[],
  slug: string,
): StoreNavCategoryDto | undefined {
  for (const category of categories) {
    if (category.slug === slug) {
      return category;
    }
    const nested = findCategoryBySlug(category.children, slug);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

type NavCategoriesOptions = Omit<
  UseQueryOptions<StoreNavCategoryDto[], Error, StoreNavCategoryDto[]>,
  "queryKey" | "queryFn"
>;

/** Tree of root categories with children for the store header. */
export function useStoreNavCategories(options?: NavCategoriesOptions) {
  return useQuery({
    staleTime: 1000 * 60 * 5,
    ...options,
    queryKey: categoryKeys.nav(),
    queryFn: fetchStoreNavCategories,
  });
}

type FlatCategoriesOptions = Omit<
  UseQueryOptions<StoreNavCategoryDto[], Error, StoreNavCategoryDto[]>,
  "queryKey" | "queryFn" | "select"
>;

/** Flat list of all categories (roots + children). */
export function useCategories(options?: FlatCategoriesOptions) {
  return useQuery({
    staleTime: 1000 * 60 * 5,
    ...options,
    queryKey: categoryKeys.nav(),
    queryFn: fetchStoreNavCategories,
    select: flattenCategories,
  });
}

type CategoryBySlugOptions = Omit<
  UseQueryOptions<
    StoreNavCategoryDto[],
    Error,
    StoreNavCategoryDto | undefined
  >,
  "queryKey" | "queryFn" | "select"
>;

/** Single category by slug, resolved from the nav tree cache. */
export function useCategory(slug: string, options?: CategoryBySlugOptions) {
  const { enabled, ...rest } = options ?? {};

  return useQuery({
    staleTime: 1000 * 60 * 5,
    ...rest,
    queryKey: categoryKeys.nav(),
    queryFn: fetchStoreNavCategories,
    enabled: Boolean(slug) && (enabled ?? true),
    select: (categories) => findCategoryBySlug(categories, slug),
  });
}
