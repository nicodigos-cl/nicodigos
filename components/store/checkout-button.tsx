"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startFlowCheckoutAction } from "@/lib/store/checkout/actions";

type CheckoutButtonProps = {
  disabled?: boolean;
  className?: string;
  onStarted?: () => void;
};

export function CheckoutButton({
  disabled = false,
  className,
  onStarted,
}: CheckoutButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleCheckout() {
    startTransition(async () => {
      const result = await startFlowCheckoutAction();

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      onStarted?.();
      window.location.href = result.data!.redirectUrl;
    });
  }

  return (
    <Button
      type="button"
      className={className}
      disabled={disabled || isPending}
      onClick={handleCheckout}
    >
      {isPending ? "Redirigiendo a Flow…" : "Finalizar compra"}
    </Button>
  );
}
