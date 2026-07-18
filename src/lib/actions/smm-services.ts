"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { deleteSmmServiceSchema } from "@/lib/validations/smm-providers";

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

export async function deleteSmmServiceAction(
  rawInput: unknown,
): Promise<ActionResult<{ id: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = deleteSmmServiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const deleted = await prisma.smmService.delete({
      where: { id: parsed.data.id },
      select: { id: true, providerId: true },
    });

    revalidatePath("/admin/services");
    revalidatePath(`/admin/providers/${deleted.providerId}`);
    return { success: true, data: { id: deleted.id } };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, message: "Servicio no encontrado." };
    }

    return { success: false, message: "No se pudo eliminar el servicio." };
  }
}
