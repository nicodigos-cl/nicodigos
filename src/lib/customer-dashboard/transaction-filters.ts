import { PaymentStatus, type Prisma } from "@/generated/prisma/client";

import { parseOrderSearchToken } from "@/lib/customer-dashboard/format";
import type { CustomerTransactionsListQuery } from "@/lib/customer-dashboard/validations";

const STATUS_FILTER_MAP: Record<
  Exclude<CustomerTransactionsListQuery["status"], "all">,
  PaymentStatus[]
> = {
  pending: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
  paid: [PaymentStatus.PAID],
  failed: [
    PaymentStatus.FAILED,
    PaymentStatus.REJECTED,
    PaymentStatus.EXPIRED,
    PaymentStatus.CANCELLED,
  ],
  refunded: [PaymentStatus.REFUNDED, PaymentStatus.PARTIALLY_REFUNDED],
};

export function buildCustomerTransactionsWhere(
  userId: string,
  query: CustomerTransactionsListQuery,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { order: { userId } };
  const and: Prisma.PaymentWhereInput[] = [];

  if (query.status && query.status !== "all") {
    where.status = { in: STATUS_FILTER_MAP[query.status] };
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

  if (query.q) {
    const token = parseOrderSearchToken(query.q);
    const or: Prisma.PaymentWhereInput[] = [
      { id: { contains: query.q, mode: "insensitive" } },
      {
        paymentMethod: {
          contains: token.productQuery,
          mode: "insensitive",
        },
      },
    ];

    if (token.exactId) {
      or.push({ orderId: token.exactId });
      or.push({ id: token.exactId });
    } else if (token.suffix) {
      or.push({
        orderId: {
          endsWith: token.suffix.toLowerCase(),
          mode: "insensitive",
        },
      });
      or.push({
        orderId: {
          contains: token.suffix.toLowerCase(),
          mode: "insensitive",
        },
      });
    } else {
      or.push({ orderId: { contains: query.q, mode: "insensitive" } });
    }

    and.push({ OR: or });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export function buildCustomerTransactionsOrderBy(
  sort: CustomerTransactionsListQuery["sort"],
): Prisma.PaymentOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "amount_desc":
      return { amount: "desc" };
    case "amount_asc":
      return { amount: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}
