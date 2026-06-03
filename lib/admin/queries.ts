import prisma from "@/lib/prisma";
import type { OrderStatus } from "@/lib/generated/prisma/client";

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export type DashboardData = {
  revenue: string;
  ordersToday: number;
  activeProducts: number;
  categories: number;
  users: number;
  openCarts: number;
  pendingKeys: number;
  ordersByStatus: { status: OrderStatus; count: number }[];
  recentOrders: {
    id: string;
    status: OrderStatus;
    total: string;
    currency: string;
    createdAt: string;
    customerName: string;
    customerEmail: string;
    itemCount: number;
  }[];
  lowStockProducts: {
    id: string;
    name: string;
    qty: number;
    platform: string;
  }[];
};

export async function getDashboardData(): Promise<DashboardData> {
  const today = startOfToday();

  const [
    revenueAgg,
    ordersToday,
    activeProducts,
    categories,
    users,
    openCarts,
    pendingKeys,
    ordersByStatusRaw,
    recentOrdersRaw,
    lowStockProducts,
  ] = await Promise.all([
    prisma.order.aggregate({
      _sum: { total: true },
      where: {
        status: { in: ["COMPLETED", "PROCESSING"] },
      },
    }),
    prisma.order.count({
      where: { createdAt: { gte: today } },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.category.count(),
    prisma.user.count(),
    prisma.cart.count({
      where: { items: { some: {} } },
    }),
    prisma.orderKey.count({ where: { status: "PENDING" } }),
    prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.product.findMany({
      where: { isActive: true, qty: { lt: 5 } },
      take: 8,
      orderBy: { qty: "asc" },
      select: { id: true, name: true, qty: true, platform: true },
    }),
  ]);

  const ordersByStatus = ordersByStatusRaw.map((row) => ({
    status: row.status,
    count: row._count._all,
  }));

  const recentOrders = recentOrdersRaw.map((order) => ({
    id: order.id,
    status: order.status,
    total: order.total.toString(),
    currency: order.currency,
    createdAt: order.createdAt.toISOString(),
    customerName: order.user.name,
    customerEmail: order.user.email,
    itemCount: order._count.items,
  }));

  return {
    revenue: revenueAgg._sum.total?.toString() ?? "0",
    ordersToday,
    activeProducts,
    categories,
    users,
    openCarts,
    pendingKeys,
    ordersByStatus,
    recentOrders,
    lowStockProducts,
  };
}
