import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  PaymentRefundStatus,
  PaymentStatus,
  ProductKeyStatus,
  ProductStatus,
} from "@/generated/prisma/enums";
import { buildDashboardAlerts } from "@/lib/dashboard/alerts";
import {
  APPROVED_PAYMENT_STATUSES,
  BUSINESS_TIMEZONE,
  DASHBOARD_ACTIVITY_LIMIT,
  DASHBOARD_RECENT_LIMIT,
  DASHBOARD_TOP_PRODUCTS_LIMIT,
} from "@/lib/dashboard/constants";
import { buildCountMetric, buildMoneyMetric } from "@/lib/dashboard/metrics";
import {
  addZonedDays,
  formatZonedDateInput,
  resolveDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard/period";
import { getEurToClpRate } from "@/lib/fx/eur-clp";
import { createLogger } from "@/lib/logger";
import { formatMoney } from "@/lib/products/format";
import prisma from "@/lib/prisma";
import { transactionsHref } from "@/lib/transactions/url";
import type { AdminDashboardDto } from "@/types/dashboard";

const log = createLogger({ module: "admin-dashboard" });

const paymentStatusLabel: Record<string, string> = {
  PENDING: "Pendientes",
  PROCESSING: "Procesando",
  PAID: "Aprobadas",
  FAILED: "Fallidas",
  REJECTED: "Rechazadas",
  CANCELLED: "Canceladas",
  EXPIRED: "Expiradas",
  PARTIALLY_REFUNDED: "Reembolso parcial",
  REFUNDED: "Reembolsadas",
};

const orderStatusLabel: Record<string, string> = {
  PENDING: "Pendientes",
  PAID: "Pagados",
  PROCESSING: "Procesando",
  FULFILLED: "Completados",
  PARTIALLY_FULFILLED: "Parciales",
  CANCELED: "Cancelados",
  REFUNDED: "Reembolsados",
};

const deliveryStatusLabel: Record<string, string> = {
  PENDING: "Pendientes",
  PROCESSING: "En proceso",
  DELIVERED: "Completadas",
  FAILED: "Fallidas",
  CANCELED: "Canceladas",
};

const deliveryMethodLabel: Record<string, string> = {
  MANUAL: "Manual / keys",
  KINGUIN: "Kinguin",
  SMM: "SMM",
};

function paymentDateFilter(
  from: Date,
  to: Date,
): Prisma.PaymentWhereInput {
  return {
    OR: [
      { paidAt: { gte: from, lt: to } },
      {
        AND: [
          { paidAt: null },
          { confirmedAt: { gte: from, lt: to } },
        ],
      },
      {
        AND: [
          { paidAt: null },
          { confirmedAt: null },
          { createdAt: { gte: from, lt: to } },
        ],
      },
    ],
  };
}

async function sumApprovedPayments(from: Date, to: Date) {
  const result = await prisma.payment.aggregate({
    where: {
      status: { in: [...APPROVED_PAYMENT_STATUSES] },
      AND: [paymentDateFilter(from, to)],
    },
    _sum: { amount: true },
    _count: { id: true },
  });
  return {
    amount: Number(result._sum.amount ?? 0),
    count: result._count.id,
  };
}

async function sumConfirmedRefunds(from: Date, to: Date) {
  const result = await prisma.paymentRefund.aggregate({
    where: {
      status: PaymentRefundStatus.REFUNDED,
      OR: [
        { completedAt: { gte: from, lt: to } },
        {
          AND: [
            { completedAt: null },
            { requestedAt: { gte: from, lt: to } },
          ],
        },
      ],
    },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

async function countOrdersInRange(from: Date, to: Date) {
  return prisma.order.count({
    where: { createdAt: { gte: from, lt: to } },
  });
}

async function countBuyersInRange(from: Date, to: Date) {
  const rows = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      payments: { some: { status: { in: [...APPROVED_PAYMENT_STATUSES] } } },
    },
    select: { userId: true },
    distinct: ["userId"],
  });
  return rows.length;
}

async function countCompletedDeliveries(from: Date, to: Date) {
  return prisma.delivery.count({
    where: {
      status: "DELIVERED",
      OR: [
        { deliveredAt: { gte: from, lt: to } },
        {
          AND: [
            { deliveredAt: null },
            { updatedAt: { gte: from, lt: to } },
          ],
        },
      ],
    },
  });
}

type SeriesRow = {
  bucket: Date;
  gross: Prisma.Decimal | number;
  orders: bigint | number;
};

type RefundSeriesRow = {
  bucket: Date;
  refunds: Prisma.Decimal | number;
};

async function loadSalesSeries(
  from: Date,
  to: Date,
  bucket: DashboardPeriod["bucket"],
): Promise<SeriesRow[]> {
  const truncUnit =
    bucket === "hour" ? "hour" : bucket === "week" ? "week" : "day";
  const truncLiteral = Prisma.raw(`'${truncUnit}'`);
  const statuses = APPROVED_PAYMENT_STATUSES.map(
    (status) => Prisma.sql`${status}`,
  );

  return prisma.$queryRaw<SeriesRow[]>`
    SELECT
      date_trunc(${truncLiteral}, (
        (COALESCE(p."paidAt", p."confirmedAt", p."createdAt") AT TIME ZONE 'UTC')
        AT TIME ZONE ${BUSINESS_TIMEZONE}
      )) AS bucket,
      COALESCE(SUM(p.amount), 0) AS gross,
      COUNT(DISTINCT p."orderId") AS orders
    FROM payment p
    WHERE p.status IN (${Prisma.join(statuses)})
      AND COALESCE(p."paidAt", p."confirmedAt", p."createdAt") >= ${from}
      AND COALESCE(p."paidAt", p."confirmedAt", p."createdAt") < ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
}

async function loadRefundSeries(
  from: Date,
  to: Date,
  bucket: DashboardPeriod["bucket"],
): Promise<RefundSeriesRow[]> {
  const truncUnit =
    bucket === "hour" ? "hour" : bucket === "week" ? "week" : "day";
  const truncLiteral = Prisma.raw(`'${truncUnit}'`);

  return prisma.$queryRaw<RefundSeriesRow[]>`
    SELECT
      date_trunc(${truncLiteral}, (
        (COALESCE(r."completedAt", r."requestedAt") AT TIME ZONE 'UTC')
        AT TIME ZONE ${BUSINESS_TIMEZONE}
      )) AS bucket,
      COALESCE(SUM(r.amount), 0) AS refunds
    FROM payment_refund r
    WHERE r.status = 'REFUNDED'
      AND COALESCE(r."completedAt", r."requestedAt") >= ${from}
      AND COALESCE(r."completedAt", r."requestedAt") < ${to}
    GROUP BY 1
    ORDER BY 1 ASC
  `;
}

async function estimatePeriodCosts(from: Date, to: Date, eurClpRate: number | null) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        payments: {
          some: {
            status: { in: [...APPROVED_PAYMENT_STATUSES] },
            AND: [paymentDateFilter(from, to)],
          },
        },
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      deliveryMethod: true,
      product: { select: { sourceCostPrice: true } },
      delivery: {
        select: {
          requestPriceEur: true,
          smmCharge: true,
          smmCurrency: true,
        },
      },
    },
  });

  let estimatedCost = 0;
  let revenueWithKnownCost = 0;
  let totalRevenue = 0;
  let itemsWithCost = 0;

  for (const item of items) {
    const revenue = Number(item.unitPrice) * item.quantity;
    totalRevenue += revenue;

    let cost: number | null = null;
    const smmCharge = item.delivery?.smmCharge
      ? Number(item.delivery.smmCharge)
      : null;
    const smmCurrency = item.delivery?.smmCurrency?.toUpperCase() ?? null;
    const requestPriceEur = item.delivery?.requestPriceEur
      ? Number(item.delivery.requestPriceEur)
      : null;
    const sourceCost = item.product.sourceCostPrice
      ? Number(item.product.sourceCostPrice)
      : null;

    if (smmCharge != null && Number.isFinite(smmCharge)) {
      if (!smmCurrency || smmCurrency === "CLP") {
        cost = smmCharge;
      } else if (smmCurrency === "EUR" && eurClpRate) {
        cost = Math.round(smmCharge * eurClpRate);
      }
    }

    if (cost == null && requestPriceEur != null && eurClpRate) {
      cost = Math.round(requestPriceEur * eurClpRate) * item.quantity;
    }

    if (cost == null && sourceCost != null) {
      cost = sourceCost * item.quantity;
    }

    if (cost != null && Number.isFinite(cost) && cost >= 0) {
      estimatedCost += cost;
      revenueWithKnownCost += revenue;
      itemsWithCost += 1;
    }
  }

  return {
    estimatedCost,
    costCoveragePercentage:
      totalRevenue > 0 ? (revenueWithKnownCost / totalRevenue) * 100 : 0,
    itemsWithCost,
    itemCount: items.length,
  };
}

function formatBucketLabel(
  bucket: Date,
  mode: DashboardPeriod["bucket"],
): string {
  const formatter = new Intl.DateTimeFormat("es-CL", {
    timeZone: BUSINESS_TIMEZONE,
    ...(mode === "hour"
      ? { day: "2-digit", month: "short", hour: "2-digit" }
      : mode === "week"
        ? { day: "2-digit", month: "short" }
        : { day: "2-digit", month: "short" }),
  });
  return formatter.format(bucket);
}

async function getOperationalSnapshot() {
  const staleBefore = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const recentFailedSince = staleBefore;

  const [
    pendingOrders,
    pendingPayments,
    failedPayments,
    pendingDeliveries,
    failedDeliveries,
    smmProcessing,
    smmFailed,
    pendingRefunds,
    requiresReview,
    paidWithoutDelivery,
    approvedPaymentPendingOrder,
    stalePendingDeliveries,
    failedSmm,
  ] = await Promise.all([
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.payment.count({
      where: { status: { in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING] } },
    }),
    prisma.payment.count({
      where: {
        status: {
          in: [
            PaymentStatus.FAILED,
            PaymentStatus.REJECTED,
            PaymentStatus.EXPIRED,
          ],
        },
        createdAt: { gte: recentFailedSince },
      },
    }),
    prisma.delivery.count({
      where: { status: { in: ["PENDING", "PROCESSING"] } },
    }),
    prisma.delivery.count({ where: { status: "FAILED" } }),
    prisma.delivery.count({
      where: { deliveryMethod: "SMM", status: "PROCESSING" },
    }),
    prisma.delivery.count({
      where: { deliveryMethod: "SMM", status: "FAILED" },
    }),
    prisma.paymentRefund.count({
      where: {
        status: {
          in: [
            PaymentRefundStatus.CREATED,
            PaymentRefundStatus.ACCEPTED,
            PaymentRefundStatus.ERROR,
          ],
        },
      },
    }),
    prisma.payment.count({ where: { requiresReview: true } }),
    prisma.order.count({
      where: {
        payments: { some: { status: { in: [...APPROVED_PAYMENT_STATUSES] } } },
        items: { some: { delivery: null } },
      },
    }),
    prisma.payment.count({
      where: {
        status: { in: [...APPROVED_PAYMENT_STATUSES] },
        order: { status: "PENDING" },
      },
    }),
    prisma.delivery.count({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        createdAt: { lt: staleBefore },
      },
    }),
    prisma.delivery.count({
      where: { deliveryMethod: "SMM", status: "FAILED" },
    }),
  ]);

  return {
    pendingOrders,
    pendingPayments,
    failedPayments,
    pendingDeliveries,
    failedDeliveries,
    smmProcessing,
    smmFailed,
    pendingRefunds,
    requiresReview,
    paidWithoutDelivery,
    approvedPaymentPendingOrder,
    stalePendingDeliveries,
    failedSmm,
  };
}

async function getInventoryHealth() {
  const { getLowStockThreshold } = await import("@/lib/settings/runtime");
  const lowStockThreshold = await getLowStockThreshold();

  const [keyGroups, activeManual] = await Promise.all([
    prisma.productKey.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        deliveryMethod: "MANUAL",
      },
      select: {
        id: true,
        qty: true,
        _count: {
          select: {
            keys: { where: { status: ProductKeyStatus.AVAILABLE } },
          },
        },
      },
    }),
  ]);

  const byStatus = Object.fromEntries(
    keyGroups.map((row) => [row.status, row._count.id]),
  ) as Record<string, number>;

  const productsWithoutKeys = activeManual.filter(
    (product) => product._count.keys === 0 && product.qty <= 0,
  ).length;
  const activeWithoutStock = productsWithoutKeys;
  const lowStockProducts = activeManual.filter(
    (product) =>
      product._count.keys > 0 &&
      product._count.keys < lowStockThreshold,
  ).length;

  return {
    keysAvailable: byStatus.AVAILABLE ?? 0,
    keysReserved: byStatus.RESERVED ?? 0,
    keysSold: byStatus.SOLD ?? 0,
    productsWithoutKeys,
    lowStockProducts,
    activeWithoutStock,
    activeManualProducts: activeManual.length,
  };
}

async function getSalesByDeliveryMethod(from: Date, to: Date, currency: string) {
  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        payments: {
          some: {
            status: { in: [...APPROVED_PAYMENT_STATUSES] },
            AND: [paymentDateFilter(from, to)],
          },
        },
      },
    },
    select: {
      quantity: true,
      unitPrice: true,
      deliveryMethod: true,
    },
  });

  const totals = new Map<string, number>();
  for (const item of items) {
    const line = Number(item.unitPrice) * item.quantity;
    totals.set(
      item.deliveryMethod,
      (totals.get(item.deliveryMethod) ?? 0) + line,
    );
  }

  const grand = [...totals.values()].reduce((sum, value) => sum + value, 0);
  return [...totals.entries()]
    .map(([method, sales]) => ({
      method,
      label: deliveryMethodLabel[method] ?? method,
      sales,
      share: grand > 0 ? (sales / grand) * 100 : 0,
      formattedSales: formatMoney(sales, currency),
    }))
    .sort((a, b) => b.sales - a.sales);
}

async function getStatusDistributions() {
  const [orders, payments, deliveries] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.payment.groupBy({ by: ["status"], _count: { id: true } }),
    prisma.delivery.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  return {
    orderStatuses: orders.map((row) => ({
      status: row.status,
      label: orderStatusLabel[row.status] ?? row.status,
      count: row._count.id,
      href: `/admin/orders?status=${row.status}`,
    })),
    transactionStatuses: payments.map((row) => ({
      status: row.status,
      label: paymentStatusLabel[row.status] ?? row.status,
      count: row._count.id,
      href: transactionsHref(
        {
          page: 1,
          pageSize: 20,
          sort: "createdAt",
          order: "desc",
        },
        { status: row.status },
      ),
    })),
    deliveryStatuses: deliveries.map((row) => ({
      status: row.status,
      label: deliveryStatusLabel[row.status] ?? row.status,
      count: row._count.id,
      href: `/admin/deliveries?status=${row.status}`,
    })),
  };
}

async function getRecentLists() {
  const [orders, transactions, deliveries] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_RECENT_LIMIT,
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        email: true,
        customerName: true,
        createdAt: true,
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
        items: {
          select: { delivery: { select: { status: true } } },
        },
      },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: DASHBOARD_RECENT_LIMIT,
      select: {
        id: true,
        orderId: true,
        status: true,
        amount: true,
        currency: true,
        provider: true,
        createdAt: true,
        requiresReview: true,
      },
    }),
    prisma.delivery.findMany({
      where: { status: { in: ["FAILED", "PENDING", "PROCESSING"] } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: DASHBOARD_RECENT_LIMIT,
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        createdAt: true,
        orderItem: {
          select: {
            productName: true,
            order: { select: { id: true, email: true } },
          },
        },
      },
    }),
  ]);

  const now = Date.now();

  return {
    recentOrders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.id.slice(-10).toUpperCase(),
      customerName: order.customerName,
      email: order.email,
      total: Number(order.total),
      currency: order.currency,
      status: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
      deliveryStatuses: order.items.flatMap((item) =>
        item.delivery ? [item.delivery.status] : [],
      ),
      createdAt: order.createdAt.toISOString(),
    })),
    recentTransactions: transactions.map((tx) => ({
      id: tx.id,
      orderId: tx.orderId,
      orderNumber: tx.orderId.slice(-10).toUpperCase(),
      status: tx.status,
      amount: Number(tx.amount),
      currency: tx.currency,
      provider: tx.provider,
      createdAt: tx.createdAt.toISOString(),
      requiresReview: tx.requiresReview,
    })),
    pendingDeliveries: deliveries
      .sort((a, b) => {
        const rank = (status: string) =>
          status === "FAILED" ? 0 : status === "PENDING" ? 1 : 2;
        const byStatus = rank(a.status) - rank(b.status);
        if (byStatus !== 0) return byStatus;
        return a.createdAt.getTime() - b.createdAt.getTime();
      })
      .map((delivery) => ({
        id: delivery.id,
        productName: delivery.orderItem.productName,
        orderId: delivery.orderItem.order.id,
        orderNumber: delivery.orderItem.order.id.slice(-10).toUpperCase(),
        method: delivery.deliveryMethod,
        status: delivery.status,
        customerEmail: delivery.orderItem.order.email,
        createdAt: delivery.createdAt.toISOString(),
        ageHours: Math.max(
          0,
          Math.round((now - delivery.createdAt.getTime()) / (1000 * 60 * 60)),
        ),
      })),
  };
}

async function getTopProducts(from: Date, to: Date) {
  const { getLowStockThreshold } = await import("@/lib/settings/runtime");
  const lowStockThreshold = await getLowStockThreshold();

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        payments: {
          some: {
            status: { in: [...APPROVED_PAYMENT_STATUSES] },
            AND: [paymentDateFilter(from, to)],
          },
        },
      },
    },
    select: {
      productId: true,
      productName: true,
      quantity: true,
      unitPrice: true,
      deliveryMethod: true,
      product: {
        select: {
          slug: true,
          keys: {
            where: { status: ProductKeyStatus.AVAILABLE },
            select: { id: true },
            take: lowStockThreshold + 1,
          },
        },
      },
    },
  });

  const map = new Map<
    string,
    {
      productId: string;
      name: string;
      slug: string;
      deliveryMethod: string;
      quantitySold: number;
      revenue: number;
      availableKeys: number | null;
    }
  >();

  for (const item of items) {
    const current = map.get(item.productId) ?? {
      productId: item.productId,
      name: item.productName,
      slug: item.product.slug,
      deliveryMethod: item.deliveryMethod,
      quantitySold: 0,
      revenue: 0,
      availableKeys:
        item.deliveryMethod === "MANUAL" ? item.product.keys.length : null,
    };
    current.quantitySold += item.quantity;
    current.revenue += Number(item.unitPrice) * item.quantity;
    map.set(item.productId, current);
  }

  return [...map.values()]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, DASHBOARD_TOP_PRODUCTS_LIMIT)
    .map((row) => ({
      ...row,
      currency: "CLP",
      href: `/admin/products/${row.productId}`,
    }));
}

async function getRecentActivity() {
  const [orders, payments, deliveries, users] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, status: true, createdAt: true, email: true },
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, status: true, createdAt: true, amount: true, currency: true },
    }),
    prisma.delivery.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        status: true,
        updatedAt: true,
        orderItem: { select: { productName: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, createdAt: true },
    }),
  ]);

  const activity = [
    ...orders.map((order) => ({
      id: `order-${order.id}`,
      type: "ORDER_CREATED",
      title: "Pedido creado",
      description: `#${order.id.slice(-10).toUpperCase()} · ${order.status}`,
      createdAt: order.createdAt.toISOString(),
      href: `/admin/orders/${order.id}`,
    })),
    ...payments.map((payment) => ({
      id: `payment-${payment.id}`,
      type:
        payment.status === "PAID"
          ? "PAYMENT_APPROVED"
          : payment.status === "FAILED" || payment.status === "REJECTED"
            ? "PAYMENT_FAILED"
            : "PAYMENT_UPDATED",
      title:
        payment.status === "PAID"
          ? "Pago aprobado"
          : payment.status === "FAILED" || payment.status === "REJECTED"
            ? "Pago fallido"
            : "Transacción actualizada",
      description: `${formatMoney(Number(payment.amount), payment.currency)} · ${payment.status}`,
      createdAt: payment.createdAt.toISOString(),
      href: `/admin/transactions/${payment.id}`,
    })),
    ...deliveries.map((delivery) => ({
      id: `delivery-${delivery.id}`,
      type:
        delivery.status === "DELIVERED"
          ? "DELIVERY_COMPLETED"
          : delivery.status === "FAILED"
            ? "DELIVERY_FAILED"
            : "DELIVERY_UPDATED",
      title:
        delivery.status === "DELIVERED"
          ? "Entrega completada"
          : delivery.status === "FAILED"
            ? "Entrega fallida"
            : "Entrega actualizada",
      description: `${delivery.orderItem.productName} · ${delivery.status}`,
      createdAt: delivery.updatedAt.toISOString(),
      href: `/admin/deliveries/${delivery.id}`,
    })),
    ...users.map((user) => ({
      id: `user-${user.id}`,
      type: "USER_REGISTERED",
      title: "Usuario registrado",
      description: user.name,
      createdAt: user.createdAt.toISOString(),
      href: `/admin/users/${user.id}`,
    })),
  ]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, DASHBOARD_ACTIVITY_LIMIT);

  return activity;
}

function greetingForHour(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

export async function getAdminDashboard(input: {
  range?: string;
  from?: string;
  to?: string;
  adminName: string;
}): Promise<AdminDashboardDto> {
  const startedAt = performance.now();
  const period = resolveDashboardPeriod(input);
  const currency = "CLP";

  let eurClpRate: number | null = null;
  try {
    eurClpRate = await getEurToClpRate();
  } catch (error) {
    log.warn({ err: error }, "dashboard.eur_clp_rate_unavailable");
  }

  const [
    currentSales,
    previousSales,
    currentRefunds,
    previousRefunds,
    currentOrders,
    previousOrders,
    currentBuyers,
    previousBuyers,
    currentDeliveries,
    previousDeliveries,
    operational,
    inventory,
    distributions,
    recent,
    topProducts,
    activity,
    currentSeries,
    previousSeries,
    currentRefundSeries,
    currentCosts,
    previousCosts,
    salesByMethod,
    smmCounts,
  ] = await Promise.all([
    sumApprovedPayments(period.from, period.to),
    sumApprovedPayments(period.previousFrom, period.previousTo),
    sumConfirmedRefunds(period.from, period.to),
    sumConfirmedRefunds(period.previousFrom, period.previousTo),
    countOrdersInRange(period.from, period.to),
    countOrdersInRange(period.previousFrom, period.previousTo),
    countBuyersInRange(period.from, period.to),
    countBuyersInRange(period.previousFrom, period.previousTo),
    countCompletedDeliveries(period.from, period.to),
    countCompletedDeliveries(period.previousFrom, period.previousTo),
    getOperationalSnapshot(),
    getInventoryHealth(),
    getStatusDistributions(),
    getRecentLists(),
    getTopProducts(period.from, period.to),
    getRecentActivity(),
    loadSalesSeries(period.from, period.to, period.bucket),
    loadSalesSeries(period.previousFrom, period.previousTo, period.bucket),
    loadRefundSeries(period.from, period.to, period.bucket),
    estimatePeriodCosts(period.from, period.to, eurClpRate),
    estimatePeriodCosts(period.previousFrom, period.previousTo, eurClpRate),
    getSalesByDeliveryMethod(period.from, period.to, currency),
    prisma.delivery.groupBy({
      by: ["status"],
      where: { deliveryMethod: "SMM" },
      _count: { id: true },
    }),
  ]);

  const netSales = Math.max(0, currentSales.amount - currentRefunds);
  const previousNet = Math.max(0, previousSales.amount - previousRefunds);
  const estimatedProfit = netSales - currentCosts.estimatedCost;
  const previousProfit = previousNet - previousCosts.estimatedCost;
  const marginPercentage =
    netSales > 0 ? (estimatedProfit / netSales) * 100 : null;
  const averageTicket =
    currentOrders > 0 ? netSales / currentOrders : 0;
  const previousAverage =
    previousOrders > 0 ? previousNet / previousOrders : 0;

  const refundByBucket = new Map(
    currentRefundSeries.map((row) => [
      new Date(row.bucket).toISOString(),
      Number(row.refunds),
    ]),
  );
  const previousNetByIndex = new Map(
    previousSeries.map((row, index) => {
      const gross = Number(row.gross);
      return [index, gross] as const;
    }),
  );

  const salesSeries = currentSeries.map((row, index) => {
    const key = new Date(row.bucket).toISOString();
    const gross = Number(row.gross);
    const refunds = refundByBucket.get(key) ?? 0;
    return {
      key,
      label: formatBucketLabel(new Date(row.bucket), period.bucket),
      gross,
      refunds,
      net: Math.max(0, gross - refunds),
      orders: Number(row.orders),
      previousNet: previousNetByIndex.get(index) ?? null,
    };
  });

  const alerts = buildDashboardAlerts({
    paidWithoutDelivery: operational.paidWithoutDelivery,
    failedDeliveries: operational.failedDeliveries,
    stalePendingDeliveries: operational.stalePendingDeliveries,
    requiresReview: operational.requiresReview,
    failedPayments: operational.failedPayments,
    lowKeyStock: inventory.lowStockProducts,
    activeWithoutStock: inventory.activeWithoutStock,
    failedSmm: operational.failedSmm,
    pendingRefunds: operational.pendingRefunds,
    approvedPaymentPendingOrder: operational.approvedPaymentPendingOrder,
  });

  const smm = {
    pending: 0,
    processing: 0,
    delivered: 0,
    failed: 0,
    canceled: 0,
  };
  for (const row of smmCounts) {
    if (row.status === "PENDING") smm.pending = row._count.id;
    if (row.status === "PROCESSING") smm.processing = row._count.id;
    if (row.status === "DELIVERED") smm.delivered = row._count.id;
    if (row.status === "FAILED") smm.failed = row._count.id;
    if (row.status === "CANCELED") smm.canceled = row._count.id;
  }

  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BUSINESS_TIMEZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );

  const dto: AdminDashboardDto = {
    period: {
      preset: period.preset,
      label: period.label,
      previousLabel: period.previousLabel,
      from: formatZonedDateInput(period.from),
      to: period.to.toISOString(),
      toInclusive: formatZonedDateInput(addZonedDays(period.to, -1)),
      bucket: period.bucket,
    },
    generatedAt: new Date().toISOString(),
    greetingName: input.adminName.split(" ")[0] || input.adminName,
    currency,
    salesBasis: currentRefunds > 0 ? "net" : "gross",
    finance: {
      gross: buildMoneyMetric(
        currentSales.amount,
        previousSales.amount,
        currency,
      ),
      refunds: buildMoneyMetric(currentRefunds, previousRefunds, currency),
      net: buildMoneyMetric(netSales, previousNet, currency),
      estimatedCost: buildMoneyMetric(
        currentCosts.estimatedCost,
        previousCosts.estimatedCost,
        currency,
      ),
      estimatedProfit: buildMoneyMetric(
        estimatedProfit,
        previousProfit,
        currency,
      ),
      marginPercentage,
      costCoveragePercentage: currentCosts.costCoveragePercentage,
      costNote:
        currentCosts.itemCount === 0
          ? "Sin ítems con pago aprobado en el periodo."
          : `Costo estimado en ${currentCosts.itemsWithCost}/${currentCosts.itemCount} ítems (${currentCosts.costCoveragePercentage.toFixed(0)}% del ingreso con costo conocido). Usa cargo SMM, precio Kinguin EUR o sourceCostPrice.`,
      eurClpRate,
    },
    metrics: {
      netSales: buildMoneyMetric(netSales, previousNet, currency),
      grossSales: buildMoneyMetric(
        currentSales.amount,
        previousSales.amount,
        currency,
      ),
      refunds: buildMoneyMetric(currentRefunds, previousRefunds, currency),
      estimatedCost: buildMoneyMetric(
        currentCosts.estimatedCost,
        previousCosts.estimatedCost,
        currency,
      ),
      estimatedProfit: buildMoneyMetric(
        estimatedProfit,
        previousProfit,
        currency,
      ),
      orders: buildCountMetric(
        currentOrders,
        previousOrders,
        `${operational.pendingOrders} pendientes`,
      ),
      averageTicket: buildMoneyMetric(
        averageTicket,
        previousAverage,
        currency,
      ),
      buyers: buildCountMetric(currentBuyers, previousBuyers),
      approvedPayments: buildCountMetric(
        currentSales.count,
        previousSales.count,
      ),
      completedDeliveries: buildCountMetric(
        currentDeliveries,
        previousDeliveries,
      ),
    },
    operational: {
      pendingOrders: operational.pendingOrders,
      pendingPayments: operational.pendingPayments,
      failedPayments: operational.failedPayments,
      pendingDeliveries: operational.pendingDeliveries,
      failedDeliveries: operational.failedDeliveries,
      smmProcessing: operational.smmProcessing,
      smmFailed: operational.smmFailed,
      pendingRefunds: operational.pendingRefunds,
      requiresReview: operational.requiresReview,
    },
    alerts,
    salesSeries,
    salesByDeliveryMethod: salesByMethod,
    orderStatuses: distributions.orderStatuses,
    transactionStatuses: distributions.transactionStatuses,
    deliveryStatuses: distributions.deliveryStatuses,
    inventory,
    smm,
    recentOrders: recent.recentOrders,
    recentTransactions: recent.recentTransactions,
    pendingDeliveries: recent.pendingDeliveries,
    topProducts,
    activity,
    quickActions: [
      {
        href: "/admin/products/new",
        label: "Crear producto",
        description: "Alta rápida de inventario",
      },
      {
        href: "/admin/orders?status=PENDING",
        label: "Pedidos pendientes",
        description: "Revisar checkouts abiertos",
      },
      {
        href: "/admin/deliveries?status=FAILED",
        label: "Entregas fallidas",
        description: "Intervenir fulfillment",
      },
      {
        href: "/admin/transactions?requiresReview=true",
        label: "Conciliar pagos",
        description: "Transacciones en revisión",
      },
      {
        href: "/admin/products?status=ACTIVE",
        label: "Inventario activo",
        description: "Revisar stock entregable",
      },
      {
        href: "/admin/categories/new",
        label: "Crear categoría",
        description: "Organizar catálogo",
      },
    ],
  };

  log.info(
    {
      action: "getAdminDashboard",
      range: period.preset,
      from: period.from.toISOString(),
      to: period.to.toISOString(),
      alertCount: alerts.length,
      durationMs: Math.round(performance.now() - startedAt),
      result: "success",
    },
    "Admin dashboard loaded",
  );

  return {
    ...dto,
    greetingName: `${greetingForHour(hour)}, ${dto.greetingName}`,
  };
}
