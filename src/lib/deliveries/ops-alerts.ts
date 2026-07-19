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

async function sendOpsAlert(input: {
  alertKey: string;
  ttlSeconds: number;
  subject: string;
  title: string;
  body: string;
  href: string;
  lines: string[];
}): Promise<boolean> {
  if (!(await claimAlertOnce(input.alertKey, input.ttlSeconds))) {
    return false;
  }

  const recipients = await resolveAdminNotificationRecipients();
  if (recipients.length === 0) {
    log.warn({ alertKey: input.alertKey }, "No admin recipients for ops alert");
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
        log.error({ err: error, to, alertKey: input.alertKey }, "Ops alert email failed");
      }
    }),
  );
  return true;
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
        slug: true,
        _count: {
          select: {
            keys: { where: { status: ProductKeyStatus.AVAILABLE } },
            accounts: { where: { status: ProductKeyStatus.AVAILABLE } },
          },
        },
      },
    });

    for (const product of products) {
      const available =
        product._count.keys + product._count.accounts;
      const href = `${appBaseUrl()}/admin/products/${product.id}`;

      if (available <= 0 && settings.notifyOutOfStock) {
        const sent = await sendOpsAlert({
          alertKey: `out-of-stock:${product.id}`,
          ttlSeconds: 60 * 60 * 12,
          subject: `Sin stock · ${product.name}`,
          title: "Producto sin stock",
          body: "Un producto MANUAL se quedó sin keys/cuentas disponibles.",
          href,
          lines: [
            `Producto: ${product.name}`,
            `Disponible: 0`,
            `Umbral configurado: ${threshold}`,
          ],
        });
        if (sent) outOfStockSent += 1;
        continue;
      }

      if (
        available > 0 &&
        available <= threshold &&
        settings.notifyLowStock
      ) {
        const sent = await sendOpsAlert({
          alertKey: `low-stock:${product.id}:${available}`,
          ttlSeconds: 60 * 60 * 12,
          subject: `Stock bajo · ${product.name}`,
          title: "Stock bajo de inventario",
          body: "Un producto MANUAL está por debajo del umbral de stock.",
          href,
          lines: [
            `Producto: ${product.name}`,
            `Disponible: ${available}`,
            `Umbral: ${threshold}`,
          ],
        });
        if (sent) lowStockSent += 1;
      }
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

    for (const delivery of stuck) {
      const sent = await sendOpsAlert({
        alertKey: `smm-stuck:${delivery.id}`,
        ttlSeconds: stuckMinutes * 60,
        subject: `SMM atascado · ${delivery.orderItem.productName}`,
        title: "Entrega SMM atascada",
        body: `Una entrega SMM lleva más de ${stuckMinutes} minutos sin completar.`,
        href: `${appBaseUrl()}/admin/deliveries/${delivery.id}`,
        lines: [
          `Pedido: ${delivery.orderItem.orderId}`,
          `Producto: ${delivery.orderItem.productName}`,
          `Estado: ${delivery.status}`,
          `Externo: ${delivery.externalOrderId ?? "—"}`,
        ],
      });
      if (sent) smmStuckSent += 1;
    }
  }

  log.info(
    { lowStockSent, outOfStockSent, smmStuckSent, reservationsReleased },
    "Delivery ops alerts finished",
  );

  return { lowStockSent, outOfStockSent, smmStuckSent, reservationsReleased };
}
