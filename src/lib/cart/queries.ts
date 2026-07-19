import "server-only";

import { DeliveryMethod } from "@/generated/prisma/client";
import { resolveDeliveryPromisesForLines } from "@/lib/delivery-promise/resolve";
import prisma from "@/lib/prisma";
import { decimalToString } from "@/lib/products/format";
import {
  estimateSmmLineTotalClp,
  smmEffectiveUnitPriceClp,
} from "@/lib/products/smm-pricing";
import { calculateVolumeDiscountPrice } from "@/lib/products/volume-discount";
import {
  isSmmOrderFieldsComplete,
  type SmmOrderFieldsPayload,
} from "@/lib/validations/smm-order-fields";
import type { CartDto, CartLineDto, CartLineSmmDto } from "@/types/orders";

function toSmmDto(
  smm: {
    link: string | null;
    username: string | null;
    quantity: number | null;
    comments: string | null;
    runs: number | null;
    intervalMinutes: number | null;
    usernames: string | null;
    hashtags: string | null;
    mediaUrl: string | null;
    min: number | null;
    max: number | null;
    delayMinutes: number | null;
    posts: number | null;
    oldPosts: number | null;
    expiry: string | null;
    answerNumber: string | null;
  } | null,
): CartLineSmmDto | null {
  if (!smm) return null;
  return {
    link: smm.link,
    username: smm.username,
    quantity: smm.quantity,
    comments: smm.comments,
    runs: smm.runs,
    intervalMinutes: smm.intervalMinutes,
    usernames: smm.usernames,
    hashtags: smm.hashtags,
    mediaUrl: smm.mediaUrl,
    min: smm.min,
    max: smm.max,
    delayMinutes: smm.delayMinutes,
    posts: smm.posts,
    oldPosts: smm.oldPosts,
    expiry: smm.expiry,
    answerNumber: smm.answerNumber,
  };
}

function toCartLine(item: {
  id: string;
  productId: string;
  quantity: number;
  smm: {
    link: string | null;
    username: string | null;
    quantity: number | null;
    comments: string | null;
    runs: number | null;
    intervalMinutes: number | null;
    usernames: string | null;
    hashtags: string | null;
    mediaUrl: string | null;
    min: number | null;
    max: number | null;
    delayMinutes: number | null;
    posts: number | null;
    oldPosts: number | null;
    expiry: string | null;
    answerNumber: string | null;
  } | null;
  product: {
    name: string;
    slug: string;
    price: { toString(): string };
    currency: string;
    coverImageUrl: string | null;
    qty: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    deliveryMethod: DeliveryMethod;
    smmServiceType: string | null;
    smmMin: number | null;
    smmMax: number | null;
    assets: Array<{ url: string; thumbnailUrl: string | null }>;
  };
}): CartLineDto {
  const catalogPrice = decimalToString(item.product.price) ?? "0";
  const catalogPriceNumber = Number.parseFloat(catalogPrice);
  const isSmm = item.product.deliveryMethod === DeliveryMethod.SMM;

  let unitPrice: string;
  let lineTotal: string;

  if (isSmm) {
    unitPrice = smmEffectiveUnitPriceClp(
      catalogPriceNumber,
      item.product.smmServiceType,
      item.quantity,
    ).toFixed(2);
    lineTotal = estimateSmmLineTotalClp(
      catalogPriceNumber,
      item.product.smmServiceType,
      item.quantity,
    ).toFixed(2);
  } else {
    const vol = calculateVolumeDiscountPrice(catalogPriceNumber, item.quantity, false);
    unitPrice = vol.unitPrice.toFixed(2);
    lineTotal = vol.lineTotal.toFixed(2);
  }

  const cover =
    item.product.coverImageUrl ??
    item.product.assets[0]?.thumbnailUrl ??
    item.product.assets[0]?.url ??
    null;

  const smm = toSmmDto(item.smm);
  const smmComplete = isSmm
    ? isSmmOrderFieldsComplete(
        item.product.smmServiceType,
        smm as SmmOrderFieldsPayload | null,
      )
    : true;

  const inStock =
    item.product.status === "ACTIVE" &&
    (isSmm || item.product.qty > 0);

  return {
    id: item.id,
    productId: item.productId,
    quantity: item.quantity,
    productName: item.product.name,
    productSlug: item.product.slug,
    unitPrice,
    currency: item.product.currency,
    coverImageUrl: cover,
    lineTotal,
    inStock,
    deliveryMethod: item.product.deliveryMethod,
    deliveryPromise: null,
    smmServiceType: item.product.smmServiceType,
    smmMin: item.product.smmMin,
    smmMax: item.product.smmMax,
    smm,
    smmComplete,
  };
}

const cartItemSelect = {
  id: true,
  productId: true,
  quantity: true,
  smm: {
    select: {
      link: true,
      username: true,
      quantity: true,
      comments: true,
      runs: true,
      intervalMinutes: true,
      usernames: true,
      hashtags: true,
      mediaUrl: true,
      min: true,
      max: true,
      delayMinutes: true,
      posts: true,
      oldPosts: true,
      expiry: true,
      answerNumber: true,
    },
  },
  product: {
    select: {
      name: true,
      slug: true,
      price: true,
      currency: true,
      coverImageUrl: true,
      qty: true,
      status: true,
      deliveryMethod: true,
      smmServiceType: true,
      smmMin: true,
      smmMax: true,
      assets: {
        where: { type: "IMAGE" as const },
        orderBy: { sortOrder: "asc" as const },
        take: 1,
        select: { url: true, thumbnailUrl: true },
      },
    },
  },
} as const;

export async function getCartForUser(userId: string): Promise<CartDto | null> {
  const cart = await prisma.cart.findUnique({
    where: { userId },
    select: {
      id: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: cartItemSelect,
      },
    },
  });

  if (!cart) {
    return null;
  }

  const items = cart.items.map(toCartLine);
  const promises = await resolveDeliveryPromisesForLines(
    items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );

  const enriched = items.map((item) => {
    const estimate =
      promises.get(`${item.productId}:${item.quantity}`) ??
      promises.get(item.productId);
    return {
      ...item,
      deliveryPromise: estimate?.promise ?? null,
    };
  });

  const currency = enriched[0]?.currency ?? "CLP";
  const subtotal = enriched
    .reduce((sum, item) => sum + Number.parseFloat(item.lineTotal), 0)
    .toFixed(2);

  return {
    id: cart.id,
    items: enriched,
    subtotal,
    currency,
    itemsCount: enriched.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function ensureCartForUser(userId: string): Promise<string> {
  const existing = await prisma.cart.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const created = await prisma.cart.create({
    data: { userId },
    select: { id: true },
  });

  return created.id;
}
