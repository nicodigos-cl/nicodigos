"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { resendDeliveryEmailAction } from "@/lib/actions/customer-dashboard";

export function ResendDeliveryEmailButton({
  deliveryId,
}: {
  deliveryId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          void (async () => {
            const result = await resendDeliveryEmailAction({ deliveryId });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Email reenviado");
          })();
        });
      }}
    >
      {pending ? "Enviando…" : "Reenviar email"}
    </Button>
  );
}
