import Link from "next/link";
import {
  HiOutlineExclamationCircle,
  HiOutlineCheckCircle,
  HiOutlineInformationCircle,
} from "react-icons/hi";

import { CustomerStatusBadge } from "@/components/dashboard/customer-status-badge";
import { Button } from "@/components/ui/button";
import type { CustomerDashboardAlert } from "@/lib/customer-dashboard/types";

export function CustomerAlerts({ alerts }: { alerts: CustomerDashboardAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <section aria-labelledby="alerts-heading" className="space-y-4">
      <h2
        id="alerts-heading"
        className="font-heading text-lg font-semibold text-foreground"
      >
        Necesitas revisar esto
      </h2>
      <ul className="space-y-3">
        {alerts.map((alert) => {
          const key =
            "orderId" in alert
              ? `${alert.type}-${alert.orderId}`
              : "deliveryId" in alert
                ? `${alert.type}-${alert.deliveryId}`
                : alert.type;

          // Determine color scheme and icon based on alert.tone
          let borderClass = "border-l-blue-500 bg-blue-500/5 dark:bg-blue-500/10";
          let Icon = HiOutlineInformationCircle;
          let badgeLabel = "Info";

          if (alert.tone === "danger") {
            borderClass = "border-l-destructive bg-destructive/5 dark:bg-destructive/10";
            Icon = HiOutlineExclamationCircle;
            badgeLabel = "Atención";
          } else if (alert.tone === "warning") {
            borderClass = "border-l-amber-500 bg-amber-500/5 dark:bg-amber-500/10";
            Icon = HiOutlineExclamationCircle;
            badgeLabel = "Pendiente";
          } else if (alert.tone === "success") {
            borderClass = "border-l-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10";
            Icon = HiOutlineCheckCircle;
            badgeLabel = "Listo";
          }

          return (
            <li
              key={key}
              className={`flex flex-col gap-4 rounded-2xl border-t border-r border-b border-l-4 border-border p-5 sm:flex-row sm:items-center sm:justify-between ${borderClass} transition-all duration-300 hover:shadow-xs`}
            >
              <div className="flex items-start gap-3">
                <Icon className="size-5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground text-sm leading-none sm:text-base">
                      {alert.title}
                    </p>
                    <CustomerStatusBadge
                      label={badgeLabel}
                      tone={alert.tone}
                      className="h-4.5 text-[10px] px-1.5 uppercase font-bold"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
              </div>
              <div className="shrink-0">
                <Button
                  size="sm"
                  variant={alert.tone === "danger" ? "default" : "outline"}
                  render={<Link href={alert.href} />}
                  nativeButton={false}
                  className="w-full sm:w-auto font-medium"
                >
                  {alert.actionLabel}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
