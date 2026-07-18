import { describe, expect, test } from "bun:test";

import { buildDashboardAlerts } from "@/lib/dashboard/alerts";
import { LOW_STOCK_THRESHOLD } from "@/lib/dashboard/constants";
import {
  buildMoneyMetric,
  computeChangePercentage,
} from "@/lib/dashboard/metrics";
import {
  resolveDashboardPeriod,
  startOfZonedDay,
  zonedDateTimeToUtc,
} from "@/lib/dashboard/period";
import { dashboardQuerySchema } from "@/lib/validations/dashboard";

describe("dashboard period", () => {
  test("parses shareable search params", () => {
    expect(
      dashboardQuerySchema.parse({ range: "30d" }),
    ).toMatchObject({ range: "30d" });
    expect(
      dashboardQuerySchema.safeParse({ from: "2026-07-01" }).success,
    ).toBeFalse();
    expect(
      dashboardQuerySchema.parse({
        from: "2026-07-01",
        to: "2026-07-18",
      }),
    ).toMatchObject({ from: "2026-07-01", to: "2026-07-18" });
  });

  test("builds previous period with equal duration", () => {
    const now = zonedDateTimeToUtc(2026, 7, 18, 15, 0, 0);
    const period = resolveDashboardPeriod({ range: "7d", now });
    expect(period.to.getTime() - period.from.getTime()).toBe(
      period.previousTo.getTime() - period.previousFrom.getTime(),
    );
    expect(period.bucket).toBe("day");
  });

  test("uses Santiago day boundaries for today", () => {
    const now = zonedDateTimeToUtc(2026, 7, 18, 1, 0, 0);
    const period = resolveDashboardPeriod({ range: "today", now });
    expect(period.from.getTime()).toBe(startOfZonedDay(now).getTime());
  });
});

describe("dashboard metrics", () => {
  test("avoids divide by zero on percentage", () => {
    expect(computeChangePercentage(100, 0)).toBeNull();
    expect(computeChangePercentage(0, 0)).toBe(0);
    const metric = buildMoneyMetric(5000, 0, "CLP");
    expect(metric.comparisonLabel).toBe("Nuevo en este periodo");
    expect(metric.formattedValue).toContain("5");
  });

  test("computes net sales and estimated profit", () => {
    const gross = 100_000;
    const refunds = 12_000;
    const net = Math.max(0, gross - refunds);
    const cost = 40_000;
    const profit = net - cost;
    const margin = (profit / net) * 100;

    expect(net).toBe(88_000);
    expect(profit).toBe(48_000);
    expect(margin).toBeCloseTo(54.545, 2);
    expect(Math.max(0, 5_000 - 9_000)).toBe(0);
  });
});

describe("dashboard alerts", () => {
  test("builds typed alerts with actionable links", () => {
    const alerts = buildDashboardAlerts({
      paidWithoutDelivery: 2,
      failedDeliveries: 1,
      stalePendingDeliveries: 0,
      requiresReview: 3,
      failedPayments: 0,
      lowKeyStock: 4,
      activeWithoutStock: 1,
      failedSmm: 2,
      pendingRefunds: 1,
      approvedPaymentPendingOrder: 1,
    });

    expect(alerts[0]?.severity).toBe("critical");
    expect(alerts.some((alert) => alert.type === "LOW_KEY_STOCK")).toBeTrue();
    expect(
      alerts.find((alert) => alert.type === "LOW_KEY_STOCK")?.description,
    ).toContain(String(LOW_STOCK_THRESHOLD));
    expect(
      alerts.every(
        (alert) =>
          alert.href.startsWith("/admin/") &&
          !alert.description.toLowerCase().includes("token") &&
          !alert.description.toLowerCase().includes("password"),
      ),
    ).toBeTrue();
  });
});
