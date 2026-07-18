import "server-only";

import { PaymentEventResult, PaymentEventSource, PaymentEventType, PaymentStatus } from "@/generated/prisma/client";

import {
  OrderPaidEmail,
  OrderPaymentRejectedEmail,
  OrderRefundedEmail,
} from "@/emails/order-lifecycle-email";
import {
  appBaseUrl,
  formatCustomerOrderNumber,
} from "@/lib/customer-dashboard/format";
import { sendReactEmail } from "@/lib/email/resend";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { formatMoney, decimalToString } from "@/lib/products/format";

const log = createLogger({ module: "customer-dashboard" });

export async function sendCustomerOrderStatusEmail(input: {
  orderId: string;
  kind: "PAID" | "REJECTED" | "REFUNDED";
}): Promise<{ sent: boolean; skipped: boolean }> {
  const idempotencyKey = `customer-email:${input.kind}:${input.orderId}`;

  const existing = await prisma.paymentEvent.findFirst({
    where: { idempotencyKey },
    select: { id: true },
  });
  if (existing) {
    return { sent: false, skipped: true };
  }

  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      email: true,
      customerName: true,
      total: true,
      currency: true,
      user: { select: { name: true } },
      payments: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });

  if (!order) return { sent: false, skipped: true };

  const paymentId = order.payments[0]?.id;
  if (!paymentId) return { sent: false, skipped: true };

  const customerName =
    order.customerName?.trim() || order.user.name?.trim() || "cliente";
  const orderNumber = formatCustomerOrderNumber(order.id);
  const orderUrl = `${appBaseUrl()}/dashboard/orders/${order.id}`;
  const totalLabel = formatMoney(
    decimalToString(order.total) ?? "0",
    order.currency,
  );

  const email =
    input.kind === "PAID" ? (
      <OrderPaidEmail
        customerName={customerName}
        orderNumber={orderNumber}
        orderUrl={orderUrl}
        totalLabel={totalLabel}
      />
    ) : input.kind === "REJECTED" ? (
      <OrderPaymentRejectedEmail
        customerName={customerName}
        orderNumber={orderNumber}
        orderUrl={orderUrl}
        totalLabel={totalLabel}
      />
    ) : (
      <OrderRefundedEmail
        customerName={customerName}
        orderNumber={orderNumber}
        orderUrl={orderUrl}
        totalLabel={totalLabel}
      />
    );

  const subject =
    input.kind === "PAID"
      ? `Pago confirmado · ${orderNumber}`
      : input.kind === "REJECTED"
        ? `Pago no completado · ${orderNumber}`
        : `Reembolso procesado · ${orderNumber}`;

  try {
    await sendReactEmail({
      to: order.email,
      subject,
      react: email,
    });

    await prisma.paymentEvent.create({
      data: {
        paymentId,
        type: PaymentEventType.STATUS_CHANGED,
        source: PaymentEventSource.SYSTEM,
        result: PaymentEventResult.SUCCESS,
        statusAfter:
          input.kind === "PAID"
            ? PaymentStatus.PAID
            : input.kind === "REJECTED"
              ? PaymentStatus.REJECTED
              : PaymentStatus.REFUNDED,
        message: `Customer email sent: ${input.kind}`,
        idempotencyKey,
      },
    });

    log.info(
      { orderId: order.id, kind: input.kind, result: "sent" },
      "Customer order email sent",
    );
    return { sent: true, skipped: false };
  } catch (error) {
    log.error(
      {
        orderId: order.id,
        kind: input.kind,
        errorCode: error instanceof Error ? error.name : "UNKNOWN",
      },
      "Customer order email failed",
    );
    return { sent: false, skipped: false };
  }
}
