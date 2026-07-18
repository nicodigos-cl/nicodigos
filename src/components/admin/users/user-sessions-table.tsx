"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { revokeUserSessionAction } from "@/lib/actions/users";
import { formatDateTime } from "@/lib/format-date";
import type { UserSessionRowDto } from "@/types/users";

export function UserSessionsTable({
  userId,
  sessions,
}: {
  userId: string;
  sessions: UserSessionRowDto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay sesiones registradas.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => (
        <li
          key={session.id}
          className="flex flex-col gap-2 rounded-xl bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 text-sm">
            <p className="font-medium">{session.userAgentSummary}</p>
            <p className="text-xs text-muted-foreground">
              IP {session.ipMasked ?? "—"} · Creada{" "}
              {formatDateTime(session.createdAt)} · Última actividad{" "}
              {formatDateTime(session.updatedAt)}
            </p>
            <p className="text-xs text-muted-foreground">
              Expira {formatDateTime(session.expiresAt)}
              {session.isExpired ? " · Expirada" : " · Activa"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            disabled={pending || session.isExpired}
            onClick={() =>
              startTransition(() => {
                void (async () => {
                  const result = await revokeUserSessionAction({
                    userId,
                    sessionId: session.id,
                    reason: "Revocación individual desde panel admin",
                  });
                  if (!result.success) return toast.error(result.message);
                  toast.success("Sesión revocada");
                  router.refresh();
                })();
              })
            }
          >
            Revocar
          </Button>
        </li>
      ))}
    </ul>
  );
}
