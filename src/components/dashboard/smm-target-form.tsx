"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitSmmTargetAction } from "@/lib/actions/customer-dashboard";

export function SmmTargetForm({ deliveryId }: { deliveryId: string }) {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-xl border border-border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => {
          void (async () => {
            const result = await submitSmmTargetAction({ deliveryId, link });
            if (!result.success) {
              toast.error(result.message);
              return;
            }
            toast.success("Destino guardado");
            router.refresh();
          })();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="smm-link">Enlace de destino</Label>
        <Input
          id="smm-link"
          type="url"
          required
          placeholder="https://..."
          value={link}
          onChange={(event) => setLink(event.target.value)}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Usa el enlace completo de la publicación o perfil que debemos
          procesar.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Enviar destino"}
      </Button>
    </form>
  );
}
