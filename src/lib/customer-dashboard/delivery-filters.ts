import {
  DeliveryMethod,
  DeliveryStatus,
  type Prisma,
} from "@/generated/prisma/client";

import { parseOrderSearchToken } from "@/lib/customer-dashboard/format";
import type { CustomerDeliveriesListQuery } from "@/lib/customer-dashboard/validations";

export function buildCustomerDeliveriesWhere(
  userId: string,
  query: CustomerDeliveriesListQuery,
): Prisma.DeliveryWhereInput {
  const where: Prisma.DeliveryWhereInput = {
    orderItem: { order: { userId } },
  };
  const and: Prisma.DeliveryWhereInput[] = [];

  if (query.status) {
    where.status = query.status;
  } else {
    switch (query.filter) {
      case "available":
      case "completed":
        where.status = DeliveryStatus.DELIVERED;
        break;
      case "processing":
        where.status = {
          in: [
            DeliveryStatus.PENDING,
            DeliveryStatus.QUEUED,
            DeliveryStatus.PROCESSING,
          ],
        };
        break;
      case "problems":
        where.status = {
          in: [DeliveryStatus.FAILED, DeliveryStatus.MANUAL_REVIEW],
        };
        break;
      case "keys":
        where.deliveryMethod = DeliveryMethod.KINGUIN;
        break;
      case "accounts":
        and.push({ credentials: { some: {} } });
        break;
      case "smm":
        where.deliveryMethod = DeliveryMethod.SMM;
        break;
      default:
        break;
    }
  }

  if (query.method) {
    where.deliveryMethod = query.method;
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
    const or: Prisma.DeliveryWhereInput[] = [
      {
        orderItem: {
          productName: {
            contains: token.productQuery,
            mode: "insensitive",
          },
        },
      },
      {
        id: { contains: query.q, mode: "insensitive" },
      },
    ];

    if (token.exactId) {
      or.push({ orderItem: { order: { id: token.exactId } } });
      or.push({ id: token.exactId });
    } else if (token.suffix) {
      or.push({
        orderItem: {
          order: {
            id: {
              endsWith: token.suffix.toLowerCase(),
              mode: "insensitive",
            },
          },
        },
      });
      or.push({
        orderItem: {
          order: {
            id: {
              contains: token.suffix.toLowerCase(),
              mode: "insensitive",
            },
          },
        },
      });
    } else {
      or.push({
        orderItem: {
          order: { id: { contains: query.q, mode: "insensitive" } },
        },
      });
    }

    and.push({ OR: or });
  }

  if (and.length > 0) where.AND = and;
  return where;
}

export function buildCustomerDeliveriesOrderBy(
  sort: CustomerDeliveriesListQuery["sort"],
): Prisma.DeliveryOrderByWithRelationInput {
  switch (sort) {
    case "oldest":
      return { createdAt: "asc" };
    case "delivered_newest":
      return { deliveredAt: "desc" };
    case "delivered_oldest":
      return { deliveredAt: "asc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}
