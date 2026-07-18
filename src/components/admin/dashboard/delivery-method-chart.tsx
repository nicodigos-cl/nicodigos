"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { HiOutlineChartPie } from "react-icons/hi";

import { DashboardEmpty } from "@/components/admin/dashboard/dashboard-empty";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/products/format";
import type { DashboardDeliveryMethodSlice } from "@/types/dashboard";

const chartConfig = {
  sales: { label: "Ventas", color: "var(--primary)" },
} satisfies ChartConfig;

export function DeliveryMethodChart({
  data,
  currency,
}: {
  data: DashboardDeliveryMethodSlice[];
  currency: string;
}) {
  if (data.length === 0) {
    return (
      <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground">
          Ventas por método
        </h2>
        <DashboardEmpty
          icon={HiOutlineChartPie}
          title="Sin desglose"
          description="Sin ventas desglosadas en este periodo."
        />
      </section>
    );
  }

  return (
    <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
        [CHART_METHOD]
      </div>
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Ventas por método
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Participación de ingresos por canal de entrega.
        </p>
      </div>
      <ChartContainer config={chartConfig} className="aspect-16/8 w-full">
        <BarChart
          data={data}
          layout="vertical"
          accessibilityLayer
          margin={{ left: 8, right: 8 }}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="oklch(from var(--border) l c h / 0.4)" />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
            tickFormatter={(value: number) =>
              formatMoney(value, currency).replace(/\s/g, "")
            }
          />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={88}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                className="font-mono text-[10px] rounded-sm border border-border/80 bg-background/95"
                formatter={(value) => (
                  <span>{formatMoney(Number(value), currency)}</span>
                )}
              />
            }
          />
          <Bar
            dataKey="sales"
            fill="var(--color-sales)"
            radius={[0, 2, 2, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
