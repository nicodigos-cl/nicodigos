"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveWebPushAction,
  cancelScheduledWebPushAction,
  deleteWebPushDraftAction,
  duplicateWebPushAction,
  sendWebPushNowAction,
} from "@/lib/actions/admin-web-push";

export function WebPushActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: Promise<{
      success: boolean;
      message?: string;
      data?: { id?: string };
    }>,
    success: string,
    navigate = false,
  ) {
    startTransition(async () => {
      const result = await action;
      if (!result.success) {
        toast.error(result.message ?? "No se pudo completar la acción.");
        return;
      }
      toast.success(success);
      if (navigate && result.data?.id) {
        router.push(`/admin/communications/web-push/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {["SCHEDULED", "QUEUED"].includes(status) ? (
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() => {
            void (async () => {
              const confirmed = await confirmDialog.warning({
                title: "Cancelar programación",
                description:
                  "¿Cancelar esta programación? La acción se registrará en auditoría.",
                confirmLabel: "Cancelar programación",
              });
              if (!confirmed) return;
              run(
                cancelScheduledWebPushAction({ notificationId: id }),
                "Programación cancelada",
              );
            })();
          }}
        >
          Cancelar programación
        </Button>
      ) : null}
      {status === "DRAFT" ? (
        <>
          <Button
            disabled={pending}
            onClick={() => {
              void (async () => {
                const confirmed = await confirmDialog.confirm({
                  title: "Enviar ahora",
                  description:
                    "Confirma el envío inmediato. La audiencia se volverá a resolver en servidor.",
                  confirmLabel: "Enviar ahora",
                });
                if (!confirmed) return;
                run(
                  sendWebPushNowAction({
                    notificationId: id,
                    idempotencyKey: crypto.randomUUID(),
                    confirmation: "ENVIAR",
                  }),
                  "Notificación en cola",
                );
              })();
            }}
          >
            Enviar ahora
          </Button>
          <Button
            variant="destructive"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const confirmed = await confirmDialog.danger({
                  title: "Eliminar borrador",
                  description: "¿Eliminar lógicamente este borrador?",
                  confirmLabel: "Eliminar",
                });
                if (!confirmed) return;
                run(
                  deleteWebPushDraftAction({ notificationId: id }),
                  "Borrador eliminado",
                );
              })();
            }}
          >
            Eliminar borrador
          </Button>
        </>
      ) : null}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(
            duplicateWebPushAction({ notificationId: id }),
            "Campaña duplicada",
            true,
          )
        }
      >
        Duplicar
      </Button>
      {["SENT", "PARTIALLY_SENT", "FAILED", "CANCELLED"].includes(status) ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(
              archiveWebPushAction({ notificationId: id }),
              "Notificación archivada",
            )
          }
        >
          Archivar
        </Button>
      ) : null}
    </div>
  );
}
