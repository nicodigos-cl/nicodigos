import "server-only";

import {
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { buildCustomerDashboardAlerts } from "@/lib/customer-dashboard/alerts";
import {
  formatCustomerOrderNumber,
  maskIpAddress,
  summarizeUserAgent,
} from "@/lib/customer-dashboard/format";
import {
  computeSmmProgressPercent,
  getCustomerDeliveryMethodLabel,
  getCustomerDeliveryStatusView,
  getCustomerOrderStatusView,
  getCustomerPaymentMethodLabel,
  getCustomerPaymentStatusView,
  getCustomerSmmStatusView,
  resolveOrderPrimaryAction,
} from "@/lib/customer-dashboard/status";
import type {
  CustomerBuyAgainProduct,
  CustomerDashboardViewModel,
  CustomerDeliveriesPageResult,
  CustomerDeliverySummary,
  CustomerOrderDetail,
  CustomerOrderSummary,
  CustomerOrderTimelineEvent,
  CustomerOrdersPageResult,
  CustomerProfileCompleteness,
  CustomerSecurityView,
  CustomerTransactionSummary,
  CustomerTransactionsPageResult,
} from "@/lib/customer-dashboard/types";
import type {
  CustomerDeliveriesListQuery,
  CustomerOrdersListQuery,
  CustomerTransactionsListQuery,
} from "@/lib/customer-dashboard/validations";
import { maskSecret } from "@/lib/crypto/mask";
import { ensureDeliveriesForOrder } from "@/lib/deliveries/ensure";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { decimalToString } from "@/lib/products/format";
import { isValidRut } from "@/lib/validations/rut";
import type { CustomerDeliveryDto } from "@/types/deliveries";

const log = createLogger({ module: "customer-dashboard" });

function mapOrderSummary(input: {
  id: string;
  status: OrderStatus;
  total: Prisma.Decimal | string;
  currency: string;
  createdAt: Date | string;
  itemsCount: number;
  productNames: string[];
  paymentStatus: PaymentStatus | null;
  deliveryStatuses: DeliveryStatus[];
  availableDeliveryId: string | null;
  needsSmmTargetDeliveryId: string | null;
  hasFailedDelivery: boolean;
}): CustomerOrderSummary {
  const paymentStatusView = input.paymentStatus
    ? getCustomerPaymentStatusView(input.paymentStatus)
    : null;

  const deliveryStatus =
    input.deliveryStatuses.find((s) => s === DeliveryStatus.DELIVERED) ??
    input.deliveryStatuses.find((s) => s === DeliveryStatus.FAILED) ??
    input.deliveryStatuses.find((s) => s === DeliveryStatus.PROCESSING) ??
    input.deliveryStatuses[0] ??
    null;

  return {
    id: input.id,
    number: formatCustomerOrderNumber(input.id),
    status: input.status,
    statusView: getCustomerOrderStatusView(input.status),
    paymentStatus: input.paymentStatus,
    paymentStatusView,
    deliveryStatus,
    deliveryStatusView: deliveryStatus
      ? getCustomerDeliveryStatusView(deliveryStatus)
      : null,
    total: decimalToString(input.total) ?? "0",
    currency: input.currency,
    itemsCount: input.itemsCount,
    productNames: input.productNames,
    createdAt:
      typeof input.createdAt === "string"
        ? input.createdAt
        : input.createdAt.toISOString(),
    primaryAction: resolveOrderPrimaryAction({
      orderId: input.id,
      orderStatus: input.status,
      paymentStatus: input.paymentStatus,
      availableDeliveryId: input.availableDeliveryId,
      needsSmmTargetDeliveryId: input.needsSmmTargetDeliveryId,
      hasFailedDelivery: input.hasFailedDelivery,
    }),
  };
}

function mapDeliverySummary(row: {
  id: string;
  status: DeliveryStatus;
  deliveryMethod: DeliveryMethod;
  createdAt: Date;
  deliveredAt: Date | null;
  externalStatus: string | null;
  smmStartCount: number | null;
  smmRemains: number | null;
  keysCount: number;
  credentialsCount: number;
  orderItem: {
    productName: string;
    quantity: number;
    smm: { link: string | null; username: string | null; quantity: number | null } | null;
    order: { id: string };
  };
}): CustomerDeliverySummary {
  const hasTarget = Boolean(
    row.orderItem.smm?.link?.trim() || row.orderItem.smm?.username?.trim(),
  );
  const quantity = row.orderItem.smm?.quantity ?? null;
  const smm =
    row.deliveryMethod === DeliveryMethod.SMM
      ? {
          hasTarget,
          quantity,
          startCount: row.smmStartCount,
          remains: row.smmRemains,
          progressPercent: computeSmmProgressPercent({
            quantity,
            remains: row.smmRemains,
          }),
          statusView: getCustomerSmmStatusView({
            status: row.status,
            hasTarget,
            externalStatus: row.externalStatus,
            remains: row.smmRemains,
            quantity,
          }),
        }
      : null;

  let actionLabel = "Ver detalle";
  let href = `/dashboard/deliveries/${row.id}`;
  if (
    row.deliveryMethod === DeliveryMethod.SMM &&
    !hasTarget &&
    (row.status === DeliveryStatus.PENDING ||
      row.status === DeliveryStatus.PROCESSING)
  ) {
    actionLabel = "Completar información";
  } else if (row.status === DeliveryStatus.DELIVERED) {
    actionLabel = "Ver entrega";
  } else if (row.status === DeliveryStatus.FAILED) {
    actionLabel = "Contactar soporte";
    href = `/dashboard/support?deliveryId=${row.id}`;
  }

  return {
    id: row.id,
    orderId: row.orderItem.order.id,
    orderNumber: formatCustomerOrderNumber(row.orderItem.order.id),
    productName: row.orderItem.productName,
    deliveryMethod: row.deliveryMethod,
    methodLabel: getCustomerDeliveryMethodLabel(row.deliveryMethod),
    status: row.status,
    statusView: getCustomerDeliveryStatusView(row.status),
    createdAt: row.createdAt.toISOString(),
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    primaryAction: { label: actionLabel, href },
    smm,
    hasSecretsAvailable:
      row.status === DeliveryStatus.DELIVERED &&
      row.keysCount + row.credentialsCount > 0,
  };
}

function getProfileCompleteness(user: {
  name: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  rut: string | null;
  invoiceType: "BOLETA" | "FACTURA";
  businessName: string | null;
  businessActivity: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  commune: string | null;
  city: string | null;
  region: string | null;
}): CustomerProfileCompleteness {
  const missing: string[] = [];
  const recommended: string[] = [];

  if (!user.name?.trim()) missing.push("Nombre");
  if (!user.emailVerified) missing.push("Email verificado");

  if (user.invoiceType === "FACTURA") {
    if (!user.rut || !isValidRut(user.rut)) missing.push("RUT");
    if (!user.businessName) missing.push("Razón social");
    if (!user.businessActivity) missing.push("Giro");
    if (!user.addressLine1) missing.push("Dirección");
  } else {
    if (!user.rut) recommended.push("RUT");
    if (!user.addressLine1) recommended.push("Dirección de facturación");
  }

  if (!user.phone) recommended.push("Teléfono");
  if (!user.commune) recommended.push("Comuna");
  if (!user.region) recommended.push("Región");

  const level =
    missing.length > 0
      ? "missing"
      : recommended.length > 0
        ? "partial"
        : "complete";

  return {
    level,
    missing,
    recommended,
    emailVerified: user.emailVerified,
    name: user.name || null,
    email: user.email,
    phone: user.phone,
    rut: user.rut,
    invoiceType: user.invoiceType,
    businessName: user.businessName,
    businessActivity: user.businessActivity,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    commune: user.commune,
    city: user.city,
    region: user.region,
  };
}

const orderListSelect = {
  id: true,
  status: true,
  total: true,
  currency: true,
  createdAt: true,
  items: {
    select: {
      productName: true,
      delivery: {
        select: {
          id: true,
          status: true,
          deliveryMethod: true,
          orderItem: {
            select: {
              smm: { select: { link: true, username: true } },
            },
          },
        },
      },
    },
  },
  payments: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { status: true },
  },
} satisfies Prisma.OrderSelect;

function toOrderSummaryFromRow(
  order: Prisma.OrderGetPayload<{ select: typeof orderListSelect }>,
): CustomerOrderSummary {
  const deliveryStatuses = order.items
    .map((item) => item.delivery?.status)
    .filter((status): status is DeliveryStatus => Boolean(status));

  const availableDeliveryId =
    order.items.find((item) => item.delivery?.status === DeliveryStatus.DELIVERED)
      ?.delivery?.id ?? null;

  const needsSmmTargetDeliveryId =
    order.items.find((item) => {
      const delivery = item.delivery;
      if (!delivery || delivery.deliveryMethod !== DeliveryMethod.SMM) {
        return false;
      }
      if (
        delivery.status !== DeliveryStatus.PENDING &&
        delivery.status !== DeliveryStatus.PROCESSING
      ) {
        return false;
      }
      const smm = delivery.orderItem.smm;
      return !smm?.link?.trim() && !smm?.username?.trim();
    })?.delivery?.id ?? null;

  const hasFailedDelivery = order.items.some(
    (item) => item.delivery?.status === DeliveryStatus.FAILED,
  );

  return mapOrderSummary({
    id: order.id,
    status: order.status,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
    itemsCount: order.items.length,
    productNames: order.items.map((item) => item.productName),
    paymentStatus: order.payments[0]?.status ?? null,
    deliveryStatuses,
    availableDeliveryId,
    needsSmmTargetDeliveryId,
    hasFailedDelivery,
  });
}

export async function getCustomerDashboard(
  userId: string,
): Promise<CustomerDashboardViewModel> {
  const started = Date.now();

  const [user, orderCount, recentOrdersRaw, deliveriesRaw, paymentsRaw, spent] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
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
        },
      }),
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: orderListSelect,
      }),
      prisma.delivery.findMany({
        where: { orderItem: { order: { userId } } },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 12,
        select: {
          id: true,
          status: true,
          deliveryMethod: true,
          createdAt: true,
          deliveredAt: true,
          externalStatus: true,
          smmStartCount: true,
          smmRemains: true,
          _count: { select: { keys: true, credentials: true } },
          orderItem: {
            select: {
              productName: true,
              quantity: true,
              smm: { select: { link: true, username: true, quantity: true } },
              order: { select: { id: true } },
            },
          },
        },
      }),
      prisma.payment.findMany({
        where: { order: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          provider: true,
          paymentMethod: true,
          createdAt: true,
          orderId: true,
        },
      }),
      prisma.payment.aggregate({
        where: {
          order: { userId },
          status: {
            in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED],
          },
        },
        _sum: { amount: true },
        _max: { paidAt: true },
      }),
    ]);

  const recentOrders = recentOrdersRaw.map(toOrderSummaryFromRow);
  const latestOrder = recentOrders[0] ?? null;

  const deliverySummaries = deliveriesRaw.map((row) =>
    mapDeliverySummary({
      ...row,
      keysCount: row._count.keys,
      credentialsCount: row._count.credentials,
    }),
  );

  const prioritizedDeliveries = [...deliverySummaries].sort((a, b) => {
    const score = (item: CustomerDeliverySummary) => {
      if (
        item.smm &&
        !item.smm.hasTarget &&
        (item.status === DeliveryStatus.PENDING ||
          item.status === DeliveryStatus.PROCESSING)
      ) {
        return 0;
      }
      if (item.status === DeliveryStatus.DELIVERED) return 1;
      if (item.status === DeliveryStatus.FAILED) return 2;
      if (item.status === DeliveryStatus.PROCESSING) return 3;
      return 4;
    };
    return score(a) - score(b);
  });

  const transactions: CustomerTransactionSummary[] = paymentsRaw.map(
    (payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: formatCustomerOrderNumber(payment.orderId),
      status: payment.status,
      statusView: getCustomerPaymentStatusView(payment.status),
      amount: decimalToString(payment.amount) ?? "0",
      currency: payment.currency,
      methodLabel: getCustomerPaymentMethodLabel(
        payment.provider,
        payment.paymentMethod,
      ),
      createdAt: payment.createdAt.toISOString(),
    }),
  );

  const profile = getProfileCompleteness(user);
  const alerts = buildCustomerDashboardAlerts({
    orders: recentOrdersRaw.map((order) => ({
      id: order.id,
      status: order.status,
      paymentStatus: order.payments[0]?.status ?? null,
    })),
    deliveries: deliverySummaries.map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
      deliveryMethod: delivery.deliveryMethod,
      productName: delivery.productName,
      hasSmmTarget: delivery.smm?.hasTarget ?? true,
    })),
    profile: {
      emailVerified: profile.emailVerified,
      billingIncomplete:
        profile.level !== "complete" &&
        (profile.missing.length > 0 || profile.recommended.length > 0),
    },
  });

  const availableDeliveries = await prisma.delivery.count({
    where: {
      orderItem: { order: { userId } },
      status: DeliveryStatus.DELIVERED,
    },
  });
  const servicesInProgress = await prisma.delivery.count({
    where: {
      orderItem: { order: { userId } },
      deliveryMethod: DeliveryMethod.SMM,
      status: {
        in: [DeliveryStatus.PENDING, DeliveryStatus.PROCESSING],
      },
    },
  });
  const completedPurchases = await prisma.order.count({
    where: {
      userId,
      status: {
        in: [OrderStatus.FULFILLED, OrderStatus.PARTIALLY_FULFILLED],
      },
    },
  });

  const buyAgain = await getBuyAgainProducts(userId);

  log.info(
    {
      route: "/dashboard",
      userId,
      result: "success",
      durationMs: Date.now() - started,
      orders: orderCount,
    },
    "Customer dashboard loaded",
  );

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
    },
    isNewCustomer: orderCount === 0,
    metrics: {
      orders: orderCount,
      availableDeliveries,
      servicesInProgress,
      completedPurchases,
      totalSpent: decimalToString(spent._sum.amount),
      totalSpentCurrency: spent._sum.amount ? "CLP" : null,
      lastPurchaseAt: spent._max.paidAt?.toISOString() ?? null,
    },
    alerts,
    latestOrder,
    recentOrders,
    deliveries: prioritizedDeliveries.slice(0, 5),
    transactions,
    buyAgain,
    profile,
  };
}

export async function getBuyAgainProducts(
  userId: string,
  limit = 4,
): Promise<CustomerBuyAgainProduct[]> {
  const purchased = await prisma.orderItem.findMany({
    where: {
      order: {
        userId,
        status: {
          notIn: [OrderStatus.CANCELED],
        },
      },
      product: {
        status: ProductStatus.ACTIVE,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    distinct: ["productId"],
    select: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          currency: true,
          coverImageUrl: true,
          qty: true,
          deliveryMethod: true,
          _count: {
            select: {
              keys: { where: { status: "AVAILABLE" } },
            },
          },
        },
      },
    },
  });

  const products: CustomerBuyAgainProduct[] = [];
  for (const row of purchased) {
    const product = row.product;
    const inStock =
      product.deliveryMethod === DeliveryMethod.SMM
        ? true
        : product._count.keys > 0 || product.qty > 0;
    if (!inStock) continue;
    products.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: decimalToString(product.price) ?? "0",
      currency: product.currency,
      coverImageUrl: product.coverImageUrl,
      inStock,
    });
    if (products.length >= limit) break;
  }

  if (products.length >= limit) return products;

  const featured = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      isFeatured: true,
      id: { notIn: products.map((p) => p.productId) },
    },
    orderBy: { updatedAt: "desc" },
    take: limit - products.length,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      currency: true,
      coverImageUrl: true,
      qty: true,
      deliveryMethod: true,
      _count: {
        select: { keys: { where: { status: "AVAILABLE" } } },
      },
    },
  });

  for (const product of featured) {
    const inStock =
      product.deliveryMethod === DeliveryMethod.SMM
        ? true
        : product._count.keys > 0 || product.qty > 0;
    if (!inStock) continue;
    products.push({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: decimalToString(product.price) ?? "0",
      currency: product.currency,
      coverImageUrl: product.coverImageUrl,
      inStock,
    });
  }

  return products;
}

export async function getCustomerOrdersPage(
  userId: string,
  query: CustomerOrdersListQuery,
): Promise<CustomerOrdersPageResult> {
  const where: Prisma.OrderWhereInput = { userId };
  const and: Prisma.OrderWhereInput[] = [];

  if (query.status) where.status = query.status;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }
  if (query.q) {
    and.push({
      OR: [
        { id: { contains: query.q, mode: "insensitive" } },
        { email: { contains: query.q, mode: "insensitive" } },
        {
          items: {
            some: {
              productName: { contains: query.q, mode: "insensitive" },
            },
          },
        },
      ],
    });
  }
  if (and.length > 0) where.AND = and;

  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      select: orderListSelect,
    }),
  ]);

  return {
    items: rows.map(toOrderSummaryFromRow),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getCustomerDeliveriesPage(
  userId: string,
  query: CustomerDeliveriesListQuery,
): Promise<CustomerDeliveriesPageResult> {
  const where: Prisma.DeliveryWhereInput = {
    orderItem: { order: { userId } },
  };
  const and: Prisma.DeliveryWhereInput[] = [];

  switch (query.filter) {
    case "available":
      where.status = DeliveryStatus.DELIVERED;
      break;
    case "processing":
      where.status = {
        in: [DeliveryStatus.PENDING, DeliveryStatus.PROCESSING],
      };
      break;
    case "completed":
      where.status = DeliveryStatus.DELIVERED;
      break;
    case "problems":
      where.status = DeliveryStatus.FAILED;
      break;
    case "keys":
      where.deliveryMethod = DeliveryMethod.KINGUIN;
      break;
    case "accounts":
      and.push({
        credentials: { some: {} },
      });
      break;
    case "smm":
      where.deliveryMethod = DeliveryMethod.SMM;
      break;
    default:
      break;
  }

  if (query.status) where.status = query.status;
  if (query.method) where.deliveryMethod = query.method;
  if (and.length > 0) where.AND = and;

  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: query.pageSize,
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        createdAt: true,
        deliveredAt: true,
        externalStatus: true,
        smmStartCount: true,
        smmRemains: true,
        _count: { select: { keys: true, credentials: true } },
        orderItem: {
          select: {
            productName: true,
            quantity: true,
            smm: { select: { link: true, username: true, quantity: true } },
            order: { select: { id: true } },
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map((row) =>
      mapDeliverySummary({
        ...row,
        keysCount: row._count.keys,
        credentialsCount: row._count.credentials,
      }),
    ),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getCustomerTransactionsPage(
  userId: string,
  query: CustomerTransactionsListQuery,
): Promise<CustomerTransactionsPageResult> {
  const where: Prisma.PaymentWhereInput = { order: { userId } };
  const skip = (query.page - 1) * query.pageSize;
  const [total, rows] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: query.pageSize,
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        provider: true,
        paymentMethod: true,
        createdAt: true,
        orderId: true,
      },
    }),
  ]);

  return {
    items: rows.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      orderNumber: formatCustomerOrderNumber(payment.orderId),
      status: payment.status,
      statusView: getCustomerPaymentStatusView(payment.status),
      amount: decimalToString(payment.amount) ?? "0",
      currency: payment.currency,
      methodLabel: getCustomerPaymentMethodLabel(
        payment.provider,
        payment.paymentMethod,
      ),
      createdAt: payment.createdAt.toISOString(),
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

export async function getCustomerOrderDetail(
  orderId: string,
  userId: string,
): Promise<CustomerOrderDetail | null> {
  await ensureDeliveriesForOrder(orderId);

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      status: true,
      email: true,
      customerName: true,
      subtotal: true,
      total: true,
      currency: true,
      createdAt: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          provider: true,
          paymentMethod: true,
          paidAt: true,
        },
      },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          quantity: true,
          unitPrice: true,
          deliveryMethod: true,
          delivery: {
            select: {
              id: true,
              status: true,
              deliveryMethod: true,
              createdAt: true,
              deliveredAt: true,
              externalStatus: true,
              smmStartCount: true,
              smmRemains: true,
              _count: { select: { keys: true, credentials: true } },
              events: {
                orderBy: { createdAt: "asc" },
                take: 20,
                select: {
                  id: true,
                  status: true,
                  message: true,
                  createdAt: true,
                  source: true,
                },
              },
              orderItem: {
                select: {
                  productName: true,
                  quantity: true,
                  smm: {
                    select: { link: true, username: true, quantity: true },
                  },
                  order: { select: { id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  const deliverySummaries = order.items
    .map((item) => item.delivery)
    .filter((delivery): delivery is NonNullable<typeof delivery> =>
      Boolean(delivery),
    )
    .map((delivery) =>
      mapDeliverySummary({
        ...delivery,
        keysCount: delivery._count.keys,
        credentialsCount: delivery._count.credentials,
      }),
    );

  const summary = mapOrderSummary({
    id: order.id,
    status: order.status,
    total: order.total,
    currency: order.currency,
    createdAt: order.createdAt,
    itemsCount: order.items.length,
    productNames: order.items.map((item) => item.productName),
    paymentStatus: order.payments[0]?.status ?? null,
    deliveryStatuses: deliverySummaries.map((d) => d.status),
    availableDeliveryId:
      deliverySummaries.find((d) => d.status === DeliveryStatus.DELIVERED)?.id ??
      null,
    needsSmmTargetDeliveryId:
      deliverySummaries.find(
        (d) => d.smm && !d.smm.hasTarget && d.status !== DeliveryStatus.CANCELED,
      )?.id ?? null,
    hasFailedDelivery: deliverySummaries.some(
      (d) => d.status === DeliveryStatus.FAILED,
    ),
  });

  const timeline: CustomerOrderTimelineEvent[] = [
    {
      id: `created-${order.id}`,
      label: "Pedido creado",
      description: null as string | null,
      createdAt: order.createdAt.toISOString(),
    },
  ];

  const payment = order.payments[0];
  if (payment?.status === PaymentStatus.PAID && payment.paidAt) {
    timeline.push({
      id: `paid-${payment.id}`,
      label: "Pago confirmado",
      description: null,
      createdAt: payment.paidAt.toISOString(),
    });
  } else if (payment?.status === PaymentStatus.PROCESSING) {
    timeline.push({
      id: `processing-pay-${payment.id}`,
      label: "Pago en revisión",
      description: null,
      createdAt: order.createdAt.toISOString(),
    });
  }

  for (const item of order.items) {
    const delivery = item.delivery;
    if (!delivery) continue;
    for (const event of delivery.events) {
      if (event.source === "ADMIN" && event.message?.includes("admin")) {
        continue;
      }
      let label = "Actualización de entrega";
      if (event.status === DeliveryStatus.PROCESSING) {
        label =
          delivery.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio enviado al proveedor"
            : "Estamos preparando tu entrega";
      } else if (event.status === DeliveryStatus.DELIVERED) {
        label =
          delivery.deliveryMethod === DeliveryMethod.SMM
            ? "Servicio completado"
            : "Tu producto está disponible";
      } else if (event.status === DeliveryStatus.FAILED) {
        label = "Estamos revisando tu entrega";
      } else if (event.status === DeliveryStatus.PENDING) {
        label = "Entrega pendiente";
      }

      timeline.push({
        id: event.id,
        label,
        description:
          event.status === DeliveryStatus.FAILED
            ? "Nuestro equipo está revisando el caso."
            : null,
        createdAt: event.createdAt.toISOString(),
      });
    }
  }

  if (order.status === OrderStatus.REFUNDED) {
    timeline.push({
      id: `refunded-${order.id}`,
      label: "Reembolso procesado",
      description: null,
      createdAt: order.createdAt.toISOString(),
    });
  }

  timeline.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return {
    id: order.id,
    number: summary.number,
    status: order.status,
    statusView: summary.statusView,
    email: order.email,
    customerName: order.customerName,
    subtotal: decimalToString(order.subtotal) ?? "0",
    total: decimalToString(order.total) ?? "0",
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          statusView: getCustomerPaymentStatusView(payment.status),
          amount: decimalToString(payment.amount) ?? "0",
          currency: payment.currency,
          methodLabel: getCustomerPaymentMethodLabel(
            payment.provider,
            payment.paymentMethod,
          ),
          paidAt: payment.paidAt?.toISOString() ?? null,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: decimalToString(item.unitPrice) ?? "0",
      deliveryMethod: item.deliveryMethod,
      methodLabel: getCustomerDeliveryMethodLabel(item.deliveryMethod),
      delivery: item.delivery
        ? mapDeliverySummary({
            ...item.delivery,
            keysCount: item.delivery._count.keys,
            credentialsCount: item.delivery._count.credentials,
          })
        : null,
    })),
    timeline,
    primaryAction: summary.primaryAction,
    canResendDeliveryEmail: deliverySummaries.some(
      (d) => d.status === DeliveryStatus.DELIVERED,
    ),
  };
}

export async function getCustomerDeliveryDetail(
  deliveryId: string,
  userId: string,
): Promise<
  | (CustomerDeliveryDto & {
      orderId: string;
      orderNumber: string;
      smm: CustomerDeliverySummary["smm"];
      canSubmitTarget: boolean;
      canResendEmail: boolean;
    })
  | null
> {
  const row = await prisma.delivery.findFirst({
    where: {
      id: deliveryId,
      orderItem: { order: { userId } },
    },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      customerMessage: true,
      deliveredAt: true,
      createdAt: true,
      externalStatus: true,
      smmStartCount: true,
      smmRemains: true,
      keys: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          contentType: true,
          serial: true,
          instructions: true,
          isSecret: true,
        },
      },
      credentials: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          label: true,
          contentType: true,
          username: true,
          email: true,
          passwordEncrypted: true,
          tokenEncrypted: true,
          url: true,
          notes: true,
          instructions: true,
          isSecret: true,
        },
      },
      events: {
        orderBy: { createdAt: "asc" },
        take: 30,
        select: {
          id: true,
          status: true,
          message: true,
          createdAt: true,
        },
      },
      orderItem: {
        select: {
          productName: true,
          quantity: true,
          smm: { select: { link: true, username: true, quantity: true } },
          order: {
            select: {
              id: true,
              status: true,
              payments: {
                where: { status: PaymentStatus.PAID },
                take: 1,
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!row) return null;

  const orderPaid =
    row.orderItem.order.status === OrderStatus.PAID ||
    row.orderItem.order.status === OrderStatus.PROCESSING ||
    row.orderItem.order.status === OrderStatus.FULFILLED ||
    row.orderItem.order.status === OrderStatus.PARTIALLY_FULFILLED ||
    row.orderItem.order.payments.length > 0;

  if (!orderPaid && row.status !== DeliveryStatus.DELIVERED) {
    return null;
  }

  const hasTarget = Boolean(
    row.orderItem.smm?.link?.trim() || row.orderItem.smm?.username?.trim(),
  );
  const quantity = row.orderItem.smm?.quantity ?? null;
  const smm =
    row.deliveryMethod === DeliveryMethod.SMM
      ? {
          hasTarget,
          quantity,
          startCount: row.smmStartCount,
          remains: row.smmRemains,
          progressPercent: computeSmmProgressPercent({
            quantity,
            remains: row.smmRemains,
          }),
          statusView: getCustomerSmmStatusView({
            status: row.status,
            hasTarget,
            externalStatus: row.externalStatus,
            remains: row.smmRemains,
            quantity,
          }),
        }
      : null;

  const safeEvents = row.events.map((event) => ({
    id: event.id,
    status: event.status,
    message:
      event.status === DeliveryStatus.FAILED
        ? "Hubo un problema con la entrega. Soporte está al tanto."
        : event.message,
    createdAt: event.createdAt.toISOString(),
  }));

  const secretsAllowed = row.status === DeliveryStatus.DELIVERED;

  return {
    id: row.id,
    status: row.status,
    deliveryMethod: row.deliveryMethod,
    productName: row.orderItem.productName,
    quantity: row.orderItem.quantity,
    customerMessage: row.customerMessage,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    keys: secretsAllowed
      ? row.keys.map((key) => ({
          id: key.id,
          label: key.label,
          contentType: key.contentType,
          serialMasked: key.isSecret ? maskSecret(key.serial) : key.serial,
          instructions: key.instructions,
          isSecret: key.isSecret,
        }))
      : [],
    credentials: secretsAllowed
      ? row.credentials.map((cred) => ({
          id: cred.id,
          label: cred.label,
          contentType: cred.contentType,
          username: cred.username,
          email: cred.email,
          passwordMasked: cred.passwordEncrypted
            ? maskSecret("********")
            : null,
          tokenMasked: cred.tokenEncrypted ? maskSecret("********") : null,
          url: cred.url,
          notes: cred.notes,
          instructions: cred.instructions,
          isSecret: cred.isSecret,
          hasPassword: Boolean(cred.passwordEncrypted),
          hasToken: Boolean(cred.tokenEncrypted),
        }))
      : [],
    events: safeEvents,
    orderId: row.orderItem.order.id,
    orderNumber: formatCustomerOrderNumber(row.orderItem.order.id),
    smm,
    canSubmitTarget:
      row.deliveryMethod === DeliveryMethod.SMM &&
      !hasTarget &&
      (row.status === DeliveryStatus.PENDING ||
        row.status === DeliveryStatus.PROCESSING),
    canResendEmail: row.status === DeliveryStatus.DELIVERED,
  };
}

export async function getCustomerProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      email: true,
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
    },
  });
  return getProfileCompleteness(user);
}

export async function getCustomerSecurityView(
  userId: string,
  currentSessionToken?: string | null,
): Promise<CustomerSecurityView> {
  const [user, sessions, accounts] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, emailVerified: true },
    }),
    prisma.session.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        token: true,
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
        password: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    email: user.email,
    emailVerified: user.emailVerified,
    hasPassword: accounts.some((account) => Boolean(account.password)),
    providers: accounts
      .filter((account) => account.providerId !== "credential")
      .map((account) => ({
        id: account.id,
        providerId: account.providerId,
        createdAt: account.createdAt.toISOString(),
      })),
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgentSummary: summarizeUserAgent(session.userAgent),
      ipMasked: maskIpAddress(session.ipAddress),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      isCurrent: Boolean(
        currentSessionToken && session.token === currentSessionToken,
      ),
      isExpired: session.expiresAt.getTime() <= Date.now(),
    })),
  };
}
