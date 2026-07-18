"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import {
  OrderStatus,
  ProductStatus,
  UserRole,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { ensureCartForUser, getCartForUser } from "@/lib/cart/queries";
import {
  createFlowPaymentForOrder,
  getOrCreateFlowRedirectUrl,
} from "@/lib/flow/payments";
import prisma from "@/lib/prisma";
import {
  addCartItemSchema,
  checkoutFromCartSchema,
  createOrderSchema,
  createPaymentLinkSchema,
  removeCartItemSchema,
  updateCartItemSchema,
  updateOrderStatusSchema,
} from "@/lib/validations/orders";

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
      name: input.customerName?.trim() || input.email.split("@")[0] || "Cliente",
      emailVerified: false,
      role: UserRole.USER,
    },
    select: { id: true, email: true, name: true },
  });
}

export async function createOrderAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    id: string;
    checkoutUrl: string;
    paymentRedirectUrl: string | null;
  }>
> {
  if (!(await requireAdminActor())) {
    return unauthorized();
  }

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return { success: false, message: "Los datos del formulario son inválidos." };
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

    const productMap = new Map(products.map((product) => [product.id, product]));
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

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        email: data.email.toLowerCase(),
        customerName: data.customerName ?? user.name,
        status: OrderStatus.PENDING,
        subtotal,
        total: subtotal,
        currency,
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
      select: { id: true },
    });

    let paymentRedirectUrl: string | null = null;
    let checkoutUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000"}/checkout?orderId=${encodeURIComponent(order.id)}`;

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
): Promise<
  ActionResult<{ checkoutUrl: string; paymentRedirectUrl: string }>
> {
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
    await prisma.order.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });

    if (
      parsed.data.status === OrderStatus.PAID ||
      parsed.data.status === OrderStatus.PROCESSING ||
      parsed.data.status === OrderStatus.FULFILLED
    ) {
      const { ensureDeliveriesForOrder } = await import(
        "@/lib/deliveries/ensure"
      );
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
): Promise<ActionResult<{ orderId: string; redirectUrl: string; checkoutUrl: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  let input: unknown;
  try {
    input = parseSubmission(rawInput);
  } catch {
    return { success: false, message: "Los datos del formulario son inválidos." };
  }

  const parsed = checkoutFromCartSchema.safeParse(input ?? {});
  if (!parsed.success) return validationError(parsed.error);

  const { assertStoreAllowsCheckout, getOperationalSettings } = await import(
    "@/lib/settings/runtime"
  );
  const storeGate = await assertStoreAllowsCheckout();
  if (!storeGate.ok) {
    return { success: false, message: storeGate.message };
  }

  const operational = await getOperationalSettings();
  if (operational.requireVerifiedEmail || operational.requireEmailVerifiedForCheckout) {
    if (!session.user.emailVerified) {
      return {
        success: false,
        message: "Debes verificar tu email antes de comprar.",
      };
    }
  }

  const cart = await getCartForUser(session.user.id);
  if (!cart || cart.items.length === 0) {
    return { success: false, message: "Tu carrito está vacío." };
  }

  const email = (parsed.data.email ?? session.user.email).toLowerCase();
  const customerName =
    parsed.data.customerName ?? session.user.name ?? undefined;

  try {
    if (parsed.data.phone || parsed.data.addressLine1 || parsed.data.city) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          phone: parsed.data.phone ?? undefined,
          addressLine1: parsed.data.addressLine1 ?? undefined,
          addressLine2: parsed.data.addressLine2 ?? undefined,
          city: parsed.data.city ?? undefined,
          region: parsed.data.region ?? undefined,
          commune: parsed.data.commune ?? undefined,
        },
      });
    }

    const productIds = cart.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, status: ProductStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        price: true,
        currency: true,
        deliveryMethod: true,
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const lineItems: Array<{
      productId: string;
      productName: string;
      unitPrice: number;
      quantity: number;
      deliveryMethod: (typeof products)[number]["deliveryMethod"];
    }> = [];
    for (const item of cart.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return {
          success: false,
          message: `El producto "${item.productName}" ya no está disponible.`,
        };
      }
      const unitPrice = Number.parseFloat(product.price.toString());
      subtotal += unitPrice * item.quantity;
      lineItems.push({
        productId: product.id,
        productName: product.name,
        unitPrice,
        quantity: item.quantity,
        deliveryMethod: product.deliveryMethod,
      });
    }

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
          items: {
            create: lineItems,
          },
        },
        select: { id: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return created;
    });

    const payment = await createFlowPaymentForOrder(order.id);

    revalidatePath("/cart");
    revalidatePath("/checkout");
    revalidatePath("/admin/orders");

    return {
      success: true,
      data: {
        orderId: order.id,
        redirectUrl: payment.redirectUrl,
        checkoutUrl: payment.checkoutUrl,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo completar el checkout.";
    return { success: false, message };
  }
}

export async function addCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = addCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: ProductStatus.ACTIVE },
    select: { id: true },
  });
  if (!product) {
    return { success: false, message: "Producto no disponible." };
  }

  const cartId = await ensureCartForUser(session.user.id);
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

export async function updateCartItemAction(
  rawInput: unknown,
): Promise<ActionResult<{ cartItemId: string }>> {
  const session = await requireSession();
  if (!session?.user) return unauthorized();

  const parsed = updateCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const item = await prisma.cartItem.findFirst({
    where: {
      id: parsed.data.cartItemId,
      cart: { userId: session.user.id },
    },
    select: { id: true },
  });
  if (!item) {
    return { success: false, message: "Ítem no encontrado." };
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
  if (!session?.user) return unauthorized();

  const parsed = removeCartItemSchema.safeParse(
    rawInput instanceof FormData ? parseSubmission(rawInput) : rawInput,
  );
  if (!parsed.success) return validationError(parsed.error);

  const item = await prisma.cartItem.findFirst({
    where: {
      id: parsed.data.cartItemId,
      cart: { userId: session.user.id },
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
