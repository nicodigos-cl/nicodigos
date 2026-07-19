import type { StoreCatalogQuery } from "@/lib/validations/catalog";

export type StoreCatalogHrefOverrides = Partial<{
  page: number;
  pageSize: StoreCatalogQuery["pageSize"];
  q: string | undefined;
  category: string | undefined;
  deliveryMethod: StoreCatalogQuery["deliveryMethod"] | undefined;
  availability: StoreCatalogQuery["availability"] | undefined;
  minPrice: number | undefined;
  maxPrice: number | undefined;
  offers: true | undefined;
  sort: StoreCatalogQuery["sort"] | undefined;
  order: "asc" | "desc" | undefined;
}>;

/** Build a `/catalog` URL from the current query, omitting defaults. */
export function buildCatalogHref(
  query: StoreCatalogQuery,
  overrides: StoreCatalogHrefOverrides = {},
): string {
  const next: StoreCatalogQuery = {
    page: "page" in overrides ? (overrides.page ?? 1) : query.page,
    pageSize:
      "pageSize" in overrides ? (overrides.pageSize ?? 24) : query.pageSize,
    q: "q" in overrides ? overrides.q : query.q,
    category: "category" in overrides ? overrides.category : query.category,
    deliveryMethod:
      "deliveryMethod" in overrides
        ? overrides.deliveryMethod
        : query.deliveryMethod,
    availability:
      "availability" in overrides ? overrides.availability : query.availability,
    minPrice: "minPrice" in overrides ? overrides.minPrice : query.minPrice,
    maxPrice: "maxPrice" in overrides ? overrides.maxPrice : query.maxPrice,
    offers:
      "offers" in overrides
        ? overrides.offers === true
          ? true
          : undefined
        : query.offers,
    sort: "sort" in overrides ? (overrides.sort ?? "relevance") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
  };

  const params = new URLSearchParams();

  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 24) params.set("pageSize", String(next.pageSize));
  if (next.q) params.set("q", next.q);
  if (next.category) params.set("category", next.category);
  if (next.deliveryMethod) {
    params.set("deliveryMethod", next.deliveryMethod);
  }
  if (next.availability) params.set("availability", next.availability);
  if (next.minPrice != null) params.set("minPrice", String(next.minPrice));
  if (next.maxPrice != null) params.set("maxPrice", String(next.maxPrice));
  if (next.offers) params.set("filter", "offers");
  if (next.sort !== "relevance") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export function catalogHasActiveFilters(query: StoreCatalogQuery): boolean {
  return Boolean(
    query.q ||
    query.category ||
    query.deliveryMethod ||
    query.availability ||
    query.minPrice != null ||
    query.maxPrice != null ||
    query.offers ||
    query.sort !== "relevance" ||
    query.order !== "desc",
  );
}
