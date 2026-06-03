import { confirmFlowPaymentByToken } from "@/lib/store/checkout/confirm-payment";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function readToken(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    const params = new URLSearchParams(body);
    return params.get("token");
  }

  if (contentType.includes("application/json")) {
    try {
      const body = (await request.json()) as { token?: string };
      return body.token ?? null;
    } catch {
      return null;
    }
  }

  const url = new URL(request.url);
  return url.searchParams.get("token");
}

async function handleConfirmation(request: Request) {
  const token = await readToken(request);

  if (!token) {
    return new NextResponse("Missing token", { status: 400 });
  }

  try {
    await confirmFlowPaymentByToken(token);
    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[flow webhook]", error);
    return new NextResponse("Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleConfirmation(request);
}

export async function GET(request: Request) {
  return handleConfirmation(request);
}
