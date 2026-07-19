import "server-only";

import {
  DeliveryMethod,
  ProductKeyStatus,
  type Prisma,
} from "@/generated/prisma/client";
import prisma from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export class KeyReservationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "KeyReservationError";
  }
}

/**
 * Reserve AVAILABLE keys for MANUAL order lines at checkout.
 * No-op when reservation is disabled or the line is not MANUAL.
 */
export async function reserveKeysForOrderItems(
  tx: Tx,
  input: {
    enabled: boolean;
    durationMinutes: number;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      deliveryMethod: DeliveryMethod;
      productName: string;
    }>;
  },
): Promise<{ reserved: number }> {
  if (!input.enabled) return { reserved: 0 };

  const until = new Date(
    Date.now() + Math.max(1, input.durationMinutes) * 60_000,
  );
  let reserved = 0;

  for (const item of input.items) {
    if (item.deliveryMethod !== DeliveryMethod.MANUAL) continue;

    const keys = await tx.productKey.findMany({
      where: {
        productId: item.productId,
        status: ProductKeyStatus.AVAILABLE,
      },
      orderBy: { createdAt: "asc" },
      take: item.quantity,
      select: { id: true },
    });

    if (keys.length !== item.quantity) {
      throw new KeyReservationError(
        `Stock insuficiente para reservar "${item.productName}": se necesitan ${item.quantity} keys y hay ${keys.length}.`,
      );
    }

    for (const key of keys) {
      const claimed = await tx.productKey.updateMany({
        where: { id: key.id, status: ProductKeyStatus.AVAILABLE },
        data: {
          status: ProductKeyStatus.RESERVED,
          orderItemId: item.id,
          reservedUntil: until,
        },
      });
      if (claimed.count !== 1) {
        throw new KeyReservationError(
          `No se pudo reservar inventario para "${item.productName}". Intenta de nuevo.`,
        );
      }
      reserved += 1;
    }
  }

  return { reserved };
}

/** Release expired RESERVED keys/accounts back to AVAILABLE. */
export async function releaseExpiredReservations(
  client: Tx | typeof prisma = prisma,
): Promise<{ keys: number; accounts: number }> {
  const now = new Date();
  const [keys, accounts] = await Promise.all([
    client.productKey.updateMany({
      where: {
        status: ProductKeyStatus.RESERVED,
        reservedUntil: { lte: now },
      },
      data: {
        status: ProductKeyStatus.AVAILABLE,
        orderItemId: null,
        reservedUntil: null,
      },
    }),
    client.productAccount.updateMany({
      where: {
        status: ProductKeyStatus.RESERVED,
        reservedUntil: { lte: now },
      },
      data: {
        status: ProductKeyStatus.AVAILABLE,
        orderItemId: null,
        reservedUntil: null,
      },
    }),
  ]);
  return { keys: keys.count, accounts: accounts.count };
}

/** Release all reservations tied to an order (cancel / expire unpaid). */
export async function releaseReservationsForOrder(
  tx: Tx,
  orderId: string,
): Promise<{ keys: number; accounts: number }> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { id: true },
  });
  const ids = items.map((item) => item.id);
  if (ids.length === 0) return { keys: 0, accounts: 0 };

  const [keys, accounts] = await Promise.all([
    tx.productKey.updateMany({
      where: {
        orderItemId: { in: ids },
        status: ProductKeyStatus.RESERVED,
      },
      data: {
        status: ProductKeyStatus.AVAILABLE,
        orderItemId: null,
        reservedUntil: null,
      },
    }),
    tx.productAccount.updateMany({
      where: {
        orderItemId: { in: ids },
        status: ProductKeyStatus.RESERVED,
      },
      data: {
        status: ProductKeyStatus.AVAILABLE,
        orderItemId: null,
        reservedUntil: null,
      },
    }),
  ]);
  return { keys: keys.count, accounts: accounts.count };
}
