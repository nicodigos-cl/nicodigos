"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  testFlowConnectionAction,
  testResendConnectionAction,
  testSmmProviderAction,
} from "@/lib/actions/admin-settings";

type TestConnectionKind = "flow" | "resend" | "smm";

const DEFAULT_LABELS: Record<TestConnectionKind, string> = {
  flow: "Probar conexión Flow",
  resend: "Probar conexión Resend",
  smm: "Probar proveedor",
};

export function TestConnectionButton({
  kind,
  providerId,
  label,
}: {
  kind: TestConnectionKind;
  providerId?: string;
  label?: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(() => {
      void (async () => {
        if (kind === "flow") {
          const result = await testFlowConnectionAction();
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(
            `Conexión Flow OK (${result.data.latencyMs} ms, ${result.data.environment})`,
          );
          return;
        }

        if (kind === "resend") {
          const result = await testResendConnectionAction();
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success(`Conexión Resend OK (${result.data.latencyMs} ms)`);
          return;
        }

        if (!providerId) {
          toast.error("Selecciona un proveedor para probar la conexión.");
          return;
        }

        const result = await testSmmProviderAction({ providerId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        const extras: string[] = [`${result.data.latencyMs} ms`];
        if (result.data.balance) extras.push(`saldo ${result.data.balance}`);
        if (result.data.services !== undefined) {
          extras.push(`${result.data.services} servicios`);
        }
        toast.success(`Conexión SMM OK (${extras.join(", ")})`);
      })();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending || (kind === "smm" && !providerId)}
      onClick={handleClick}
      className="rounded-sm font-mono text-xs border border-border/60 hover:bg-muted/50"
    >
      {pending ? "RUNNING…" : (label ?? DEFAULT_LABELS[kind]).toUpperCase()}
    </Button>
  );
}
