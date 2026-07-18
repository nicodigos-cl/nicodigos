"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { HiOutlineRefresh } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  dashboardRangeLabel,
  dashboardRangeValues,
} from "@/lib/validations/dashboard";
import type { AdminDashboardDto } from "@/types/dashboard";

const selectClass =
  "h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

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
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          {data.greetingName}. Resumen operativo y comercial de Nicodigos.
        </p>
        <p className="text-xs text-muted-foreground">
          Periodo: {data.period.label} · Comparado con{" "}
          {data.period.previousLabel}
          {data.salesBasis === "net"
            ? " · Ventas netas (aprobadas − reembolsos)"
            : " · Ventas brutas aprobadas"}
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
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
          <label className="grid gap-1 text-xs text-muted-foreground">
            Desde
            <input
              type="date"
              name="from"
              className={selectClass}
              defaultValue={data.period.from}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Hasta
            <input
              type="date"
              name="to"
              className={selectClass}
              defaultValue={data.period.toInclusive}
            />
          </label>
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
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
        >
          <HiOutlineRefresh className="size-4" />
          {pending ? "Actualizando…" : "Actualizar"}
        </Button>

        <Button
          size="sm"
          variant="ghost"
          render={<Link href="/admin/orders" />}
          nativeButton={false}
        >
          Pedidos
        </Button>
      </div>
    </div>
  );
}
