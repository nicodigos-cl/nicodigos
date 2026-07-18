"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">
          Ventas por método
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sin ventas desglosadas en este periodo.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold">
          Ventas por método
        </h2>
        <p className="text-sm text-muted-foreground">
          Participación de ingresos por canal de entrega.
        </p>
      </div>
      <ChartContainer config={chartConfig} className="aspect-[16/8] w-full">
        <BarChart
          data={data}
          layout="vertical"
          accessibilityLayer
          margin={{ left: 8, right: 8 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
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
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span>{formatMoney(Number(value), currency)}</span>
                )}
              />
            }
          />
          <Bar
            dataKey="sales"
            fill="var(--color-sales)"
            radius={[0, 6, 6, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ChartContainer>
    </section>
  );
}
