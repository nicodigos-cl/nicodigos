import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  DeliveryMethod,
  DeliveryStatus,
  OrderStatus,
  ProductKeyStatus,
} from "@/generated/prisma/client";

import { maskSecret } from "@/lib/crypto/mask";
import { ensureDeliveriesForOrder } from "@/lib/deliveries/ensure";
import {
  getAllowedDeliveryActions,
  type DeliveryAdminAction,
} from "@/lib/deliveries/status";
import { decimalToString } from "@/lib/products/format";
import prisma from "@/lib/prisma";
import type {
  DeliveriesListQuery,
  DeliveriesSortField,
} from "@/lib/validations/deliveries";
import type {
  AvailableProductKeyDto,
  CustomerDeliveryDto,
  DeliveriesPageResult,
  DeliveryDetailDto,
  DeliveryKeyDto,
  DeliveryListItemDto,
  DeliveryMetricsDto,
} from "@/types/deliveries";

function buildOrderBy(
  sort: DeliveriesSortField,
  order: "asc" | "desc",
): Prisma.DeliveryOrderByWithRelationInput {
  return sort === "updatedAt" ? { updatedAt: order } : { createdAt: order };
}

function buildWhere(input: DeliveriesListQuery): Prisma.DeliveryWhereInput {
  const where: Prisma.DeliveryWhereInput = {};
  const and: Prisma.DeliveryWhereInput[] = [];

  if (input.status) {
    where.status = input.status;
  }
  if (input.method) {
    where.deliveryMethod = input.method;
  }
  if (input.hasError) {
    and.push({
      OR: [
        { status: DeliveryStatus.FAILED },
        { errorMessage: { not: null } },
      ],
    });
  }
  if (input.needsManual) {
    and.push({
      OR: [
        {
          deliveryMethod: DeliveryMethod.MANUAL,
          status: { in: [DeliveryStatus.PENDING, DeliveryStatus.PROCESSING] },
        },
        { status: DeliveryStatus.FAILED },
      ],
    });
  }
  if (input.hasExternal) {
    and.push({
      OR: [
        { externalOrderId: { not: null } },
        { kinguinOrderId: { not: null } },
      ],
    });
  }
  if (input.from || input.to) {
    where.createdAt = {};
    if (input.from) where.createdAt.gte = new Date(input.from);
    if (input.to) where.createdAt.lte = new Date(input.to);
  }

  if (input.q) {
    const q = input.q;
    and.push({
      OR: [
        { id: { contains: q, mode: "insensitive" } },
        { externalOrderId: { contains: q, mode: "insensitive" } },
        { kinguinOrderId: { contains: q, mode: "insensitive" } },
        { orderExternalId: { contains: q, mode: "insensitive" } },
        {
          orderItem: {
            order: {
              OR: [
                { id: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { customerName: { contains: q, mode: "insensitive" } },
                { user: { name: { contains: q, mode: "insensitive" } } },
              ],
            },
          },
        },
        {
          orderItem: {
            productName: { contains: q, mode: "insensitive" },
          },
        },
        // Safe serial search: exact match only (avoids leaking partial key scans in logs/UI)
        {
          keys: {
            some: { serial: { equals: q } },
          },
        },
      ],
    });
  }

  if (and.length > 0) {
    where.AND = and;
  }

  return where;
}

function progressSummary(input: {
  status: DeliveryStatus;
  method: DeliveryMethod;
  keysCount: number;
  credentialsCount: number;
  externalStatus: string | null;
  smmRemains: number | null;
  errorMessage: string | null;
}): string {
  if (input.errorMessage) return "Con error";
  if (input.status === DeliveryStatus.DELIVERED) {
    const n = input.keysCount + input.credentialsCount;
    return n > 0 ? `${n} ítem(s) entregados` : "Completada";
  }
  if (input.method === DeliveryMethod.SMM) {
    if (input.externalStatus) {
      return input.smmRemains != null
        ? `${input.externalStatus} · quedan ${input.smmRemains}`
        : input.externalStatus;
    }
    return "Sin enviar al panel";
  }
  if (input.method === DeliveryMethod.KINGUIN) {
    if (input.externalStatus) {
      return `${input.externalStatus}${input.keysCount ? ` · ${input.keysCount} key(s)` : ""}`;
    }
    return "Sin solicitar a Kinguin";
  }
  if (input.keysCount + input.credentialsCount > 0) {
    return `Borrador · ${input.keysCount + input.credentialsCount} ítem(s)`;
  }
  return "Espera acción manual";
}

function needsManualAttention(input: {
  status: DeliveryStatus;
  method: DeliveryMethod;
}): boolean {
  if (input.status === DeliveryStatus.FAILED) return true;
  if (
    input.method === DeliveryMethod.MANUAL &&
    (input.status === DeliveryStatus.PENDING ||
      input.status === DeliveryStatus.PROCESSING)
  ) {
    return true;
  }
  return false;
}

function toKeyDto(key: {
  id: string;
  serial: string;
  contentType: DeliveryKeyDto["contentType"];
  type: string | null;
  label: string | null;
  instructions: string | null;
  isSecret: boolean;
  externalKeyId: string | null;
  productKeyId: string | null;
  createdAt: Date;
}): DeliveryKeyDto {
  return {
    id: key.id,
    serialMasked: key.isSecret ? maskSecret(key.serial) : key.serial,
    contentType: key.contentType,
    type: key.type,
    label: key.label,
    instructions: key.instructions,
    isSecret: key.isSecret,
    externalKeyId: key.externalKeyId,
    productKeyId: key.productKeyId,
    createdAt: key.createdAt.toISOString(),
  };
}

export async function getDeliveriesPage(
  input: DeliveriesListQuery,
): Promise<DeliveriesPageResult> {
  const where = buildWhere(input);
  const skip = (input.page - 1) * input.pageSize;

  const [total, rows] = await prisma.$transaction([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      orderBy: buildOrderBy(input.sort, input.order),
      skip,
      take: input.pageSize,
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        errorMessage: true,
        externalOrderId: true,
        externalStatus: true,
        smmRemains: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { keys: true, credentials: true } },
        orderItem: {
          select: {
            quantity: true,
            productName: true,
            productId: true,
            order: {
              select: {
                id: true,
                email: true,
                customerName: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const items: DeliveryListItemDto[] = rows.map((row) => {
    const keysCount = row._count.keys;
    const credentialsCount = row._count.credentials;
    return {
      id: row.id,
      status: row.status,
      deliveryMethod: row.deliveryMethod,
      errorMessage: row.errorMessage,
      externalOrderId: row.externalOrderId,
      externalStatus: row.externalStatus,
      keysCount,
      credentialsCount,
      progressSummary: progressSummary({
        status: row.status,
        method: row.deliveryMethod,
        keysCount,
        credentialsCount,
        externalStatus: row.externalStatus,
        smmRemains: row.smmRemains,
        errorMessage: row.errorMessage,
      }),
      needsManualAttention: needsManualAttention({
        status: row.status,
        method: row.deliveryMethod,
      }),
      orderId: row.orderItem.order.id,
      orderEmail: row.orderItem.order.email,
      customerName: row.orderItem.order.customerName,
      userName: row.orderItem.order.user.name,
      productId: row.orderItem.productId,
      productName: row.orderItem.productName,
      quantity: row.orderItem.quantity,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      deliveredAt: row.deliveredAt?.toISOString() ?? null,
    };
  });

  return {
    items,
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getDeliveryMetrics(
  input: DeliveriesListQuery,
): Promise<DeliveryMetricsDto> {
  const base = buildWhere({
    ...input,
    status: undefined,
    page: 1,
    pageSize: 20,
  });

  const hasFilters = Boolean(
    input.q ||
      input.method ||
      input.hasError ||
      input.needsManual ||
      input.hasExternal ||
      input.from ||
      input.to,
  );

  const [pending, processing, delivered, failed, needsManual] =
    await prisma.$transaction([
      prisma.delivery.count({
        where: { ...base, status: DeliveryStatus.PENDING },
      }),
      prisma.delivery.count({
        where: { ...base, status: DeliveryStatus.PROCESSING },
      }),
      prisma.delivery.count({
        where: { ...base, status: DeliveryStatus.DELIVERED },
      }),
      prisma.delivery.count({
        where: { ...base, status: DeliveryStatus.FAILED },
      }),
      prisma.delivery.count({
        where: {
          AND: [
            base,
            {
              OR: [
                {
                  deliveryMethod: DeliveryMethod.MANUAL,
                  status: {
                    in: [DeliveryStatus.PENDING, DeliveryStatus.PROCESSING],
                  },
                },
                { status: DeliveryStatus.FAILED },
              ],
            },
          ],
        },
      }),
    ]);

  return {
    pending,
    processing,
    delivered,
    failed,
    needsManual,
    scope: hasFilters ? "filtered" : "global",
  };
}

export async function getDeliveryById(
  deliveryId: string,
): Promise<DeliveryDetailDto | null> {
  const row = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      errorMessage: true,
      customerMessage: true,
      deliveredAt: true,
      lastSyncedAt: true,
      externalOrderId: true,
      externalStatus: true,
      kinguinOrderId: true,
      orderExternalId: true,
      requestPriceEur: true,
      smmCharge: true,
      smmStartCount: true,
      smmRemains: true,
      smmCurrency: true,
      smmRefillId: true,
      createdAt: true,
      updatedAt: true,
      keys: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          serial: true,
          contentType: true,
          type: true,
          label: true,
          instructions: true,
          isSecret: true,
          externalKeyId: true,
          productKeyId: true,
          createdAt: true,
        },
      },
      credentials: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          contentType: true,
          label: true,
          username: true,
          email: true,
          passwordEncrypted: true,
          tokenEncrypted: true,
          url: true,
          notes: true,
          instructions: true,
          isSecret: true,
          createdAt: true,
        },
      },
      events: {
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          status: true,
          message: true,
          source: true,
          actorUserId: true,
          actorEmail: true,
          createdAt: true,
        },
      },
      notifications: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          status: true,
          recipient: true,
          isResend: true,
          sentAt: true,
          errorMessage: true,
          createdAt: true,
        },
      },
      orderItem: {
        select: {
          quantity: true,
          unitPrice: true,
          productName: true,
          productId: true,
          deliveryMethod: true,
          smm: true,
          product: {
            select: {
              id: true,
              slug: true,
              _count: {
                select: {
                  keys: { where: { status: ProductKeyStatus.AVAILABLE } },
                },
              },
            },
          },
          order: {
            select: {
              id: true,
              status: true,
              email: true,
              customerName: true,
              currency: true,
              total: true,
              userId: true,
              user: { select: { name: true, email: true } },
              payments: {
                where: { status: "PAID" },
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

  const isPaid =
    row.orderItem.order.status === OrderStatus.PAID ||
    row.orderItem.order.status === OrderStatus.PROCESSING ||
    row.orderItem.order.status === OrderStatus.FULFILLED ||
    row.orderItem.order.status === OrderStatus.PARTIALLY_FULFILLED ||
    row.orderItem.order.payments.length > 0;

  const keys = row.keys.map(toKeyDto);
  const hasExternal = Boolean(row.externalOrderId || row.kinguinOrderId);
  const allowedActions = getAllowedDeliveryActions({
    status: row.status,
    method: row.deliveryMethod,
    hasExternalOrderId: hasExternal,
    hasKeysOrCredentials:
      row.keys.length > 0 || row.credentials.length > 0,
  });

  const smm =
    row.deliveryMethod === DeliveryMethod.SMM
      ? {
          link: row.orderItem.smm?.link ?? null,
          username: row.orderItem.smm?.username ?? null,
          quantity: row.orderItem.smm?.quantity ?? null,
          comments: row.orderItem.smm?.comments ?? null,
          runs: row.orderItem.smm?.runs ?? null,
          intervalMinutes: row.orderItem.smm?.intervalMinutes ?? null,
          usernames: row.orderItem.smm?.usernames ?? null,
          hashtags: row.orderItem.smm?.hashtags ?? null,
          mediaUrl: row.orderItem.smm?.mediaUrl ?? null,
          min: row.orderItem.smm?.min ?? null,
          max: row.orderItem.smm?.max ?? null,
          delayMinutes: row.orderItem.smm?.delayMinutes ?? null,
          posts: row.orderItem.smm?.posts ?? null,
          oldPosts: row.orderItem.smm?.oldPosts ?? null,
          expiry: row.orderItem.smm?.expiry ?? null,
          answerNumber: row.orderItem.smm?.answerNumber ?? null,
          remoteOrderId: row.externalOrderId,
          remoteStatus: row.externalStatus,
          charge: decimalToString(row.smmCharge),
          currency: row.smmCurrency,
          startCount: row.smmStartCount,
          remains: row.smmRemains,
          refillId: row.smmRefillId,
          lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
          errorMessage: row.errorMessage,
        }
      : null;

  const kinguin =
    row.deliveryMethod === DeliveryMethod.KINGUIN
      ? {
          kinguinOrderId: row.kinguinOrderId,
          orderExternalId: row.orderExternalId,
          externalOrderId: row.externalOrderId,
          externalStatus: row.externalStatus,
          requestPriceEur: decimalToString(row.requestPriceEur),
          lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
          errorMessage: row.errorMessage,
          keys,
        }
      : null;

  return {
    id: row.id,
    status: row.status,
    deliveryMethod: row.deliveryMethod,
    errorMessage: row.errorMessage,
    customerMessage: row.customerMessage,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    externalOrderId: row.externalOrderId,
    externalStatus: row.externalStatus,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    allowedActions: allowedActions as DeliveryAdminAction[],
    order: {
      id: row.orderItem.order.id,
      status: row.orderItem.order.status,
      email: row.orderItem.order.email,
      customerName: row.orderItem.order.customerName,
      currency: row.orderItem.order.currency,
      total: decimalToString(row.orderItem.order.total) ?? "0",
      userId: row.orderItem.order.userId,
      userName: row.orderItem.order.user.name,
      userEmail: row.orderItem.order.user.email,
      isPaid,
    },
    product: {
      id: row.orderItem.product.id,
      name: row.orderItem.productName,
      slug: row.orderItem.product.slug,
      quantity: row.orderItem.quantity,
      unitPrice: decimalToString(row.orderItem.unitPrice) ?? "0",
      deliveryMethod: row.orderItem.deliveryMethod,
      hasKeyInventory: row.orderItem.product._count.keys > 0,
    },
    keys,
    credentials: row.credentials.map((cred) => ({
      id: cred.id,
      contentType: cred.contentType,
      label: cred.label,
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
      createdAt: cred.createdAt.toISOString(),
    })),
    events: row.events.map((event) => ({
      id: event.id,
      status: event.status,
      message: event.message,
      source: event.source,
      actorUserId: event.actorUserId,
      actorEmail: event.actorEmail,
      createdAt: event.createdAt.toISOString(),
    })),
    smm,
    kinguin,
    notifications: row.notifications.map((n) => ({
      id: n.id,
      type: n.type,
      status: n.status,
      recipient: n.recipient,
      isResend: n.isResend,
      sentAt: n.sentAt?.toISOString() ?? null,
      errorMessage: n.errorMessage,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

export async function getAvailableProductKeys(
  productId: string,
  limit = 50,
): Promise<AvailableProductKeyDto[]> {
  const keys = await prisma.productKey.findMany({
    where: { productId, status: ProductKeyStatus.AVAILABLE },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, code: true, createdAt: true },
  });

  return keys.map((key) => ({
    id: key.id,
    codeMasked: maskSecret(key.code),
    createdAt: key.createdAt.toISOString(),
  }));
}

export async function getCustomerDeliveryForUser(
  deliveryId: string,
  userId: string,
): Promise<CustomerDeliveryDto | null> {
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
        where: {
          status: {
            in: [
              DeliveryStatus.PENDING,
              DeliveryStatus.PROCESSING,
              DeliveryStatus.DELIVERED,
              DeliveryStatus.FAILED,
            ],
          },
        },
        orderBy: { createdAt: "asc" },
        take: 30,
        select: {
          id: true,
          status: true,
          message: true,
          createdAt: true,
          source: true,
        },
      },
      orderItem: {
        select: { productName: true, quantity: true },
      },
    },
  });

  if (!row) return null;

  // Hide technical/admin failure details from customers
  const safeEvents = row.events
    .filter((e) => e.status !== DeliveryStatus.FAILED || !e.message?.includes("API"))
    .map((e) => ({
      id: e.id,
      status: e.status,
      message:
        e.status === DeliveryStatus.FAILED
          ? "Hubo un problema con la entrega. Soporte está al tanto."
          : e.message,
      createdAt: e.createdAt.toISOString(),
    }));

  return {
    id: row.id,
    status: row.status,
    deliveryMethod: row.deliveryMethod,
    productName: row.orderItem.productName,
    quantity: row.orderItem.quantity,
    customerMessage: row.customerMessage,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    keys: row.keys.map((key) => ({
      id: key.id,
      label: key.label,
      contentType: key.contentType,
      serialMasked: key.isSecret ? maskSecret(key.serial) : key.serial,
      instructions: key.instructions,
      isSecret: key.isSecret,
    })),
    credentials: row.credentials.map((cred) => ({
      id: cred.id,
      label: cred.label,
      contentType: cred.contentType,
      username: cred.username,
      email: cred.email,
      passwordMasked: cred.passwordEncrypted ? maskSecret("********") : null,
      tokenMasked: cred.tokenEncrypted ? maskSecret("********") : null,
      url: cred.url,
      notes: cred.notes,
      instructions: cred.instructions,
      isSecret: cred.isSecret,
      hasPassword: Boolean(cred.passwordEncrypted),
      hasToken: Boolean(cred.tokenEncrypted),
    })),
    events: safeEvents,
  };
}

export async function getCustomerOrderDeliveries(orderId: string, userId: string) {
  await ensureDeliveriesForOrder(orderId);

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    select: {
      id: true,
      status: true,
      email: true,
      customerName: true,
      total: true,
      currency: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          productName: true,
          quantity: true,
          delivery: {
            select: {
              id: true,
              status: true,
              deliveryMethod: true,
              deliveredAt: true,
              _count: { select: { keys: true, credentials: true } },
            },
          },
        },
      },
    },
  });

  if (!order) return null;

  return {
    id: order.id,
    status: order.status,
    email: order.email,
    customerName: order.customerName,
    total: decimalToString(order.total) ?? "0",
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      quantity: item.quantity,
      delivery: item.delivery
        ? {
            id: item.delivery.id,
            status: item.delivery.status,
            deliveryMethod: item.delivery.deliveryMethod,
            deliveredAt: item.delivery.deliveredAt?.toISOString() ?? null,
            contentCount:
              item.delivery._count.keys + item.delivery._count.credentials,
          }
        : null,
    })),
  };
}

export async function getCustomerOrdersPage(userId: string) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      total: true,
      currency: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    status: order.status,
    total: decimalToString(order.total) ?? "0",
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    itemsCount: order._count.items,
  }));
}
