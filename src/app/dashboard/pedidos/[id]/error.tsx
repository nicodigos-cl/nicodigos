"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { CUSTOMER_ORDERS_PATH } from "@/lib/customer-dashboard/paths";

type CustomerPedidoDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomerPedidoDetailError({
  error,
  reset,
}: CustomerPedidoDetailErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar este pedido. Intenta nuevamente.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button type="button" onClick={reset}>
          Reintentar
        </Button>
        <Button
          variant="outline"
          render={<Link href={CUSTOMER_ORDERS_PATH} />}
          nativeButton={false}
        >
          Volver a mis pedidos
        </Button>
      </div>
    </div>
  );
}
