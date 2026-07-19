import type {
  DeliveriesListQuery,
  DeliveriesSortField,
} from "@/lib/validations/deliveries";

type DeliveriesHrefOverrides = Partial<{
  q: string | undefined;
  status: DeliveriesListQuery["status"] | undefined;
  method: DeliveriesListQuery["method"] | undefined;
  hasError: boolean | undefined;
  needsManual: boolean | undefined;
  hasExternal: boolean | undefined;
  sort: DeliveriesSortField | undefined;
  order: "asc" | "desc" | undefined;
  page: number | undefined;
}>;

export function buildAdminDeliveriesHref(
  query: DeliveriesListQuery,
  overrides: DeliveriesHrefOverrides = {},
): string {
  const next = {
    q: "q" in overrides ? overrides.q : query.q,
    pageSize: query.pageSize,
    status: "status" in overrides ? overrides.status : query.status,
    method: "method" in overrides ? overrides.method : query.method,
    hasError: "hasError" in overrides ? overrides.hasError : query.hasError,
    needsManual:
      "needsManual" in overrides ? overrides.needsManual : query.needsManual,
    hasExternal:
      "hasExternal" in overrides ? overrides.hasExternal : query.hasExternal,
    sort: "sort" in overrides ? (overrides.sort ?? "createdAt") : query.sort,
    order: "order" in overrides ? (overrides.order ?? "desc") : query.order,
    page: "page" in overrides ? overrides.page : undefined,
  };

  const params = new URLSearchParams();
  if (next.page && next.page > 1) params.set("page", String(next.page));
  if (next.q) params.set("q", next.q);
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.status) params.set("status", next.status);
  if (next.method) params.set("method", next.method);
  if (next.hasError) params.set("hasError", "true");
  if (next.needsManual) params.set("needsManual", "true");
  if (next.hasExternal) params.set("hasExternal", "true");
  if (next.sort !== "createdAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/deliveries?${qs}` : "/admin/deliveries";
}

/** @deprecated Prefer `buildAdminDeliveriesHref` — kept for existing call sites. */
export const buildDeliveriesHref = buildAdminDeliveriesHref;
