import Link from "next/link";
import {
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from "react-icons/hi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminDashboardAlert } from "@/lib/dashboard/alerts";
import { cn } from "@/lib/utils";

const severityLabel = {
  critical: "Crítica",
  high: "Alta",
  medium: "Media",
  low: "Baja",
} as const;

export function DashboardAlerts({ alerts }: { alerts: AdminDashboardAlert[] }) {
  if (alerts.length === 0) {
    return (
      <section className="rounded-sm border border-border/80 bg-muted/10 p-4 sm:p-5 relative overflow-hidden font-mono text-xs">
        <div className="flex items-start gap-3">
          <span className="flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-500">
              [ALERT_STATUS: CLEAR]
            </h2>
            <p className="text-muted-foreground">
              Todo está al día. No hay problemas operativos que requieran atención.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-destructive/40 bg-destructive/5 p-4 sm:p-5 relative overflow-hidden font-mono text-xs">
      <div className="flex items-start gap-3">
        <span className="flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-destructive animate-pulse" />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-destructive">
              [ALERT_STATUS: ATTENTION_REQUIRED ({alerts.length})]
            </h2>
            <p className="text-muted-foreground">
              Se han detectado {alerts.length} señal
              {alerts.length === 1 ? "" : "es"} operativa
              {alerts.length === 1 ? "" : "s"}.
            </p>
          </div>
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.type}
                className={cn(
                  "rounded-sm border border-destructive/20 bg-background/60 p-3",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-foreground uppercase tracking-wide">
                    {alert.title}
                  </p>
                  <Badge
                    variant={
                      alert.severity === "critical" || alert.severity === "high"
                        ? "destructive"
                        : "secondary"
                    }
                    className="rounded-sm font-mono text-[9px] tracking-wider uppercase px-1 py-0.5 h-auto"
                  >
                    {severityLabel[alert.severity]}
                  </Badge>
                </div>
                <p className="mt-1.5 text-muted-foreground">
                  {alert.description}
                </p>
                <Button
                  className="mt-3 rounded-sm font-mono text-xs"
                  size="sm"
                  variant="outline"
                  render={<Link href={alert.href} />}
                  nativeButton={false}
                >
                  REVISAR_REGISTRO
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
