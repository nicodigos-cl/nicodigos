import { ProductForm } from "@/components/admin/products/product-form";
import { getEurToClpRate } from "@/lib/fx/eur-clp";
import { getUsdToClpRate } from "@/lib/fx/usd-clp";
import { searchKinguinProducts } from "@/lib/kinguin/search";
import { getCategoryOptions } from "@/lib/products/queries";
import {
  DEFAULT_KINGUIN_MARKUP_PCT,
  DEFAULT_MARKUP_MIN_PCT,
} from "@/lib/smm-services/constants";
import { getSmmServicesPage } from "@/lib/smm-providers/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import type { KinguinSearchPageResult } from "@/types/kinguin-admin";
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
  kinguinQ: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(200)
      .transform((value) => value.replace(/\s+/g, " "))
      .optional(),
  ),
  kinguinPage: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).default(1),
  ),
});

export default async function NewProductPage({
  searchParams,
}: NewProductPageProps) {
  const raw = parseSearchParamsRecord(await searchParams);
  const picker = pickerQuerySchema.parse(raw);

  const emptyKinguin: KinguinSearchPageResult = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    q: "",
  };

  const [categories, smmServices, usdClpRate, eurClpRate, kinguinSearch] =
    await Promise.all([
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
      getEurToClpRate().catch(() => 1000),
      picker.kinguinQ
        ? searchKinguinProducts({
            q: picker.kinguinQ,
            page: picker.kinguinPage,
            pageSize: 10,
            chile: "all",
            imported: "all",
          }).catch(() => ({
            ...emptyKinguin,
            q: picker.kinguinQ ?? "",
            page: picker.kinguinPage,
          }))
        : Promise.resolve(emptyKinguin),
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
      kinguinPicker={{
        items: kinguinSearch.items,
        total: kinguinSearch.total,
        page: kinguinSearch.page,
        pageSize: kinguinSearch.pageSize,
        totalPages: kinguinSearch.totalPages,
        q: picker.kinguinQ,
        eurClpRate,
        defaultMarkupPct: DEFAULT_KINGUIN_MARKUP_PCT,
      }}
    />
  );
}
