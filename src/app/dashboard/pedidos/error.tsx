"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type CustomerPedidosErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomerPedidosError({
  error,
  reset,
}: CustomerPedidosErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar tus pedidos. Intenta nuevamente.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
