import {
  importProductItemSchema,
  PRODUCT_IMPORT_LIMIT,
  type ImportProductItem,
  exportedSmmServiceSchema,
  type ExportedSmmService,
} from "@/lib/validations/product-import";
import { SMM_SERVICE_SELECTION_LIMIT } from "@/lib/smm-services/constants";

export type ParseImportResult<T> =
  | {
      success: true;
      items: T[];
      warnings: string[];
      categoryIds?: string[];
    }
  | { success: false; message: string };

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/\s+/g, "_");
}

const CSV_HEADER_ALIASES: Record<string, keyof ImportProductItem | "skip"> = {
  name: "name",
  nombre: "name",
  slug: "slug",
  description: "description",
  descripcion: "description",
  descripción: "description",
  price: "price",
  precio: "price",
  deliverymethod: "deliveryMethod",
  delivery_method: "deliveryMethod",
  entrega: "deliveryMethod",
  status: "status",
  estado: "status",
  qty: "qty",
  stock: "qty",
  currency: "currency",
  moneda: "currency",
  compareatprice: "compareAtPrice",
  compare_at_price: "compareAtPrice",
  textqty: "textQty",
  text_qty: "textQty",
};

export function parseProductsCsv(
  text: string,
): ParseImportResult<ImportProductItem> {
  const lines = text
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return {
      success: false,
      message: "El CSV debe tener encabezado y al menos una fila.",
    };
  }

  const headers = splitCsvLine(lines[0]!).map(normalizeHeader);
  const mapped = headers.map((header) => CSV_HEADER_ALIASES[header] ?? null);

  if (!mapped.includes("name") || !mapped.includes("price")) {
    return {
      success: false,
      message: "El CSV requiere columnas name/nombre y price/precio.",
    };
  }

  const items: ImportProductItem[] = [];
  const warnings: string[] = [];

  for (let rowIndex = 1; rowIndex < lines.length; rowIndex += 1) {
    if (items.length >= PRODUCT_IMPORT_LIMIT) {
      warnings.push(
        `Se truncó a ${PRODUCT_IMPORT_LIMIT} productos (límite de importación).`,
      );
      break;
    }

    const cells = splitCsvLine(lines[rowIndex]!);
    const raw: Record<string, string> = {};

    mapped.forEach((field, index) => {
      if (!field || field === "skip") return;
      const value = cells[index];
      if (value != null && value !== "") {
        raw[field] = value;
      }
    });

    const parsed = importProductItemSchema.safeParse(raw);
    if (!parsed.success) {
      warnings.push(`Fila ${rowIndex + 1}: datos inválidos, se omitió.`);
      continue;
    }
    items.push(parsed.data);
  }

  if (items.length === 0) {
    return {
      success: false,
      message: "No se encontró ninguna fila de producto válida.",
    };
  }

  return { success: true, items, warnings };
}

export function parseProductsJson(
  text: string,
): ParseImportResult<ImportProductItem> {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: "JSON inválido." };
  }

  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { products?: unknown }).products)
      ? (data as { products: unknown[] }).products
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : null;

  if (!rows) {
    return {
      success: false,
      message: "El JSON debe ser un array de productos o { products/items: [] }.",
    };
  }

  if (rows.length === 0) {
    return { success: false, message: "El JSON no contiene productos." };
  }

  const categoryIds =
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    Array.isArray((data as { categoryIds?: unknown }).categoryIds)
      ? (data as { categoryIds: unknown[] }).categoryIds.filter(
          (id): id is string => typeof id === "string" && id.length > 0,
        )
      : undefined;

  const items: ImportProductItem[] = [];
  const warnings: string[] = [];
  const limit = Math.min(rows.length, PRODUCT_IMPORT_LIMIT);

  if (rows.length > PRODUCT_IMPORT_LIMIT) {
    warnings.push(
      `Se truncó a ${PRODUCT_IMPORT_LIMIT} productos (límite de importación).`,
    );
  }

  for (let index = 0; index < limit; index += 1) {
    const parsed = importProductItemSchema.safeParse(rows[index]);
    if (!parsed.success) {
      warnings.push(`Item ${index + 1}: datos inválidos, se omitió.`);
      continue;
    }
    items.push(parsed.data);
  }

  if (items.length === 0) {
    return {
      success: false,
      message: "No se encontró ningún producto válido en el JSON.",
    };
  }

  return { success: true, items, warnings, categoryIds };
}

export function parseServicesJson(
  text: string,
): ParseImportResult<ExportedSmmService> {
  let data: unknown;
  try {
    data = JSON.parse(text) as unknown;
  } catch {
    return { success: false, message: "JSON inválido." };
  }

  const rows = Array.isArray(data)
    ? data
    : data &&
        typeof data === "object" &&
        Array.isArray((data as { services?: unknown }).services)
      ? (data as { services: unknown[] }).services
      : null;

  if (!rows) {
    return {
      success: false,
      message: "El JSON debe ser un array de servicios SMM exportados.",
    };
  }

  if (rows.length === 0) {
    return { success: false, message: "El JSON no contiene servicios." };
  }

  const items: ExportedSmmService[] = [];
  const warnings: string[] = [];
  const limit = Math.min(rows.length, SMM_SERVICE_SELECTION_LIMIT);

  if (rows.length > SMM_SERVICE_SELECTION_LIMIT) {
    warnings.push(
      `Se truncó a ${SMM_SERVICE_SELECTION_LIMIT} servicios (límite).`,
    );
  }

  for (let index = 0; index < limit; index += 1) {
    const parsed = exportedSmmServiceSchema.safeParse(rows[index]);
    if (!parsed.success) {
      warnings.push(`Servicio ${index + 1}: esquema inválido, se omitió.`);
      continue;
    }
    items.push(parsed.data);
  }

  if (items.length === 0) {
    return {
      success: false,
      message: "No se encontró ningún servicio válido en el JSON.",
    };
  }

  return { success: true, items, warnings };
}
