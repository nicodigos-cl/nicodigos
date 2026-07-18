import { NextResponse } from "next/server";

import { sendCustomerOrderStatusEmail } from "@/lib/customer-dashboard/emails";
import { getFlowClient } from "@/lib/flow/client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { processVerifiedFlowPayment } from "@/lib/transactions/processing";
import { mapFlowStatus } from "@/lib/transactions/status";
import { PaymentStatus } from "@/generated/prisma/client";

const log = createLogger({ module: "flow-confirmation" });

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let token: string | null = null;

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { token?: string };
      token = body.token ?? null;
    } else {
      const form = await request.formData();
      const value = form.get("token");
      token = typeof value === "string" ? value : null;
    }

    if (!token) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const flow = getFlowClient();
    const { getOperationalSettings } = await import("@/lib/settings/runtime");
    const settings = await getOperationalSettings();
    const result = await flow.webhooks.verifyPaymentConfirmation(
      { token },
      {
        expectedCurrency: settings.strictCurrencyValidation
          ? settings.acceptedCurrency
          : undefined,
      },
    );

    if (!result.valid || !result.payment) {
      log.warn(
        { reason: "reason" in result ? result.reason : "invalid_confirmation" },
        "Flow confirmation rejected",
      );
      return NextResponse.json({ ok: true });
    }

    const payment = result.payment;
    const mappedStatus = mapFlowStatus(payment.status);
    const processed = await processVerifiedFlowPayment({
      token,
      source: "CALLBACK",
      snapshot: {
        status: mappedStatus,
        providerStatus: payment.statusStr,
        flowOrder: payment.flowOrder,
        commerceOrder: payment.commerceOrder,
        amount: payment.amount,
        currency: payment.currency,
        payerEmail: payment.payer,
        paymentMethod: payment.paymentData?.media ?? null,
        paidAt: payment.paymentData?.date
          ? new Date(payment.paymentData.date.replace(" ", "T"))
          : null,
      },
    });

    if (processed.changed) {
      const localPayment = await prisma.payment.findUnique({
        where: { id: processed.paymentId },
        select: { orderId: true, status: true },
      });
      if (localPayment) {
        if (localPayment.status === PaymentStatus.PAID) {
          void sendCustomerOrderStatusEmail({
            orderId: localPayment.orderId,
            kind: "PAID",
          });
        } else if (
          localPayment.status === PaymentStatus.REJECTED ||
          localPayment.status === PaymentStatus.FAILED
        ) {
          void sendCustomerOrderStatusEmail({
            orderId: localPayment.orderId,
            kind: "REJECTED",
          });
        } else if (localPayment.status === PaymentStatus.REFUNDED) {
          void sendCustomerOrderStatusEmail({
            orderId: localPayment.orderId,
            kind: "REFUNDED",
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({ errorCode: error instanceof Error ? error.name : "UNKNOWN" }, "Flow confirmation failed");
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "flow-confirmation" });
}
