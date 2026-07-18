"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cancelDeliveryAction,
  fulfillKinguinDeliveryAction,
  markDeliveryDeliveredManualAction,
  markDeliveryFailedAction,
  markDeliveryProcessingAction,
  refillSmmDeliveryAction,
  reopenDeliveryAction,
  resendDeliveryEmailAction,
  sendSmmDeliveryAction,
  syncKinguinDeliveryAction,
  syncSmmDeliveryAction,
} from "@/lib/actions/deliveries";
import type { DeliveryAdminAction } from "@/lib/deliveries/status";
import type { DeliveryDetailDto } from "@/types/deliveries";

const actionLabel: Partial<Record<DeliveryAdminAction, string>> = {
  mark_processing: "Marcar como procesando",
  mark_failed: "Marcar como fallida",
  cancel: "Cancelar entrega",
  reopen: "Reabrir entrega",
  resend_email: "Reenviar email",
  smm_send: "Enviar al panel SMM",
  smm_sync: "Sincronizar SMM",
  smm_retry: "Reintentar envío SMM",
  smm_refill: "Solicitar refill",
  smm_complete_manual: "Completar SMM manualmente",
  kinguin_fulfill: "Solicitar fulfillment Kinguin",
  kinguin_sync: "Sincronizar Kinguin",
  kinguin_retry: "Reintentar Kinguin",
  kinguin_import_keys: "Importar keys Kinguin",
  kinguin_complete_manual: "Completar Kinguin manualmente",
};

type ConfirmKind =
  | "fail"
  | "cancel"
  | "smm_send"
  | "kinguin_fulfill"
  | "complete_manual"
  | null;

export function DeliveryActionMenu({
  delivery,
}: {
  delivery: DeliveryDetailDto;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmKind>(null);
  const actions = new Set(delivery.allowedActions);

  function run(
    label: string,
    fn: () => Promise<{ success: boolean; message?: string }>,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await fn();
        if (!result.success) {
          toast.error(result.message ?? "No se pudo completar la acción");
          return;
        }
        toast.success(label);
        setConfirm(null);
        router.refresh();
      })();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              aria-label="Acciones administrativas"
              disabled={pending}
            />
          }
        >
          <HiOutlineDotsHorizontal className="size-4" />
          Acciones
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {actions.has("mark_processing") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("Procesando", () =>
                  markDeliveryProcessingAction({ deliveryId: delivery.id }),
                )
              }
            >
              {actionLabel.mark_processing}
            </DropdownMenuItem>
          ) : null}
          {actions.has("resend_email") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("Email reenviado", () =>
                  resendDeliveryEmailAction({
                    deliveryId: delivery.id,
                    type: "COMPLETED",
                  }),
                )
              }
            >
              {actionLabel.resend_email}
            </DropdownMenuItem>
          ) : null}
          {actions.has("smm_send") || actions.has("smm_retry") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => setConfirm("smm_send")}
            >
              {actions.has("smm_send")
                ? actionLabel.smm_send
                : actionLabel.smm_retry}
            </DropdownMenuItem>
          ) : null}
          {actions.has("smm_sync") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("SMM sincronizado", () =>
                  syncSmmDeliveryAction({ deliveryId: delivery.id }),
                )
              }
            >
              {actionLabel.smm_sync}
            </DropdownMenuItem>
          ) : null}
          {actions.has("smm_refill") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("Refill solicitado", () =>
                  refillSmmDeliveryAction({ deliveryId: delivery.id }),
                )
              }
            >
              {actionLabel.smm_refill}
            </DropdownMenuItem>
          ) : null}
          {actions.has("kinguin_fulfill") || actions.has("kinguin_retry") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => setConfirm("kinguin_fulfill")}
            >
              {actions.has("kinguin_fulfill")
                ? actionLabel.kinguin_fulfill
                : actionLabel.kinguin_retry}
            </DropdownMenuItem>
          ) : null}
          {actions.has("kinguin_sync") || actions.has("kinguin_import_keys") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("Kinguin sincronizado", () =>
                  syncKinguinDeliveryAction({ deliveryId: delivery.id }),
                )
              }
            >
              {actionLabel.kinguin_sync}
            </DropdownMenuItem>
          ) : null}
          {actions.has("smm_complete_manual") ||
          actions.has("kinguin_complete_manual") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() => setConfirm("complete_manual")}
            >
              Completar manualmente
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          {actions.has("mark_failed") ? (
            <DropdownMenuItem
              disabled={pending}
              variant="destructive"
              onClick={() => setConfirm("fail")}
            >
              {actionLabel.mark_failed}
            </DropdownMenuItem>
          ) : null}
          {actions.has("cancel") ? (
            <DropdownMenuItem
              disabled={pending}
              variant="destructive"
              onClick={() => setConfirm("cancel")}
            >
              {actionLabel.cancel}
            </DropdownMenuItem>
          ) : null}
          {actions.has("reopen") ? (
            <DropdownMenuItem
              disabled={pending}
              onClick={() =>
                run("Entrega reabierta", () =>
                  reopenDeliveryAction({ deliveryId: delivery.id }),
                )
              }
            >
              {actionLabel.reopen}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "fail"
                ? "¿Marcar como fallida?"
                : confirm === "cancel"
                  ? "¿Cancelar entrega?"
                  : confirm === "smm_send"
                    ? "¿Enviar al panel SMM?"
                    : confirm === "kinguin_fulfill"
                      ? "¿Solicitar fulfillment Kinguin?"
                      : "¿Completar manualmente?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "fail"
                ? "Se notificará al cliente y quedará registrada en la auditoría."
                : confirm === "smm_send" || confirm === "kinguin_fulfill"
                  ? "La operación es idempotente: no se creará una segunda orden remota si ya existe."
                  : "Esta acción quedará auditada con tu usuario administrador."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                if (confirm === "fail") {
                  run("Marcada como fallida", () =>
                    markDeliveryFailedAction({
                      deliveryId: delivery.id,
                      errorMessage: "Marcada como fallida por administrador",
                    }),
                  );
                } else if (confirm === "cancel") {
                  run("Entrega cancelada", () =>
                    cancelDeliveryAction({ deliveryId: delivery.id }),
                  );
                } else if (confirm === "smm_send") {
                  run("Enviado a SMM", () =>
                    sendSmmDeliveryAction({ deliveryId: delivery.id }),
                  );
                } else if (confirm === "kinguin_fulfill") {
                  run("Fulfillment solicitado", () =>
                    fulfillKinguinDeliveryAction({ deliveryId: delivery.id }),
                  );
                } else if (confirm === "complete_manual") {
                  run("Completada", () =>
                    markDeliveryDeliveredManualAction({
                      deliveryId: delivery.id,
                    }),
                  );
                }
              }}
            >
              {pending ? "Ejecutando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
