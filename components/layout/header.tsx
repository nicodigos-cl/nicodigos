"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiChevronDown, FiHeart, FiMenu } from "react-icons/fi";
import { IconLogout, IconUser } from "@tabler/icons-react";

import Logo from "@/components/logo";
import { CartPreviewSheet } from "@/components/store/cart-preview-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  mainNavItems,
  shopMenuItems,
  shopQuickActions,
  storeRoutes,
  type ShopMenuItem,
} from "@/lib/store/navigation";
import type { CartView } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { DashboardUserMenu, type DashboardUserMenuUser } from "@/components/dashboard/dashboard-user-menu";
import { getUserInitials } from "@/lib/dashboard/format";
import { signOut } from "@/lib/auth-client";

function ShopMenuLink({ item }: { item: ShopMenuItem }) {
  const Icon = item.icon;
  return (
    <NavigationMenuLink asChild>
      <Link
        href={item.href}
        className="group flex w-full gap-3 rounded-xl p-3 transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-background group-hover:text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            {item.name}
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
            {item.description}
          </span>
        </span>
      </Link>
    </NavigationMenuLink>
  );
}

function MobileNavLink({
  href,
  children,
  className,
  onNavigate,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function StoreHeaderIcons({
  cart,
  cartCount,
  wishlistCount,
  isAuthenticated,
}: {
  cart: CartView | null;
  cartCount: number;
  wishlistCount: number;
  isAuthenticated: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" className="relative shrink-0" asChild>
        <Link href={storeRoutes.wishlist} aria-label="Lista de deseos">
          <FiHeart className="size-5" aria-hidden />
          {wishlistCount > 0 ? (
            <Badge className="absolute -top-1 -right-1 size-5 justify-center rounded-full px-0 text-[10px]">
              {wishlistCount > 9 ? "9+" : wishlistCount}
            </Badge>
          ) : null}
        </Link>
      </Button>
      <CartPreviewSheet
        cart={cart}
        cartCount={cartCount}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}

export type MarketplaceHeaderProps = {
  cart?: CartView | null;
  cartCount?: number;
  wishlistCount?: number;
  isAuthenticated?: boolean;
  user?: DashboardUserMenuUser | null;
};

export function MarketplaceHeader({
  cart = null,
  cartCount = 0,
  wishlistCount = 0,
  isAuthenticated = false,
  user = null,
}: MarketplaceHeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      closeMobile();
      router.push("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 shadow-sm backdrop-blur supports-backdrop-filter:bg-background/80">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8"
      >
        <div className="flex shrink-0 items-center lg:flex-1">
          <Logo href={storeRoutes.home} size="md" priority format="auto" />
        </div>

        <div className="hidden flex-1 items-center justify-center lg:flex">
          <NavigationMenu>
            <NavigationMenuList className="gap-1">
              <NavigationMenuItem>
                <NavigationMenuTrigger className="shrink-0 whitespace-nowrap bg-transparent text-foreground">
                  Comprar
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[min(100vw-2rem,20rem)] p-2">
                    <ul className="grid gap-0.5">
                      {shopMenuItems.map((item) => (
                        <li key={item.name}>
                          <ShopMenuLink item={item} />
                        </li>
                      ))}
                    </ul>
                    <Separator className="my-2" />
                    <div className="grid grid-cols-2 gap-1">
                      {shopQuickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <NavigationMenuLink key={action.name} asChild>
                            <Link
                              href={action.href}
                              className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-muted/60 px-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                            >
                              <Icon
                                className="size-4 shrink-0 text-muted-foreground"
                                aria-hidden
                              />
                              {action.name}
                            </Link>
                          </NavigationMenuLink>
                        );
                      })}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {mainNavItems.map((item) => (
                <NavigationMenuItem key={item.name}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.href}
                      className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-2xl px-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                    >
                      {item.name}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="hidden items-center gap-3 lg:flex lg:flex-1 lg:justify-end">
          <StoreHeaderIcons
            cart={cart}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            isAuthenticated={isAuthenticated}
          />
          {isAuthenticated && user ? (
            <DashboardUserMenu user={user} />
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href={storeRoutes.signIn}>Iniciar sesión</Link>
              </Button>
              <Button asChild>
                <Link href={storeRoutes.signUp}>Crear cuenta</Link>
              </Button>
            </>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <StoreHeaderIcons
            cart={cart}
            cartCount={cartCount}
            wishlistCount={wishlistCount}
            isAuthenticated={isAuthenticated}
          />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                aria-label="Abrir menú de navegación"
              >
                <FiMenu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-full max-w-[min(100vw,20rem)] flex-col gap-0 overflow-x-hidden border-border p-0 sm:max-w-xs"
            >
              <SheetHeader className="border-b border-border px-4 py-3 text-left">
                <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
                <div className="flex items-center justify-between pr-10">
                  <Link
                    href={storeRoutes.home}
                    onClick={closeMobile}
                    className="inline-flex shrink-0"
                  >
                    <Logo size="md" format="auto" />
                  </Link>
                </div>
              </SheetHeader>

              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-3 py-3">
                <div className="space-y-0.5">
                  <Collapsible>
                    <CollapsibleTrigger className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-[15px] font-semibold text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&[data-state=open]>svg]:rotate-180">
                      Comprar
                      <FiChevronDown
                        className="size-4 shrink-0 text-muted-foreground transition-transform duration-200"
                        aria-hidden
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-0.5 pb-1 pl-1">
                      {shopMenuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <MobileNavLink
                            key={item.name}
                            href={item.href}
                            onNavigate={closeMobile}
                            className="gap-3 py-2.5 pl-3"
                          >
                            <Icon
                              className="size-4 shrink-0 text-primary"
                              aria-hidden
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold">
                                {item.name}
                              </span>
                              <span className="block text-xs font-normal text-muted-foreground">
                                {item.description}
                              </span>
                            </span>
                          </MobileNavLink>
                        );
                      })}
                      {shopQuickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <MobileNavLink
                            key={action.name}
                            href={action.href}
                            onNavigate={closeMobile}
                            className="gap-2 pl-3"
                          >
                            <Icon
                              className="size-4 text-muted-foreground"
                              aria-hidden
                            />
                            {action.name}
                          </MobileNavLink>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>

                  {mainNavItems.map((item) => (
                    <MobileNavLink
                      key={item.name}
                      href={item.href}
                      onNavigate={closeMobile}
                    >
                      {item.name}
                    </MobileNavLink>
                  ))}
                </div>

                <Separator className="my-3" />

                <div className="space-y-2 pb-4">
                  {isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/10">
                        <Avatar size="default">
                          {user.image ? (
                            <AvatarImage src={user.image} alt={user.name} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {getUserInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <Button className="h-10 w-full rounded-xl gap-2" asChild>
                          <Link href="/dashboard" onClick={closeMobile}>
                            <IconUser className="size-4" />
                            Mi cuenta
                          </Link>
                        </Button>
                        <Button variant="outline" className="h-10 w-full rounded-xl gap-2" asChild>
                          <Link href={storeRoutes.support} onClick={closeMobile}>
                            Soporte
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="h-10 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                          disabled={signingOut}
                          onClick={handleSignOut}
                        >
                          <IconLogout className="size-4" />
                          {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button className="h-11 w-full rounded-xl" asChild>
                        <Link href={storeRoutes.signUp} onClick={closeMobile}>
                          Crear cuenta
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 w-full rounded-xl"
                        asChild
                      >
                        <Link href={storeRoutes.support} onClick={closeMobile}>
                          Soporte
                        </Link>
                      </Button>
                      <Button variant="ghost" className="h-10 w-full" asChild>
                        <Link href={storeRoutes.signIn} onClick={closeMobile}>
                          Iniciar sesión
                        </Link>
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}

export default MarketplaceHeader;
