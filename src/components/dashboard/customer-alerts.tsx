import Link from "next/link";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import type { CustomerDashboardAlert } from "@/lib/customer-dashboard/types";

export function CustomerAlerts({ alerts }: { alerts: CustomerDashboardAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <section aria-labelledby="alerts-heading" className="space-y-3">
      <h2 id="alerts-heading" className="font-heading text-lg font-semibold">
        Necesitas revisar esto
      </h2>
      <ul className="space-y-2">
        {alerts.map((alert) => {
          const key =
            "orderId" in alert
              ? `${alert.type}-${alert.orderId}`
              : "deliveryId" in alert
                ? `${alert.type}-${alert.deliveryId}`
                : alert.type;

          return (
            <li
              key={key}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{alert.title}</p>
                  <CustomerStatusBadge
                    label={
                      alert.tone === "danger"
                        ? "Atención"
                        : alert.tone === "warning"
                          ? "Pendiente"
                          : alert.tone === "success"
                            ? "Listo"
                            : "Info"
                    }
                    tone={alert.tone}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {alert.description}
                </p>
              </div>
              <Button
                size="sm"
                variant={alert.tone === "danger" ? "default" : "outline"}
                render={<Link href={alert.href} />}
                nativeButton={false}
              >
                {alert.actionLabel}
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
