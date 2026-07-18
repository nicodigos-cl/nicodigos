"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/products/format";
import type { DashboardSalesSeriesPoint } from "@/types/dashboard";

const chartConfig = {
  gross: { label: "Bruto", color: "var(--chart-3)" },
  net: { label: "Neto", color: "var(--primary)" },
  orders: { label: "Pedidos", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function SalesChart({
  data,
  currency,
}: {
  data: DashboardSalesSeriesPoint[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Ventas en el tiempo</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No hay ventas aprobadas en este periodo.
        </p>
      </section>
    );
  }

  const totalNet = data.reduce((sum, point) => sum + point.net, 0);
  const totalGross = data.reduce((sum, point) => sum + point.gross, 0);
  const totalOrders = data.reduce((sum, point) => sum + point.orders, 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">
            Ventas en el tiempo
          </h2>
          <p className="text-sm text-muted-foreground">
            Neto {formatMoney(totalNet, currency)} · Bruto{" "}
            {formatMoney(totalGross, currency)} · {totalOrders} pedidos
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--primary)" }}
            />
            Neto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--chart-3)" }}
            />
            Bruto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: "var(--chart-2)" }}
            />
            Pedidos
          </span>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[16/7] w-full">
        <ComposedChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            yAxisId="sales"
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) =>
              formatMoney(value, currency).replace(/\s/g, "")
            }
          />
          <YAxis
            yAxisId="orders"
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={40}
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => {
                  if (name === "orders") {
                    return <span>{String(value)} pedidos</span>;
                  }
                  return (
                    <span>{formatMoney(Number(value), currency)}</span>
                  );
                }}
              />
            }
          />
          <Area
            yAxisId="sales"
            dataKey="gross"
            type="monotone"
            fill="var(--color-gross)"
            fillOpacity={0.12}
            stroke="var(--color-gross)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            isAnimationActive={false}
          />
          <Area
            yAxisId="sales"
            dataKey="net"
            type="monotone"
            fill="var(--color-net)"
            fillOpacity={0.18}
            stroke="var(--color-net)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            yAxisId="orders"
            dataKey="orders"
            type="monotone"
            stroke="var(--color-orders)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
      <p className="sr-only">
        Resumen textual: neto {formatMoney(totalNet, currency)}, bruto{" "}
        {formatMoney(totalGross, currency)}, {totalOrders} pedidos.
      </p>
    </section>
  );
}
