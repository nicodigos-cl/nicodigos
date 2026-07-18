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
  deriveCustomerOrderDeliverySummary,
  getCustomerDeliveryErrorMessage,
} from "@/lib/customer-dashboard/delivery-summary";
import {
  abbreviateUrl,
  formatCustomerOrderNumber,
  maskIpAddress,
  summarizeUserAgent,
} from "@/lib/customer-dashboard/format";
import {
  buildAvailableActions,
  buildCustomerOrderTimeline,
  mapDeliveryKeysPreview,
  mapOrderSummaryFromRow,
  orderListSelect,
} from "@/lib/customer-dashboard/order-mappers";
import {
  buildCustomerDeliveriesOrderBy,
  buildCustomerDeliveriesWhere,
} from "@/lib/customer-dashboard/delivery-filters";
import {
  buildCustomerOrdersOrderBy,
  buildCustomerOrdersWhere,
} from "@/lib/customer-dashboard/order-filters";
import { deriveCustomerPaymentSummary } from "@/lib/customer-dashboard/payment-summary";
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
import {
  buildCustomerTransactionsOrderBy,
  buildCustomerTransactionsWhere,
} from "@/lib/customer-dashboard/transaction-filters";
import type {
  CustomerBuyAgainProduct,
  CustomerDashboardViewModel,
  CustomerDeliveriesPageResult,
  CustomerDeliveryMetrics,
  CustomerDeliverySummary,
  CustomerOrderDetail,
  CustomerOrderMetrics,
  CustomerOrdersPageResult,
  CustomerProfileCompleteness,
  CustomerSecurityView,
  CustomerTransactionMetrics,
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
import { decimalToString, formatMoney } from "@/lib/products/format";
import { isValidRut } from "@/lib/validations/rut";
import type { CustomerDeliveryDto } from "@/types/deliveries";

const log = createLogger({ module: "customer-dashboard" });

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
      row.status === DeliveryStatus.QUEUED ||
      row.status === DeliveryStatus.PROCESSING)
  ) {
    actionLabel = "Completar información";
  } else if (row.status === DeliveryStatus.DELIVERED) {
    actionLabel = "Ver entrega";
  } else if (
    row.status === DeliveryStatus.FAILED ||
    row.status === DeliveryStatus.MANUAL_REVIEW
  ) {
    actionLabel = "Contactar soporte";
    href = `/dashboard/support?deliveryId=${row.id}&category=delivery`;
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

  const recentOrders = recentOrdersRaw.map(mapOrderSummaryFromRow);
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
          item.status === DeliveryStatus.QUEUED ||
          item.status === DeliveryStatus.PROCESSING)
      ) {
        return 0;
      }
      if (item.status === DeliveryStatus.DELIVERED) return 1;
      if (item.status === DeliveryStatus.FAILED || item.status === DeliveryStatus.MANUAL_REVIEW) return 2;
      if (item.status === DeliveryStatus.QUEUED || item.status === DeliveryStatus.PROCESSING) return 3;
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
        in: [DeliveryStatus.PENDING, DeliveryStatus.QUEUED, DeliveryStatus.PROCESSING],
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
          smmServiceType: true,
          smmMin: true,
          smmMax: true,
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
      deliveryMethod: product.deliveryMethod,
      smmServiceType: product.smmServiceType,
      smmMin: product.smmMin,
      smmMax: product.smmMax,
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
      smmServiceType: true,
      smmMin: true,
      smmMax: true,
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
      deliveryMethod: product.deliveryMethod,
      smmServiceType: product.smmServiceType,
      smmMin: product.smmMin,
      smmMax: product.smmMax,
    });
  }

  return products;
}

export async function getCustomerOrderMetrics(
  userId: string,
): Promise<CustomerOrderMetrics> {
  const [totalOrders, inProgress, availableDeliveries, needsAttention] =
    await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.count({
        where: {
          userId,
          status: {
            in: [
              OrderStatus.PROCESSING,
              OrderStatus.PARTIALLY_FULFILLED,
              OrderStatus.PAID,
            ],
          },
        },
      }),
      prisma.delivery.count({
        where: {
          orderItem: { order: { userId } },
          status: DeliveryStatus.DELIVERED,
        },
      }),
      prisma.order.count({
        where: {
          userId,
          OR: [
            { status: OrderStatus.PENDING },
            {
              AND: [
                {
                  payments: {
                    some: {
                      status: {
                        in: [
                          PaymentStatus.FAILED,
                          PaymentStatus.REJECTED,
                          PaymentStatus.EXPIRED,
                        ],
                      },
                    },
                  },
                },
                {
                  NOT: {
                    payments: {
                      some: { status: PaymentStatus.PAID },
                    },
                  },
                },
              ],
            },
            {
              items: {
                some: {
                  delivery: { status: DeliveryStatus.FAILED },
                },
              },
            },
          ],
        },
      }),
    ]);

  return {
    totalOrders,
    inProgress,
    availableDeliveries,
    needsAttention,
  };
}

export async function getCustomerOrdersPage(
  userId: string,
  query: CustomerOrdersListQuery,
): Promise<CustomerOrdersPageResult> {
  const where = buildCustomerOrdersWhere(userId, query);
  const orderBy = buildCustomerOrdersOrderBy(query.sort);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows, metrics] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      select: orderListSelect,
    }),
    getCustomerOrderMetrics(userId),
  ]);

  return {
    items: rows.map(mapOrderSummaryFromRow),
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    metrics,
  };
}

export async function getCustomerDeliveryMetrics(
  userId: string,
): Promise<CustomerDeliveryMetrics> {
  const ownerWhere: Prisma.DeliveryWhereInput = {
    orderItem: { order: { userId } },
  };

  const [totalDeliveries, available, processing, needsAttention] =
    await Promise.all([
      prisma.delivery.count({ where: ownerWhere }),
      prisma.delivery.count({
        where: { ...ownerWhere, status: DeliveryStatus.DELIVERED },
      }),
      prisma.delivery.count({
        where: {
          ...ownerWhere,
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.QUEUED,
              DeliveryStatus.PROCESSING,
            ],
          },
        },
      }),
      prisma.delivery.count({
        where: {
          ...ownerWhere,
          status: {
            in: [DeliveryStatus.FAILED, DeliveryStatus.MANUAL_REVIEW],
          },
        },
      }),
    ]);

  return {
    totalDeliveries,
    available,
    processing,
    needsAttention,
  };
}

export async function getCustomerDeliveriesPage(
  userId: string,
  query: CustomerDeliveriesListQuery,
): Promise<CustomerDeliveriesPageResult> {
  const where = buildCustomerDeliveriesWhere(userId, query);
  const orderBy = buildCustomerDeliveriesOrderBy(query.sort);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows, metrics] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      orderBy,
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
    getCustomerDeliveryMetrics(userId),
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
    metrics,
  };
}

export async function getCustomerTransactionMetrics(
  userId: string,
): Promise<CustomerTransactionMetrics> {
  const ownerWhere: Prisma.PaymentWhereInput = { order: { userId } };

  const [totalTransactions, paid, pending, failed] = await Promise.all([
    prisma.payment.count({ where: ownerWhere }),
    prisma.payment.count({
      where: { ...ownerWhere, status: PaymentStatus.PAID },
    }),
    prisma.payment.count({
      where: {
        ...ownerWhere,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
        },
      },
    }),
    prisma.payment.count({
      where: {
        ...ownerWhere,
        status: {
          in: [
            PaymentStatus.FAILED,
            PaymentStatus.REJECTED,
            PaymentStatus.EXPIRED,
            PaymentStatus.CANCELLED,
          ],
        },
      },
    }),
  ]);

  return {
    totalTransactions,
    paid,
    pending,
    failed,
  };
}

export async function getCustomerTransactionsPage(
  userId: string,
  query: CustomerTransactionsListQuery,
): Promise<CustomerTransactionsPageResult> {
  const where = buildCustomerTransactionsWhere(userId, query);
  const orderBy = buildCustomerTransactionsOrderBy(query.sort);
  const skip = (query.page - 1) * query.pageSize;

  const [total, rows, metrics] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy,
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
    getCustomerTransactionMetrics(userId),
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
    metrics,
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
      updatedAt: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          provider: true,
          paymentMethod: true,
          paidAt: true,
          createdAt: true,
          updatedAt: true,
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
          product: {
            select: {
              status: true,
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
          smm: {
            select: { link: true, username: true, quantity: true },
          },
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
              keys: {
                orderBy: { createdAt: "asc" },
                take: 3,
                select: { id: true, serial: true },
              },
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

  const paymentSummary = deriveCustomerPaymentSummary(
    order.payments.map((payment) => ({
      id: payment.id,
      status: payment.status,
      amount: decimalToString(payment.amount) ?? "0",
      currency: payment.currency,
      provider: payment.provider,
      paymentMethod: payment.paymentMethod,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
  );

  const deliveries = order.items
    .map((item) => item.delivery)
    .filter((delivery): delivery is NonNullable<typeof delivery> =>
      Boolean(delivery),
    );

  const deliverySummary = deriveCustomerOrderDeliverySummary({
    totalItems: order.items.length,
    deliveries: deliveries.map((delivery) => ({
      id: delivery.id,
      status: delivery.status,
    })),
  });

  const deliverySummaries = deliveries.map((delivery) =>
    mapDeliverySummary({
      ...delivery,
      keysCount: delivery._count.keys,
      credentialsCount: delivery._count.credentials,
    }),
  );

  const needsSmmTargetDeliveryId =
    order.items.find((item) => {
      const delivery = item.delivery;
      if (!delivery || delivery.deliveryMethod !== DeliveryMethod.SMM) {
        return false;
      }
      if (
        delivery.status !== DeliveryStatus.PENDING &&
        delivery.status !== DeliveryStatus.QUEUED &&
        delivery.status !== DeliveryStatus.PROCESSING
      ) {
        return false;
      }
      const smm = item.smm ?? delivery.orderItem.smm;
      return !smm?.link?.trim() && !smm?.username?.trim();
    })?.delivery?.id ?? null;

  const primaryAction = resolveOrderPrimaryAction({
    orderId: order.id,
    orderStatus: order.status,
    paymentStatus: paymentSummary.status,
    availableDeliveryId: deliverySummary.availableDeliveryId,
    needsSmmTargetDeliveryId,
    hasFailedDelivery: deliverySummary.failedCount > 0,
  });

  const canBuyAgain =
    (order.status === OrderStatus.FULFILLED ||
      order.status === OrderStatus.REFUNDED) &&
    order.items.some((item) => {
      const product = item.product;
      const productActive = product.status === ProductStatus.ACTIVE;
      const productInStock =
        product.deliveryMethod === DeliveryMethod.SMM
          ? true
          : product._count.keys > 0 || product.qty > 0;
      return productActive && productInStock;
    });

  const availableActions = buildAvailableActions({
    orderId: order.id,
    status: order.status,
    primaryAction,
    canPay: paymentSummary.canPay,
    canRetry: paymentSummary.canRetry,
    canBuyAgain,
    availableDeliveryId: deliverySummary.availableDeliveryId,
  });

  const relevantPayment = paymentSummary.relevantPayment;
  const deliveryEvents = order.items.flatMap((item) => {
    const delivery = item.delivery;
    if (!delivery) return [];
    return delivery.events.map((event) => ({
      id: event.id,
      status: event.status,
      message: event.message,
      source: event.source,
      createdAt: event.createdAt,
      deliveryMethod: delivery.deliveryMethod,
    }));
  });

  const timeline = buildCustomerOrderTimeline({
    orderId: order.id,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    payment: relevantPayment
      ? {
          id: relevantPayment.id,
          status: relevantPayment.status,
          paidAt: relevantPayment.paidAt
            ? new Date(relevantPayment.paidAt)
            : null,
          createdAt: new Date(relevantPayment.createdAt),
        }
      : null,
    deliveryEvents,
  });

  const orderProductIds = new Set(order.items.map((item) => item.productId));
  const buyAgainProducts = (await getBuyAgainProducts(userId, 10)).filter(
    (product) => orderProductIds.has(product.productId),
  );

  const subtotal = decimalToString(order.subtotal) ?? "0";
  const total = decimalToString(order.total) ?? "0";

  return {
    id: order.id,
    number: formatCustomerOrderNumber(order.id),
    status: order.status,
    statusView: getCustomerOrderStatusView(order.status),
    email: order.email,
    customerName: order.customerName,
    subtotal,
    subtotalFormatted: formatMoney(subtotal, order.currency),
    total,
    totalFormatted: formatMoney(total, order.currency),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    deliverySummary,
    payment: relevantPayment
      ? {
          id: relevantPayment.id,
          status: relevantPayment.status,
          statusView: paymentSummary.statusView!,
          amount: relevantPayment.amount,
          amountFormatted: formatMoney(
            relevantPayment.amount,
            relevantPayment.currency,
          ),
          currency: relevantPayment.currency,
          methodLabel: getCustomerPaymentMethodLabel(
            relevantPayment.provider,
            relevantPayment.paymentMethod,
          ),
          paidAt: relevantPayment.paidAt,
          updatedAt: relevantPayment.updatedAt,
          canPay: paymentSummary.canPay,
          canRetry: paymentSummary.canRetry,
        }
      : null,
    items: order.items.map((item) => {
      const unitPrice = decimalToString(item.unitPrice) ?? "0";
      const lineTotal = (
        Number.parseFloat(unitPrice) * item.quantity
      ).toFixed(2);
      const product = item.product;
      const productActive = product.status === ProductStatus.ACTIVE;
      const productInStock =
        product.deliveryMethod === DeliveryMethod.SMM
          ? true
          : product._count.keys > 0 || product.qty > 0;
      const delivery = item.delivery;
      const smmTargetLink = item.smm?.link?.trim() || null;
      const smmTargetUsername = item.smm?.username?.trim() || null;
      const smmTargetAbbreviated = smmTargetLink
        ? abbreviateUrl(smmTargetLink)
        : smmTargetUsername;

      const smm =
        item.deliveryMethod === DeliveryMethod.SMM
          ? {
              hasTarget: Boolean(smmTargetLink || smmTargetUsername),
              targetAbbreviated: smmTargetAbbreviated,
              quantity: item.smm?.quantity ?? null,
              startCount: delivery?.smmStartCount ?? null,
              remains: delivery?.smmRemains ?? null,
              progressPercent: computeSmmProgressPercent({
                quantity: item.smm?.quantity ?? null,
                remains: delivery?.smmRemains ?? null,
              }),
              statusView: getCustomerSmmStatusView({
                status: delivery?.status ?? DeliveryStatus.PENDING,
                hasTarget: Boolean(smmTargetLink || smmTargetUsername),
                externalStatus: delivery?.externalStatus ?? null,
                remains: delivery?.smmRemains ?? null,
                quantity: item.smm?.quantity ?? null,
              }),
            }
          : null;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice,
        unitPriceFormatted: formatMoney(unitPrice, order.currency),
        lineTotal,
        lineTotalFormatted: formatMoney(lineTotal, order.currency),
        deliveryMethod: item.deliveryMethod,
        methodLabel: getCustomerDeliveryMethodLabel(item.deliveryMethod),
        imageUrl: product.coverImageUrl,
        productActive,
        productInStock,
        delivery: delivery
          ? mapDeliverySummary({
              ...delivery,
              keysCount: delivery._count.keys,
              credentialsCount: delivery._count.credentials,
            })
          : null,
        keysCount: delivery?._count.keys ?? 0,
        keysPreview: delivery
          ? mapDeliveryKeysPreview(delivery.keys, delivery.status)
          : [],
        smm,
        deliveryErrorMessage: delivery
          ? getCustomerDeliveryErrorMessage(delivery.status) || null
          : null,
      };
    }),
    timeline,
    primaryAction,
    availableActions,
    canResendDeliveryEmail: deliverySummaries.some(
      (delivery) => delivery.status === DeliveryStatus.DELIVERED,
    ),
    canResendConfirmation: paymentSummary.hasApprovedPayment,
    canBuyAgain,
    buyAgainProducts,
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
      (event.status === DeliveryStatus.FAILED || event.status === DeliveryStatus.MANUAL_REVIEW)
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
        row.status === DeliveryStatus.QUEUED ||
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
      select: {
        email: true,
        emailVerified: true,
        createdAt: true,
        lastActivityAt: true,
      },
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
    accountCreatedAt: user.createdAt.toISOString(),
    lastActivityAt: user.lastActivityAt?.toISOString() ?? null,
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
