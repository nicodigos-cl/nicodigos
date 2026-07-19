import { NextResponse } from "next/server";

import { createLogger } from "@/lib/logger";
import { refreshProviderBalances } from "@/lib/providers/balance";

const log = createLogger({ module: "cron-refresh-provider-balances" });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return (
    request.headers.get("authorization") === `Bearer ${secret}` ||
    request.headers.get("x-vercel-cron-secret") === secret
  );
}

async function handle(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshProviderBalances({ forceRefresh: true });
    log.info(
      {
        kinguin: result.kinguin.status,
        smm: result.smm.map((row) => ({
          id: row.accountId,
          status: row.status,
        })),
      },
      "Provider balances refreshed",
    );
    return NextResponse.json({
      ok: true,
      kinguin: {
        status: result.kinguin.status,
        balance: result.kinguin.balance,
        currency: result.kinguin.currency,
        checkedAt: result.kinguin.checkedAt,
      },
      smm: result.smm.map((row) => ({
        accountId: row.accountId,
        status: row.status,
        balance: row.balance,
        currency: row.currency,
        checkedAt: row.checkedAt,
      })),
    });
  } catch (error) {
    log.error({ err: error }, "Provider balance cron failed");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
