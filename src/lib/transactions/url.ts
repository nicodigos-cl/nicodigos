import type { TransactionsListQuery } from "@/lib/validations/transactions";

export function transactionsHref(query: TransactionsListQuery, overrides: Partial<TransactionsListQuery> = {}) {
  const next = { ...query, ...overrides }; const params = new URLSearchParams();
  if (next.page > 1) params.set("page", String(next.page)); if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  const textKeys = ["q", "status", "provider", "type", "method", "currency", "from", "to"] as const;
  for (const key of textKeys) if (next[key]) params.set(key, String(next[key]));
  if (next.minAmount != null) params.set("minAmount", String(next.minAmount)); if (next.maxAmount != null) params.set("maxAmount", String(next.maxAmount));
  const boolKeys = ["hasError", "withoutConfirmation", "webhookReceived", "needsReconciliation", "refunded", "possibleDuplicate", "inconsistentPaidOrder", "approvedWithoutDelivery", "requiresReview"] as const;
  for (const key of boolKeys) if (next[key]) params.set(key, "true");
  if (next.sort !== "createdAt") params.set("sort", next.sort); if (next.order !== "desc") params.set("order", next.order);
  const qs = params.toString(); return qs ? `/admin/transactions?${qs}` : "/admin/transactions";
}
