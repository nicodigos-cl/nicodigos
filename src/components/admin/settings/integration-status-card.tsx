import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import type {
  IntegrationStatus,
  IntegrationStatusCard as IntegrationStatusCardType,
} from "@/types/settings";

const STATUS_LABELS: Record<IntegrationStatus, string> = {
  connected: "Conectado",
  configured: "Configurado",
  missing: "Faltante",
  error: "Error",
  disabled: "Desactivado",
};

function statusVariant(
  status: IntegrationStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "connected":
      return "default";
    case "configured":
      return "secondary";
    case "error":
      return "destructive";
    case "missing":
    case "disabled":
    default:
      return "outline";
  }
}

export function IntegrationStatusCard({
  item,
}: {
  item: IntegrationStatusCardType;
}) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{item.name}</h3>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {item.description}
          </p>
        </div>
        <Badge
          variant={statusVariant(item.status)}
          className="rounded-sm font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 h-auto border-border/50"
        >
          {STATUS_LABELS[item.status].toUpperCase()}
        </Badge>
      </div>

      <dl className="grid gap-1.5 text-xs text-muted-foreground mt-1.5">
        {item.environment ? (
          <div className="flex items-center justify-between py-1 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">ENTORNO</dt>
            <dd className="font-semibold text-foreground">{item.environment.toUpperCase()}</dd>
          </div>
        ) : null}
        {item.detail ? (
          <div className="flex items-center justify-between py-1 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">DETALLE</dt>
            <dd className="font-semibold text-foreground">{item.detail}</dd>
          </div>
        ) : null}
        {item.secretHint ? (
          <div className="flex items-center justify-between py-1 border-b border-dashed border-border/40">
            <dt className="text-muted-foreground">REFERENCIA</dt>
            <dd className="font-mono text-foreground font-semibold">{item.secretHint}</dd>
          </div>
        ) : null}
        {item.lastCheckedAt ? (
          <div className="flex items-center justify-between py-1 border-b border-dashed border-border/40 last:border-0">
            <dt className="text-muted-foreground">ÚLTIMA REVISIÓN</dt>
            <dd className="text-foreground">{formatDateTime(item.lastCheckedAt)}</dd>
          </div>
        ) : null}
        {item.error ? (
          <div className="rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2 text-destructive text-[10px] mt-1.5 font-sans">
            {item.error}
          </div>
        ) : null}
      </dl>

      <div className="mt-auto pt-1">
        <Button
          size="sm"
          variant="outline"
          render={<Link href={item.configureHref} />}
          nativeButton={false}
          className="rounded-sm font-mono text-xs border border-border/60 hover:bg-muted/50"
        >
          {item.editable ? "CONFIGURAR" : "VER AJUSTES"}
        </Button>
      </div>
    </article>
  );
}
