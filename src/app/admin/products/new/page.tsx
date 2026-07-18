import { ProductForm } from "@/components/admin/products/product-form";
import { getUsdToClpRate } from "@/lib/fx/usd-clp";
import { getCategoryOptions } from "@/lib/products/queries";
import { DEFAULT_MARKUP_MIN_PCT } from "@/lib/smm-services/constants";
import { getSmmServicesPage } from "@/lib/smm-providers/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { z } from "zod";

type NewProductPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function emptyToUndefined(value: unknown): unknown {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  return value;
}

const pickerQuerySchema = z.object({
  serviceQ: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200)
      .transform((value) => value.replace(/\s+/g, " "))
      .optional(),
  ),
  servicePage: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
});

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const raw = parseSearchParamsRecord(await searchParams);
  const picker = pickerQuerySchema.parse(raw);

  const [categories, smmServices, usdClpRate] = await Promise.all([
    getCategoryOptions(),
    getSmmServicesPage({
      page: picker.servicePage,
      pageSize: 10,
      q: picker.serviceQ,
      sort: "name",
      order: "asc",
      isActive: "true",
    }),
    getUsdToClpRate().catch(() => 950),
  ]);

  return (
    <ProductForm
      mode="create"
      categories={categories}
      smmPicker={{
        items: smmServices.items,
        total: smmServices.total,
        page: smmServices.page,
        pageSize: smmServices.pageSize,
        totalPages: smmServices.totalPages,
        q: picker.serviceQ,
        usdClpRate,
        defaultMarkupPct: DEFAULT_MARKUP_MIN_PCT,
      }}
    />
  );
}
