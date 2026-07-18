"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  HiOutlineBell,
  HiOutlineQuestionMarkCircle,
  HiOutlineSearch,
} from "react-icons/hi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminHeaderProps = {
  title?: string;
};

type SearchTarget = {
  listPath: string;
  placeholder: string;
  ariaLabel: string;
};

function resolveSearchTarget(pathname: string): SearchTarget {
  if (pathname === "/admin/services" || pathname.startsWith("/admin/services/")) {
    return {
      listPath: "/admin/services",
      placeholder: "Buscar servicios...",
      ariaLabel: "Buscar servicios",
    };
  }

  if (pathname === "/admin/kinguin" || pathname.startsWith("/admin/kinguin/")) {
    return {
      listPath: "/admin/kinguin",
      placeholder: "Buscar en Kinguin...",
      ariaLabel: "Buscar en Kinguin",
    };
  }

  if (
    pathname === "/admin/deliveries" ||
    pathname.startsWith("/admin/deliveries/")
  ) {
    return {
      listPath: "/admin/deliveries",
      placeholder: "Buscar entregas...",
      ariaLabel: "Buscar entregas",
    };
  }

  if (
    pathname === "/admin/users" ||
    pathname.startsWith("/admin/users/")
  ) {
    return {
      listPath: "/admin/users",
      placeholder: "Buscar usuarios...",
      ariaLabel: "Buscar usuarios",
    };
  }

  if (pathname === "/admin/orders" || pathname.startsWith("/admin/orders/")) {
    return {
      listPath: "/admin/orders",
      placeholder: "Buscar órdenes...",
      ariaLabel: "Buscar órdenes",
    };
  }

  return {
    listPath: "/admin/products",
    placeholder:
      pathname === "/admin/products" || pathname === "/admin/products/"
        ? "Buscar productos..."
        : "Buscar en productos...",
    ariaLabel: "Buscar productos",
  };
}

function AdminSearchInput({
  initialQuery,
  isOnList,
  target,
}: {
  initialQuery: string;
  isOnList: boolean;
  target: SearchTarget;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(initialQuery);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isOnList) {
      const params = new URLSearchParams();
      if (searchValue.trim()) {
        params.set("q", searchValue.trim());
      }
      startTransition(() => {
        router.push(
          params.size > 0
            ? `${target.listPath}?${params.toString()}`
            : target.listPath,
        );
      });
      return;
    }

    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = searchValue.trim();

    if (nextQuery) {
      params.set("q", nextQuery);
    } else {
      params.delete("q");
    }
    params.delete("page");

    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${target.listPath}?${qs}` : target.listPath);
    });
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="relative min-w-0 flex-1 max-w-xs sm:max-w-md"
      role="search"
    >
      <span className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-primary font-mono text-sm select-none font-bold">
        $
      </span>
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder={target.placeholder}
        className={cn(
          "h-9 pl-8 font-mono text-xs border-border/80 bg-muted/20 focus-visible:ring-1 focus-visible:ring-primary rounded-sm shadow-inner",
          isPending && "opacity-80"
        )}
        aria-label={target.ariaLabel}
      />
    </form>
  );
}

export function AdminHeader({ title = "Administración" }: AdminHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const target = resolveSearchTarget(pathname);
  const isOnList =
    pathname === target.listPath || pathname === `${target.listPath}/`;
  const urlQuery = searchParams.get("q") ?? "";

  const userName = session?.user?.name ?? "Admin";
  const userImage = session?.user?.image ?? undefined;
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-md md:px-6">
      <SidebarTrigger className="-ml-1 rounded-sm border border-border/40 hover:bg-muted/50" />

      <AdminSearchInput
        key={`${pathname}:${urlQuery}`}
        initialQuery={isOnList ? urlQuery : ""}
        isOnList={isOnList}
        target={target}
      />

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <span className="hidden text-xs font-mono tracking-wider text-muted-foreground uppercase lg:inline border-l border-border/60 pl-3">
          {title}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Ayuda"
          className="rounded-sm border border-border/40 hover:bg-muted/50"
        >
          <HiOutlineQuestionMarkCircle className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Notificaciones"
          className="rounded-sm border border-border/40 hover:bg-muted/50"
        >
          <HiOutlineBell className="size-4" />
        </Button>
        <Avatar size="sm" className="ml-1 rounded-sm border border-border/60">
          {userImage ? <AvatarImage src={userImage} alt={userName} className="rounded-sm" /> : null}
          <AvatarFallback className="rounded-sm font-mono text-xs">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
