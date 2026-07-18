"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  anonymizeUserAction,
  changeUserRoleAction,
  createUserAdminNoteAction,
  markUserReviewAction,
  resolveUserReviewAction,
  restoreUserAction,
  revokeAllUserSessionsAction,
  sendEmailVerificationAction,
  sendPasswordResetAction,
  suspendUserAction,
} from "@/lib/actions/users";
import type { UserDetailDto } from "@/types/users";

type Kind =
  | "role"
  | "restrict"
  | "suspend"
  | "restore"
  | "note"
  | "review"
  | "resolve-review"
  | "reset"
  | "verify"
  | "revoke-all"
  | "anonymize"
  | null;

const inputClass =
  "w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function UserActionMenu({ user }: { user: UserDetailDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setKind] = useState<Kind>(null);
  const [reason, setReason] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [role, setRole] = useState<"USER" | "ADMIN">(
    user.role === "ADMIN" ? "USER" : "ADMIN",
  );
  const [noteCategory, setNoteCategory] = useState<
    "SUPPORT" | "RISK" | "FRAUD" | "BILLING" | "DELIVERY" | "REFUND" | "OTHER"
  >("SUPPORT");
  const [notePriority, setNotePriority] = useState<
    "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  >("MEDIUM");

  function run(
    label: string,
    task: () => Promise<{ success: boolean; message?: string }>,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await task();
        if (!result.success) {
          return toast.error(result.message ?? "No se pudo completar la acción");
        }
        toast.success(label);
        setKind(null);
        setReason("");
        setConfirmation("");
        router.refresh();
      })();
    });
  }

  function submit() {
    if (kind === "role") {
      run("Rol actualizado", () =>
        changeUserRoleAction({
          userId: user.id,
          role,
          reason,
          confirmation: "CAMBIAR_ROL",
        }),
      );
    }
    if (kind === "restrict") {
      run("Cuenta restringida", () =>
        suspendUserAction({
          userId: user.id,
          mode: "RESTRICTED",
          reason,
          revokeSessions: true,
          confirmation: "SUSPENDER",
        }),
      );
    }
    if (kind === "suspend") {
      run("Cuenta bloqueada", () =>
        suspendUserAction({
          userId: user.id,
          mode: "SUSPENDED",
          reason,
          revokeSessions: true,
          confirmation: "SUSPENDER",
        }),
      );
    }
    if (kind === "restore") {
      run("Cuenta rehabilitada", () =>
        restoreUserAction({
          userId: user.id,
          reason,
          confirmation: "REHABILITAR",
        }),
      );
    }
    if (kind === "note") {
      run("Nota agregada", () =>
        createUserAdminNoteAction({
          userId: user.id,
          category: noteCategory,
          priority: notePriority,
          content: reason,
        }),
      );
    }
    if (kind === "review") {
      run("Marcada para revisión", () =>
        markUserReviewAction({ userId: user.id, reason }),
      );
    }
    if (kind === "resolve-review") {
      run("Revisión resuelta", () =>
        resolveUserReviewAction({ userId: user.id, reason }),
      );
    }
    if (kind === "reset") {
      run("Restablecimiento enviado", () =>
        sendPasswordResetAction({ userId: user.id, reason }),
      );
    }
    if (kind === "verify") {
      run("Verificación enviada", () =>
        sendEmailVerificationAction({ userId: user.id, reason }),
      );
    }
    if (kind === "revoke-all") {
      run("Sesiones revocadas", () =>
        revokeAllUserSessionsAction({
          userId: user.id,
          reason,
          confirmation: "REVOCAR_SESIONES",
          keepCurrentAdminSession: true,
        }),
      );
    }
    if (kind === "anonymize") {
      run("Usuario anonimizado", () =>
        anonymizeUserAction({
          userId: user.id,
          reason,
          confirmation: "ANONIMIZAR",
        }),
      );
    }
  }

  const titles: Record<Exclude<Kind, null>, string> = {
    role: "Cambiar rol",
    restrict: "Restringir cuenta",
    suspend: "Bloquear cuenta",
    restore: "Rehabilitar cuenta",
    note: "Agregar nota administrativa",
    review: "Marcar para revisión",
    "resolve-review": "Resolver revisión",
    reset: "Enviar restablecimiento de contraseña",
    verify: "Enviar verificación de email",
    "revoke-all": "Revocar todas las sesiones",
    anonymize: "Anonimizar usuario",
  };

  const needsConfirmation =
    kind === "role" ||
    kind === "restrict" ||
    kind === "suspend" ||
    kind === "restore" ||
    kind === "revoke-all" ||
    kind === "anonymize";

  const confirmationWord =
    kind === "role"
      ? "CAMBIAR_ROL"
      : kind === "restore"
        ? "REHABILITAR"
        : kind === "revoke-all"
          ? "REVOCAR_SESIONES"
          : kind === "anonymize"
            ? "ANONIMIZAR"
            : "SUSPENDER";

  const blocked = user.accountStatus === "ANONYMIZED";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              aria-label="Acciones administrativas"
            />
          }
        >
          <HiOutlineDotsHorizontal className="size-4" />
          Acciones
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuItem disabled={blocked} onClick={() => setKind("role")}>
            Cambiar rol
          </DropdownMenuItem>
          <DropdownMenuItem disabled={blocked} onClick={() => setKind("note")}>
            Agregar nota
          </DropdownMenuItem>
          {user.requiresReview ? (
            <DropdownMenuItem onClick={() => setKind("resolve-review")}>
              Resolver revisión
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              disabled={blocked}
              onClick={() => setKind("review")}
            >
              Marcar para revisión
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={blocked} onClick={() => setKind("reset")}>
            Enviar restablecimiento
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={blocked || user.emailVerified}
            onClick={() => setKind("verify")}
          >
            Enviar verificación de email
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setKind("revoke-all")}>
            Revocar todas las sesiones
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {user.accountStatus === "ACTIVE" ? (
            <>
              <DropdownMenuItem onClick={() => setKind("restrict")}>
                Restringir acceso
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setKind("suspend")}>
                Bloquear cuenta
              </DropdownMenuItem>
            </>
          ) : user.accountStatus !== "ANONYMIZED" ? (
            <DropdownMenuItem onClick={() => setKind("restore")}>
              Rehabilitar cuenta
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={blocked || user.role === "ADMIN"}
            onClick={() => setKind("anonymize")}
          >
            Anonimizar (soft delete)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={kind !== null}
        onOpenChange={(open) => {
          if (!open) setKind(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{kind ? titles[kind] : ""}</DialogTitle>
            <DialogDescription>
              {kind === "anonymize"
                ? "Se eliminarán datos personales no esenciales. El historial financiero se conserva. Esta acción no borra pedidos ni pagos."
                : kind === "role"
                  ? `Rol actual: ${user.role}. ${user.isEnvAdmin ? "Este email está en ADMIN_EMAILS y puede re-ascender en el próximo login." : "La operación quedará auditada."}`
                  : kind === "suspend" || kind === "restrict"
                    ? [
                        user.commerce.pendingDeliveryCount
                          ? `${user.commerce.pendingDeliveryCount} entrega(s) pendiente(s).`
                          : null,
                        user.commerce.pendingOrderCount
                          ? `${user.commerce.pendingOrderCount} pedido(s) pendiente(s).`
                          : null,
                        "El historial financiero no se altera.",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : "La operación quedará registrada con tu identidad administrativa."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {kind === "role" ? (
              <label className="grid gap-1 text-sm">
                Nuevo rol
                <select
                  className={inputClass}
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as "USER" | "ADMIN")
                  }
                >
                  <option value="USER">Usuario</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </label>
            ) : null}
            {kind === "note" ? (
              <>
                <label className="grid gap-1 text-sm">
                  Categoría
                  <select
                    className={inputClass}
                    value={noteCategory}
                    onChange={(event) =>
                      setNoteCategory(
                        event.target.value as typeof noteCategory,
                      )
                    }
                  >
                    <option value="SUPPORT">Soporte</option>
                    <option value="RISK">Riesgo</option>
                    <option value="FRAUD">Fraude</option>
                    <option value="BILLING">Facturación</option>
                    <option value="DELIVERY">Entrega</option>
                    <option value="REFUND">Reembolso</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label className="grid gap-1 text-sm">
                  Prioridad
                  <select
                    className={inputClass}
                    value={notePriority}
                    onChange={(event) =>
                      setNotePriority(
                        event.target.value as typeof notePriority,
                      )
                    }
                  >
                    <option value="LOW">Baja</option>
                    <option value="MEDIUM">Media</option>
                    <option value="HIGH">Alta</option>
                    <option value="CRITICAL">Crítica</option>
                  </select>
                </label>
              </>
            ) : null}
            <label className="grid gap-1 text-sm">
              {kind === "note" ? "Contenido" : "Motivo"}
              <textarea
                className={inputClass}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {needsConfirmation ? (
              <label className="grid gap-1 text-sm">
                Escribe <strong>{confirmationWord}</strong> para confirmar
                <input
                  className={inputClass}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setKind(null)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={submit}
              disabled={
                pending ||
                !reason.trim() ||
                (needsConfirmation && confirmation !== confirmationWord)
              }
            >
              {pending ? "Procesando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
