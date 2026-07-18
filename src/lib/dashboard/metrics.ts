import { formatMoney } from "@/lib/products/format";

export type DashboardMoneyMetric = {
  value: number;
  formattedValue: string;
  previousValue: number;
  formattedPreviousValue: string;
  changePercentage: number | null;
  trend: "up" | "down" | "neutral";
  comparisonLabel: string;
};

export type DashboardCountMetric = {
  value: number;
  previousValue: number;
  changePercentage: number | null;
  trend: "up" | "down" | "neutral";
  comparisonLabel: string;
  context?: string;
};

export function computeChangePercentage(
  current: number,
  previous: number,
): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return ((current - previous) / previous) * 100;
}

export function trendFromChange(
  change: number | null,
  current: number,
  previous: number,
): "up" | "down" | "neutral" {
  if (change == null) {
    return current > 0 && previous === 0 ? "up" : "neutral";
  }
  if (Math.abs(change) < 0.05) return "neutral";
  return change > 0 ? "up" : "down";
}

export function comparisonLabel(
  change: number | null,
  current: number,
  previous: number,
): string {
  if (previous === 0 && current === 0) {
    return "Sin variación";
  }
  if (previous === 0 && current > 0) {
    return "Nuevo en este periodo";
  }
  if (change == null) {
    return "Sin comparación";
  }
  const absolute = Math.abs(change);
  const formatted = absolute.toLocaleString("es-CL", {
    maximumFractionDigits: 1,
    minimumFractionDigits: absolute < 10 ? 1 : 0,
  });
  if (change > 0) return `+${formatted} % vs periodo anterior`;
  if (change < 0) return `−${formatted} % vs periodo anterior`;
  return "Sin variación vs periodo anterior";
}

export function buildMoneyMetric(
  value: number,
  previousValue: number,
  currency = "CLP",
): DashboardMoneyMetric {
  const changePercentage = computeChangePercentage(value, previousValue);
  return {
    value,
    formattedValue: formatMoney(value, currency),
    previousValue,
    formattedPreviousValue: formatMoney(previousValue, currency),
    changePercentage,
    trend: trendFromChange(changePercentage, value, previousValue),
    comparisonLabel: comparisonLabel(changePercentage, value, previousValue),
  };
}

export function buildCountMetric(
  value: number,
  previousValue: number,
  context?: string,
): DashboardCountMetric {
  const changePercentage = computeChangePercentage(value, previousValue);
  return {
    value,
    previousValue,
    changePercentage,
    trend: trendFromChange(changePercentage, value, previousValue),
    comparisonLabel: comparisonLabel(changePercentage, value, previousValue),
    context,
  };
}
