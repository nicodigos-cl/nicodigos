import { NextResponse } from "next/server";

import { PaymentStatus } from "@/generated/prisma/enums";
import { getFlowClient } from "@/lib/flow/client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { appendPaymentEvent } from "@/lib/transactions/processing";

const log = createLogger({ module: "flow-refund-callback" });

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const value = form.get("token");
    const token = typeof value === "string" ? value : null;
    if (!token) return NextResponse.json({ ok: false }, { status: 400 });
    const remote = await getFlowClient().refunds.status.byToken(token);
    await prisma.$transaction(async (tx) => {
      const refund = await tx.paymentRefund.findUnique({ where: { providerToken: token }, include: { payment: { select: { id: true, status: true, amount: true, refundAmount: true, orderId: true } } } });
      if (!refund) return;
      const status = remote.status === "created" ? "CREATED" : remote.status === "accepted" ? "ACCEPTED" : remote.status === "rejected" ? "REJECTED" : remote.status === "refunded" ? "REFUNDED" : "CANCELLED";
      const completed = status === "REFUNDED";
      const nextRefundAmount = completed ? Number(refund.payment.refundAmount) + Number(refund.amount) : Number(refund.payment.refundAmount);
      const nextPaymentStatus = completed ? (nextRefundAmount >= Number(refund.payment.amount) ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED) : refund.payment.status;
      await tx.paymentRefund.update({ where: { id: refund.id }, data: { status, flowRefundOrder: remote.flowRefundOrder, completedAt: completed ? new Date() : null } });
      if (completed) {
        await tx.payment.update({ where: { id: refund.paymentId }, data: { refundAmount: nextRefundAmount, status: nextPaymentStatus } });
        if (nextPaymentStatus === PaymentStatus.REFUNDED) await tx.order.update({ where: { id: refund.payment.orderId }, data: { status: "REFUNDED" } });
      }
      await appendPaymentEvent(tx, { paymentId: refund.paymentId, type: completed ? "REFUND_COMPLETED" : "REFUND_STATUS_CHECKED", source: "WEBHOOK", statusBefore: refund.payment.status, statusAfter: nextPaymentStatus, message: `Flow informó reembolso ${remote.status}.`, providerRef: remote.flowRefundOrder, idempotencyKey: `refund-callback:${token}:${remote.status}` });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({ errorCode: error instanceof Error ? error.name : "UNKNOWN" }, "Flow refund callback failed");
    return NextResponse.json({ ok: true });
  }
}
