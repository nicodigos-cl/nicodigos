import { getTransactionsForOrder } from "@/lib/admin/transactions/queries";
import {
  getManualFulfillmentAdminNote,
  isManualFulfillmentPending,
} from "@/lib/store/checkout/manual-fulfillment";
import prisma from "@/lib/prisma";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
} from "@/lib/admin/orders/types";

const ORDER_LIST_LIMIT = 100;

function maskSerial(serial: string): string {
  if (serial.length <= 8) {
    return "••••••••";
  }
  return `${serial.slice(0, 4)}••••${serial.slice(-4)}`;
}

export async function getAdminOrders(): Promise<AdminOrderListItem[]> {
  const orders = await prisma.order.findMany({
    take: ORDER_LIST_LIMIT,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  return orders.map((order) => {
    const needsManualFulfillment = isManualFulfillmentPending(
      order.kinguinStatus,
    );

    return {
      id: order.id,
      status: order.status,
      total: order.total.toString(),
      currency: order.currency,
      createdAt: order.createdAt.toISOString(),
      customerName: order.user.name,
      customerEmail: order.user.email,
      itemCount: order._count.items,
      kinguinOrderId: order.kinguinOrderId,
      isPreorder: order.isPreorder,
      needsManualFulfillment,
      manualFulfillmentNote: needsManualFulfillment
        ? getManualFulfillmentAdminNote(order.kinguinStatus)
        : null,
      pendingKeyCount: 0,
    };
  });
}

export async function getAdminOrderById(
  id: string,
): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          keys: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!order) {
    return null;
  }

  const transactions = await getTransactionsForOrder(id);
  const expectedKeyCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const deliveredKeyCount = order.items.reduce(
    (sum, item) =>
      sum +
      item.keys.filter(
        (key) => key.status === "DELIVERED" && key.serial.trim().length > 0,
      ).length,
    0,
  );
  const needsManualFulfillment = isManualFulfillmentPending(
    order.kinguinStatus,
  );

  return {
    id: order.id,
    status: order.status,
    total: order.total.toString(),
    subtotal: order.subtotal.toString(),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    kinguinOrderId: order.kinguinOrderId,
    kinguinStatus: order.kinguinStatus,
    isPreorder: order.isPreorder,
    preorderReleaseAt: order.preorderReleaseAt?.toISOString() ?? null,
    needsManualFulfillment,
    manualFulfillmentNote: needsManualFulfillment
      ? getManualFulfillmentAdminNote(order.kinguinStatus)
      : null,
    pendingKeyCount: Math.max(expectedKeyCount - deliveredKeyCount, 0),
    deliveredKeyCount,
    expectedKeyCount,
    customer: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
      role: order.user.role,
    },
    items: order.items.map((item) => {
      const deliveredKeys = item.keys.filter(
        (key) => key.status === "DELIVERED" && key.serial.trim().length > 0,
      );

      return {
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        lineTotal: item.lineTotal.toString(),
        kinguinProductId: item.kinguinProductId,
        productId: item.productId,
        deliveredKeyCount: deliveredKeys.length,
        pendingKeyCount: Math.max(item.quantity - deliveredKeys.length, 0),
        keys: item.keys.map((key) => ({
          id: key.id,
          kinguinKeyId: key.kinguinKeyId,
          status: key.status,
          contentType: key.contentType,
          serialMasked: maskSerial(key.serial),
        })),
      };
    }),
    transactions,
  };
}
