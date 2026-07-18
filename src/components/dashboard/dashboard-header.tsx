import Link from "next/link";

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
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Hola, {displayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Revisa tus pedidos, entregas y servicios desde aquí.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button render={<Link href="/cart" />} nativeButton={false}>
          Seguir comprando
        </Button>
        {hasProblems ? (
          <Button
            variant="outline"
            render={<Link href="/dashboard/support" />}
            nativeButton={false}
          >
            Ir a soporte
          </Button>
        ) : null}
      </div>
    </header>
  );
}
