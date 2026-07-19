"use server";

import { revalidatePath } from "next/cache";
import { flattenError } from "zod";

import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import {
  getKinguinProductPreview,
  importKinguinProduct,
} from "@/lib/kinguin/import";
import { applyMarkupPct, eurToClp, getEurToClpRate } from "@/lib/fx/eur-clp";
import {
  importKinguinProductSchema,
} from "@/lib/validations/kinguin";
import type { KinguinProductPreviewDto } from "@/types/kinguin-admin";

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

export async function getKinguinProductPreviewAction(
  rawInput: unknown,
): Promise<
  ActionResult<{
    preview: KinguinProductPreviewDto;
    eurClpRate: number;
    suggestedPriceClp: number | null;
  }>
> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importKinguinProductSchema
    .pick({ kinguinId: true, markupPct: true })
    .safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    const [preview, eurClpRate] = await Promise.all([
      getKinguinProductPreview(parsed.data.kinguinId),
      getEurToClpRate(),
    ]);

    const costEur = preview.priceEur;
    const suggestedPriceClp =
      costEur != null
        ? applyMarkupPct(
            Math.round(costEur * eurClpRate),
            parsed.data.markupPct,
          )
        : null;

    return {
      success: true,
      data: { preview, eurClpRate, suggestedPriceClp },
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo cargar el producto Kinguin.",
    };
  }
}

export async function importKinguinProductAction(
  rawInput: unknown,
): Promise<ActionResult<{ productId: string }>> {
  const session = await requireSession();
  if (!session) {
    return unauthorized();
  }

  const parsed = importKinguinProductSchema.safeParse(rawInput);
  if (!parsed.success) {
    return validationError(parsed.error);
  }

  try {
    // Warm FX cache; import uses eurToClp internally.
    await eurToClp(1);

    const result = await importKinguinProduct(parsed.data);

    revalidatePath("/admin/kinguin");
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${result.productId}`);

    return { success: true, data: { productId: result.productId } };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "KINGUIN_ALREADY_IMPORTED") {
        return {
          success: false,
          message: "Este producto Kinguin ya está importado.",
          fieldErrors: { kinguinId: ["Ya importado"] },
        };
      }
      if (error.message === "KINGUIN_PRODUCT_NOT_FOUND") {
        return {
          success: false,
          message: "Producto no encontrado en Kinguin.",
        };
      }
      if (error.message === "KINGUIN_NO_OFFERS") {
        return {
          success: false,
          message: "El producto no tiene ofertas disponibles.",
        };
      }
      if (error.message === "CATEGORY_NOT_FOUND") {
        return {
          success: false,
          message: "Una o más categorías no existen.",
          fieldErrors: { categoryIds: ["Categoría inválida"] },
        };
      }
      if (error.message.startsWith("R2_CONFIG_MISSING:")) {
        return {
          success: false,
          message:
            "R2 no está configurado. Configura el almacenamiento para importar imágenes de Kinguin.",
        };
      }
    }

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 300)
          : "No se pudo importar el producto.",
    };
  }
}
