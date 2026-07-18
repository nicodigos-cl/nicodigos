"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { flattenError } from "zod";

import {
  DeliveryEventSource,
  DeliveryMethod,
  DeliveryStatus,
  UserAdminEventType,
} from "@/generated/prisma/client";

import type { ActionResult } from "@/lib/actions/types";
import { auth } from "@/lib/auth";
import { requireSession } from "@/lib/auth/session";
import {
  isOwnershipError,
  requireOwnedDelivery,
  requireOwnedOrder,
} from "@/lib/customer-dashboard/ownership";
import { supportEmail } from "@/lib/customer-dashboard/format";
import {
  buyAgainSchema,
  changeCustomerPasswordSchema,
  createSupportRequestSchema,
  resendDeliveryEmailSchema,
  retryPaymentSchema,
  revokeAllOtherSessionsSchema,
  revokeSessionSchema,
  submitSmmTargetSchema,
  updateCustomerBillingSchema,
  updateCustomerProfileSchema,
} from "@/lib/customer-dashboard/validations";
import { sendDeliveryNotification } from "@/lib/deliveries/notifications";
import { SupportRequestEmail } from "@/emails/order-lifecycle-email";
import { sendReactEmail } from "@/lib/email/resend";
import { getOrCreateFlowRedirectUrl } from "@/lib/flow/payments";
import { createLogger } from "@/lib/logger";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import prisma from "@/lib/prisma";
import { addCartItemAction } from "@/lib/actions/orders";

const log = createLogger({ module: "customer-dashboard" });

const emailResendWindowMs = 15 * 60 * 1000;

function unauthorized<T>(): ActionResult<T> {
  return { success: false, message: "Debes iniciar sesión." };
}

function validationError<T>(
  error: Parameters<typeof flattenError>[0],
): ActionResult<T> {
  const flat = flattenError(error);
  return {
    success: false,
    message: "Revisa los datos del formulario.",
    fieldErrors: flat.fieldErrors,
  };
}

function parseSubmission(rawInput: unknown): unknown {
  if (rawInput instanceof FormData) {
    const payload = rawInput.get("payload");
    if (typeof payload === "string" && payload.length > 0) {
      return JSON.parse(payload) as unknown;
    }
    const obj: Record<string, string> = {};
    for (const [key, value] of rawInput.entries()) {
      if (typeof value === "string") obj[key] = value;
    }
    return obj;
  }
  return rawInput;
}

export async function retryPaymentAction(
  rawInput: unknown,
): Promise<ActionResult<{ redirectUrl: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = retryPaymentSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  try {
    await requireOwnedOrder(parsed.data.orderId, session.user.id);
    const redirectUrl = await getOrCreateFlowRedirectUrl(parsed.data.orderId);
    log.info(
      {
        action: "retryPayment",
        userId: session.user.id,
        orderId: parsed.data.orderId,
        result: "success",
      },
      "Customer retry payment",
    );
    revalidatePath("/dashboard/pedidos");
    revalidatePath(`/dashboard/pedidos/${parsed.data.orderId}`);
    return { success: true, data: { redirectUrl } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "No se pudo iniciar el pago. Intenta nuevamente.",
    };
  }
}

export async function submitSmmTargetAction(
  rawInput: unknown,
): Promise<ActionResult<{ deliveryId: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = submitSmmTargetSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const delivery = await requireOwnedDelivery(
      parsed.data.deliveryId,
      session.user.id,
    );

    if (delivery.deliveryMethod !== DeliveryMethod.SMM) {
      return {
        success: false,
        message: "Esta entrega no requiere un destino SMM.",
      };
    }

    if (
      delivery.status !== DeliveryStatus.PENDING &&
      delivery.status !== DeliveryStatus.PROCESSING
    ) {
      return {
        success: false,
        message: "Ya no se puede modificar el destino de este servicio.",
      };
    }

    const existingLink = delivery.orderItem.smm?.link?.trim();
    if (existingLink) {
      return {
        success: false,
        message: "Este servicio ya tiene un destino configurado.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItemSmm.upsert({
        where: { orderItemId: delivery.orderItem.id },
        create: {
          orderItemId: delivery.orderItem.id,
          link: parsed.data.link,
          quantity: delivery.orderItem.smm?.quantity ?? delivery.orderItem.quantity,
        },
        update: {
          link: parsed.data.link,
        },
      });

      await tx.deliveryEvent.create({
        data: {
          deliveryId: delivery.id,
          status: delivery.status,
          source: DeliveryEventSource.SYSTEM,
          actorUserId: session.user.id,
          actorEmail: session.user.email,
          message: "El cliente agregó el enlace de destino del servicio.",
        },
      });
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/deliveries");
    revalidatePath(`/dashboard/deliveries/${delivery.id}`);
    revalidatePath("/dashboard/pedidos");
    revalidatePath(`/dashboard/pedidos/${delivery.orderItem.order.id}`);

    log.info(
      {
        action: "submitSmmTarget",
        userId: session.user.id,
        deliveryId: delivery.id,
        result: "success",
      },
      "Customer submitted SMM target",
    );

    return { success: true, data: { deliveryId: delivery.id } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "No pudimos guardar el destino. Intenta nuevamente.",
    };
  }
}

export async function updateCustomerProfileAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = updateCustomerProfileSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: session.user.id,
        type: UserAdminEventType.PROFILE_UPDATED,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        message: "Perfil actualizado por el cliente",
        metadata: { source: "customer-dashboard" },
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  log.info(
    {
      action: "updateCustomerProfile",
      userId: session.user.id,
      result: "success",
    },
    "Customer profile updated",
  );

  return { success: true, data: { ok: true } };
}

export async function updateBillingProfileAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = updateCustomerBillingSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: {
        rut: parsed.data.rut,
        invoiceType: parsed.data.invoiceType,
        businessName: parsed.data.businessName,
        businessActivity: parsed.data.businessActivity,
        addressLine1: parsed.data.addressLine1,
        addressLine2: parsed.data.addressLine2,
        commune: parsed.data.commune,
        city: parsed.data.city,
        region: parsed.data.region,
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: session.user.id,
        type: UserAdminEventType.BILLING_UPDATED,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        message: "Facturación actualizada por el cliente",
        metadata: {
          source: "customer-dashboard",
          invoiceType: parsed.data.invoiceType,
          hasRut: Boolean(parsed.data.rut),
        },
      },
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");

  log.info(
    {
      action: "updateBillingProfile",
      userId: session.user.id,
      result: "success",
    },
    "Customer billing updated",
  );

  return { success: true, data: { ok: true } };
}

export async function resendDeliveryEmailAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = resendDeliveryEmailSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  try {
    const delivery = await requireOwnedDelivery(
      parsed.data.deliveryId,
      session.user.id,
    );

    if (delivery.status !== DeliveryStatus.DELIVERED) {
      return {
        success: false,
        message: "Solo puedes reenviar el aviso de entregas disponibles.",
      };
    }

    const recent = await prisma.deliveryNotification.findFirst({
      where: {
        deliveryId: delivery.id,
        isResend: true,
        createdAt: { gte: new Date(Date.now() - emailResendWindowMs) },
      },
      select: { id: true },
    });

    if (recent) {
      return {
        success: false,
        message: "Espera unos minutos antes de solicitar otro reenvío.",
      };
    }

    const result = await sendDeliveryNotification({
      deliveryId: delivery.id,
      type: "COMPLETED",
      isResend: true,
      actor: { userId: session.user.id, email: session.user.email },
    });

    if (!result.sent) {
      return {
        success: false,
        message: "No pudimos reenviar el email. Intenta más tarde.",
      };
    }

    log.info(
      {
        action: "resendDeliveryEmail",
        userId: session.user.id,
        deliveryId: delivery.id,
        result: "success",
      },
      "Customer resend delivery email",
    );

    return { success: true, data: { ok: true } };
  } catch (error) {
    if (isOwnershipError(error)) {
      return { success: false, message: error.message };
    }
    return {
      success: false,
      message: "No pudimos reenviar el email. Intenta más tarde.",
    };
  }
}

export async function createSupportRequestAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = createSupportRequestSchema.safeParse(
    parseSubmission(rawInput),
  );
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.orderId) {
    try {
      await requireOwnedOrder(parsed.data.orderId, session.user.id);
    } catch {
      return { success: false, message: "Pedido no válido." };
    }
  }

  if (parsed.data.deliveryId) {
    try {
      await requireOwnedDelivery(parsed.data.deliveryId, session.user.id);
    } catch {
      return { success: false, message: "Entrega no válida." };
    }
  }

  const recent = await prisma.userAdminEvent.findFirst({
    where: {
      userId: session.user.id,
      type: UserAdminEventType.NOTE_ADDED,
      message: { startsWith: "support-request:" },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    select: { id: true },
  });

  if (recent) {
    return {
      success: false,
      message: "Ya enviamos una solicitud reciente. Espera unos minutos.",
    };
  }

  const sanitizedMessage = parsed.data.message
    .replace(/sk_[a-zA-Z0-9]+/g, "[redacted]")
    .slice(0, 4000);

  const thread = await prisma.$transaction(async (tx) => {
    const created = await tx.communicationThread.create({
      data: {
        subject: parsed.data.subject,
        status: "OPEN",
        category: parsed.data.category,
        userId: session.user.id,
        orderId: parsed.data.orderId,
        deliveryId: parsed.data.deliveryId,
        unreadCount: 1,
        lastMessageAt: new Date(),
        lastInboundAt: new Date(),
        messages: {
          create: {
            direction: "INBOUND",
            kind: "SUPPORT",
            status: "DELIVERED",
            provider: "WEB_FORM",
            fromAddress: session.user.email,
            fromName: session.user.name,
            toAddresses: [supportEmail()],
            subject: parsed.data.subject,
            textContent: sanitizedMessage,
            deliveredAt: new Date(),
          },
        },
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: session.user.id,
        type: UserAdminEventType.NOTE_ADDED,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        message: `support-request:${parsed.data.category}`,
        metadata: { orderId: parsed.data.orderId ?? null, deliveryId: parsed.data.deliveryId ?? null, subject: parsed.data.subject.slice(0, 160), communicationThreadId: created.id },
      },
    });
    await recordCommunicationAudit({ actor: { userId: session.user.id, email: session.user.email }, action: "SUPPORT_REQUEST_CREATE", channel: "EMAIL", resourceType: "THREAD", resourceId: created.id, statusAfter: "OPEN" }, tx);
    return created;
  });

  try {
    await sendReactEmail({
      to: supportEmail(),
      subject: `[Soporte] ${parsed.data.subject}`,
      react: <SupportRequestEmail customerName={session.user.name || "Cliente"} customerEmail={session.user.email} subject={parsed.data.subject} message={sanitizedMessage} category={parsed.data.category} orderId={parsed.data.orderId} deliveryId={parsed.data.deliveryId} />,
    });
  } catch (error) {
    log.warn({ threadId: thread.id, errorCode: error instanceof Error ? error.name : "UNKNOWN" }, "Support notification email failed; request remains in inbox");
  }

  revalidatePath("/admin/communications");
  revalidatePath("/admin/communications/email");

  log.info(
    {
      action: "createSupportRequest",
      userId: session.user.id,
      category: parsed.data.category,
      result: "success",
    },
    "Customer support request sent",
  );

  return { success: true, data: { ok: true } };
}

export async function revokeOtherSessionAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = revokeSessionSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const target = await prisma.session.findFirst({
    where: { id: parsed.data.sessionId, userId: session.user.id },
    select: { id: true, token: true },
  });

  if (!target) {
    return { success: false, message: "Sesión no encontrada." };
  }

  if (target.token === session.session.token) {
    return {
      success: false,
      message: "No puedes cerrar la sesión actual desde aquí.",
    };
  }

  await prisma.session.delete({ where: { id: target.id } });

  await prisma.userAdminEvent.create({
    data: {
      userId: session.user.id,
      type: UserAdminEventType.SESSION_REVOKED,
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      message: "Sesión revocada por el cliente",
      metadata: { sessionId: target.id },
    },
  });

  revalidatePath("/dashboard/security");

  log.info(
    {
      action: "revokeOtherSession",
      userId: session.user.id,
      result: "success",
    },
    "Customer revoked session",
  );

  return { success: true, data: { ok: true } };
}

export async function revokeAllOtherSessionsAction(
  rawInput: unknown,
): Promise<ActionResult<{ revoked: number }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = revokeAllOtherSessionsSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const revoked = await prisma.$transaction(async (tx) => {
    const deleted = await tx.session.deleteMany({
      where: {
        userId: session.user.id,
        token: { not: session.session.token },
      },
    });
    await tx.userAdminEvent.create({
      data: {
        userId: session.user.id,
        type: UserAdminEventType.SESSIONS_REVOKED_ALL,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        message: "El cliente cerró todas sus otras sesiones",
        metadata: { revoked: deleted.count, keptCurrent: true },
      },
    });
    return deleted.count;
  });

  revalidatePath("/dashboard/security");
  log.info(
    { action: "revokeAllOtherSessions", userId: session.user.id, revoked, result: "success" },
    "Customer revoked all other sessions",
  );
  return { success: true, data: { revoked } };
}

export async function changeCustomerPasswordAction(
  rawInput: unknown,
): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = changeCustomerPasswordSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);

  const credential = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "credential", password: { not: null } },
    select: { id: true },
  });
  if (!credential) {
    return {
      success: false,
      message: "Esta cuenta todavía no tiene contraseña. Usa el flujo de recuperación para crear una.",
    };
  }

  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: parsed.data.revokeOtherSessions,
      },
    });
    await prisma.userAdminEvent.create({
      data: {
        userId: session.user.id,
        type: UserAdminEventType.PROFILE_UPDATED,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        message: "Contraseña actualizada por el cliente",
        metadata: { revokedOtherSessions: parsed.data.revokeOtherSessions },
      },
    });
    revalidatePath("/dashboard/security");
    log.info(
      { action: "changePassword", userId: session.user.id, result: "success" },
      "Customer changed password",
    );
    return { success: true, data: { ok: true } };
  } catch (error) {
    log.warn(
      { action: "changePassword", userId: session.user.id, errorCode: error instanceof Error ? error.name : "UNKNOWN" },
      "Customer password change rejected",
    );
    return {
      success: false,
      message: "No pudimos cambiar la contraseña. Comprueba tu contraseña actual.",
    };
  }
}

export async function buyAgainAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const parsed = buyAgainSchema.safeParse(parseSubmission(rawInput));
  if (!parsed.success) return validationError(parsed.error);
  return addCartItemAction({
    productId: parsed.data.productId,
    quantity: 1,
  });
}
