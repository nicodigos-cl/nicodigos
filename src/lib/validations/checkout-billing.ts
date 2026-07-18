import { z } from "zod";

import { isValidRut, normalizeRut } from "@/lib/validations/rut";
import { invoiceDocumentTypeValues } from "@/lib/validations/users";

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

function emptyToNull(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return null;
  }
  return value;
}

/**
 * SII Res. Ex. 44/2025 + Ley 21.713: boletas ≥ 135 UF must identify the buyer.
 * Annual CLP equivalent for 2025 (UF at 31 Dec 2024). Update yearly via settings if needed.
 */
export const BOLETA_NAMED_THRESHOLD_CLP = 5_186_253;

export type CheckoutBillingSettings = {
  requireRut: boolean;
  requireBillingData: boolean;
  allowBoleta: boolean;
  allowFactura: boolean;
  boletaNamedThresholdClp?: number;
};

export const checkoutBillingInputSchema = z.object({
  email: z.string().trim().email("Email inválido").max(320).optional(),
  customerName: z.preprocess(
    emptyToUndefined,
    z.string().trim().min(1).max(200).optional(),
  ),
  phone: z.preprocess(
    emptyToNull,
    z.string().trim().max(40).nullable().optional(),
  ),
  invoiceType: z.enum(invoiceDocumentTypeValues).default("BOLETA"),
  rut: z.preprocess(emptyToNull, z.string().trim().max(20).nullable().optional()),
  businessName: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().optional(),
  ),
  businessActivity: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().optional(),
  ),
  addressLine1: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().optional(),
  ),
  addressLine2: z.preprocess(
    emptyToNull,
    z.string().trim().max(200).nullable().optional(),
  ),
  commune: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable().optional(),
  ),
  city: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable().optional(),
  ),
  region: z.preprocess(
    emptyToNull,
    z.string().trim().max(120).nullable().optional(),
  ),
});

export type CheckoutBillingInput = z.infer<typeof checkoutBillingInputSchema>;

export function validateCheckoutBilling(input: {
  data: CheckoutBillingInput;
  orderTotalClp: number;
  settings: CheckoutBillingSettings;
}): { ok: true; data: CheckoutBillingInput & { rut: string | null } } | {
  ok: false;
  message: string;
  fieldErrors: Record<string, string[]>;
} {
  const { data, orderTotalClp, settings } = input;
  const threshold =
    settings.boletaNamedThresholdClp ?? BOLETA_NAMED_THRESHOLD_CLP;
  const fieldErrors: Record<string, string[]> = {};

  const add = (field: string, message: string) => {
    fieldErrors[field] = [...(fieldErrors[field] ?? []), message];
  };

  if (data.invoiceType === "FACTURA" && !settings.allowFactura) {
    add("invoiceType", "La factura no está habilitada.");
  }
  if (data.invoiceType === "BOLETA" && !settings.allowBoleta) {
    add("invoiceType", "La boleta no está habilitada.");
  }

  if (!data.customerName?.trim()) {
    add("customerName", "El nombre es obligatorio");
  }

  let rut: string | null = null;
  if (data.rut) {
    const normalized = normalizeRut(data.rut);
    if (!normalized || !isValidRut(normalized)) {
      add("rut", "RUT inválido");
    } else {
      rut = normalized;
    }
  }

  const needsNamedBoleta =
    data.invoiceType === "BOLETA" && orderTotalClp >= threshold;
  const needsRut =
    settings.requireRut ||
    data.invoiceType === "FACTURA" ||
    needsNamedBoleta;

  if (needsRut && !rut) {
    add(
      "rut",
      needsNamedBoleta
        ? "El RUT es obligatorio para boletas sobre 135 UF"
        : "El RUT es obligatorio",
    );
  }

  if (data.invoiceType === "FACTURA") {
    if (!data.businessName?.trim()) {
      add("businessName", "La razón social es obligatoria para factura");
    }
    if (!data.businessActivity?.trim()) {
      add("businessActivity", "El giro es obligatorio para factura");
    }
    if (!data.addressLine1?.trim()) {
      add("addressLine1", "La dirección es obligatoria para factura");
    }
    if (!data.commune?.trim()) {
      add("commune", "La comuna es obligatoria para factura");
    }
  }

  if (settings.requireBillingData) {
    if (!data.addressLine1?.trim()) {
      add("addressLine1", "La dirección es obligatoria");
    }
    if (!data.commune?.trim()) {
      add("commune", "La comuna es obligatoria");
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Revisa los datos de facturación.",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      ...data,
      rut,
      businessName:
        data.invoiceType === "FACTURA" ? data.businessName : null,
      businessActivity:
        data.invoiceType === "FACTURA" ? data.businessActivity : null,
    },
  };
}
