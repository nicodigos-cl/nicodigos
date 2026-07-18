import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { PaymentStatus } from "@/generated/prisma/enums";
import { isAdminEmailByEnv } from "@/lib/auth/admin-allowlist";
import prisma from "@/lib/prisma";
import { detectUserReviewIssues } from "@/lib/users/review";
import { isValidRut } from "@/lib/validations/rut";
import type {
  UserDetailQuery,
  UsersListQuery,
} from "@/lib/validations/users";
import type {
  DerivedUserStatus,
  UserAccountProviderDto,
  UserAdminNoteDto,
  UserBillingDto,
  UserCommerceSummaryDto,
  UserDeliveryRowDto,
  UserDetailDto,
  UserListItemDto,
  UserMetricsDto,
  UserOrderRowDto,
  UserSessionRowDto,
  UserTimelineEventDto,
  UserTransactionRowDto,
} from "@/types/users";

const successfulPaymentStatuses: PaymentStatus[] = [
  PaymentStatus.PAID,
  PaymentStatus.PARTIALLY_REFUNDED,
  PaymentStatus.REFUNDED,
];

const failedPaymentStatuses: PaymentStatus[] = [
  PaymentStatus.FAILED,
  PaymentStatus.REJECTED,
  PaymentStatus.CANCELLED,
  PaymentStatus.EXPIRED,
];

const iso = (date: Date | null | undefined) => date?.toISOString() ?? null;

function maskReference(value: string | null | undefined) {
  if (!value) return null;
  if (value.length <= 10) return `${value.slice(0, 3)}•••`;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function maskIp(ip: string | null | undefined) {
  if (!ip) return null;
  if (ip.includes(".")) {
    const parts = ip.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.•••.•••`;
  }
  if (ip.includes(":")) {
    const parts = ip.split(":");
    return `${parts.slice(0, 2).join(":")}:••••`;
  }
  return `${ip.slice(0, 4)}•••`;
}

function summarizeUserAgent(ua: string | null | undefined) {
  if (!ua) return "Dispositivo desconocido";
  const browser =
    /Edg\//.test(ua)
      ? "Edge"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iOS/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "SO desconocido";
  return `${browser} · ${os}`;
}

function deriveStatus(input: {
  accountStatus: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "ANONYMIZED";
  emailVerified: boolean;
  requiresReview: boolean;
}): DerivedUserStatus {
  if (input.accountStatus === "ANONYMIZED") return "ANONYMIZED";
  if (input.accountStatus === "SUSPENDED") return "SUSPENDED";
  if (input.accountStatus === "RESTRICTED") return "RESTRICTED";
  if (input.requiresReview) return "NEEDS_REVIEW";
  if (!input.emailVerified) return "UNVERIFIED";
  return "ACTIVE";
}

function billingCompleteness(user: {
  invoiceType: "BOLETA" | "FACTURA";
  rut: string | null;
  businessName: string | null;
  businessActivity: string | null;
  addressLine1: string | null;
  commune: string | null;
  region: string | null;
}): UserBillingDto["completeness"] {
  if (user.invoiceType === "FACTURA") {
    const complete = Boolean(
      user.rut &&
        user.businessName &&
        user.businessActivity &&
        user.addressLine1 &&
        user.commune &&
        user.region,
    );
    if (complete) return "complete";
    if (user.rut || user.businessName) return "partial";
    return "incomplete";
  }
  if (user.rut && user.addressLine1) return "complete";
  if (user.rut || user.addressLine1 || user.commune) return "partial";
  return "incomplete";
}

function hasFilterSignal(query: UsersListQuery) {
  return Object.entries(query).some(
    ([key, value]) =>
      !["page", "pageSize", "sort", "order"].includes(key) &&
      value !== undefined,
  );
}

function spentFilterIds(min?: number, max?: number) {
  return prisma.payment
    .groupBy({
      by: ["orderId"],
      where: { status: { in: successfulPaymentStatuses } },
      _sum: { amount: true },
    })
    .then(async (rows) => {
      const orderIds = rows
        .filter((row) => {
          const amount = Number(row._sum.amount ?? 0);
          if (min != null && amount < min) return false;
          if (max != null && amount > max) return false;
          return true;
        })
        .map((row) => row.orderId);
      if (orderIds.length === 0) return [] as string[];
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: { userId: true },
        distinct: ["userId"],
      });
      return orders.map((order) => order.userId);
    });
}

async function buildWhere(
  query: UsersListQuery,
): Promise<Prisma.UserWhereInput> {
  const and: Prisma.UserWhereInput[] = [];

  if (query.q) {
    const q = query.q;
    and.push({
      OR: [
        { id: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { rut: { contains: q, mode: "insensitive" } },
        { businessName: { contains: q, mode: "insensitive" } },
        { orders: { some: { id: { contains: q, mode: "insensitive" } } } },
        {
          orders: {
            some: {
              payments: { some: { id: { contains: q, mode: "insensitive" } } },
            },
          },
        },
        {
          orders: {
            some: {
              payments: {
                some: {
                  externalId: { contains: q, mode: "insensitive" },
                },
              },
            },
          },
        },
      ],
    });
  }

  if (query.role) and.push({ role: query.role });
  if (query.accountStatus) and.push({ accountStatus: query.accountStatus });
  if (query.emailVerified != null) {
    and.push({ emailVerified: query.emailVerified });
  }
  if (query.withOrders) and.push({ orders: { some: {} } });
  if (query.withoutOrders) and.push({ orders: { none: {} } });
  if (query.withApprovedPurchases) {
    and.push({
      orders: {
        some: {
          payments: { some: { status: { in: successfulPaymentStatuses } } },
        },
      },
    });
  }
  if (query.withFailedPayments) {
    and.push({
      orders: {
        some: {
          payments: { some: { status: { in: failedPaymentStatuses } } },
        },
      },
    });
  }
  if (query.withPendingDeliveries) {
    and.push({
      orders: {
        some: {
          items: {
            some: {
              delivery: { status: { in: ["PENDING", "PROCESSING"] } },
            },
          },
        },
      },
    });
  }
  if (query.withCompleteBilling) {
    and.push({
      OR: [
        {
          invoiceType: "BOLETA",
          rut: { not: null },
          addressLine1: { not: null },
        },
        {
          invoiceType: "FACTURA",
          rut: { not: null },
          businessName: { not: null },
          businessActivity: { not: null },
          addressLine1: { not: null },
        },
      ],
    });
  }
  if (query.withRut) and.push({ rut: { not: null } });
  if (query.registeredFrom || query.registeredTo) {
    and.push({
      createdAt: {
        gte: query.registeredFrom
          ? new Date(query.registeredFrom)
          : undefined,
        lte: query.registeredTo ? new Date(query.registeredTo) : undefined,
      },
    });
  }
  if (query.activeFrom || query.activeTo) {
    and.push({
      lastActivityAt: {
        gte: query.activeFrom ? new Date(query.activeFrom) : undefined,
        lte: query.activeTo ? new Date(query.activeTo) : undefined,
      },
    });
  }
  if (query.requiresReview) and.push({ requiresReview: true });
  if (query.adminsOnly) and.push({ role: "ADMIN" });
  if (query.blockedOnly) {
    and.push({ accountStatus: { in: ["RESTRICTED", "SUSPENDED"] } });
  }
  if (query.minSpent != null || query.maxSpent != null) {
    const userIds = await spentFilterIds(query.minSpent, query.maxSpent);
    and.push({ id: { in: userIds.length ? userIds : ["__none__"] } });
  }

  return and.length ? { AND: and } : {};
}

type AggregateBag = {
  orderCount: number;
  totalSpent: number;
  transactionCount: number;
  deliveryCount: number;
  currency: string;
  hasPassword: boolean;
};

async function loadAggregates(
  userIds: string[],
): Promise<Map<string, AggregateBag>> {
  const map = new Map<string, AggregateBag>();
  for (const id of userIds) {
    map.set(id, {
      orderCount: 0,
      totalSpent: 0,
      transactionCount: 0,
      deliveryCount: 0,
      currency: "CLP",
      hasPassword: false,
    });
  }
  if (userIds.length === 0) return map;

  const [orderGroups, payments, deliveries, accounts, txCounts] =
    await Promise.all([
      prisma.order.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _count: { id: true },
      }),
      prisma.payment.findMany({
        where: {
          status: { in: successfulPaymentStatuses },
          order: { userId: { in: userIds } },
        },
        select: {
          amount: true,
          currency: true,
          order: { select: { userId: true } },
        },
      }),
      prisma.delivery.findMany({
        where: { orderItem: { order: { userId: { in: userIds } } } },
        select: {
          orderItem: { select: { order: { select: { userId: true } } } },
        },
      }),
      prisma.account.findMany({
        where: { userId: { in: userIds }, password: { not: null } },
        select: { userId: true },
      }),
      prisma.payment.groupBy({
        by: ["orderId"],
        where: { order: { userId: { in: userIds } } },
        _count: { id: true },
      }),
    ]);

  for (const group of orderGroups) {
    const entry = map.get(group.userId);
    if (entry) entry.orderCount = group._count.id;
  }

  const orderUser = await prisma.order.findMany({
    where: { id: { in: txCounts.map((row) => row.orderId) } },
    select: { id: true, userId: true },
  });
  const orderUserMap = new Map(orderUser.map((row) => [row.id, row.userId]));
  for (const row of txCounts) {
    const userId = orderUserMap.get(row.orderId);
    if (!userId) continue;
    const entry = map.get(userId);
    if (entry) entry.transactionCount += row._count.id;
  }

  for (const payment of payments) {
    const entry = map.get(payment.order.userId);
    if (!entry) continue;
    entry.totalSpent += Number(payment.amount);
    entry.currency = payment.currency;
  }

  for (const delivery of deliveries) {
    const entry = map.get(delivery.orderItem.order.userId);
    if (entry) entry.deliveryCount += 1;
  }

  for (const account of accounts) {
    const entry = map.get(account.userId);
    if (entry) entry.hasPassword = true;
  }

  return map;
}

export async function getAdminUsers(query: UsersListQuery) {
  const where = await buildWhere(query);
  const total = await prisma.user.count({ where });

  const aggregateSort = [
    "orderCount",
    "totalSpent",
    "transactionCount",
    "deliveryCount",
  ].includes(query.sort);

  let rows: Array<{
    id: string;
    name: string;
    email: string;
    image: string | null;
    role: "USER" | "ADMIN";
    accountStatus: "ACTIVE" | "RESTRICTED" | "SUSPENDED" | "ANONYMIZED";
    emailVerified: boolean;
    requiresReview: boolean;
    lastActivityAt: Date | null;
    createdAt: Date;
  }>;

  if (!aggregateSort) {
    const orderBy: Prisma.UserOrderByWithRelationInput =
      query.sort === "name"
        ? { name: query.order }
        : query.sort === "lastActivityAt"
          ? { lastActivityAt: query.order }
          : { createdAt: query.order };

    rows = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        accountStatus: true,
        emailVerified: true,
        requiresReview: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  } else if (query.sort === "orderCount") {
    rows = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        accountStatus: true,
        emailVerified: true,
        requiresReview: true,
        lastActivityAt: true,
        createdAt: true,
      },
      orderBy: { orders: { _count: query.order } },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
  } else {
    const candidates = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        accountStatus: true,
        emailVerified: true,
        requiresReview: true,
        lastActivityAt: true,
        createdAt: true,
      },
    });
    const aggregates = await loadAggregates(candidates.map((row) => row.id));
    const sorted = [...candidates].sort((a, b) => {
      const left = aggregates.get(a.id)!;
      const right = aggregates.get(b.id)!;
      const leftValue =
        query.sort === "totalSpent"
          ? left.totalSpent
          : query.sort === "transactionCount"
            ? left.transactionCount
            : left.deliveryCount;
      const rightValue =
        query.sort === "totalSpent"
          ? right.totalSpent
          : query.sort === "transactionCount"
            ? right.transactionCount
            : right.deliveryCount;
      return query.order === "asc"
        ? leftValue - rightValue
        : rightValue - leftValue;
    });
    rows = sorted.slice(
      (query.page - 1) * query.pageSize,
      query.page * query.pageSize,
    );
  }

  const aggregates = await loadAggregates(rows.map((row) => row.id));
  const items: UserListItemDto[] = rows.map((row) => {
    const stats = aggregates.get(row.id)!;
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      role: row.role,
      accountStatus: row.accountStatus,
      derivedStatus: deriveStatus(row),
      emailVerified: row.emailVerified,
      hasPassword: stats.hasPassword,
      orderCount: stats.orderCount,
      totalSpent: stats.totalSpent,
      currency: stats.currency,
      lastActivityAt: iso(row.lastActivityAt),
      createdAt: row.createdAt.toISOString(),
      requiresReview: row.requiresReview,
      isEnvAdmin: isAdminEmailByEnv(row.email),
    };
  });

  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize) || 1),
  };
}

export async function getUserMetrics(
  query: UsersListQuery,
): Promise<UserMetricsDto> {
  const where = await buildWhere(query);
  const recentCutoff = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const periodFrom = query.registeredFrom
    ? new Date(query.registeredFrom)
    : recentCutoff;
  const periodTo = query.registeredTo ? new Date(query.registeredTo) : new Date();

  const [
    total,
    newInPeriod,
    withOrders,
    withCompletedPurchases,
    admins,
    blockedOrRestricted,
    recentlyActive,
    needsReview,
  ] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.count({
      where: {
        AND: [where, { createdAt: { gte: periodFrom, lte: periodTo } }],
      },
    }),
    prisma.user.count({ where: { AND: [where, { orders: { some: {} } }] } }),
    prisma.user.count({
      where: {
        AND: [
          where,
          {
            orders: {
              some: {
                payments: {
                  some: { status: { in: successfulPaymentStatuses } },
                },
              },
            },
          },
        ],
      },
    }),
    prisma.user.count({ where: { AND: [where, { role: "ADMIN" }] } }),
    prisma.user.count({
      where: {
        AND: [
          where,
          { accountStatus: { in: ["RESTRICTED", "SUSPENDED"] } },
        ],
      },
    }),
    prisma.user.count({
      where: {
        AND: [where, { lastActivityAt: { gte: recentCutoff } }],
      },
    }),
    prisma.user.count({
      where: { AND: [where, { requiresReview: true }] },
    }),
  ]);

  return {
    total,
    newInPeriod,
    withOrders,
    withCompletedPurchases,
    admins,
    blockedOrRestricted,
    recentlyActive,
    needsReview,
    scope: hasFilterSignal(query) ? "filtered" : "global",
    periodFrom: periodFrom.toISOString(),
    periodTo: periodTo.toISOString(),
  };
}

async function getCommerceSummary(
  userId: string,
): Promise<UserCommerceSummaryDto> {
  const [
    orderCount,
    paidOrders,
    payments,
    deliveryCount,
    refunds,
    pendingOrderCount,
    pendingDeliveryCount,
    recentFailedPaymentCount,
    activeNoteCount,
  ] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.order.findMany({
      where: {
        userId,
        OR: [
          { status: { in: ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED", "REFUNDED"] } },
          { payments: { some: { status: { in: successfulPaymentStatuses } } } },
        ],
      },
      select: {
        id: true,
        createdAt: true,
        payments: {
          where: { status: { in: successfulPaymentStatuses } },
          select: { amount: true, currency: true, paidAt: true, createdAt: true },
        },
        items: { select: { delivery: { select: { id: true } } } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.payment.count({ where: { order: { userId } } }),
    prisma.delivery.count({
      where: { orderItem: { order: { userId } } },
    }),
    prisma.paymentRefund.findMany({
      where: { payment: { order: { userId } } },
      select: { amount: true, status: true },
    }),
    prisma.order.count({
      where: { userId, status: { in: ["PENDING", "PAID", "PROCESSING"] } },
    }),
    prisma.delivery.count({
      where: {
        orderItem: { order: { userId } },
        status: { in: ["PENDING", "PROCESSING"] },
      },
    }),
    prisma.payment.count({
      where: {
        order: { userId },
        status: { in: failedPaymentStatuses },
        createdAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
      },
    }),
    prisma.userAdminNote.count({
      where: { userId, resolvedAt: null },
    }),
  ]);

  let totalSpent = 0;
  let currency = "CLP";
  let firstPurchaseAt: string | null = null;
  let lastPurchaseAt: string | null = null;
  let paidOrdersWithoutDelivery = 0;

  for (const order of paidOrders) {
    const approved = order.payments;
    if (approved.length === 0) continue;
    for (const payment of approved) {
      totalSpent += Number(payment.amount);
      currency = payment.currency;
      const stamp = iso(payment.paidAt ?? payment.createdAt);
      if (stamp && (!firstPurchaseAt || stamp < firstPurchaseAt)) {
        firstPurchaseAt = stamp;
      }
      if (stamp && (!lastPurchaseAt || stamp > lastPurchaseAt)) {
        lastPurchaseAt = stamp;
      }
    }
    if (order.items.every((item) => !item.delivery)) {
      paidOrdersWithoutDelivery += 1;
    }
  }

  void paidOrdersWithoutDelivery;

  return {
    orderCount,
    paidOrderCount: paidOrders.length,
    totalSpent,
    currency,
    transactionCount: payments,
    deliveryCount,
    refundCount: refunds.length,
    refundAmount: refunds.reduce((sum, row) => sum + Number(row.amount), 0),
    firstPurchaseAt,
    lastPurchaseAt,
    pendingOrderCount,
    pendingDeliveryCount,
    recentFailedPaymentCount,
    activeNoteCount,
  };
}

export async function getUserOrdersPage(
  userId: string,
  page: number,
  pageSize: number,
) {
  const where = { userId };
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        total: true,
        currency: true,
        createdAt: true,
        items: {
          select: {
            id: true,
            delivery: { select: { status: true } },
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: UserOrderRowDto[] = rows.map((row) => ({
    id: row.id,
    orderNumber: row.id.slice(-10).toUpperCase(),
    status: row.status,
    total: Number(row.total),
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    itemsCount: row.items.length,
    paymentStatus: row.payments[0]?.status ?? null,
    deliveryStatuses: row.items.flatMap((item) =>
      item.delivery ? [item.delivery.status] : [],
    ),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function getUserTransactionsPage(
  userId: string,
  page: number,
  pageSize: number,
) {
  const where = { order: { userId } };
  const [total, rows] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: {
        id: true,
        provider: true,
        status: true,
        amount: true,
        currency: true,
        externalId: true,
        createdAt: true,
        orderId: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: UserTransactionRowDto[] = rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency,
    orderId: row.orderId,
    orderNumber: row.orderId.slice(-10).toUpperCase(),
    createdAt: row.createdAt.toISOString(),
    externalReference: maskReference(row.externalId),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function getUserDeliveriesPage(
  userId: string,
  page: number,
  pageSize: number,
) {
  const where = { orderItem: { order: { userId } } };
  const [total, rows] = await prisma.$transaction([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        externalOrderId: true,
        createdAt: true,
        orderItem: {
          select: {
            productName: true,
            order: { select: { id: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const items: UserDeliveryRowDto[] = rows.map((row) => ({
    id: row.id,
    productName: row.orderItem.productName,
    orderId: row.orderItem.order.id,
    orderNumber: row.orderItem.order.id.slice(-10).toUpperCase(),
    method: row.deliveryMethod,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    externalReference: maskReference(row.externalOrderId),
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

function mapNote(note: {
  id: string;
  category: UserAdminNoteDto["category"];
  priority: UserAdminNoteDto["priority"];
  content: string;
  authorEmail: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserAdminNoteDto {
  return {
    id: note.id,
    category: note.category,
    priority: note.priority,
    content: note.content,
    authorEmail: note.authorEmail,
    resolvedAt: iso(note.resolvedAt),
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function mapSession(session: {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}): UserSessionRowDto {
  return {
    id: session.id,
    userAgentSummary: summarizeUserAgent(session.userAgent),
    ipMasked: maskIp(session.ipAddress),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    isExpired: session.expiresAt.getTime() <= Date.now(),
  };
}

function mapProvider(account: {
  id: string;
  providerId: string;
  accountId: string;
  password: string | null;
  createdAt: Date;
}): UserAccountProviderDto {
  return {
    id: account.id,
    providerId: account.providerId,
    accountIdMasked: maskReference(account.accountId) ?? "•••",
    hasPassword: Boolean(account.password),
    createdAt: account.createdAt.toISOString(),
  };
}

async function buildTimeline(
  userId: string,
  email: string,
): Promise<UserTimelineEventDto[]> {
  const [adminEvents, orders, payments, deliveries, sessions] =
    await Promise.all([
      prisma.userAdminEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 40,
        select: {
          id: true,
          type: true,
          message: true,
          createdAt: true,
        },
      }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, status: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { order: { userId } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          createdAt: true,
          confirmedAt: true,
        },
      }),
      prisma.delivery.findMany({
        where: { orderItem: { order: { userId } } },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          status: true,
          createdAt: true,
          deliveredAt: true,
        },
      }),
      prisma.session.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, createdAt: true },
      }),
    ]);

  const events: UserTimelineEventDto[] = [];

  for (const event of adminEvents) {
    events.push({
      id: `admin-${event.id}`,
      source: "admin",
      type: event.type,
      message: event.message ?? event.type,
      createdAt: event.createdAt.toISOString(),
    });
  }

  for (const order of orders) {
    events.push({
      id: `order-${order.id}`,
      source: "order",
      type: "ORDER_CREATED",
      message: `Pedido #${order.id.slice(-10).toUpperCase()} creado (${order.status})`,
      createdAt: order.createdAt.toISOString(),
      href: `/admin/orders/${order.id}`,
    });
  }

  for (const payment of payments) {
    events.push({
      id: `payment-${payment.id}-created`,
      source: "payment",
      type: "PAYMENT_CREATED",
      message: `Pago iniciado (${payment.status})`,
      createdAt: payment.createdAt.toISOString(),
      href: `/admin/transactions/${payment.id}`,
    });
    if (
      payment.confirmedAt &&
      successfulPaymentStatuses.includes(payment.status)
    ) {
      events.push({
        id: `payment-${payment.id}-paid`,
        source: "payment",
        type: "PAYMENT_APPROVED",
        message: "Pago aprobado",
        createdAt: payment.confirmedAt.toISOString(),
        href: `/admin/transactions/${payment.id}`,
      });
    }
  }

  for (const delivery of deliveries) {
    events.push({
      id: `delivery-${delivery.id}`,
      source: "delivery",
      type: "DELIVERY_UPDATED",
      message: `Entrega ${delivery.status.toLowerCase()}`,
      createdAt: (delivery.deliveredAt ?? delivery.createdAt).toISOString(),
      href: `/admin/deliveries/${delivery.id}`,
    });
  }

  for (const session of sessions) {
    events.push({
      id: `session-${session.id}`,
      source: "session",
      type: "SESSION_CREATED",
      message: "Inicio de sesión",
      createdAt: session.createdAt.toISOString(),
    });
  }

  events.push({
    id: `account-${userId}`,
    source: "account",
    type: "ACCOUNT_CREATED",
    message: `Cuenta creada (${email})`,
    createdAt:
      (
        await prisma.user.findUnique({
          where: { id: userId },
          select: { createdAt: true },
        })
      )?.createdAt.toISOString() ?? new Date(0).toISOString(),
  });

  return events
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 60);
}

export async function getAdminUserById(
  userId: string,
  detailQuery: UserDetailQuery = { section: "resumen", page: 1, pageSize: 10 },
): Promise<UserDetailDto | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      accountStatus: true,
      emailVerified: true,
      phone: true,
      rut: true,
      invoiceType: true,
      businessName: true,
      businessActivity: true,
      addressLine1: true,
      addressLine2: true,
      commune: true,
      city: true,
      region: true,
      createdAt: true,
      updatedAt: true,
      lastActivityAt: true,
      requiresReview: true,
      reviewReason: true,
      suspensionReason: true,
      suspendedAt: true,
      suspensionEndsAt: true,
      anonymizedAt: true,
    },
  });

  if (!user) return null;

  const now = new Date();
  const [
    commerce,
    sessions,
    accounts,
    notes,
    pendingRefundCount,
    paidOrdersWithoutDelivery,
  ] = await Promise.all([
    getCommerceSummary(userId),
    prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
      },
    }),
    prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        providerId: true,
        accountId: true,
        password: true,
        createdAt: true,
      },
    }),
    prisma.userAdminNote.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.paymentRefund.count({
      where: {
        payment: { order: { userId } },
        status: { in: ["CREATED", "ACCEPTED", "ERROR"] },
      },
    }),
    prisma.order.count({
      where: {
        userId,
        payments: { some: { status: { in: successfulPaymentStatuses } } },
        items: { every: { delivery: null } },
      },
    }),
  ]);

  const activeSessions = sessions.filter(
    (session) => session.expiresAt.getTime() > now.getTime(),
  );
  const rutValid = user.rut ? isValidRut(user.rut) : null;
  const billing: UserBillingDto = {
    rut: user.rut,
    rutValid,
    invoiceType: user.invoiceType,
    businessName: user.businessName,
    businessActivity: user.businessActivity,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    commune: user.commune,
    city: user.city,
    region: user.region,
    phone: user.phone,
    completeness: billingCompleteness(user),
  };

  const issues = detectUserReviewIssues({
    accountStatus: user.accountStatus,
    emailVerified: user.emailVerified,
    requiresReview: user.requiresReview,
    reviewReason: user.reviewReason,
    invoiceType: user.invoiceType,
    rut: user.rut,
    rutValid,
    billingComplete: billing.completeness === "complete",
    activeSessionCount: activeSessions.length,
    recentFailedPaymentCount: commerce.recentFailedPaymentCount,
    paidOrdersWithoutDelivery,
    pendingOrderCount: commerce.pendingOrderCount,
    pendingRefundCount,
    paidOrderCount: commerce.paidOrderCount,
  });

  const section = detailQuery.section;
  const page = detailQuery.page;
  const pageSize = detailQuery.pageSize;

  const shouldLoadOrders =
    section === "resumen" || section === "pedidos" || section === "actividad";
  const shouldLoadTransactions =
    section === "resumen" ||
    section === "transacciones" ||
    section === "actividad";
  const shouldLoadDeliveries =
    section === "resumen" || section === "entregas" || section === "actividad";
  const shouldLoadTimeline =
    section === "actividad" || section === "resumen";

  const [ordersPage, transactionsPage, deliveriesPage, timeline] =
    await Promise.all([
      shouldLoadOrders
        ? getUserOrdersPage(
            userId,
            section === "pedidos" ? page : 1,
            section === "pedidos" ? pageSize : 5,
          )
        : Promise.resolve({
            items: [] as UserOrderRowDto[],
            total: 0,
            page: 1,
            pageSize: 5,
            totalPages: 1,
          }),
      shouldLoadTransactions
        ? getUserTransactionsPage(
            userId,
            section === "transacciones" ? page : 1,
            section === "transacciones" ? pageSize : 5,
          )
        : Promise.resolve({
            items: [] as UserTransactionRowDto[],
            total: 0,
            page: 1,
            pageSize: 5,
            totalPages: 1,
          }),
      shouldLoadDeliveries
        ? getUserDeliveriesPage(
            userId,
            section === "entregas" ? page : 1,
            section === "entregas" ? pageSize : 5,
          )
        : Promise.resolve({
            items: [] as UserDeliveryRowDto[],
            total: 0,
            page: 1,
            pageSize: 5,
            totalPages: 1,
          }),
      shouldLoadTimeline
        ? buildTimeline(userId, user.email)
        : Promise.resolve([] as UserTimelineEventDto[]),
    ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    accountStatus: user.accountStatus,
    derivedStatus: deriveStatus(user),
    emailVerified: user.emailVerified,
    phone: user.phone,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastActivityAt: iso(user.lastActivityAt),
    requiresReview: user.requiresReview,
    reviewReason: user.reviewReason,
    suspensionReason: user.suspensionReason,
    suspendedAt: iso(user.suspendedAt),
    suspensionEndsAt: iso(user.suspensionEndsAt),
    anonymizedAt: iso(user.anonymizedAt),
    isEnvAdmin: isAdminEmailByEnv(user.email),
    activeSessionCount: activeSessions.length,
    lastSessionAt: iso(sessions[0]?.updatedAt ?? null),
    commerce,
    billing,
    issues,
    providers: accounts.map(mapProvider),
    sessions: sessions.map(mapSession),
    notes: notes.map(mapNote),
    timeline,
    orders: ordersPage.items,
    transactions: transactionsPage.items,
    deliveries: deliveriesPage.items,
    adminEventTypes: [],
  };
}

export async function countActiveAdmins() {
  return prisma.user.count({
    where: {
      role: "ADMIN",
      accountStatus: { in: ["ACTIVE", "RESTRICTED"] },
    },
  });
}
