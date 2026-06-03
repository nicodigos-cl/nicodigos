import "server-only";

import { Prisma } from "@/lib/generated/prisma/client";
import prisma from "@/lib/prisma";

export type CheckoutOrderDraft = {
  orderId: string;
  email: string;
  subject: string;
  amount: number;
  itemCount: number;
};

export async function createOrderFromCart(
  userId: string,
): Promise<CheckoutOrderDraft | { error: string }> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              kinguinId: true,
              kinguinProductId: true,
              isActive: true,
              qty: true,
              isPreorder: true,
            },
          },
          offer: {
            select: {
              id: true,
              name: true,
              kinguinOfferId: true,
              costPrice: true,
              sellPrice: true,
              qty: true,
              isPreorder: true,
            },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { error: "Tu carrito está vacío." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user?.email) {
    return {
      error:
        "No encontramos tu correo. Actualiza tu perfil e intenta de nuevo.",
    };
  }

  let subtotal = 0;
  let itemCount = 0;
  let isPreorder = false;

  const orderItems: Prisma.OrderItemCreateWithoutOrderInput[] = [];

  for (const item of cart.items) {
    const { product, offer } = item;

    if (!product.isActive || product.qty <= 0) {
      return { error: `"${product.name}" ya no está disponible.` };
    }

    if (offer.qty < item.quantity) {
      return {
        error: `Solo quedan ${offer.qty} unidades de "${product.name}".`,
      };
    }

    const unitSellPrice = new Prisma.Decimal(offer.sellPrice.toString());
    const unitCostPrice = new Prisma.Decimal(offer.costPrice.toString());
    const lineTotal = unitSellPrice.mul(item.quantity);

    subtotal += Number(lineTotal.toString());
    itemCount += item.quantity;
    isPreorder = isPreorder || product.isPreorder || offer.isPreorder;

    orderItems.push({
      product: { connect: { id: product.id } },
      offer: { connect: { id: offer.id } },
      kinguinId: product.kinguinId,
      kinguinProductId: product.kinguinProductId,
      kinguinOfferId: offer.kinguinOfferId,
      name: product.name,
      quantity: item.quantity,
      unitCostPrice,
      unitSellPrice,
      lineTotal,
    });
  }

  const totalDecimal = new Prisma.Decimal(Math.round(subtotal).toString());
  const amount = Math.round(subtotal);

  if (amount <= 0) {
    return { error: "El total del pedido no es válido." };
  }

  const order = await prisma.order.create({
    data: {
      userId,
      status: "PENDING",
      currency: "CLP",
      subtotal: totalDecimal,
      total: totalDecimal,
      isPreorder,
      items: {
        create: orderItems,
      },
    },
    select: { id: true },
  });

  const subject =
    itemCount === 1
      ? `Compra en nicodigos.cl — ${orderItems[0]?.name ?? "producto digital"}`
      : `Compra en nicodigos.cl (${itemCount} productos)`;

  return {
    orderId: order.id,
    email: user.email,
    subject,
    amount,
    itemCount,
  };
}
