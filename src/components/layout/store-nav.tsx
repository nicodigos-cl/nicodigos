"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineChevronDown,
  HiOutlineLogout,
  HiOutlineMenu,
  HiOutlineShoppingCart,
  HiOutlineUser,
} from "react-icons/hi";

import { Logo } from "@/components/logo";
import { StoreCartDrawer } from "@/components/store/store-cart-drawer";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
} from "@/components/ui/menubar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCartItemsCount } from "@/hooks/use-cart";
import { useStoreNavCategories } from "@/hooks/use-categories";
import { signOut, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { StoreNavCategoryDto } from "@/types/categories";

const staticPages = [
  { name: "Ofertas", href: "/?filtro=ofertas" },
  { name: "Soporte", href: "/dashboard/support" },
] as const;

/** Max root categories shown inline in the desktop header before "Más". */
const HEADER_CATEGORY_LIMIT = 5;

function CategoryMenuItems({ category }: { category: StoreNavCategoryDto }) {
  return (
    <>
      <MenubarItem render={<Link href={category.href} />}>Ver todo</MenubarItem>
      {category.children.length > 0 ? (
        <>
          <MenubarSeparator />
          <div className="px-3 py-2 text-xs uppercase text-muted-foreground">
            Subcategorías
          </div>
          {category.children.map((child) => (
            <MenubarItem key={child.id} render={<Link href={child.href} />}>
              {child.name}
            </MenubarItem>
          ))}
        </>
      ) : null}
    </>
  );
}

function UserAccountMenu({
  isPending,
  isAuthenticated,
  user,
  onSignOut,
}: {
  isPending: boolean;
  isAuthenticated: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  onSignOut: () => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch: session isPending differs between SSR and client.
  const disableTrigger = mounted && isPending;

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-xl h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
          aria-label="Menú de cuenta"
          disabled={disableTrigger}
          onClick={() => setOpen(true)}
        >
          <HiOutlineUser className="size-5 text-sidebar-foreground" />
        </Button>
        <Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
          <DrawerContent className="max-h-[85dvh] p-0">
            <DrawerHeader className="text-left border-b border-border/40 p-6 pb-4">
              <DrawerTitle className="text-lg font-bold">Mi cuenta</DrawerTitle>
              {isAuthenticated && user?.email ? (
                <DrawerDescription className="text-xs truncate text-muted-foreground mt-1">
                  Conectado como{" "}
                  <span className="font-semibold text-foreground">
                    {user.name || user.email}
                  </span>
                </DrawerDescription>
              ) : (
                <DrawerDescription className="text-xs text-muted-foreground mt-1">
                  Inicia sesión para gestionar tus pedidos y perfil.
                </DrawerDescription>
              )}
            </DrawerHeader>

            <div className="px-6 py-4 flex flex-col gap-2">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                  >
                    Panel
                  </Link>
                  <Link
                    href="/dashboard/pedidos"
                    onClick={() => setOpen(false)}
                    className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                  >
                    Pedidos
                  </Link>
                  <Link
                    href="/dashboard/profile"
                    onClick={() => setOpen(false)}
                    className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                  >
                    Perfil
                  </Link>
                  <Link
                    href="/dashboard/support"
                    onClick={() => setOpen(false)}
                    className="flex items-center w-full rounded-xl px-4 py-3 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                  >
                    Soporte
                  </Link>
                  <div className="border-t border-border/40 my-2" />
                  <button
                    onClick={() => {
                      setOpen(false);
                      onSignOut();
                    }}
                    className="flex items-center gap-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition-colors text-left cursor-pointer"
                  >
                    <HiOutlineLogout className="size-4 shrink-0" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-3 py-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl bg-sidebar-primary py-3 text-sm font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/auth/register"
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center justify-center rounded-xl border border-sidebar-border bg-transparent py-3 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                  >
                    Crear cuenta
                  </Link>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
            aria-label="Menú de cuenta"
            disabled={disableTrigger}
          />
        }
      >
        <HiOutlineUser className="size-5 text-sidebar-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 rounded-xl shadow-lg border border-border bg-popover text-popover-foreground"
      >
        {isAuthenticated ? (
          <>
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name || "Cuenta"}
              </p>
              {user?.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              ) : null}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard" />}>
              Panel
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/pedidos" />}>
              Pedidos
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/profile" />}>
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/dashboard/support" />}>
              Soporte
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut}>
              <HiOutlineLogout className="size-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem render={<Link href="/auth/login" />}>
              Iniciar sesión
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/auth/register" />}>
              Crear cuenta
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function StoreNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const router = useRouter();
  const { data: session, isPending: sessionPending } = useSession();
  const { data: categories = [], isPending: categoriesPending } =
    useStoreNavCategories();
  const { count: cartCount } = useCartItemsCount();

  const headerCategories = categories.slice(0, HEADER_CATEGORY_LIMIT);
  const overflowCategories = categories.slice(HEADER_CATEGORY_LIMIT);

  const isAuthenticated = Boolean(session?.user);
  const cartBadge = cartCount > 99 ? "99+" : String(cartCount);

  function handleSignOut() {
    void signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-sidebar-border bg-sidebar/95 backdrop-blur-md text-sidebar-foreground support-[backdrop-filter]:bg-sidebar/80">
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-full max-w-xs flex flex-col gap-0 border-sidebar-border bg-sidebar/98 backdrop-blur-md p-0 text-sidebar-foreground"
        >
          <SheetHeader className="border-b border-sidebar-border px-6 py-5">
            <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground text-lg font-bold">
              <Logo size="sm" href={false} />
              Menú de navegación
            </SheetTitle>
          </SheetHeader>

          <nav className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3">
                Categorías
              </p>
              {categoriesPending ? (
                <p className="px-3 text-sm text-muted-foreground">
                  Cargando categorías…
                </p>
              ) : categories.length === 0 ? (
                <p className="px-3 text-sm text-muted-foreground">
                  No hay categorías aún.
                </p>
              ) : (
                <Accordion multiple className="w-full space-y-1">
                  {categories.map((category) => (
                    <AccordionItem
                      key={category.id}
                      value={category.id}
                      className="border-0"
                    >
                      <AccordionTrigger className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 hover:no-underline data-[state=open]:bg-sidebar-accent">
                        {category.name}
                      </AccordionTrigger>
                      <AccordionContent className="px-1 pt-1 pb-2">
                        <div className="flex flex-col gap-1 pl-3 border-l border-sidebar-border/60">
                          <Link
                            href={category.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="rounded-lg px-3 py-2 text-xs font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                          >
                            Ver todo
                          </Link>
                          {category.children.map((child) => (
                            <Link
                              key={child.id}
                              href={child.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>

            <div className="space-y-2 pt-4 border-t border-sidebar-border/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-3">
                Navegación
              </p>
              <div className="flex flex-col gap-1">
                {staticPages.map((page) => (
                  <Link
                    key={page.name}
                    href={page.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
                  >
                    {page.name}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="mt-auto border-t border-sidebar-border/40 p-6 bg-sidebar-accent/10">
            {isAuthenticated ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-1 py-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-accent text-sidebar-foreground font-semibold text-sm">
                    {session?.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-sidebar-foreground">
                      {session?.user?.name || "Cuenta"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {session?.user?.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center rounded-lg bg-sidebar py-2 text-xs font-semibold border border-sidebar-border hover:bg-sidebar-accent transition-colors"
                  >
                    Mi Panel
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="flex items-center justify-center rounded-lg bg-destructive/10 text-destructive py-2 text-xs font-semibold hover:bg-destructive/20 transition-colors cursor-pointer"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl bg-sidebar-primary py-2.5 text-sm font-semibold text-sidebar-primary-foreground hover:bg-sidebar-primary/90 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center justify-center rounded-xl border border-sidebar-border bg-transparent py-2.5 text-sm font-medium hover:bg-sidebar-accent transition-colors"
                >
                  Crear cuenta
                </Link>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <nav
        aria-label="Cabecera de la tienda"
        className="w-full text-sidebar-foreground"
      >
        <div className="hidden h-9 bg-sidebar-accent/10 border-b border-sidebar-border/30 items-center justify-center px-4 lg:flex">
          <p className="text-center text-xs font-medium tracking-wide text-sidebar-foreground/70">
            Productos digitales · precios en CLP · entrega inmediata
          </p>
        </div>

        <div className="mx-auto grid grid-cols-3 items-center h-16 max-w-7xl px-4 sm:px-6 lg:flex lg:justify-between lg:px-8">
          <div className="flex items-center gap-2 justify-start">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:hidden rounded-xl h-10 w-10 shrink-0"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú"
            >
              <HiOutlineMenu className="size-5 text-sidebar-foreground" />
            </Button>

            <div className="hidden lg:block">
              <Logo size="md" href="/" priority />
            </div>
          </div>

          <div className="flex items-center justify-center lg:hidden">
            <Logo size="sm" href="/" priority />
          </div>

          <div className="hidden h-full min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden lg:flex">
            <Menubar className="h-full max-w-full space-x-1 border-0 bg-transparent p-0 shadow-none">
              {categoriesPending
                ? null
                : headerCategories.map((category) => (
                    <MenubarMenu key={category.id}>
                      <MenubarTrigger
                        className={cn(
                          "inline-flex max-w-[9.5rem] items-center gap-1 rounded-xl px-3.5 py-1.5 text-sm font-medium text-sidebar-foreground/80 cursor-pointer transition-all duration-200",
                          "hover:text-sidebar-foreground hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground",
                        )}
                      >
                        <span className="truncate">{category.name}</span>
                        {category.children.length > 0 ? (
                          <HiOutlineChevronDown className="ml-0.5 size-3.5 shrink-0 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        ) : null}
                      </MenubarTrigger>
                      <MenubarContent className="min-w-[220px] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                        <CategoryMenuItems category={category} />
                      </MenubarContent>
                    </MenubarMenu>
                  ))}
              {!categoriesPending && overflowCategories.length > 0 ? (
                <MenubarMenu>
                  <MenubarTrigger
                    className={cn(
                      "inline-flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-sm font-medium text-sidebar-foreground/80 cursor-pointer transition-all duration-200",
                      "hover:text-sidebar-foreground hover:bg-sidebar-accent/50 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-foreground",
                    )}
                  >
                    Más
                    <HiOutlineChevronDown className="ml-0.5 size-3.5 shrink-0 opacity-60" />
                  </MenubarTrigger>
                  <MenubarContent className="min-w-[220px] rounded-xl border border-border bg-popover text-popover-foreground shadow-lg">
                    {overflowCategories.map((category) => (
                      <MenubarItem
                        key={category.id}
                        render={<Link href={category.href} />}
                      >
                        {category.name}
                      </MenubarItem>
                    ))}
                  </MenubarContent>
                </MenubarMenu>
              ) : null}
            </Menubar>
            {staticPages.map((page) => (
              <Link
                key={page.name}
                href={page.href}
                className="shrink-0 rounded-xl px-3.5 py-1.5 text-sm font-medium text-sidebar-foreground/80 transition-all duration-200 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                {page.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 justify-end">
            <ThemeToggle />

            <UserAccountMenu
              isPending={sessionPending}
              isAuthenticated={isAuthenticated}
              user={session?.user}
              onSignOut={handleSignOut}
            />

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="relative rounded-xl h-10 w-10 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200"
              aria-label="Abrir carrito"
              onClick={() => setCartOpen(true)}
            >
              <HiOutlineShoppingCart className="size-5 text-sidebar-foreground" />
              <span className="sr-only">{cartCount} ítems en el carrito</span>
              {cartCount > 0 ? (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1 text-[9px] font-bold tabular-nums text-sidebar-primary-foreground shadow-sm ring-2 ring-sidebar animate-in zoom-in-50 duration-200">
                  {cartBadge}
                </span>
              ) : null}
            </Button>
          </div>
        </div>
      </nav>

      <StoreCartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
