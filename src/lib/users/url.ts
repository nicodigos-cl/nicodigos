import type { UsersListQuery } from "@/lib/validations/users";

export function usersHref(
  query: UsersListQuery,
  overrides: Partial<UsersListQuery> = {},
) {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();

  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));

  const textKeys = [
    "q",
    "role",
    "accountStatus",
    "registeredFrom",
    "registeredTo",
    "activeFrom",
    "activeTo",
  ] as const;
  for (const key of textKeys) {
    if (next[key]) params.set(key, String(next[key]));
  }

  if (next.minSpent != null) params.set("minSpent", String(next.minSpent));
  if (next.maxSpent != null) params.set("maxSpent", String(next.maxSpent));

  const boolKeys = [
    "emailVerified",
    "withOrders",
    "withoutOrders",
    "withApprovedPurchases",
    "withFailedPayments",
    "withPendingDeliveries",
    "withCompleteBilling",
    "withRut",
    "requiresReview",
    "adminsOnly",
    "blockedOnly",
  ] as const;
  for (const key of boolKeys) {
    if (next[key] === true) params.set(key, "true");
    if (next[key] === false) params.set(key, "false");
  }

  if (next.sort !== "createdAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);

  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

export function userDetailHref(
  userId: string,
  overrides: { section?: string; page?: number; pageSize?: number } = {},
) {
  const params = new URLSearchParams();
  if (overrides.section && overrides.section !== "resumen") {
    params.set("section", overrides.section);
  }
  if (overrides.page && overrides.page > 1) {
    params.set("page", String(overrides.page));
  }
  if (overrides.pageSize && overrides.pageSize !== 10) {
    params.set("pageSize", String(overrides.pageSize));
  }
  const qs = params.toString();
  return qs ? `/admin/users/${userId}?${qs}` : `/admin/users/${userId}`;
}
