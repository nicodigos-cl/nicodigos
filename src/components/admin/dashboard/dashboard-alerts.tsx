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
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <HiOutlineCheckCircle className="mt-0.5 size-5 text-primary" />
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Atención requerida
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Todo está al día. No hay problemas operativos que requieran
              atención.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <HiOutlineExclamationCircle className="mt-0.5 size-5 text-destructive" />
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">
              Atención requerida
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {alerts.length} señal
              {alerts.length === 1 ? "" : "es"} operativa
              {alerts.length === 1 ? "" : "s"} detectada
              {alerts.length === 1 ? "" : "s"}.
            </p>
          </div>
          <ul className="space-y-3">
            {alerts.map((alert) => (
              <li
                key={alert.type}
                className={cn(
                  "rounded-xl border border-border/70 bg-background/80 p-3",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{alert.title}</p>
                  <Badge
                    variant={
                      alert.severity === "critical" || alert.severity === "high"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {severityLabel[alert.severity]}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {alert.description}
                </p>
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  render={<Link href={alert.href} />}
                  nativeButton={false}
                >
                  Revisar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
