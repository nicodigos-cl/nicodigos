"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  buyOrderAgainAction,
  retryOrderPaymentAction,
} from "@/lib/actions/customer-orders";
import type { CustomerOrderAction } from "@/lib/customer-dashboard/types";
import { cn } from "@/lib/utils";

export function OrderPrimaryActionButton({
  action,
  className,
  size = "default",
  variant = "default",
}: {
  action: CustomerOrderAction;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon" | "xs" | "icon-xs" | "icon-sm" | "icon-lg";
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (action.type === "BUY_AGAIN") {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(className)}
        disabled={pending}
        onClick={() => {
          startTransition(() => {
            void (async () => {
              const result = await buyOrderAgainAction({
                orderId: action.orderId,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success(
                result.data.added === 0
                  ? "Ningún producto disponible para volver a comprar"
                  : `${result.data.added} producto(s) agregados al carrito`,
              );
              if (result.data.added > 0) {
                router.push("/cart");
              }
            })();
          });
        }}
      >
        {pending ? "Agregando…" : action.label}
      </Button>
    );
  }

  if (action.type === "RETRY_PAYMENT") {
    return (
      <Button
        type="button"
        size={size}
        variant={variant}
        className={cn(className)}
        disabled={pending}
        aria-live="polite"
        onClick={() => {
          startTransition(() => {
            void (async () => {
              const result = await retryOrderPaymentAction({
                orderId: action.orderId,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              window.location.href = result.data.redirectUrl;
            })();
          });
        }}
      >
        {pending ? "Preparando pago…" : action.label}
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={cn(className)}
      render={<Link href={action.href} />}
      nativeButton={false}
    >
      {action.label}
    </Button>
  );
}
