/** Canonical app paths (English URL slugs). */
export const routes = {
  dashboard: "/dashboard",
  dashboardOrders: "/dashboard/orders",
  dashboardKeys: "/dashboard/keys",
  dashboardSettings: "/dashboard/settings",
  admin: "/admin",
  adminProducts: "/admin/products",
  adminProductsNew: "/admin/products/new",
  adminCategories: "/admin/categories",
  adminCategoriesNew: "/admin/categories/new",
  adminOrders: "/admin/orders",
  adminTransactions: "/admin/transactions",
} as const;

/** Legacy Spanish paths → canonical English paths. */
export const legacyPathRedirects: Record<string, string> = {
  "/catalogo": "/catalog",
  "/carrito": "/cart",
  "/lista-deseos": "/wishlist",
  "/checkout/retorno": "/checkout/return",
  "/legal/terminos": "/legal/terms",
  "/legal/privacidad": "/legal/privacy",
  "/dashboard/configuracion": routes.dashboardSettings,
  "/dashboard/pedidos": routes.dashboardOrders,
  "/dashboard/claves": routes.dashboardKeys,
  "/admin/productos": routes.adminProducts,
  "/admin/productos/nuevo": routes.adminProductsNew,
};

export function normalizeAppPath(path: string): string {
  return legacyPathRedirects[path] ?? path;
}
