"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import type { ActionResult } from "@/lib/actions/types";
import { addCartItemAction } from "@/lib/actions/orders";
import { requireSession } from "@/lib/auth/session";
import {
  isOwnershipError,
  requireOwnedOrder,
} from "@/lib/customer-dashboard/ownership";
import {
  CUSTOMER_ORDERS_PATH,
  customerOrderPath,
} from "@/lib/customer-dashboard/paths";
import {
  buyOrderAgainSchema,
  resendOrderConfirmationSchema,
  retryPaymentSchema,
} from "@/lib/customer-dashboard/validations";
import { sendCustomerOrderStatusEmail } from "@/lib/customer-dashboard/emails";
import { getOrCreateFlowRedirectUrl } from "@/lib/flow/payments";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import {
  DeliveryMethod,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
} from "@/generated/prisma/client";

const log = createLogger({ module: "customer-orders" });

function unauthorized<T>(): ActionResult<T> {
  return { success: false, message: "Debes iniciar sesión." };
}

function validationError<T>(
  error: Parameters<typeof flattenError>[0],
): ActionResult<T> {
  const flat = flattenError(error);
  return {
    success: false,
    message: "Revisa los datos del formulario.",
    fieldErrors: flat.fieldErrors,
  };
}

function parseSubmission(rawInput: unknown): unknown {
  if (rawInput instanceof FormData) {
    const payload = rawInput.get("payload");
    if (typeof payload === "string" && payload.length > 0) {
      return JSON.parse(payload) as unknown;
    }
    const obj: Record<string, string> = {};
    for (const [key, value] of rawInput.entries()) {
      if (typeof value === "string") obj[key] = value;
    }
    return obj;
  }
  return rawInput;
}

export async function retryOrderPaymentAction(
  rawInput: unknown,
): Promise<ActionResult<{ redirectUrl: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = retryPaymentSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const order = await requireOwnedOrder(parsed.data.orderId, session.user.id);

    const approved = await prisma.payment.findFirst({
      where: {
        orderId: order.id,
        status: PaymentStatus.PAID,
      },
      select: { id: true },
    });

    if (approved || order.status !== OrderStatus.PENDING) {
      if (
        approved ||
        order.status === OrderStatus.PAID ||
        order.status === OrderStatus.PROCESSING ||
        order.status === OrderStatus.PARTIALLY_FULFILLED ||
        order.status === OrderStatus.FULFILLED
      ) {
        return {
          success: false,
          message: "Tu pago ya fue confirmado.",
        };
      }
    }

    if (
      order.status === OrderStatus.CANCELED ||
      order.status === OrderStatus.REFUNDED
    ) {
      return {
        success: false,
        message: "Este pedido no admite un nuevo pago.",
      };
    }

    const redirectUrl = await getOrCreateFlowRedirectUrl(order.id);
    log.info(
      {
        action: "retryOrderPayment",
        userId: session.user.id,
        orderId: order.id,
        result: "success",
      },
      "Customer retry order payment",
    );
    revalidatePath(CUSTOMER_ORDERS_PATH);
    revalidatePath(customerOrderPath(order.id));
    return { success: true, data: { redirectUrl } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    log.warn(
      {
        action: "retryOrderPayment",
        userId: session.user.id,
        orderId: parsed.data.orderId,
        result: "error",
      },
      "Customer retry payment failed",
    );
    return {
      success: false,
      message:
        "No pudimos actualizar el estado del pago. Puedes volver a intentarlo en unos minutos.",
    };
  }
}

export async function buyOrderAgainAction(
  rawInput: unknown,
): Promise<ActionResult<{ added: number; skipped: number }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = buyOrderAgainSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const order = await prisma.order.findFirst({
      where: { id: parsed.data.orderId, userId: session.user.id },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            productId: true,
            quantity: true,
            product: {
              select: {
                id: true,
                status: true,
                qty: true,
                deliveryMethod: true,
                _count: {
                  select: {
                    keys: { where: { status: "AVAILABLE" } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      return { success: false, message: "No encontramos este pedido." };
    }

    let added = 0;
    let skipped = 0;

    for (const item of order.items) {
      const product = item.product;
      if (product.status !== ProductStatus.ACTIVE) {
        skipped += 1;
        continue;
      }
      const inStock =
        product.deliveryMethod === DeliveryMethod.SMM
          ? true
          : product._count.keys > 0 || product.qty > 0;
      if (!inStock) {
        skipped += 1;
        continue;
      }

      const result = await addCartItemAction({
        productId: product.id,
        quantity: Math.max(1, item.quantity),
      });
      if (result.success) {
        added += 1;
      } else {
        skipped += 1;
      }
    }

    log.info(
      {
        action: "buyOrderAgain",
        userId: session.user.id,
        orderId: order.id,
        added,
        skipped,
      },
      "Customer buy order again",
    );

    revalidatePath("/cart");
    revalidatePath(CUSTOMER_ORDERS_PATH);
    revalidatePath(customerOrderPath(order.id));

    if (added === 0 && skipped > 0) {
      return {
        success: false,
        message: "Los productos de este pedido ya no están disponibles.",
      };
    }

    return { success: true, data: { added, skipped } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "No pudimos agregar los productos al carrito.",
    };
  }
}

export async function resendOrderConfirmationAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = resendOrderConfirmationSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    const order = await requireOwnedOrder(parsed.data.orderId, session.user.id);

    const paid = await prisma.payment.findFirst({
      where: { orderId: order.id, status: PaymentStatus.PAID },
      select: { id: true },
    });

    if (!paid) {
      return {
        success: false,
        message: "Solo puedes reenviar la confirmación de un pedido pagado.",
      };
    }

    const recent = await prisma.deliveryNotification.findFirst({
      where: {
        delivery: { orderItem: { orderId: order.id } },
        isResend: true,
        createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
      },
      select: { id: true },
    });

    if (recent) {
      return {
        success: false,
        message: "Ya reenviamos un correo reciente. Espera unos minutos.",
      };
    }

    await sendCustomerOrderStatusEmail({
      orderId: order.id,
      kind: "PAID",
    });

    log.info(
      {
        action: "resendOrderConfirmation",
        userId: session.user.id,
        orderId: order.id,
      },
      "Customer resend order confirmation",
    );

    return { success: true, data: { ok: true } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "No pudimos reenviar la confirmación.",
    };
  }
}
