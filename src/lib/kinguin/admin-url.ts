import type { KinguinSearchQuery } from "@/lib/validations/kinguin";

/** Build `/admin/kinguin` href from query, resetting page unless overridden. */
export function buildKinguinAdminHref(
  query: KinguinSearchQuery,
  overrides: Partial<KinguinSearchQuery> = {},
): string {
  const next: KinguinSearchQuery = {
    ...query,
    ...overrides,
    page:
      "page" in overrides
        ? (overrides.page ?? 1)
        : "q" in overrides ||
            "pageSize" in overrides ||
            "chile" in overrides ||
            "platform" in overrides ||
            "regionId" in overrides ||
            "tag" in overrides ||
            "imported" in overrides
          ? 1
          : query.page,
  };

  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.chile !== "all") params.set("chile", next.chile);
  if (next.platform) params.set("platform", next.platform);
  if (next.regionId != null) params.set("regionId", String(next.regionId));
  if (next.tag) params.set("tag", next.tag);
  if (next.imported !== "all") params.set("imported", next.imported);

  const qs = params.toString();
  return qs ? `/admin/kinguin?${qs}` : "/admin/kinguin";
}

export function kinguinSearchHasCriteria(query: KinguinSearchQuery): boolean {
  const q = query.q?.trim() ?? "";
  return (
    q.length > 0 ||
    Boolean(query.platform) ||
    query.regionId != null ||
    Boolean(query.tag)
  );
}
