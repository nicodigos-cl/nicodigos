"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import {
  DeliveryMethod,
  OrderStatus,
  ProductStatus,
  UserRole,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import {
  clearGuestCartCookie,
  ensureCurrentCart,
  getCurrentCart,
  getCurrentCartId,
} from "@/lib/cart/current";
import {
  cartMeetsMinimumTotal,
  cartMinimumTotalMessage,
} from "@/lib/cart/constants";
import {
  createFlowPaymentForOrder,
  getOrCreateFlowRedirectUrl,
} from "@/lib/flow/payments";
import {
  generateOrderAccessToken,
  buildOrderAccessUrl,
  setOrderAccessCookie,
} from "@/lib/orders/access";
import { getAppBaseUrl } from "@/lib/flow/client";
import prisma from "@/lib/prisma";
import {
  estimateSmmLineTotalClp,
  smmEffectiveUnitPriceClp,
} from "@/lib/products/smm-pricing";
import { calculateVolumeDiscountPrice } from "@/lib/products/volume-discount";
import {
  BOLETA_NAMED_THRESHOLD_CLP,
  validateCheckoutBilling,
} from "@/lib/validations/checkout-billing";
import {
  addCartItemSchema,
  addSmmCartItemSchema,
  checkoutFromCartSchema,
  createOrderSchema,
  createPaymentLinkSchema,
  guestCheckoutOtpSchema,
  removeCartItemSchema,
  updateCartItemSchema,
  updateCartItemSmmSchema,
  updateOrderStatusSchema,
} from "@/lib/validations/orders";
import {
  cartLineQuantityFromSmm,
  parseSmmOrderFieldsForType,
  type SmmOrderFieldsPayload,
} from "@/lib/validations/smm-order-fields";
import { resolveDeliveryPromisesForLines } from "@/lib/delivery-promise/resolve";

function unauthorized<T>(): ActionResult<T> {
  return {
    success: false,
    message: "No autorizado. Inicia sesión para continuar.",
  };
}

async function requireAdminActor() {
  const session = await requireSession();
  if (!session?.user || session.user.role !== "ADMIN") {
    return null;
  }
  return session;
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

async function findOrCreateCustomer(input: {
  email: string;
  customerName?: string;
  userId?: string;
}): Promise<{ id: string; email: string; name: string }> {
  if (input.userId) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) {
      throw new Error("Usuario no encontrado.");
    }
    return user;
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase() },
    select: { id: true, email: true, name: true },
  });

  if (existing) {
    return existing;
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  return prisma.user.create({
    data: {
      id,
      email: input.email.toLowerCase(),
      name:
        input.customerName?.trim() || input.email.split("@")[0] || "Cliente",
      emailVerified: false,
      role: UserRole.USER,
    },
    select: { id: true, email: true, name: true },
  });
}

export async function createOrderAction(rawInput: unknown): Promise<
  ActionResult<{
    id: string;
    checkoutUrl: string;
    paymentRedirectUrl: string | null;
    accessToken: string;
  }>
> {
  if (!(await requireAdminActor())) {
    return unauthorized();
  }

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return {
      success: false,
      message: "Los datos del formulario son inválidos.",
    };
  }

  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) return validationError(parsed.error);

  const data = parsed.data;

  try {
    const productIds = [...new Set(data.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        status: ProductStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        deliveryMethod: true,
      },
    });

    if (products.length !== productIds.length) {
      return {
        success: false,
        message: "Uno o más productos no están disponibles.",
        fieldErrors: { items: ["Producto inválido o inactivo"] },
      };
    }

    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );
    const currency = products[0]?.currency ?? "CLP";

    let subtotal = 0;
    const lineItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!;
      const unitPrice = Number.parseFloat(product.price.toString());
      subtotal += unitPrice * item.quantity;
      return {
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        deliveryMethod: product.deliveryMethod,
      };
    });

    const user = await findOrCreateCustomer({
      email: data.email,
      customerName: data.customerName,
      userId: data.userId,
    });

    const accessToken = generateOrderAccessToken();
    const { getOperationalSettings } = await import("@/lib/settings/runtime");
    const operational = await getOperationalSettings();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: user.id,
          email: data.email.toLowerCase(),
          customerName: data.customerName ?? user.name,
          status: OrderStatus.PENDING,
          subtotal,
          total: subtotal,
          currency,
          accessToken,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              deliveryMethod: item.deliveryMethod,
            })),
          },
        },
        select: {
          id: true,
          accessToken: true,
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              deliveryMethod: true,
              productName: true,
            },
          },
        },
      });

      const { reserveKeysForOrderItems } = await import(
        "@/lib/deliveries/key-reservation"
      );
      await reserveKeysForOrderItems(tx, {
        enabled: operational.keysReserveDuringCheckout,
        durationMinutes: operational.keysReserveDurationMinutes,
        items: created.items,
      });

      return created;
    });

    await setOrderAccessCookie(order.id, order.accessToken);

    let paymentRedirectUrl: string | null = null;
    let checkoutUrl = buildOrderAccessUrl(
      getAppBaseUrl(),
      order.id,
      order.accessToken,
    );

    if (data.createPaymentLink) {
      const payment = await createFlowPaymentForOrder(order.id);
      paymentRedirectUrl = payment.redirectUrl;
      checkoutUrl = payment.checkoutUrl;
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${order.id}`);

    return {
      success: true,
      data: {
        id: order.id,
        checkoutUrl,
        paymentRedirectUrl,
        accessToken: order.accessToken,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo crear la orden.";
    return { success: false, message };
  }
}

export async function createPaymentLinkAction(
  rawInput: unknown,
): Promise<ActionResult<{ checkoutUrl: string; paymentRedirectUrl: string }>> {
  if (!(await requireAdminActor())) {
    return unauthorized();
  }

  const parsed = createPaymentLinkSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    const payment = await createFlowPaymentForOrder(parsed.data.orderId);
    revalidatePath(`/admin/orders/${parsed.data.orderId}`);
    revalidatePath("/admin/orders");
    return {
      success: true,
      data: {
        checkoutUrl: payment.checkoutUrl,
        paymentRedirectUrl: payment.redirectUrl,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo crear el link de pago.";
    return { success: false, message };
  }
}

export async function updateOrderStatusAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  if (!(await requireAdminActor())) {
    return unauthorized();
  }

  const parsed = updateOrderStatusSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: parsed.data.id },
        data: { status: parsed.data.status },
      });

      if (parsed.data.status === OrderStatus.CANCELED) {
        const { releaseReservationsForOrder } = await import(
          "@/lib/deliveries/key-reservation"
        );
        await releaseReservationsForOrder(tx, parsed.data.id);
      }
    });

    if (
      parsed.data.status === OrderStatus.PAID ||
      parsed.data.status === OrderStatus.PROCESSING ||
      parsed.data.status === OrderStatus.FULFILLED
    ) {
      const { ensureDeliveriesForOrder } =
        await import("@/lib/deliveries/ensure");
      await ensureDeliveriesForOrder(parsed.data.id);
      revalidatePath("/admin/deliveries");
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${parsed.data.id}`);
    return { success: true, data: { id: parsed.data.id } };
  } catch {
    return { success: false, message: "No se pudo actualizar el estado." };
  }
}

function smmPayloadToDb(fields: SmmOrderFieldsPayload) {
  return {
    link: fields.link ?? null,
    username: fields.username ?? null,
    quantity: fields.quantity ?? null,
    comments: fields.comments ?? null,
    runs: fields.runs ?? null,
    intervalMinutes: fields.intervalMinutes ?? null,
    usernames: fields.usernames ?? null,
    hashtags: fields.hashtags ?? null,
    mediaUrl: fields.mediaUrl ?? null,
    min: fields.min ?? null,
    max: fields.max ?? null,
    delayMinutes: fields.delayMinutes ?? null,
    posts: fields.posts ?? null,
    oldPosts: fields.oldPosts ?? null,
    expiry: fields.expiry ?? null,
    answerNumber: fields.answerNumber ?? null,
  };
}

export async function startCheckoutPaymentAction(
  orderId: string,
): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const redirectUrl = await getOrCreateFlowRedirectUrl(orderId);
    return { success: true, data: { redirectUrl } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo iniciar el pago con Flow.";
    return { success: false, message };
  }
}

export async function checkoutFromCartAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    orderId: string;
    redirectUrl: string;
    checkoutUrl: string;
    accessToken: string;
  }>
> {
  const session = await requireSession();
  if (!session?.user) {
    return {
      success: false,
      message: "Verifica tu email con el código antes de pagar.",
    };
  }

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return {
      success: false,
      message: "Los datos del formulario son inválidos.",
    };
  }

  const parsed = checkoutFromCartSchema.safeParse(input ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const { assertStoreAllowsCheckout, getOperationalSettings } =
    await import("@/lib/settings/runtime");
  const storeGate = await assertStoreAllowsCheckout();
  if (!storeGate.ok) {
    return { success: false, message: storeGate.message };
  }

  const operational = await getOperationalSettings();
  if (
    operational.requireVerifiedEmail ||
    operational.requireEmailVerifiedForCheckout
  ) {
    if (!session.user.emailVerified) {
      return {
        success: false,
        message: "Debes verificar tu email antes de comprar.",
      };
    }
  }

  const cart = await getCurrentCart(session.user.id);
  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Tu carrito está vacío." };
  }

  if (!cartMeetsMinimumTotal(cart.subtotal)) {
    return {
      success: false,
      message: cartMinimumTotalMessage(cart.currency),
    };
  }

  const incompleteSmm = cart.items.find(
    (item) => item.deliveryMethod === "SMM" && !item.smmComplete,
  );
  if (incompleteSmm) {
    return {
      success: false,
      message: `Completa los datos del servicio "${incompleteSmm.productName}" antes de pagar.`,
    };
  }

  const email = (parsed.data.email ?? session.user.email).toLowerCase();
  if (email !== session.user.email.toLowerCase()) {
    return {
      success: false,
      message: "El email del checkout debe coincidir con el email verificado.",
      fieldErrors: { email: ["Verifica este email antes de continuar"] },
    };
  }
  const orderTotalClp = Number.parseFloat(cart.subtotal);
  const billing = validateCheckoutBilling({
    data: {
      ...parsed.data,
      email,
      customerName: parsed.data.customerName ?? session.user.name ?? undefined,
    },
    orderTotalClp,
    settings: {
      requireRut: operational.requireRut,
      requireBillingData: operational.requireBillingData,
      allowBoleta: operational.allowBoleta,
      allowFactura: operational.allowFactura,
      boletaNamedThresholdClp: BOLETA_NAMED_THRESHOLD_CLP,
    },
  });
  if (!billing.ok) {
    return {
      success: false,
      message: billing.message,
      fieldErrors: billing.fieldErrors,
    };
  }

  const customerName =
    billing.data.customerName ?? session.user.name ?? undefined;

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        phone: billing.data.phone ?? undefined,
        invoiceType: billing.data.invoiceType,
        rut: billing.data.rut,
        businessName: billing.data.businessName,
        businessActivity: billing.data.businessActivity,
        addressLine1: billing.data.addressLine1,
        addressLine2: billing.data.addressLine2,
        city: billing.data.city,
        region: billing.data.region,
        commune: billing.data.commune,
        ...(customerName ? { name: customerName } : {}),
      },
    });

    const productIds = cart.items.map((item) => item.productId);
    const [products, promiseByLine] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds }, status: ProductStatus.ACTIVE },
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          deliveryMethod: true,
          smmServiceType: true,
        },
      }),
      resolveDeliveryPromisesForLines(
        cart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      ),
    ]);
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      deliveryMethod: (typeof products)[number]["deliveryMethod"];
      deliveryPromise: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE";
      estimatedCostAmount: number | null;
      estimatedCostCurrency: string | null;
      smm: ReturnType<typeof smmPayloadToDb> | null;
    }> = [];

    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return {
          success: false,
          message: `El producto "${item.productName}" ya no está disponible.`,
        };
      }
      const promise =
        promiseByLine.get(`${item.productId}:${item.quantity}`) ??
        promiseByLine.get(item.productId);
      if (!promise || promise.promise === "UNAVAILABLE") {
        return {
          success: false,
          message: `El producto "${item.productName}" no tiene entrega disponible en este momento.`,
        };
      }

      const catalogPrice = Number.parseFloat(product.price.toString());

      let smm: ReturnType<typeof smmPayloadToDb> | null = null;
      if (product.deliveryMethod === DeliveryMethod.SMM) {
        if (!item.smm) {
          return {
            success: false,
            message: `Faltan los datos del servicio "${item.productName}".`,
          };
        }
        const parsedSmm = parseSmmOrderFieldsForType(
          item.smmServiceType,
          item.smm,
        );
        if (!parsedSmm.success) {
          return {
            success: false,
            message: `Completa los datos del servicio "${item.productName}" antes de pagar.`,
          };
        }
        smm = smmPayloadToDb(parsedSmm.data);
      }

      let unitPrice: number;
      let lineTotal: number;

      if (product.deliveryMethod === DeliveryMethod.SMM) {
        unitPrice = smmEffectiveUnitPriceClp(
          catalogPrice,
          product.smmServiceType,
          item.quantity,
        );
        lineTotal = estimateSmmLineTotalClp(
          catalogPrice,
          product.smmServiceType,
          item.quantity,
        );
      } else {
        const vol = calculateVolumeDiscountPrice(catalogPrice, item.quantity, false);
        unitPrice = vol.unitPrice;
        lineTotal = vol.lineTotal;
      }

      subtotal += lineTotal;

      lineItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        deliveryMethod: product.deliveryMethod,
        deliveryPromise: promise.promise,
        estimatedCostAmount: promise.estimatedCostAmount,
        estimatedCostCurrency: promise.estimatedCostCurrency,
        smm,
      });
    }

    const accessToken = generateOrderAccessToken();
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: session.user.id,
          email,
          customerName: customerName ?? null,
          status: OrderStatus.PENDING,
          subtotal,
          total: subtotal,
          currency: cart.currency,
          accessToken,
          items: {
            create: lineItems.map((line) => ({
              productId: line.productId,
              productName: line.productName,
              unitPrice: line.unitPrice,
              quantity: line.quantity,
              deliveryMethod: line.deliveryMethod,
              deliveryPromise: line.deliveryPromise,
              estimatedCostAmount: line.estimatedCostAmount,
              estimatedCostCurrency: line.estimatedCostCurrency,
              ...(line.smm
                ? {
                    smm: {
                      create: line.smm,
                    },
                  }
                : {}),
            })),
          },
        },
        select: {
          id: true,
          accessToken: true,
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              deliveryMethod: true,
              productName: true,
            },
          },
        },
      });

      const { reserveKeysForOrderItems } = await import(
        "@/lib/deliveries/key-reservation"
      );
      await reserveKeysForOrderItems(tx, {
        enabled: operational.keysReserveDuringCheckout,
        durationMinutes: operational.keysReserveDurationMinutes,
        items: created.items,
      });

      const cartOwner = await tx.cart.findUnique({
        where: { id: cart.id },
        select: { userId: true },
      });
      if (cartOwner?.userId) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      } else {
        await tx.cart.delete({ where: { id: cart.id } });
      }
      return created;
    });

    await setOrderAccessCookie(order.id, order.accessToken);

    const payment = await createFlowPaymentForOrder(order.id);

    await clearGuestCartCookie();

    revalidatePath("/cart");
    revalidatePath("/checkout");
    revalidatePath(`/checkout/${order.id}`);
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: {
        orderId: order.id,
        redirectUrl: payment.redirectUrl,
        checkoutUrl: payment.checkoutUrl,
        accessToken: order.accessToken,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo completar el checkout.";
    return { success: false, message };
  }
}

export async function prepareGuestCheckoutOtpAction(
  rawInput: unknown,
): Promise<ActionResult<{ email: string }>> {
  const parsed = guestCheckoutOtpSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const session = await requireSession();
  if (session?.user) {
    return { success: true, data: { email: session.user.email } };
  }

  const cart = await getCurrentCart();
  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Tu carrito está vacío." };
  }

  if (!cartMeetsMinimumTotal(cart.subtotal)) {
    return {
      success: false,
      message: cartMinimumTotalMessage(cart.currency),
    };
  }

  try {
    const user = await findOrCreateCustomer({
      email: parsed.data.email,
      customerName: parsed.data.customerName,
    });

    return { success: true, data: { email: user.email } };
  } catch {
    return {
      success: false,
      message: "No se pudo preparar el checkout. Intenta nuevamente.",
    };
  }
}

export async function addCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();

  const parsed = addCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: ProductStatus.ACTIVE },
    select: { id: true, deliveryMethod: true },
  });
  if (!product) {
    return { success: false, message: "Producto no disponible." };
  }

  if (product.deliveryMethod === DeliveryMethod.SMM) {
    return {
      success: false,
      message:
        "Este servicio requiere datos de destino. Usa el formulario del producto.",
    };
  }

  const cartId = await ensureCurrentCart(session?.user.id);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId: product.id, smm: null },
    select: { id: true, quantity: true },
  });

  const cartItem = existing
    ? await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + parsed.data.quantity },
        select: { id: true },
      })
    : await prisma.cartItem.create({
        data: {
          cartId,
          productId: product.id,
          quantity: parsed.data.quantity,
        },
        select: { id: true },
      });

  revalidatePath("/cart");
  return { success: true, data: { cartItemId: cartItem.id } };
}

export async function addSmmCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();

  const parsed = addSmmCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: ProductStatus.ACTIVE },
    select: {
      id: true,
      deliveryMethod: true,
      smmServiceType: true,
      smmMin: true,
      smmMax: true,
    },
  });
  if (!product) {
    return { success: false, message: "Producto no disponible." };
  }
  if (product.deliveryMethod !== DeliveryMethod.SMM) {
    return { success: false, message: "Este producto no es un servicio SMM." };
  }

  const smmParsed = parseSmmOrderFieldsForType(
    product.smmServiceType,
    parsed.data.smm ?? {},
  );
  if (!smmParsed.success) return validationError(smmParsed.error);

  if (
    smmParsed.data.quantity != null &&
    product.smmMin != null &&
    smmParsed.data.quantity < product.smmMin
  ) {
    return {
      success: false,
      message: `La cantidad mínima es ${product.smmMin}.`,
      fieldErrors: { quantity: [`Mínimo ${product.smmMin}`] },
    };
  }
  if (
    smmParsed.data.quantity != null &&
    product.smmMax != null &&
    smmParsed.data.quantity > product.smmMax
  ) {
    return {
      success: false,
      message: `La cantidad máxima es ${product.smmMax}.`,
      fieldErrors: { quantity: [`Máximo ${product.smmMax}`] },
    };
  }

  const quantity = cartLineQuantityFromSmm(
    product.smmServiceType,
    smmParsed.data,
    1,
  );
  const cartId = await ensureCurrentCart(session?.user.id);

  const cartItem = await prisma.cartItem.create({
    data: {
      cartId,
      productId: product.id,
      quantity,
      smm: {
        create: smmPayloadToDb(smmParsed.data),
      },
    },
    select: { id: true },
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true, data: { cartItemId: cartItem.id } };
}

export async function updateCartItemSmmAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();

  const parsed = updateCartItemSmmSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const cartId = await getCurrentCartId(session?.user.id);
  if (!cartId) return { success: false, message: "Ítem no encontrado." };

  const item = await prisma.cartItem.findFirst({
    where: {
      id: parsed.data.cartItemId,
      cartId,
    },
    select: {
      id: true,
      product: {
        select: {
          deliveryMethod: true,
          smmServiceType: true,
          smmMin: true,
          smmMax: true,
        },
      },
    },
  });
  if (!item) {
    return { success: false, message: "Ítem no encontrado." };
  }
  if (item.product.deliveryMethod !== DeliveryMethod.SMM) {
    return { success: false, message: "Este ítem no es un servicio SMM." };
  }

  const smmParsed = parseSmmOrderFieldsForType(
    item.product.smmServiceType,
    parsed.data.smm,
  );
  if (!smmParsed.success) return validationError(smmParsed.error);

  if (
    smmParsed.data.quantity != null &&
    item.product.smmMin != null &&
    smmParsed.data.quantity < item.product.smmMin
  ) {
    return {
      success: false,
      message: `La cantidad mínima es ${item.product.smmMin}.`,
      fieldErrors: { quantity: [`Mínimo ${item.product.smmMin}`] },
    };
  }
  if (
    smmParsed.data.quantity != null &&
    item.product.smmMax != null &&
    smmParsed.data.quantity > item.product.smmMax
  ) {
    return {
      success: false,
      message: `La cantidad máxima es ${item.product.smmMax}.`,
      fieldErrors: { quantity: [`Máximo ${item.product.smmMax}`] },
    };
  }

  const quantity = cartLineQuantityFromSmm(
    item.product.smmServiceType,
    smmParsed.data,
    1,
  );
  const smmData = smmPayloadToDb(smmParsed.data);

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });
    await tx.cartItemSmm.upsert({
      where: { cartItemId: item.id },
      create: { cartItemId: item.id, ...smmData },
      update: smmData,
    });
  });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true, data: { cartItemId: item.id } };
}

export async function updateCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();

  const parsed = updateCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const cartId = await getCurrentCartId(session?.user.id);
  if (!cartId) return { success: false, message: "Ítem no encontrado." };

  const item = await prisma.cartItem.findFirst({
    where: {
      id: parsed.data.cartItemId,
      cartId,
    },
    select: {
      id: true,
      product: { select: { deliveryMethod: true } },
      smm: { select: { id: true } },
    },
  });
  if (!item) {
    return { success: false, message: "Ítem no encontrado." };
  }

  if (item.product.deliveryMethod === DeliveryMethod.SMM || item.smm) {
    return {
      success: false,
      message:
        "Para servicios SMM edita los datos del destino, no la cantidad de línea.",
    };
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: parsed.data.quantity },
  });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true, data: { cartItemId: item.id } };
}

export async function removeCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();

  const parsed = removeCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const cartId = await getCurrentCartId(session?.user.id);
  if (!cartId) return { success: false, message: "Ítem no encontrado." };

  const item = await prisma.cartItem.findFirst({
    where: {
      id: parsed.data.cartItemId,
      cartId,
    },
    select: { id: true },
  });
  if (!item) {
    return { success: false, message: "Ítem no encontrado." };
  }

  await prisma.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true, data: { cartItemId: item.id } };
}
