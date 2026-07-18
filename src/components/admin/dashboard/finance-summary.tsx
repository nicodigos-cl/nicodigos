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
      : `${finance.marginPercentage.toFixed(1)}% MARGEN`;

  return (
    <section className="rounded-sm border border-border/80 bg-muted/5 p-4 sm:p-5 font-mono text-xs relative overflow-hidden">
      <div className="absolute top-0 right-0 p-1 text-[8px] text-muted-foreground/30 select-none">
        [SYS_FINANCE]
      </div>
      <div className="mb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
          Resultado del periodo
        </h2>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          BRUTO → REEMBOLSOS → NETO → COSTO EST. → GANANCIA EST. | {marginLabel}.
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
          <div key={title} className="rounded-sm border border-border/60 bg-background/50 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">
              {metric.formattedValue}
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground/80">
              {metric.comparisonLabel}
            </p>
          </div>
        ))}
      </div>

      <ChartContainer config={chartConfig} className="aspect-16/6 w-full">
        <BarChart data={chartData} accessibilityLayer>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="oklch(from var(--border) l c h / 0.4)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={64}
            tickMargin={8}
            className="font-mono text-[9px] fill-muted-foreground"
            tickFormatter={(value: number) =>
              formatMoney(value, currency).replace(/\s/g, "")
            }
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
          <Bar dataKey="value" radius={0} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell
                key={entry.name}
                fill={barColors[entry.name] ?? "var(--primary)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>

      <p className="mt-3 text-[10px] text-muted-foreground/90">[NOTA: {finance.costNote.toUpperCase()}]</p>
      {finance.eurClpRate != null ? (
        <p className="mt-1 text-[10px] text-muted-foreground/90">
          [TIPO DE CAMBIO EUR/CLP USADO: {finance.eurClpRate.toFixed(2)}]
        </p>
      ) : null}
    </section>
  );
}
