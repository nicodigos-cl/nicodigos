"use client";

import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney } from "@/lib/products/format";
import type { DashboardFinanceSummary } from "@/types/dashboard";

const chartConfig = {
  value: { label: "Monto", color: "var(--primary)" },
} satisfies ChartConfig;

const barColors: Record<string, string> = {
  Bruto: "var(--chart-3)",
  Reembolsos: "var(--destructive)",
  Neto: "var(--primary)",
  Costo: "var(--chart-4)",
  Ganancia: "var(--chart-2)",
};

export function FinanceSummary({
  finance,
  currency,
}: {
  finance: DashboardFinanceSummary;
  currency: string;
}) {
  const chartData = [
    { name: "Bruto", value: finance.gross.value },
    { name: "Reembolsos", value: finance.refunds.value },
    { name: "Neto", value: finance.net.value },
    { name: "Costo", value: finance.estimatedCost.value },
    { name: "Ganancia", value: finance.estimatedProfit.value },
  ];

  const marginLabel =
    finance.marginPercentage == null
      ? "Sin margen"
      : `${finance.marginPercentage.toFixed(1)}% margen`;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4">
        <h2 className="font-heading text-lg font-semibold">
          Resultado del periodo
        </h2>
        <p className="text-sm text-muted-foreground">
          Bruto → reembolsos → neto → costo estimado → ganancia. {marginLabel}.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(
          [
            ["Bruto", finance.gross],
            ["Reembolsos", finance.refunds],
            ["Neto", finance.net],
            ["Costo est.", finance.estimatedCost],
            ["Ganancia est.", finance.estimatedProfit],
          ] as const
        ).map(([title, metric]) => (
          <div key={title} className="rounded-xl border border-border px-3 py-2">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-1 font-heading text-base font-semibold tabular-nums">
              {metric.formattedValue}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {metric.comparisonLabel}
            </p>
          </div>
        ))}
      </div>

      <ChartContainer config={chartConfig} className="aspect-[16/6] w-full">
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(value: number) =>
              formatMoney(value, currency).replace(/\s/g, "")
            }
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
          <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={barColors[entry.name] ?? "var(--primary)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <p className="mt-3 text-xs text-muted-foreground">{finance.costNote}</p>
      {finance.eurClpRate != null ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Tipo de cambio EUR/CLP usado: {finance.eurClpRate.toFixed(2)}.
        </p>
      ) : null}
    </section>
  );
}
