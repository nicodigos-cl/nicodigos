import type { IconType } from "react-icons";
import { FiGrid, FiZap } from "react-icons/fi";
import { LuFolderOpen, LuTags } from "react-icons/lu";

/** Rutas de tienda (páginas públicas previstas o existentes). */
export const storeRoutes = {
  home: "/",
  catalog: "/catalogo",
  categories: "/categorias",
  offers: "/ofertas",
  howItWorks: "/como-funciona",
  support: "/soporte",
  signIn: "/auth/sign-in",
  signUp: "/auth/sign-up",
  cart: "/carrito",
  wishlist: "/lista-deseos",
  orders: "/dashboard/orders",
  keys: "/dashboard/keys",
  product: (slug: string) => `/catalogo/${slug}` as const,
  category: (slug: string) => `/categorias/${slug}` as const,
} as const;

export type StoreNavItem = {
  name: string;
  href: string;
};

export type ShopMenuItem = StoreNavItem & {
  description: string;
  icon: IconType;
};

export const shopMenuItems: ShopMenuItem[] = [
  {
    name: "Catálogo",
    description: "Todos los keys, licencias y gift cards disponibles.",
    href: storeRoutes.catalog,
    icon: FiGrid,
  },
  {
    name: "Categorías",
    description: "Navega por tipo de producto digital.",
    href: storeRoutes.categories,
    icon: LuFolderOpen,
  },
  {
    name: "Ofertas",
    description: "Promociones y precios destacados en Chile.",
    href: storeRoutes.offers,
    icon: LuTags,
  },
];

export type ShopQuickAction = StoreNavItem & {
  icon: IconType;
};

export const shopQuickActions: ShopQuickAction[] = [
  { name: "Ver catálogo", href: storeRoutes.catalog, icon: FiGrid },
  { name: "Ofertas de hoy", href: storeRoutes.offers, icon: FiZap },
];

/** Enlaces principales visibles junto al menú Comprar (cortos, sin duplicar el dropdown). */
export const mainNavItems: StoreNavItem[] = [
  { name: "Ofertas", href: storeRoutes.offers },
  { name: "Ayuda", href: storeRoutes.howItWorks },
];

export const footerShopLinks: StoreNavItem[] = [
  { name: "Catálogo", href: storeRoutes.catalog },
  { name: "Categorías", href: storeRoutes.categories },
  { name: "Ofertas", href: storeRoutes.offers },
];

export const footerHelpLinks: StoreNavItem[] = [
  { name: "Cómo funciona", href: storeRoutes.howItWorks },
  { name: "Soporte", href: storeRoutes.support },
];

export const footerAccountLinks: StoreNavItem[] = [
  { name: "Crear cuenta", href: storeRoutes.signUp },
  { name: "Iniciar sesión", href: storeRoutes.signIn },
  { name: "Carrito", href: storeRoutes.cart },
  { name: "Lista de deseos", href: storeRoutes.wishlist },
  { name: "Mis pedidos", href: storeRoutes.orders },
];

export const footerLegalLinks: StoreNavItem[] = [
  { name: "Términos", href: "/legal/terminos" },
  { name: "Privacidad", href: "/legal/privacidad" },
];
