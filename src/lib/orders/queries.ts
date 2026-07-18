import type { Prisma } from "@/generated/prisma/client";
import { ProductStatus } from "@/generated/prisma/client";

import { getAppBaseUrl } from "@/lib/flow/client";
import prisma from "@/lib/prisma";
import { decimalToString } from "@/lib/products/format";
import type {
  OrdersListQuery,
  OrdersSortField,
} from "@/lib/validations/orders";
import type {
  OrderDetailDto,
  OrderListItemDto,
  OrderProductOptionDto,
  OrdersPageResult,
} from "@/types/orders";

function buildOrderBy(
  sort: OrdersSortField,
  order: "asc" | "desc",
): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "email":
      return { email: order };
    case "total":
      return { total: order };
    case "status":
      return { status: order };
    case "updatedAt":
      return { updatedAt: order };
    case "createdAt":
    default:
      return { createdAt: order };
  }
}

function toListItem(order: {
  id: string;
  status: OrderListItemDto["status"];
  email: string;
  customerName: string | null;
  subtotal: { toString(): string };
  total: { toString(): string };
  currency: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user: { name: string };
  _count: { items: number };
  payments: Array<{ status: NonNullable<OrderListItemDto["latestPaymentStatus"]> }>;
}): OrderListItemDto {
  return {
    id: order.id,
    status: order.status,
    email: order.email,
    customerName: order.customerName,
    subtotal: decimalToString(order.subtotal) ?? "0",
    total: decimalToString(order.total) ?? "0",
    currency: order.currency,
    itemsCount: order._count.items,
    userId: order.userId,
    userName: order.user.name,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    latestPaymentStatus: order.payments[0]?.status ?? null,
  };
}

export async function getOrdersPage(
  input: OrdersListQuery,
): Promise<OrdersPageResult> {
  const where: Prisma.OrderWhereInput = {};

  if (input.q) {
    where.OR = [
      { email: { contains: input.q, mode: "insensitive" } },
      { customerName: { contains: input.q, mode: "insensitive" } },
      { id: { contains: input.q, mode: "insensitive" } },
      { user: { name: { contains: input.q, mode: "insensitive" } } },
    ];
  }

  if (input.status) {
    where.status = input.status;
  }

  if (input.paymentStatus) {
    where.payments = {
      some: { status: input.paymentStatus },
    };
  }

  const skip = (input.page - 1) * input.pageSize;

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: buildOrderBy(input.sort, input.order),
      skip,
      take: input.pageSize,
      select: {
        id: true,
        status: true,
        email: true,
        customerName: true,
        subtotal: true,
        total: true,
        currency: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true } },
        _count: { select: { items: true } },
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    }),
  ]);

  return {
    items: orders.map(toListItem),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getOrderById(
  orderId: string,
): Promise<OrderDetailDto | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      email: true,
      customerName: true,
      subtotal: true,
      total: true,
      currency: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { name: true, email: true } },
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          productId: true,
          productName: true,
          unitPrice: true,
          quantity: true,
          deliveryMethod: true,
          product: {
            select: {
              slug: true,
              coverImageUrl: true,
              assets: {
                where: { type: "IMAGE" },
                orderBy: { sortOrder: "asc" },
                take: 1,
                select: { url: true, thumbnailUrl: true },
              },
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          provider: true,
          status: true,
          amount: true,
          currency: true,
          externalId: true,
          failureCode: true,
          failureMessage: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const baseUrl = getAppBaseUrl();

  return {
    id: order.id,
    status: order.status,
    email: order.email,
    customerName: order.customerName,
    subtotal: decimalToString(order.subtotal) ?? "0",
    total: decimalToString(order.total) ?? "0",
    currency: order.currency,
    userId: order.userId,
    userName: order.user.name,
    userEmail: order.user.email,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    checkoutUrl: `${baseUrl}/checkout?orderId=${encodeURIComponent(order.id)}`,
    items: order.items.map((item) => {
      const unitPrice = decimalToString(item.unitPrice) ?? "0";
      const lineTotal = (
        Number.parseFloat(unitPrice) * item.quantity
      ).toFixed(2);
      const cover =
        item.product.coverImageUrl ??
        item.product.assets[0]?.thumbnailUrl ??
        item.product.assets[0]?.url ??
        null;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.product.slug,
        coverImageUrl: cover,
        unitPrice,
        quantity: item.quantity,
        lineTotal,
        deliveryMethod: item.deliveryMethod,
      };
    }),
    payments: order.payments.map((payment) => ({
      id: payment.id,
      provider: payment.provider,
      status: payment.status,
      amount: decimalToString(payment.amount) ?? "0",
      currency: payment.currency,
      externalId: payment.externalId,
      failureCode: payment.failureCode,
      failureMessage: payment.failureMessage,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    })),
  };
}

export async function getActiveProductOptions(
  query?: string,
): Promise<OrderProductOptionDto[]> {
  const where: Prisma.ProductWhereInput = {
    status: ProductStatus.ACTIVE,
  };

  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { slug: { contains: query, mode: "insensitive" } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    orderBy: { name: "asc" },
    take: 40,
    select: {
      id: true,
      name: true,
      slug: true,
      price: true,
      currency: true,
      coverImageUrl: true,
      deliveryMethod: true,
      status: true,
      assets: {
        where: { type: "IMAGE" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, thumbnailUrl: true },
      },
    },
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: decimalToString(product.price) ?? "0",
    currency: product.currency,
    coverImageUrl:
      product.coverImageUrl ??
      product.assets[0]?.thumbnailUrl ??
      product.assets[0]?.url ??
      null,
    deliveryMethod: product.deliveryMethod,
    status: product.status,
  }));
}
