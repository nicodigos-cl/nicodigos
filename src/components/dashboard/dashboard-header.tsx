import Link from "next/link";
import { HiOutlineShoppingCart, HiOutlineSupport } from "react-icons/hi";

import { Button } from "@/components/ui/button";

export function DashboardHeader({
  name,
  hasProblems,
}: {
  name: string | null;
  hasProblems: boolean;
}) {
  const displayName = name?.trim() || "bienvenido";

  return (
    <header className="flex flex-col gap-5 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Hola, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa tus pedidos, entregas y servicios de forma rápida y sencilla.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button
          render={<Link href="/cart" />}
          nativeButton={false}
          className="gap-2 font-medium"
        >
          <HiOutlineShoppingCart className="size-4" />
          <span>Seguir comprando</span>
        </Button>
        {hasProblems ? (
          <Button
            variant="outline"
            render={<Link href="/dashboard/support" />}
            nativeButton={false}
            className="gap-2 font-medium border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <HiOutlineSupport className="size-4" />
            <span>Ir a soporte</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}
