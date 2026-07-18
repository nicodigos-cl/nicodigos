"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import {
  DeliveryContentType,
  DeliveryEventSource,
  DeliveryMethod,
  DeliveryStatus,
  ProductKeyStatus,
  type Prisma,
} from "@/generated/prisma/client";

import type { ActionResult } from "@/lib/actions/types";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secrets";
import { ensureDeliveriesForOrder } from "@/lib/deliveries/ensure";
import { sendDeliveryNotification } from "@/lib/deliveries/notifications";
import { canTransitionDeliveryStatus } from "@/lib/deliveries/status";
import { KinguinClient } from "@/lib/kinguin-client";
import { createLogger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { SmmService } from "@/lib/smm-service";
import type { SmmOrderPayload } from "@/types/smm";
import {
  adminMessageSchema,
  completeManualDeliverySchema,
  deliveryIdSchema,
  markDeliveryFailedSchema,
  resendDeliveryEmailSchema,
  revealDeliverySecretSchema,
  saveManualDeliverySchema,
  type SaveManualDeliveryInput,
} from "@/lib/validations/deliveries";

const log = createLogger({ module: "admin-deliveries" });

type Actor = { userId: string; email: string };

function unauthorized<T>(): ActionResult<T> {
  return {
    success: false,
    message: "No autorizado. Se requiere sesión de administrador.",
  };
}

function validationError<T>(
  error: Parameters<typeof flattenError>[0],
): ActionResult<T> {
  const flat = flattenError(error);
  return {
    success: false,
    message: "Revisa los campos del formulario.",
    fieldErrors: flat.fieldErrors,
  };
}

function parseSubmission(rawInput: unknown): unknown {
  if (!(rawInput instanceof FormData)) return rawInput;
  const payload = rawInput.get("payload");
  return typeof payload === "string" ? JSON.parse(payload) : null;
}

async function requireAdminActor(): Promise<Actor | null> {
  const { requireSession } = await import("@/lib/auth/session");
  const session = await requireSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return {
    userId: session.user.id,
    email: session.user.email,
  };
}

function revalidateDelivery(deliveryId: string, orderId?: string) {
  revalidatePath("/admin/deliveries");
  revalidatePath(`/admin/deliveries/${deliveryId}`);
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath(`/dashboard/orders/${orderId}`);
  }
  revalidatePath("/dashboard/orders");
}

async function appendEvent(
  tx: Prisma.TransactionClient,
  input: {
    deliveryId: string;
    status: DeliveryStatus;
    message: string;
    actor?: Actor | null;
    source?: DeliveryEventSource;
  },
) {
  await tx.deliveryEvent.create({
    data: {
      deliveryId: input.deliveryId,
      status: input.status,
      message: input.message,
      source: input.source ?? (input.actor ? DeliveryEventSource.ADMIN : DeliveryEventSource.SYSTEM),
      actorUserId: input.actor?.userId,
      actorEmail: input.actor?.email,
    },
  });
}

async function persistManualContent(
  tx: Prisma.TransactionClient,
  input: SaveManualDeliveryInput & {
    productId: string;
    quantity: number;
    orderItemId: string;
  },
) {
  if (input.replaceExisting) {
    const existingKeys = await tx.deliveryKey.findMany({
      where: { deliveryId: input.deliveryId, productKeyId: { not: null } },
      select: { productKeyId: true },
    });
    const releaseIds = existingKeys
      .map((k) => k.productKeyId)
      .filter((id): id is string => Boolean(id));
    if (releaseIds.length > 0) {
      await tx.productKey.updateMany({
        where: { id: { in: releaseIds } },
        data: {
          status: ProductKeyStatus.AVAILABLE,
          orderItemId: null,
        },
      });
    }
    await tx.deliveryKey.deleteMany({ where: { deliveryId: input.deliveryId } });
    await tx.deliveryCredential.deleteMany({
      where: { deliveryId: input.deliveryId },
    });
  }

  const productKeyIds = new Set<string>([
    ...input.productKeyIds,
    ...input.keys
      .map((k) => k.productKeyId)
      .filter((id): id is string => Boolean(id)),
  ]);

  if (input.autoAssignKeys) {
    const needed = Math.max(
      0,
      input.quantity - productKeyIds.size - input.keys.filter((k) => !k.productKeyId).length,
    );
    if (needed > 0) {
      const available = await tx.productKey.findMany({
        where: {
          productId: input.productId,
          status: ProductKeyStatus.AVAILABLE,
          id: { notIn: [...productKeyIds] },
        },
        orderBy: { createdAt: "asc" },
        take: needed,
        select: { id: true, code: true },
      });
      if (available.length < needed) {
        throw new Error(
          `Inventario insuficiente: se necesitan ${needed} keys disponibles y hay ${available.length}.`,
        );
      }
      for (const key of available) {
        productKeyIds.add(key.id);
      }
    }
  }

  // Assign inventory keys with row-level safety
  for (const productKeyId of productKeyIds) {
    const updated = await tx.productKey.updateMany({
      where: {
        id: productKeyId,
        productId: input.productId,
        status: ProductKeyStatus.AVAILABLE,
      },
      data: {
        status: ProductKeyStatus.SOLD,
        orderItemId: input.orderItemId,
      },
    });
    if (updated.count !== 1) {
      throw new Error(
        "Una o más keys ya no están disponibles. Actualiza e intenta de nuevo.",
      );
    }
    const productKey = await tx.productKey.findUniqueOrThrow({
      where: { id: productKeyId },
      select: { code: true },
    });
    await tx.deliveryKey.create({
      data: {
        deliveryId: input.deliveryId,
        serial: productKey.code,
        contentType: DeliveryContentType.PRODUCT_KEY,
        label: "Product key",
        isSecret: true,
        productKeyId,
      },
    });
  }

  for (const key of input.keys) {
    if (key.productKeyId) continue; // already handled via inventory
    await tx.deliveryKey.create({
      data: {
        deliveryId: input.deliveryId,
        serial: key.serial,
        contentType: key.contentType as DeliveryContentType,
        label: key.label,
        instructions: key.instructions,
        isSecret: key.isSecret,
      },
    });
  }

  for (const cred of input.credentials) {
    await tx.deliveryCredential.create({
      data: {
        deliveryId: input.deliveryId,
        contentType: cred.contentType as DeliveryContentType,
        label: cred.label,
        username: cred.username,
        email: cred.email,
        passwordEncrypted: cred.password
          ? encryptSecret(cred.password)
          : null,
        tokenEncrypted: cred.token ? encryptSecret(cred.token) : null,
        url: cred.url,
        notes: cred.notes,
        instructions: cred.instructions,
        isSecret: cred.isSecret,
      },
    });
  }
}

export async function saveManualDeliveryDraftAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return { success: false, message: "Los datos del formulario son inválidos." };
  }

  const parsed = saveManualDeliverySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parsed.data.deliveryId },
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            productId: true,
            orderId: true,
          },
        },
      },
    });

    if (!delivery) {
      return { success: false, message: "Entrega no encontrada." };
    }
    if (delivery.deliveryMethod !== DeliveryMethod.MANUAL) {
      return {
        success: false,
        message: "Solo las entregas MANUAL admiten este formulario.",
      };
    }
    if (delivery.status === DeliveryStatus.CANCELED) {
      return { success: false, message: "La entrega está cancelada." };
    }

    await prisma.$transaction(async (tx) => {
      await persistManualContent(tx, {
        ...parsed.data,
        productId: delivery.orderItem.productId,
        quantity: delivery.orderItem.quantity,
        orderItemId: delivery.orderItem.id,
      });
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          customerMessage: parsed.data.customerMessage ?? null,
          errorMessage: null,
        },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: delivery.status,
        message: "Borrador de entrega guardado",
        actor,
      });
    });

    log.info(
      { deliveryId: delivery.id, action: "save_draft" },
      "Manual delivery draft saved",
    );
    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: true, data: { id: delivery.id } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el borrador.";
    log.error({ err: message }, "saveManualDeliveryDraft failed");
    return { success: false, message };
  }
}

export async function completeManualDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string; emailSent: boolean; emailError?: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return { success: false, message: "Los datos del formulario son inválidos." };
  }

  const parsed = completeManualDeliverySchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: parsed.data.deliveryId },
      select: {
        id: true,
        status: true,
        deliveryMethod: true,
        orderItem: {
          select: {
            id: true,
            quantity: true,
            productId: true,
            orderId: true,
            order: {
              select: {
                status: true,
                payments: {
                  where: { status: "PAID" },
                  take: 1,
                  select: { id: true },
                },
              },
            },
          },
        },
        _count: { select: { keys: true, credentials: true } },
      },
    });

    if (!delivery) {
      return { success: false, message: "Entrega no encontrada." };
    }
    if (delivery.deliveryMethod !== DeliveryMethod.MANUAL) {
      return { success: false, message: "Método inválido para completar manualmente." };
    }
    if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.DELIVERED)) {
      return {
        success: false,
        message: `No se puede completar desde el estado ${delivery.status}.`,
      };
    }

    const isPaid =
      ["PAID", "PROCESSING", "FULFILLED", "PARTIALLY_FULFILLED"].includes(
        delivery.orderItem.order.status,
      ) || delivery.orderItem.order.payments.length > 0;

    if (!isPaid && !parsed.data.allowUnpaidOverride) {
      return {
        success: false,
        message:
          "El pedido no está pagado. Marca el override administrativo auditado para continuar.",
      };
    }

    if (delivery.status === DeliveryStatus.DELIVERED) {
      // Idempotent complete: do not re-assign keys
      const email = await sendDeliveryNotification({
        deliveryId: delivery.id,
        type: "COMPLETED",
        isResend: true,
        actor,
      });
      revalidateDelivery(delivery.id, delivery.orderItem.orderId);
      return {
        success: true,
        data: {
          id: delivery.id,
          emailSent: email.sent,
          emailError: email.error,
        },
      };
    }

    await prisma.$transaction(async (tx) => {
      await persistManualContent(tx, {
        ...parsed.data,
        replaceExisting: parsed.data.replaceExisting || delivery._count.keys > 0 || delivery._count.credentials > 0
          ? parsed.data.replaceExisting
          : false,
        productId: delivery.orderItem.productId,
        quantity: delivery.orderItem.quantity,
        orderItemId: delivery.orderItem.id,
      });

      const counts = await tx.delivery.findUniqueOrThrow({
        where: { id: delivery.id },
        select: { _count: { select: { keys: true, credentials: true } } },
      });
      if (counts._count.keys + counts._count.credentials < 1) {
        throw new Error("Debes incluir al menos una key o credencial para completar.");
      }

      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: DeliveryStatus.DELIVERED,
          deliveredAt: new Date(),
          customerMessage: parsed.data.customerMessage ?? null,
          errorMessage: null,
        },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: DeliveryStatus.DELIVERED,
        message: parsed.data.allowUnpaidOverride && !isPaid
          ? "Entrega completada (override de pedido no pagado)"
          : "Entrega manual completada",
        actor,
      });
    });

    const email = await sendDeliveryNotification({
      deliveryId: delivery.id,
      type: "COMPLETED",
      actor,
    });

    log.info(
      {
        deliveryId: delivery.id,
        from: delivery.status,
        to: DeliveryStatus.DELIVERED,
        emailSent: email.sent,
      },
      "Manual delivery completed",
    );

    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return {
      success: true,
      data: {
        id: delivery.id,
        emailSent: email.sent,
        emailError: email.error,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo completar la entrega.";
    log.error({ err: message }, "completeManualDelivery failed");
    return { success: false, message };
  }
}

export async function markDeliveryProcessingAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = adminMessageSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: { id: true, status: true, orderItem: { select: { orderId: true } } },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };
  if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.PROCESSING)) {
    return { success: false, message: "Transición de estado no permitida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: { status: DeliveryStatus.PROCESSING, errorMessage: null },
    });
    await appendEvent(tx, {
      deliveryId: delivery.id,
      status: DeliveryStatus.PROCESSING,
      message: parsed.data.message || "Procesamiento iniciado",
      actor,
    });
  });

  void sendDeliveryNotification({
    deliveryId: delivery.id,
    type: "PROCESSING",
    actor,
  });

  revalidateDelivery(delivery.id, delivery.orderItem.orderId);
  return { success: true, data: { id: delivery.id } };
}

export async function markDeliveryFailedAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = markDeliveryFailedSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: { id: true, status: true, orderItem: { select: { orderId: true } } },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };
  if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.FAILED)) {
    return { success: false, message: "Transición de estado no permitida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.FAILED,
        errorMessage: parsed.data.errorMessage,
      },
    });
    await appendEvent(tx, {
      deliveryId: delivery.id,
      status: DeliveryStatus.FAILED,
      message: "Marcada como fallida",
      actor,
    });
  });

  void sendDeliveryNotification({
    deliveryId: delivery.id,
    type: "FAILED",
    actor,
  });

  log.info(
    { deliveryId: delivery.id, from: delivery.status, to: DeliveryStatus.FAILED },
    "Delivery marked failed",
  );
  revalidateDelivery(delivery.id, delivery.orderItem.orderId);
  return { success: true, data: { id: delivery.id } };
}

export async function cancelDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = adminMessageSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: { id: true, status: true, orderItem: { select: { orderId: true } } },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };
  if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.CANCELED)) {
    return { success: false, message: "Transición de estado no permitida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: { status: DeliveryStatus.CANCELED },
    });
    await appendEvent(tx, {
      deliveryId: delivery.id,
      status: DeliveryStatus.CANCELED,
      message: parsed.data.message || "Entrega cancelada",
      actor,
    });
  });

  revalidateDelivery(delivery.id, delivery.orderItem.orderId);
  return { success: true, data: { id: delivery.id } };
}

export async function reopenDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: { id: true, status: true, orderItem: { select: { orderId: true } } },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };
  if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.PENDING)) {
    return { success: false, message: "Solo se pueden reabrir fallidas o canceladas." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.PENDING,
        errorMessage: null,
        deliveredAt: null,
      },
    });
    await appendEvent(tx, {
      deliveryId: delivery.id,
      status: DeliveryStatus.PENDING,
      message: "Entrega reabierta",
      actor,
    });
  });

  revalidateDelivery(delivery.id, delivery.orderItem.orderId);
  return { success: true, data: { id: delivery.id } };
}

export async function resendDeliveryEmailAction(
  rawInput: unknown,
): Promise<ActionResult<{ sent: boolean }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = resendDeliveryEmailSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: { id: true, orderItem: { select: { orderId: true } } },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };

  const result = await sendDeliveryNotification({
    deliveryId: delivery.id,
    type: parsed.data.type,
    isResend: true,
    actor,
  });

  revalidateDelivery(delivery.id, delivery.orderItem.orderId);

  if (!result.sent && result.error) {
    return { success: false, message: result.error };
  }
  return { success: true, data: { sent: result.sent } };
}

export async function revealDeliverySecretAction(
  rawInput: unknown,
): Promise<ActionResult<{ value: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = revealDeliverySecretSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  if (parsed.data.kind === "key") {
    const key = await prisma.deliveryKey.findFirst({
      where: {
        id: parsed.data.itemId,
        deliveryId: parsed.data.deliveryId,
      },
      select: { serial: true },
    });
    if (!key) return { success: false, message: "Key no encontrada." };
    return { success: true, data: { value: key.serial } };
  }

  const cred = await prisma.deliveryCredential.findFirst({
    where: {
      id: parsed.data.itemId,
      deliveryId: parsed.data.deliveryId,
    },
    select: { passwordEncrypted: true, tokenEncrypted: true },
  });
  if (!cred) return { success: false, message: "Credencial no encontrada." };

  const field = parsed.data.field ?? "password";
  const encrypted =
    field === "token" ? cred.tokenEncrypted : cred.passwordEncrypted;
  if (!encrypted) {
    return { success: false, message: "No hay secreto almacenado." };
  }

  try {
    return { success: true, data: { value: decryptSecret(encrypted) } };
  } catch {
    return {
      success: false,
      message: "No se pudo descifrar. Verifica DELIVERY_SECRETS_KEY.",
    };
  }
}

export async function revealCustomerDeliverySecretAction(
  rawInput: unknown,
): Promise<ActionResult<{ value: string }>> {
  const { requireSession } = await import("@/lib/auth/session");
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = revealDeliverySecretSchema.safeParse(rawInput);
  if (!parsed.success) return validationError(parsed.error);

  const owned = await prisma.delivery.findFirst({
    where: {
      id: parsed.data.deliveryId,
      orderItem: { order: { userId: session.user.id } },
      status: DeliveryStatus.DELIVERED,
    },
    select: { id: true },
  });
  if (!owned) {
    return { success: false, message: "No autorizado." };
  }

  if (parsed.data.kind === "key") {
    const key = await prisma.deliveryKey.findFirst({
      where: { id: parsed.data.itemId, deliveryId: parsed.data.deliveryId },
      select: { serial: true },
    });
    if (!key) return { success: false, message: "Contenido no encontrado." };
    return { success: true, data: { value: key.serial } };
  }

  const cred = await prisma.deliveryCredential.findFirst({
    where: { id: parsed.data.itemId, deliveryId: parsed.data.deliveryId },
    select: { passwordEncrypted: true, tokenEncrypted: true },
  });
  if (!cred) return { success: false, message: "Contenido no encontrado." };
  const field = parsed.data.field ?? "password";
  const encrypted =
    field === "token" ? cred.tokenEncrypted : cred.passwordEncrypted;
  if (!encrypted) return { success: false, message: "Sin secreto." };
  try {
    return { success: true, data: { value: decryptSecret(encrypted) } };
  } catch {
    return { success: false, message: "No se pudo revelar el secreto." };
  }
}

async function resolveSmmClient(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      smmApiUrl: true,
      smmServiceId: true,
    },
  });
  if (!product?.smmApiUrl || product.smmServiceId == null) {
    throw new Error("El producto no tiene servicio SMM configurado.");
  }

  const provider = await prisma.smmProvider.findFirst({
    where: { apiUrl: product.smmApiUrl, status: "ACTIVE" },
    select: { apiUrl: true, apiKey: true },
  });
  if (!provider) {
    throw new Error("No hay un provider SMM activo para la API del producto.");
  }

  return {
    client: new SmmService({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    }),
    remoteServiceId: product.smmServiceId,
  };
}

export async function sendSmmDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ externalOrderId: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      externalOrderId: true,
      orderItem: {
        select: {
          id: true,
          productId: true,
          orderId: true,
          quantity: true,
          smm: true,
        },
      },
    },
  });

  if (!delivery || delivery.deliveryMethod !== DeliveryMethod.SMM) {
    return { success: false, message: "Entrega SMM no encontrada." };
  }

  // Idempotency: already sent
  if (delivery.externalOrderId) {
    return {
      success: true,
      data: { externalOrderId: delivery.externalOrderId },
    };
  }

  try {
    const { client, remoteServiceId } = await resolveSmmClient(
      delivery.orderItem.productId,
    );
    const smm = delivery.orderItem.smm;
    if (!smm?.link) {
      return {
        success: false,
        message: "Falta el link del pedido SMM en el ítem de la orden.",
      };
    }
    const payload = {
      service: remoteServiceId,
      link: smm.link,
      quantity: smm.quantity ?? delivery.orderItem.quantity,
      ...(smm.comments ? { comments: smm.comments } : {}),
      ...(smm.runs != null ? { runs: smm.runs } : {}),
      ...(smm.intervalMinutes != null ? { interval: smm.intervalMinutes } : {}),
      ...(smm.username ? { username: smm.username } : {}),
      ...(smm.usernames ? { usernames: smm.usernames } : {}),
      ...(smm.hashtags ? { hashtags: smm.hashtags } : {}),
      ...(smm.mediaUrl ? { media: smm.mediaUrl } : {}),
      ...(smm.min != null ? { min: smm.min } : {}),
      ...(smm.max != null ? { max: smm.max } : {}),
      ...(smm.delayMinutes != null ? { delay: smm.delayMinutes } : {}),
      ...(smm.posts != null ? { posts: smm.posts } : {}),
      ...(smm.oldPosts != null ? { old_posts: smm.oldPosts } : {}),
      ...(smm.expiry ? { expiry: smm.expiry } : {}),
      ...(smm.answerNumber ? { answer_number: smm.answerNumber } : {}),
    } as SmmOrderPayload;

    // Claim processing + lock external id slot before remote call when possible
    const claimed = await prisma.delivery.updateMany({
      where: {
        id: delivery.id,
        externalOrderId: null,
        status: { in: [DeliveryStatus.PENDING, DeliveryStatus.FAILED, DeliveryStatus.PROCESSING] },
      },
      data: { status: DeliveryStatus.PROCESSING },
    });
    if (claimed.count === 0 && !delivery.externalOrderId) {
      // Re-check race
      const again = await prisma.delivery.findUnique({
        where: { id: delivery.id },
        select: { externalOrderId: true },
      });
      if (again?.externalOrderId) {
        return { success: true, data: { externalOrderId: again.externalOrderId } };
      }
    }

    const response = await client.order(payload);
    const remoteId = String(response.order);

    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          externalOrderId: remoteId,
          externalStatus: "Pending",
          status: DeliveryStatus.PROCESSING,
          errorMessage: null,
          lastSyncedAt: new Date(),
        },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: DeliveryStatus.PROCESSING,
        message: `Pedido enviado al panel SMM (#${remoteId})`,
        actor,
      });
    });

    log.info(
      { deliveryId: delivery.id, externalOrderId: remoteId, method: "SMM" },
      "SMM order placed",
    );
    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: true, data: { externalOrderId: remoteId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al enviar a SMM";
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: DeliveryStatus.FAILED, errorMessage: message.slice(0, 2000) },
    });
    await prisma.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        status: DeliveryStatus.FAILED,
        message: "Falló el envío al panel SMM",
        source: DeliveryEventSource.ADMIN,
        actorUserId: actor.userId,
        actorEmail: actor.email,
      },
    });
    log.error({ deliveryId: delivery.id, err: message }, "SMM send failed");
    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: false, message };
  }
}

export async function syncSmmDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ status: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      externalOrderId: true,
      deliveryMethod: true,
      status: true,
      orderItem: { select: { productId: true, orderId: true } },
    },
  });
  if (!delivery?.externalOrderId || delivery.deliveryMethod !== DeliveryMethod.SMM) {
    return { success: false, message: "No hay orden remota SMM para sincronizar." };
  }

  try {
    const { client } = await resolveSmmClient(delivery.orderItem.productId);
    const remote = await client.status(delivery.externalOrderId);
    const remoteStatus = String(remote.status);
    const completed =
      remoteStatus.toLowerCase() === "completed" ||
      remoteStatus.toLowerCase() === "partial";

    let nextStatus = delivery.status;
    if (completed && canTransitionDeliveryStatus(delivery.status, DeliveryStatus.DELIVERED)) {
      nextStatus = DeliveryStatus.DELIVERED;
    } else if (
      remoteStatus.toLowerCase() === "canceled" ||
      remoteStatus.toLowerCase() === "cancelled"
    ) {
      nextStatus = canTransitionDeliveryStatus(delivery.status, DeliveryStatus.FAILED)
        ? DeliveryStatus.FAILED
        : delivery.status;
    }

    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          externalStatus: remoteStatus,
          smmCharge: remote.charge != null ? String(remote.charge) : undefined,
          smmCurrency: remote.currency ?? undefined,
          smmStartCount: remote.start_count != null ? Number(remote.start_count) : undefined,
          smmRemains: remote.remains != null ? Number(remote.remains) : undefined,
          lastSyncedAt: new Date(),
          status: nextStatus,
          deliveredAt:
            nextStatus === DeliveryStatus.DELIVERED ? new Date() : undefined,
          errorMessage: remoteStatus.toLowerCase().includes("error")
            ? remoteStatus
            : null,
        },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: nextStatus,
        message: `Sincronizado SMM: ${remoteStatus}`,
        actor,
      });
    });

    if (nextStatus === DeliveryStatus.DELIVERED && delivery.status !== DeliveryStatus.DELIVERED) {
      void sendDeliveryNotification({
        deliveryId: delivery.id,
        type: "COMPLETED",
        actor,
      });
    }

    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: true, data: { status: remoteStatus } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar SMM";
    return { success: false, message };
  }
}

export async function refillSmmDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ refillId: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      externalOrderId: true,
      smmRefillId: true,
      deliveryMethod: true,
      orderItem: { select: { productId: true, orderId: true } },
    },
  });
  if (!delivery?.externalOrderId || delivery.deliveryMethod !== DeliveryMethod.SMM) {
    return { success: false, message: "No hay orden SMM para refill." };
  }
  if (delivery.smmRefillId) {
    return { success: true, data: { refillId: delivery.smmRefillId } };
  }

  try {
    const { client } = await resolveSmmClient(delivery.orderItem.productId);
    const response = await client.refill(delivery.externalOrderId);
    const refillId = String(response.refill);

    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: { smmRefillId: refillId, lastSyncedAt: new Date() },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: DeliveryStatus.PROCESSING,
        message: `Refill solicitado (#${refillId})`,
        actor,
      });
    });

    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: true, data: { refillId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al solicitar refill";
    return { success: false, message };
  }
}

export async function fulfillKinguinDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ kinguinOrderId: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      kinguinOrderId: true,
      externalOrderId: true,
      orderExternalId: true,
      orderItem: {
        select: {
          quantity: true,
          unitPrice: true,
          productId: true,
          orderId: true,
          product: {
            select: {
              kinguinId: true,
              kinguinProductId: true,
              kinguinOfferId: true,
              sourceCostPrice: true,
            },
          },
        },
      },
    },
  });

  if (!delivery || delivery.deliveryMethod !== DeliveryMethod.KINGUIN) {
    return { success: false, message: "Entrega Kinguin no encontrada." };
  }

  if (delivery.kinguinOrderId || delivery.externalOrderId) {
    return {
      success: true,
      data: {
        kinguinOrderId: delivery.kinguinOrderId || delivery.externalOrderId || "",
      },
    };
  }

  const kinguinId = delivery.orderItem.product.kinguinId;
  if (kinguinId == null) {
    return {
      success: false,
      message: "El producto no tiene kinguinId configurado.",
    };
  }

  const orderExternalId = delivery.orderExternalId || delivery.id;
  const price = Number.parseFloat(
    (delivery.orderItem.product.sourceCostPrice ?? delivery.orderItem.unitPrice).toString(),
  );

  try {
    await prisma.delivery.updateMany({
      where: {
        id: delivery.id,
        kinguinOrderId: null,
        externalOrderId: null,
      },
      data: {
        status: DeliveryStatus.PROCESSING,
        orderExternalId,
      },
    });

    const client = new KinguinClient();
    const order = await client.placeOrderV1({
      orderExternalId,
      products: [
        {
          kinguinId,
          qty: delivery.orderItem.quantity,
          price,
          offerId: delivery.orderItem.product.kinguinOfferId ?? undefined,
        },
      ],
    });

    const remoteId = order.orderId || order.kinguinOrderId || "";
    await prisma.$transaction(async (tx) => {
      await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          kinguinOrderId: order.kinguinOrderId ?? remoteId,
          externalOrderId: remoteId,
          orderExternalId,
          externalStatus: String(order.status),
          requestPriceEur:
            order.requestTotalPrice != null
              ? String(order.requestTotalPrice)
              : order.totalPrice != null
                ? String(order.totalPrice)
                : undefined,
          status: DeliveryStatus.PROCESSING,
          errorMessage: null,
          lastSyncedAt: new Date(),
        },
      });
      await appendEvent(tx, {
        deliveryId: delivery.id,
        status: DeliveryStatus.PROCESSING,
        message: `Fulfillment Kinguin solicitado (#${remoteId})`,
        actor,
      });
    });

    log.info(
      { deliveryId: delivery.id, kinguinOrderId: remoteId, method: "KINGUIN" },
      "Kinguin order placed",
    );
    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: true, data: { kinguinOrderId: remoteId } };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al solicitar Kinguin";
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.FAILED,
        errorMessage: message.slice(0, 2000),
      },
    });
    await prisma.deliveryEvent.create({
      data: {
        deliveryId: delivery.id,
        status: DeliveryStatus.FAILED,
        message: "Falló el fulfillment Kinguin",
        source: DeliveryEventSource.ADMIN,
        actorUserId: actor.userId,
        actorEmail: actor.email,
      },
    });
    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return { success: false, message };
  }
}

export async function syncKinguinDeliveryAction(
  rawInput: unknown,
): Promise<ActionResult<{ status: string; keysImported: number }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = deliveryIdSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      kinguinOrderId: true,
      externalOrderId: true,
      orderItem: { select: { orderId: true } },
    },
  });

  const remoteOrderId = delivery?.kinguinOrderId || delivery?.externalOrderId;
  if (!delivery || !remoteOrderId || delivery.deliveryMethod !== DeliveryMethod.KINGUIN) {
    return { success: false, message: "No hay orden Kinguin para sincronizar." };
  }

  try {
    const client = new KinguinClient();
    const order = await client.getOrder(remoteOrderId);
    let keysImported = 0;

    if (String(order.status).toLowerCase() === "completed") {
      const keys = await client.downloadKeys(remoteOrderId);
      await prisma.$transaction(async (tx) => {
        for (const key of keys) {
          const existing = await tx.deliveryKey.findFirst({
            where: {
              OR: [
                { externalKeyId: key.id },
                { deliveryId: delivery.id, serial: key.serial },
              ],
            },
            select: { id: true },
          });
          if (existing) continue;
          await tx.deliveryKey.create({
            data: {
              deliveryId: delivery.id,
              serial: key.serial,
              type: key.type,
              contentType: DeliveryContentType.PRODUCT_KEY,
              externalKeyId: key.id,
              label: key.name ?? "Kinguin key",
              isSecret: true,
            },
          });
          keysImported += 1;
        }

        const nextStatus = canTransitionDeliveryStatus(
          delivery.status,
          DeliveryStatus.DELIVERED,
        )
          ? DeliveryStatus.DELIVERED
          : delivery.status;

        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            externalStatus: String(order.status),
            status: nextStatus,
            deliveredAt:
              nextStatus === DeliveryStatus.DELIVERED ? new Date() : undefined,
            lastSyncedAt: new Date(),
            errorMessage: null,
            requestPriceEur:
              order.requestTotalPrice != null
                ? String(order.requestTotalPrice)
                : undefined,
          },
        });
        await appendEvent(tx, {
          deliveryId: delivery.id,
          status: nextStatus,
          message: `Sincronizado Kinguin: ${order.status}${keysImported ? ` · +${keysImported} keys` : ""}`,
          actor,
        });
      });

      if (delivery.status !== DeliveryStatus.DELIVERED) {
        void sendDeliveryNotification({
          deliveryId: delivery.id,
          type: "COMPLETED",
          actor,
        });
      }
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.delivery.update({
          where: { id: delivery.id },
          data: {
            externalStatus: String(order.status),
            lastSyncedAt: new Date(),
          },
        });
        await appendEvent(tx, {
          deliveryId: delivery.id,
          status: delivery.status,
          message: `Sincronizado Kinguin: ${order.status}`,
          actor,
        });
      });
    }

    revalidateDelivery(delivery.id, delivery.orderItem.orderId);
    return {
      success: true,
      data: { status: String(order.status), keysImported },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al sincronizar Kinguin";
    return { success: false, message };
  }
}

export async function markDeliveryDeliveredManualAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();

  const parsed = adminMessageSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const delivery = await prisma.delivery.findUnique({
    where: { id: parsed.data.deliveryId },
    select: {
      id: true,
      status: true,
      deliveryMethod: true,
      orderItem: { select: { orderId: true } },
    },
  });
  if (!delivery) return { success: false, message: "Entrega no encontrada." };
  if (!canTransitionDeliveryStatus(delivery.status, DeliveryStatus.DELIVERED)) {
    return { success: false, message: "Transición no permitida." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.delivery.update({
      where: { id: delivery.id },
      data: {
        status: DeliveryStatus.DELIVERED,
        deliveredAt: new Date(),
        errorMessage: null,
      },
    });
    await appendEvent(tx, {
      deliveryId: delivery.id,
      status: DeliveryStatus.DELIVERED,
      message: parsed.data.message || "Marcada como entregada manualmente",
      actor,
    });
  });

  void sendDeliveryNotification({
    deliveryId: delivery.id,
    type: "COMPLETED",
    actor,
  });

  revalidateDelivery(delivery.id, delivery.orderItem.orderId);
  return { success: true, data: { id: delivery.id } };
}

export async function ensureOrderDeliveriesAction(
  orderId: string,
): Promise<ActionResult<{ created: number }>> {
  const actor = await requireAdminActor();
  if (!actor) return unauthorized();
  const result = await ensureDeliveriesForOrder(orderId);
  revalidatePath("/admin/deliveries");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true, data: result };
}
