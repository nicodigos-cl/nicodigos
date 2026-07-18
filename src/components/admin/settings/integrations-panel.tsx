"use client";

import { toast } from "sonner";

import { IntegrationStatusCard } from "@/components/admin/settings/integration-status-card";
import { Button } from "@/components/ui/button";
import type { AdminSettingsOverview } from "@/types/settings";

export function IntegrationsPanel({
  overview,
}: {
  overview: AdminSettingsOverview;
}) {
  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copiada al portapapeles");
    } catch {
      toast.error("No pudimos copiar la URL");
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-sm font-medium">Integraciones</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {overview.integrations.map((item) => (
            <IntegrationStatusCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Webhooks</h2>
        <ul className="space-y-3">
          {overview.webhooks.map((webhook) => (
            <li
              key={webhook.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <h3 className="text-sm font-medium">{webhook.name}</h3>
                  <p className="break-all font-mono text-xs text-muted-foreground">
                    {webhook.publicUrl}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Eventos: {webhook.events.join(", ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Firma verificada:{" "}
                    {webhook.signatureVerified ? "Sí" : "No"} · Idempotente:{" "}
                    {webhook.idempotent ? "Sí" : "No"}
                  </p>
                  {webhook.notes ? (
                    <p className="text-xs text-muted-foreground">
                      {webhook.notes}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyUrl(webhook.publicUrl)}
                >
                  Copiar URL
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium">Tareas programadas</h2>
        <ul className="space-y-3">
          {overview.crons.map((cron) => (
            <li
              key={cron.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <h3 className="text-sm font-medium">{cron.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {cron.description}
              </p>
              <p className="mt-2 font-mono text-xs text-muted-foreground">
                {cron.route}
              </p>
              <p className="mt-2 text-xs font-medium text-foreground">
                Configurado mediante infraestructura
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
