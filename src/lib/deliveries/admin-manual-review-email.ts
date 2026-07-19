import "server-only";

import { AdminManualReviewEmail } from "@/emails/admin-manual-review-email";
import { getAdminEmailsFromEnv } from "@/lib/auth/admin-allowlist";
import { sendReactEmail } from "@/lib/email/resend";
import { createLogger } from "@/lib/logger";
import { sanitizeProviderError } from "@/lib/providers/balance-types";
import prisma from "@/lib/prisma";

const log = createLogger({ module: "admin-manual-review-email" });

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function sendAdminManualReviewEmail(deliveryId: string): Promise<void> {
  const recipients = getAdminEmailsFromEnv().filter((entry) =>
    entry.includes("@"),
  );
  if (recipients.length === 0) {
    log.warn({ deliveryId }, "No ADMIN_EMAILS addresses for manual review alert");
    return;
  }

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      deliveryMethod: true,
      effectiveDeliveryMethod: true,
      attemptCount: true,
      lastError: true,
      errorMessage: true,
      externalOrderId: true,
      kinguinOrderId: true,
      orderExternalId: true,
      orderItem: {
        select: {
          id: true,
          productName: true,
          order: {
            select: {
              id: true,
              email: true,
              customerName: true,
              user: { select: { name: true, email: true } },
            },
          },
        },
      },
    },
  });

  if (!delivery) return;

  const order = delivery.orderItem.order;
  const customerName =
    order.customerName || order.user.name || order.email;
  const errorMessage = sanitizeProviderError(
    delivery.lastError || delivery.errorMessage || "Error desconocido",
  );
  const externalReference =
    delivery.externalOrderId ||
    delivery.kinguinOrderId ||
    delivery.orderExternalId ||
    null;
  const adminDeliveryUrl = `${appBaseUrl()}/admin/deliveries/${delivery.id}`;

  await Promise.all(
    recipients.map(async (to) => {
      try {
        await sendReactEmail({
          to,
          subject: `Revisión manual · ${order.id.slice(0, 8)} · ${delivery.orderItem.productName}`,
          category: "admin",
          react: AdminManualReviewEmail({
            orderId: order.id,
            customerName,
            customerEmail: order.email || order.user.email,
            productName: delivery.orderItem.productName,
            orderItemId: delivery.orderItem.id,
            provider: delivery.deliveryMethod,
            externalReference,
            errorMessage,
            attemptCount: delivery.attemptCount,
            adminDeliveryUrl,
          }),
        });
      } catch (error) {
        log.error(
          { err: error, deliveryId, to },
          "Failed to send admin manual review email",
        );
      }
    }),
  );
}
