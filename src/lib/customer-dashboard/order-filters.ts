import { OrderStatus, PaymentStatus, type Prisma } from "@/generated/prisma/client";

import { parseOrderSearchToken } from "@/lib/customer-dashboard/format";
import type { CustomerOrdersListQuery } from "@/lib/customer-dashboard/validations";

const STATUS_CATEGORY_MAP: Record<
  Exclude<NonNullable<CustomerOrdersListQuery["status"]>, "all">,
  OrderStatus[]
> = {
  pending: [OrderStatus.PENDING, OrderStatus.PAID],
  processing: [OrderStatus.PROCESSING, OrderStatus.PARTIALLY_FULFILLED],
  completed: [OrderStatus.FULFILLED],
  canceled: [OrderStatus.CANCELED],
  refunded: [OrderStatus.REFUNDED],
};

const PAYMENT_FILTER_MAP: Record<
  NonNullable<CustomerOrdersListQuery["payment"]>,
  PaymentStatus[]
> = {
  pending: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
  paid: [PaymentStatus.PAID],
  failed: [
    PaymentStatus.FAILED,
    PaymentStatus.REJECTED,
    PaymentStatus.EXPIRED,
  ],
  refunded: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
};

export function buildCustomerOrdersWhere(
  userId: string,
  query: CustomerOrdersListQuery,
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { userId };
  const and: Prisma.OrderWhereInput[] = [];

  if (query.orderStatus) {
    where.status = query.orderStatus;
  } else if (query.status && query.status !== "all") {
    where.status = { in: STATUS_CATEGORY_MAP[query.status] };
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      where.createdAt.gte = new Date(`${query.from}T00:00:00.000Z`);
    }
    if (query.to) {
      where.createdAt.lte = new Date(`${query.to}T23:59:59.999Z`);
    }
  }

  if (query.payment) {
    and.push({
      payments: {
        some: {
          status: { in: PAYMENT_FILTER_MAP[query.payment] },
        },
      },
    });
  }

  if (query.delivery) {
    and.push({
      items: {
        some: {
          deliveryMethod: query.delivery,
        },
      },
    });
  }

  if (query.q) {
    const token = parseOrderSearchToken(query.q);
    const or: Prisma.OrderWhereInput[] = [
      {
        items: {
          some: {
            productName: {
              contains: token.productQuery,
              mode: "insensitive",
            },
          },
        },
      },
    ];

    if (token.exactId) {
      or.push({ id: token.exactId });
    } else if (token.suffix) {
      or.push({ id: { endsWith: token.suffix.toLowerCase(), mode: "insensitive" } });
      or.push({ id: { contains: token.suffix.toLowerCase(), mode: "insensitive" } });
    } else {
      or.push({ id: { contains: query.q, mode: "insensitive" } });
    }

    and.push({ OR: or });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export function buildCustomerOrdersOrderBy(
  sort: CustomerOrdersListQuery["sort"],
): Prisma.OrderOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "amount_desc":
      return { total: "desc" };
    case "amount_asc":
      return { total: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}
