import "server-only";

import { DeliveryStatus, ProductKeyStatus } from "@/generated/prisma/client";
import { AdminOpsAlertEmail } from "@/emails/admin-ops-alert-email";
import { getAdminEmailsFromEnv } from "@/lib/auth/admin-allowlist";
import { sendReactEmail } from "@/lib/email/resend";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { getReadyRedis } from "@/lib/redis";
import { getOperationalSettings } from "@/lib/settings/runtime";

const log = createLogger({ module: "delivery-ops-alerts" });

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function resolveAdminNotificationRecipients(): Promise<string[]> {
  const settings = await getOperationalSettings();
  const fromSettings = (settings.adminNotificationEmails ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.includes("@"));
  if (fromSettings.length > 0) return [...new Set(fromSettings)];
  return getAdminEmailsFromEnv().filter((entry) => entry.includes("@"));
}

async function claimAlertOnce(
  key: string,
  ttlSeconds: number,
): Promise<boolean> {
  const redis = await getReadyRedis();
  if (!redis) {
    // Without Redis, still send (may duplicate on overlapping crons).
    return true;
  }
  const result = await redis.set(`ops-alert:${key}`, "1", "EX", ttlSeconds, "NX");
  return result === "OK";
}

async function sendOpsAlertEmail(input: {
  subject: string;
  title: string;
  body: string;
  href: string;
  lines: string[];
  alertKey?: string;
}): Promise<boolean> {
  const recipients = await resolveAdminNotificationRecipients();
  if (recipients.length === 0) {
    log.warn(
      { alertKey: input.alertKey ?? "ops-alert" },
      "No admin recipients for ops alert",
    );
    return false;
  }

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendReactEmail({
          to,
          subject: input.subject,
          category: "admin",
          react: AdminOpsAlertEmail({
            title: input.title,
            body: input.body,
            lines: input.lines,
            actionUrl: input.href,
            actionLabel: "Abrir en admin",
          }),
        });
      } catch (error) {
        log.error(
          { err: error, to, alertKey: input.alertKey },
          "Ops alert email failed",
        );
      }
    }),
  );
  return true;
}

const STOCK_ALERT_TTL_SECONDS = 60 * 60 * 12;
const STOCK_SUMMARY_LINE_LIMIT = 40;

function stockSummaryLines(
  items: Array<{ name: string; available: number }>,
  threshold: number,
): string[] {
  const sorted = [...items].sort((a, b) => a.available - b.available);
  const shown = sorted.slice(0, STOCK_SUMMARY_LINE_LIMIT);
  const lines = [
    `Umbral: ${threshold}`,
    `Productos: ${items.length}`,
    ...shown.map((item) => `${item.name}: ${item.available}`),
  ];
  if (sorted.length > shown.length) {
    lines.push(`… y ${sorted.length - shown.length} más`);
  }
  return lines;
}

export async function runDeliveryOpsAlerts(): Promise<{
  lowStockSent: number;
  outOfStockSent: number;
  smmStuckSent: number;
  reservationsReleased: { keys: number; accounts: number };
}> {
  const settings = await getOperationalSettings();
  const { releaseExpiredReservations } = await import(
    "@/lib/deliveries/key-reservation"
  );
  const reservationsReleased = await releaseExpiredReservations();

  let lowStockSent = 0;
  let outOfStockSent = 0;
  let smmStuckSent = 0;

  const shouldAlertStock =
    settings.keysStockAlertsEnabled &&
    (settings.notifyLowStock || settings.notifyOutOfStock);

  if (shouldAlertStock) {
    const threshold = Math.max(0, settings.keysLowStockThreshold);
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        deliveryMethod: "MANUAL",
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            keys: { where: { status: ProductKeyStatus.AVAILABLE } },
            accounts: { where: { status: ProductKeyStatus.AVAILABLE } },
          },
        },
      },
    });

    const lowStockClaimed: Array<{ name: string; available: number }> = [];
    const outOfStockClaimed: Array<{ name: string; available: number }> = [];

    for (const product of products) {
      const available = product._count.keys + product._count.accounts;

      if (available <= 0 && settings.notifyOutOfStock) {
        if (
          await claimAlertOnce(
            `out-of-stock:${product.id}`,
            STOCK_ALERT_TTL_SECONDS,
          )
        ) {
          outOfStockClaimed.push({ name: product.name, available: 0 });
        }
        continue;
      }

      if (
        available > 0 &&
        available <= threshold &&
        settings.notifyLowStock
      ) {
        if (
          await claimAlertOnce(
            `low-stock:${product.id}:${available}`,
            STOCK_ALERT_TTL_SECONDS,
          )
        ) {
          lowStockClaimed.push({ name: product.name, available });
        }
      }
    }

    const productsHref = `${appBaseUrl()}/admin/products`;

    if (lowStockClaimed.length > 0) {
      const sent = await sendOpsAlertEmail({
        alertKey: "low-stock:summary",
        subject: `Stock bajo · ${lowStockClaimed.length} productos`,
        title: "Resumen de stock bajo",
        body: `${lowStockClaimed.length} productos MANUAL están por debajo del umbral de stock.`,
        href: productsHref,
        lines: stockSummaryLines(lowStockClaimed, threshold),
      });
      if (sent) lowStockSent = lowStockClaimed.length;
    }

    if (outOfStockClaimed.length > 0) {
      const sent = await sendOpsAlertEmail({
        alertKey: "out-of-stock:summary",
        subject: `Sin stock · ${outOfStockClaimed.length} productos`,
        title: "Resumen de productos sin stock",
        body: `${outOfStockClaimed.length} productos MANUAL se quedaron sin keys/cuentas disponibles.`,
        href: productsHref,
        lines: stockSummaryLines(outOfStockClaimed, threshold),
      });
      if (sent) outOfStockSent = outOfStockClaimed.length;
    }
  }

  if (settings.notifySmmStuck) {
    const stuckMinutes = Math.max(15, settings.smmStuckAlertMinutes);
    const cutoff = new Date(Date.now() - stuckMinutes * 60_000);
    const stuck = await prisma.delivery.findMany({
      where: {
        deliveryMethod: "SMM",
        status: {
          in: [DeliveryStatus.PROCESSING, DeliveryStatus.QUEUED],
        },
        OR: [
          { processingStartedAt: { lte: cutoff } },
          {
            processingStartedAt: null,
            updatedAt: { lte: cutoff },
          },
        ],
      },
      take: 50,
      select: {
        id: true,
        status: true,
        externalOrderId: true,
        processingStartedAt: true,
        updatedAt: true,
        orderItem: {
          select: {
            productName: true,
            orderId: true,
          },
        },
      },
    });

    const stuckClaimed: Array<{
      productName: string;
      orderId: string;
      status: DeliveryStatus;
    }> = [];

    for (const delivery of stuck) {
      if (await claimAlertOnce(`smm-stuck:${delivery.id}`, stuckMinutes * 60)) {
        stuckClaimed.push({
          productName: delivery.orderItem.productName,
          orderId: delivery.orderItem.orderId,
          status: delivery.status,
        });
      }
    }

    if (stuckClaimed.length > 0) {
      const first = stuckClaimed[0]!;
      const shown = stuckClaimed.slice(0, STOCK_SUMMARY_LINE_LIMIT);
      const lines = [
        `Umbral: ${stuckMinutes} min`,
        `Entregas: ${stuckClaimed.length}`,
        ...shown.map(
          (delivery) =>
            `${delivery.productName} · pedido ${delivery.orderId} · ${delivery.status}`,
        ),
      ];
      if (stuckClaimed.length > shown.length) {
        lines.push(`… y ${stuckClaimed.length - shown.length} más`);
      }

      const sent = await sendOpsAlertEmail({
        alertKey: "smm-stuck:summary",
        subject:
          stuckClaimed.length === 1
            ? `SMM atascado · ${first.productName}`
            : `SMM atascado · ${stuckClaimed.length} entregas`,
        title: "Resumen de entregas SMM atascadas",
        body: `${stuckClaimed.length} entregas SMM llevan más de ${stuckMinutes} minutos sin completar.`,
        href: `${appBaseUrl()}/admin/deliveries`,
        lines,
      });
      if (sent) smmStuckSent = stuckClaimed.length;
    }
  }

  log.info(
    { lowStockSent, outOfStockSent, smmStuckSent, reservationsReleased },
    "Delivery ops alerts finished",
  );

  return { lowStockSent, outOfStockSent, smmStuckSent, reservationsReleased };
}
