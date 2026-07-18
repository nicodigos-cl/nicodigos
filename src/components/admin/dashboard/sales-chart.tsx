"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";
import { HiOutlineChartBar } from "react-icons/hi";

import { DashboardEmpty } from "@/components/admin/dashboard/dashboard-empty";
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
      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
          Ventas en el tiempo
        </h2>
        <DashboardEmpty
          icon={HiOutlineChartBar}
          title="Sin ventas"
          description="No hay ventas aprobadas en este periodo."
        />
      </section>
    );
  }

  const totalNet = data.reduce((sum, point) => sum + point.net, 0);
  const totalGross = data.reduce((sum, point) => sum + point.gross, 0);
  const totalOrders = data.reduce((sum, point) => sum + point.orders, 0);

  return (
    <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
        [CHART_SALES]
      </div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Ventas en el tiempo
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            NETO: {formatMoney(totalNet, currency)} · BRUTO:{" "}
            {formatMoney(totalGross, currency)} · PEDIDOS: {totalOrders}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] uppercase text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-none"
              style={{ background: "var(--primary)" }}
            />
            Neto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-none"
              style={{ background: "var(--chart-3)" }}
            />
            Bruto
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-none"
              style={{ background: "var(--chart-2)" }}
            />
            Pedidos
          </span>
        </div>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[16/7] w-full">
        <ComposedChart data={data} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(from var(--border) l c h / 0.4)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            minTickGap={24}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
          />
          <YAxis
            yAxisId="sales"
            tickLine={false}
            axisLine={false}
            width={64}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
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
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
            allowDecimals={false}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                className="font-mono text-[10px] rounded-sm border border-border/80 bg-background/95"
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
            type="linear"
            fill="var(--color-gross)"
            fillOpacity={0.05}
            stroke="var(--color-gross)"
            strokeWidth={1.5}
            strokeDasharray="3 3"
            isAnimationActive={false}
          />
          <Area
            yAxisId="sales"
            dataKey="net"
            type="linear"
            fill="var(--color-net)"
            fillOpacity={0.1}
            stroke="var(--color-net)"
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            yAxisId="orders"
            dataKey="orders"
            type="linear"
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
