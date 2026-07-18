"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/products/format";
import { syncProviderServices } from "@/lib/smm-providers/sync";
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
): Promise<
  ActionResult<{ synced: number; removed: number; archivedProducts: number }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = syncSmmProviderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const result = await syncProviderServices(parsed.data.id);

  revalidatePath("/admin/providers");
  revalidatePath(`/admin/providers/${parsed.data.id}`);
  revalidatePath("/admin/services");
  revalidatePath("/admin/products");

  if (result.error) {
    return {
      success: false,
      message: `No se pudieron sincronizar los servicios: ${result.error}`,
    };
  }

  return {
    success: true,
    data: {
      synced: result.synced,
      removed: result.removed,
      archivedProducts: result.archivedProducts,
    },
  };
}
