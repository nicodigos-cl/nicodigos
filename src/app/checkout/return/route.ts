import { NextResponse } from "next/server";

import { getAppBaseUrl, getFlowClient } from "@/lib/flow/client";
import {
  applyOrderAccessCookie,
  canAccessOrder,
  isOrderAccessTokenFormat,
} from "@/lib/orders/access";
import { processVerifiedFlowPayment } from "@/lib/transactions/processing";
import { mapFlowStatus, normalizeFlowAmount } from "@/lib/transactions/status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function firstParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

async function handleCheckoutReturn(request: Request) {
  const url = new URL(request.url);
  let orderId = firstParam(url.searchParams.get("orderId"));
  let token = firstParam(url.searchParams.get("token"));
  let accessToken = firstParam(url.searchParams.get("s"));

  if (request.method === "POST") {
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/x-www-form-urlencoded")) {
        const body = await request.formData();
        orderId = firstParam(String(body.get("orderId") ?? "")) ?? orderId;
        token = firstParam(String(body.get("token") ?? "")) ?? token;
        accessToken = firstParam(String(body.get("s") ?? "")) ?? accessToken;
      }
    } catch {
      // Keep query params if body parse fails.
    }
  }

  if (token && orderId) {
    try {
      const flow = getFlowClient();
      const status = await flow.payments.status.byToken(token);
      await processVerifiedFlowPayment({
        token,
        source: "CALLBACK",
        snapshot: {
          status: mapFlowStatus(status.status),
          providerStatus: status.statusStr,
          flowOrder: status.flowOrder,
          commerceOrder: status.commerceOrder,
          amount: normalizeFlowAmount(status.amount),
          currency: status.currency,
          payerEmail: status.payer,
          paymentMethod: status.paymentData?.media ?? null,
          paidAt: status.paymentData?.date
            ? new Date(status.paymentData.date.replace(" ", "T"))
            : null,
        },
      });
    } catch {
      // Keep pending UI on the order page if verification fails.
    }
  }

  const baseUrl = getAppBaseUrl();
  if (!orderId) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const destination = new URL(
    `/checkout/${encodeURIComponent(orderId)}`,
    baseUrl,
  );
  const response = NextResponse.redirect(destination);

  if (accessToken && isOrderAccessTokenFormat(accessToken)) {
    const allowed = await canAccessOrder({ orderId, accessToken });
    if (allowed) {
      applyOrderAccessCookie(response, orderId, accessToken);
    }
  }

  return response;
}

export async function GET(request: Request) {
  return handleCheckoutReturn(request);
}

export async function POST(request: Request) {
  return handleCheckoutReturn(request);
}
