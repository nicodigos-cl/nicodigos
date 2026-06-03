"use server";

import { buildFlowPaymentRequest } from "@/lib/payments/flow/build-payment-request";
import { isFlowConfigured } from "@/lib/payments/flow/config";
import { getFlowClient } from "@/lib/payments/flow/client";
import { formatFlowError } from "@/lib/payments/flow/errors";
import prisma from "@/lib/prisma";
import { requireStoreUser } from "@/lib/store/auth";
import { storeRoutes } from "@/lib/store/navigation";
import { createOrderFromCart } from "@/lib/store/checkout/create-order";
import type { StoreActionResult } from "@/lib/store/types";

export async function startFlowCheckoutAction(): Promise<
  StoreActionResult<{ redirectUrl: string; orderId: string }>
> {
  const session = await requireStoreUser(storeRoutes.cart);

  if (!isFlowConfigured()) {
    return {
      success: false,
      error:
        "El pago en línea no está disponible todavía. Contáctanos en contacto@nicodigos.cl.",
    };
  }

  const draft = await createOrderFromCart(session.user.id);

  if ("error" in draft) {
    return { success: false, error: draft.error };
  }

  try {
    const flow = getFlowClient();
    const payment = await flow.payments.create(
      buildFlowPaymentRequest({
        commerceOrder: draft.orderId,
        subject: draft.subject,
        amount: draft.amount,
        email: draft.email,
      }),
    );

    const redirectUrl =
      payment.redirectUrl ||
      `${payment.url}?token=${encodeURIComponent(payment.token)}`;

    return {
      success: true,
      data: {
        redirectUrl,
        orderId: draft.orderId,
      },
    };
  } catch (error) {
    await prisma.order.update({
      where: { id: draft.orderId },
      data: { status: "CANCELED" },
    });

    const message = formatFlowError(error);

    return {
      success: false,
      error: `Flow: ${message}`,
    };
  }
}
