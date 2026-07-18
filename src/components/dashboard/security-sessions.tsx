"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { revokeOtherSessionAction } from "@/lib/actions/customer-dashboard";
import type { CustomerSecurityView } from "@/lib/customer-dashboard/types";
import { formatDateTime } from "@/lib/format-date";

export function SecuritySessions({
  security,
}: {
  security: CustomerSecurityView;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Cuenta</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-1 font-medium">{security.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Verificación</dt>
            <dd className="mt-1 font-medium">
              {security.emailVerified ? "Email verificado" : "Email sin verificar"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Contraseña</dt>
            <dd className="mt-1 font-medium">
              {security.hasPassword ? "Configurada" : "No configurada"}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {!security.emailVerified ? (
            <Button
              size="sm"
              variant="outline"
              render={<a href="/auth/verify-email" />}
              nativeButton={false}
            >
              Verificar email
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            render={<a href="/auth/forgot-password" />}
            nativeButton={false}
          >
            Cambiar contraseña
          </Button>
        </div>
        {security.providers.length > 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Proveedores conectados</p>
            <ul className="mt-2 space-y-1 text-sm">
              {security.providers.map((provider) => (
                <li key={provider.id} className="font-medium capitalize">
                  {provider.providerId}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Sesiones</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Puedes cerrar otras sesiones activas. Nunca mostramos tokens.
        </p>
        <ul className="mt-4 space-y-3">
          {security.sessions.map((session) => (
            <li
              key={session.id}
              className="flex flex-col gap-3 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1 text-sm">
                <p className="font-medium">
                  {session.userAgentSummary}
                  {session.isCurrent ? " · Esta sesión" : null}
                  {session.isExpired ? " · Expirada" : null}
                </p>
                <p className="text-muted-foreground">
                  {session.ipMasked ?? "IP no disponible"} · Actualizada{" "}
                  {formatDateTime(session.updatedAt)}
                </p>
              </div>
              {!session.isCurrent && !session.isExpired ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const result = await revokeOtherSessionAction({
                          sessionId: session.id,
                        });
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success("Sesión cerrada");
                        router.refresh();
                      })();
                    });
                  }}
                >
                  Cerrar sesión
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
