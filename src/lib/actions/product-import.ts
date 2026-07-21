"use server";

import { revalidatePath } from "next/cache";
import pLimit from "p-limit";
import { flattenError } from "zod";

import {
  DeliveryMethod,
  Prisma,
  ProductStatus,
} from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { slugify, decimalToString } from "@/lib/products/format";
import { IMPORT_CONCURRENCY } from "@/lib/smm-services/constants";
import {
  importProductsSchema,
  resolveExportedSmmServicesSchema,
  type ExportedSmmService,
} from "@/lib/validations/product-import";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

function unauthorized<T>(): ActionResult<T> {
  return {
    success: false,
    message: "No autorizado. Inicia sesión para continuar.",
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

async function uniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
): Promise<string> {
  let candidate = slugify(base) || "producto";
  candidate = candidate.slice(0, 110);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const next = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
    const existing = await tx.product.findUnique({
      where: { slug: next },
      select: { id: true },
    });
    if (!existing) {
      return next;
    }
  }

  return `${candidate}-${Date.now().toString(36)}`;
}

function mapServiceRow(service: {
  id: string;
  providerId: string;
  remoteServiceId: number;
  name: string;
  type: string;
  category: string;
  rate: { toString(): string };
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  provider: { name: string; slug: string; apiUrl: string };
}): SmmServiceListItemDto {
  return {
    id: service.id,
    providerId: service.providerId,
    providerName: service.provider.name,
    providerSlug: service.provider.slug,
    providerApiUrl: service.provider.apiUrl,
    remoteServiceId: service.remoteServiceId,
    name: service.name,
    type: service.type,
    category: service.category,
    rate: decimalToString(service.rate) ?? "0",
    min: service.min,
    max: service.max,
    refill: service.refill,
    cancel: service.cancel,
    isActive: service.isActive,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

const serviceSelect = {
  id: true,
  providerId: true,
  remoteServiceId: true,
  name: true,
  type: true,
  category: true,
  rate: true,
  min: true,
  max: true,
  refill: true,
  cancel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  provider: {
    select: {
      name: true,
      slug: true,
      apiUrl: true,
    },
  },
} as const;

async function resolveOneExportedService(
  item: ExportedSmmService,
): Promise<SmmServiceListItemDto | null> {
  if (item.id) {
    const byId = await prisma.smmService.findUnique({
      where: { id: item.id },
      select: serviceSelect,
    });
    if (byId) {
      return mapServiceRow(byId);
    }
  }

  if (item.providerId) {
    const byProvider = await prisma.smmService.findUnique({
      where: {
        providerId_remoteServiceId: {
          providerId: item.providerId,
          remoteServiceId: item.remoteServiceId,
        },
      },
      select: serviceSelect,
    });
    if (byProvider) {
      return mapServiceRow(byProvider);
    }
  }

  if (item.providerApiUrl) {
    const byApiUrl = await prisma.smmService.findFirst({
      where: {
        remoteServiceId: item.remoteServiceId,
        provider: { apiUrl: item.providerApiUrl },
      },
      select: serviceSelect,
    });
    if (byApiUrl) {
      return mapServiceRow(byApiUrl);
    }
  }

  return null;
}

export async function importProductsAction(
  rawInput: unknown,
): Promise<ActionResult<{ createdIds: string[]; count: number }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importProductsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { items, categoryIds } = parsed.data;

  if (categoryIds.length > 0) {
    const count = await prisma.category.count({
      where: { id: { in: categoryIds } },
    });
    if (count !== categoryIds.length) {
      return {
        success: false,
        message: "Una o más categorías no existen.",
        fieldErrors: { categoryIds: ["Categoría inválida"] },
      };
    }
  }

  try {
    const createdIds = await prisma.$transaction(async (tx) => {
      const ids: string[] = [];

      for (const item of items) {
        const slug = item.slug ?? (await uniqueSlug(tx, item.name));
        const assets = item.assets ?? [];
        const coverFromAssets =
          assets.find((asset) => asset.type === "IMAGE" && asset.isCover)?.url ??
          assets.find((asset) => asset.type === "IMAGE")?.url ??
          null;

        const product = await tx.product.create({
          data: {
            name: item.name,
            slug,
            description: item.description ?? null,
            coverImageUrl: item.coverImageUrl ?? coverFromAssets,
            status: item.status as ProductStatus,
            deliveryMethod: item.deliveryMethod as DeliveryMethod,
            price: item.price,
            compareAtPrice: item.compareAtPrice ?? null,
            sourceCostPrice: item.sourceCostPrice ?? null,
            currency: item.currency,
            qty: item.qty,
            textQty: item.textQty ?? null,
            categories:
              categoryIds.length > 0
                ? {
                    create: categoryIds.map((categoryId) => ({
                      categoryId,
                    })),
                  }
                : undefined,
          },
          select: { id: true },
        });

        if (assets.length > 0) {
          await tx.asset.createMany({
            data: assets.map((asset) => ({
              productId: product.id,
              type: asset.type,
              url: asset.url,
              objectKey: asset.objectKey ?? null,
              youtubeId: asset.youtubeId ?? null,
              mimeType: asset.mimeType ?? null,
              fileName: asset.fileName ?? null,
              sizeBytes:
                asset.sizeBytes != null ? BigInt(asset.sizeBytes) : null,
              thumbnailUrl: asset.thumbnailUrl ?? null,
              altText: asset.altText ?? null,
              sortOrder: asset.sortOrder,
              isCover: asset.type === "IMAGE" && asset.isCover,
            })),
          });
        }

        ids.push(product.id);
      }

      return ids;
    });

    revalidatePath("/admin/products");
    return {
      success: true,
      data: { createdIds, count: createdIds.length },
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Conflicto de slug al importar. Revisa o regenera los slugs.",
      };
    }

    return {
      success: false,
      message: "No se pudieron importar los productos.",
    };
  }
}

export async function resolveExportedSmmServicesAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    items: SmmServiceListItemDto[];
    missing: number;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = resolveExportedSmmServicesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const resolveLimit = pLimit(IMPORT_CONCURRENCY);
  const resolvedRows = await Promise.all(
    parsed.data.services.map((row) =>
      resolveLimit(() => resolveOneExportedService(row)),
    ),
  );

  const items: SmmServiceListItemDto[] = [];
  const seen = new Set<string>();
  let missing = 0;

  for (const resolved of resolvedRows) {
    if (!resolved) {
      missing += 1;
      continue;
    }
    if (seen.has(resolved.id)) {
      continue;
    }
    seen.add(resolved.id);
    items.push(resolved);
  }

  if (items.length === 0) {
    return {
      success: false,
      message:
        "Ningún servicio del JSON coincide con el catálogo local. Sincroniza providers primero.",
    };
  }

  return { success: true, data: { items, missing } };
}
