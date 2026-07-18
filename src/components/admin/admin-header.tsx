"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { HiOutlineBell, HiOutlineQuestionMarkCircle, HiOutlineSearch } from "react-icons/hi";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type AdminHeaderProps = {
  title?: string;
};

function ProductsSearchInput({
  initialQuery,
  isProductsList,
}: {
  initialQuery: string;
  isProductsList: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(initialQuery);

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isProductsList) {
      const params = new URLSearchParams();
      if (searchValue.trim()) {
        params.set("q", searchValue.trim());
      }
      startTransition(() => {
        router.push(
          params.size > 0
            ? `/admin/products?${params.toString()}`
            : "/admin/products",
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
      router.push(`/admin/products?${params.toString()}`);
    });
  }

  return (
    <form
      onSubmit={handleSearchSubmit}
      className="relative min-w-0 flex-1 max-w-md"
      role="search"
    >
      <HiOutlineSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder={
          isProductsList ? "Buscar productos..." : "Buscar en productos..."
        }
        className={cn("h-9 pl-9", isPending && "opacity-80")}
        aria-label="Buscar productos"
      />
    </form>
  );
}

export function AdminHeader({ title = "Administración" }: AdminHeaderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const isProductsList =
    pathname === "/admin/products" || pathname === "/admin/products/";
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
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:px-6">
      <SidebarTrigger className="-ml-1" />

      <ProductsSearchInput
        key={`${pathname}:${urlQuery}`}
        initialQuery={urlQuery}
        isProductsList={isProductsList}
      />

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <span className="hidden text-sm font-medium text-muted-foreground lg:inline">
          {title}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Ayuda"
        >
          <HiOutlineQuestionMarkCircle className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Notificaciones"
        >
          <HiOutlineBell className="size-4" />
        </Button>
        <Avatar size="sm" className="ml-1">
          {userImage ? <AvatarImage src={userImage} alt={userName} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
