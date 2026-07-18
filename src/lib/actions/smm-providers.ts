"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma, SmmProviderStatus } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import { SmmService as SmmApiClient } from "@/lib/smm-service";
import {
  createSmmProviderSchema,
  deleteSmmProviderSchema,
  syncSmmProviderSchema,
  updateSmmProviderSchema,
} from "@/lib/validations/smm-providers";

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

async function ensureSingleDefault(
  tx: Prisma.TransactionClient,
  providerId: string,
  isDefault: boolean,
) {
  if (!isDefault) {
    return;
  }

  await tx.smmProvider.updateMany({
    where: {
      isDefault: true,
      NOT: { id: providerId },
    },
    data: { isDefault: false },
  });
}

export async function createSmmProviderAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = createSmmProviderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;
  const slug = data.slug || slugify(data.name);

  try {
    const provider = await prisma.$transaction(async (tx) => {
      const created = await tx.smmProvider.create({
        data: {
          name: data.name,
          slug,
          description: data.description ?? null,
          apiUrl: data.apiUrl.replace(/\/$/, ""),
          apiKey: data.apiKey,
          status: data.status,
          isDefault: data.isDefault,
        },
        select: { id: true },
      });

      await ensureSingleDefault(tx, created.id, data.isDefault);
      return created;
    });

    revalidatePath("/admin/providers");
    return { success: true, data: { id: provider.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Ya existe un provider con ese slug.",
        fieldErrors: { slug: ["Slug duplicado"] },
      };
    }

    return { success: false, message: "No se pudo crear el provider." };
  }
}

export async function updateSmmProviderAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = updateSmmProviderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.smmProvider.update({
        where: { id: data.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          apiUrl: data.apiUrl.replace(/\/$/, ""),
          ...(data.apiKey ? { apiKey: data.apiKey } : {}),
          status: data.status,
          isDefault: data.isDefault,
        },
      });

      await ensureSingleDefault(tx, data.id, data.isDefault);
    });

    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${data.id}`);
    return { success: true, data: { id: data.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Provider no encontrado." };
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "Ya existe un provider con ese slug.",
        fieldErrors: { slug: ["Slug duplicado"] },
      };
    }

    return { success: false, message: "No se pudo actualizar el provider." };
  }
}

export async function deleteSmmProviderAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = deleteSmmProviderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    await prisma.smmProvider.delete({
      where: { id: parsed.data.id },
    });

    revalidatePath("/admin/providers");
    return { success: true, data: { id: parsed.data.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Provider no encontrado." };
    }

    return { success: false, message: "No se pudo eliminar el provider." };
  }
}

export async function syncSmmProviderServicesAction(
  rawInput: unknown,
): Promise<ActionResult<{ synced: number }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = syncSmmProviderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const provider = await prisma.smmProvider.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      apiUrl: true,
      apiKey: true,
    },
  });

  if (!provider) {
    return { success: false, message: "Provider no encontrado." };
  }

  try {
    const client = new SmmApiClient({
      apiUrl: provider.apiUrl,
      apiKey: provider.apiKey,
    });
    const remoteServices = await client.services();

    await prisma.$transaction(async (tx) => {
      for (const item of remoteServices) {
        const rate = Number.parseFloat(item.rate);
        const min = Number.parseInt(item.min, 10);
        const max = Number.parseInt(item.max, 10);

        await tx.smmService.upsert({
          where: {
            providerId_remoteServiceId: {
              providerId: provider.id,
              remoteServiceId: item.service,
            },
          },
          create: {
            providerId: provider.id,
            remoteServiceId: item.service,
            name: item.name,
            type: item.type,
            category: item.category,
            rate: Number.isFinite(rate) ? rate : 0,
            min: Number.isFinite(min) ? min : 0,
            max: Number.isFinite(max) ? max : 0,
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
            isActive: true,
          },
          update: {
            name: item.name,
            type: item.type,
            category: item.category,
            rate: Number.isFinite(rate) ? rate : 0,
            min: Number.isFinite(min) ? min : 0,
            max: Number.isFinite(max) ? max : 0,
            refill: Boolean(item.refill),
            cancel: Boolean(item.cancel),
            isActive: true,
          },
        });
      }

      await tx.smmProvider.update({
        where: { id: provider.id },
        data: {
          lastSyncedAt: new Date(),
          lastError: null,
          status: SmmProviderStatus.ACTIVE,
        },
      });
    });

    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${provider.id}`);
    return { success: true, data: { synced: remoteServices.length } };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 500)
        : "Error al sincronizar servicios.";

    await prisma.smmProvider.update({
      where: { id: provider.id },
      data: {
        lastError: message,
        status: SmmProviderStatus.ERROR,
      },
    });

    revalidatePath("/admin/providers");
    revalidatePath(`/admin/providers/${provider.id}`);
    return {
      success: false,
      message: `No se pudieron sincronizar los servicios: ${message}`,
    };
  }
}
