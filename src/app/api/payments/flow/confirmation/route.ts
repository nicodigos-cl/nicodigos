import { NextResponse } from "next/server";

import { markOrderPaidFromFlow } from "@/lib/actions/orders";
import { getFlowClient } from "@/lib/flow/client";
import { createLogger } from "@/lib/logger";

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
    const result = await flow.webhooks.verifyPaymentConfirmation(
      { token },
      { expectedCurrency: "CLP" },
    );

    if (!result.valid || !result.payment) {
      log.warn({ token }, "Flow confirmation rejected");
      return NextResponse.json({ ok: true });
    }

    const orderId = result.payment.commerceOrder;
    if (orderId) {
      await markOrderPaidFromFlow({ orderId, token });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error({ err: error }, "Flow confirmation failed");
    return NextResponse.json({ ok: true });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "flow-confirmation" });
}
