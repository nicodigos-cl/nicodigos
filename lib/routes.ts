/** Canonical app paths (English URL slugs). */
export const routes = {
  dashboard: "/dashboard",
  dashboardOrders: "/dashboard/orders",
  dashboardKeys: "/dashboard/keys",
  dashboardSettings: "/dashboard/settings",
  admin: "/admin",
  adminProducts: "/admin/products",
  adminProductsNew: "/admin/products/new",
} as const;

/** Legacy Spanish paths → canonical English paths. */
export const legacyPathRedirects: Record<string, string> = {
  "/dashboard/configuracion": routes.dashboardSettings,
  "/dashboard/pedidos": routes.dashboardOrders,
  "/dashboard/claves": routes.dashboardKeys,
  "/admin/productos": routes.adminProducts,
  "/admin/productos/nuevo": routes.adminProductsNew,
};

export function normalizeAppPath(path: string): string {
  return legacyPathRedirects[path] ?? path;
}
