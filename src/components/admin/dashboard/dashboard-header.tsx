"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { HiOutlineRefresh } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  dashboardRangeLabel,
  dashboardRangeValues,
} from "@/lib/validations/dashboard";
import type { AdminDashboardDto } from "@/types/dashboard";

const selectClass =
  "h-9 rounded-sm border border-border/80 bg-muted/10 px-3 font-mono text-xs outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-inner";

export function DashboardHeader({
  data,
}: {
  data: Pick<
    AdminDashboardDto,
    "greetingName" | "period" | "salesBasis"
  >;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-border/40 pb-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary font-bold px-1.5 py-0.5 border border-primary bg-primary/10 rounded-sm select-none">
            SYS_MONITOR
          </span>
          <h1 className="font-mono text-lg font-bold uppercase tracking-tight">
            Dashboard / Resumen
          </h1>
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          {data.greetingName}. Resumen operativo y comercial de Nicodigos.
        </p>
        <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
          [PERIODO: {data.period.label.toUpperCase()} · COMPARATIVA:{" "}
          {data.period.previousLabel.toUpperCase()}
          {data.salesBasis === "net"
            ? " · BASE: VENTAS NETAS]"
            : " · BASE: VENTAS BRUTAS]"}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
          Periodo
          <select
            className={selectClass}
            value={data.period.preset}
            disabled={pending}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "custom") return;
              startTransition(() => {
                router.push(
                  value === "7d" ? "/admin" : `/admin?range=${value}`,
                );
              });
            }}
          >
            {dashboardRangeValues.map((value) => (
              <option
                key={value}
                value={value}
                disabled={value === "custom"}
                className="bg-background text-foreground"
              >
                {dashboardRangeLabel[value]}
              </option>
            ))}
          </select>
        </label>

        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const from = String(form.get("from") ?? "");
            const to = String(form.get("to") ?? "");
            if (!from || !to) return;
            startTransition(() => {
              router.push(`/admin?from=${from}&to=${to}`);
            });
          }}
        >
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
            Desde
            <input
              type="date"
              name="from"
              className={selectClass}
              defaultValue={data.period.from}
            />
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
            Hasta
            <input
              type="date"
              name="to"
              className={selectClass}
              defaultValue={data.period.toInclusive}
            />
          </label>
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={pending}
            className="rounded-sm font-mono text-xs"
          >
            Aplicar
          </Button>
        </form>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          aria-label="Actualizar dashboard"
          onClick={() => startTransition(() => router.refresh())}
          className="rounded-sm font-mono text-xs gap-1.5"
        >
          <HiOutlineRefresh className={cn("size-3.5", pending && "animate-spin")} />
          {pending ? "RUNNING…" : "REFRESH"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          render={<Link href="/admin/orders" />}
          nativeButton={false}
          className="rounded-sm font-mono text-xs border border-border/40 hover:bg-muted/50"
        >
          PEDIDOS
        </Button>
      </div>
    </div>
  );
}
