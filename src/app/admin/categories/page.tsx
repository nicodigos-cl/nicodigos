import { CategoriesAdminClient } from "@/components/admin/categories/categories-admin-client";
import {
  getCategoriesTree,
  getCategoryParentOptions,
} from "@/lib/categories/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { z } from "zod";

const categoriesAdminQuerySchema = z.object({
  q: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z
      .string()
      .trim()
      .max(120)
      .transform((value) => value.replace(/\s+/g, " "))
      .optional(),
  ),
  edit: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) return undefined;
      return value;
    },
    z.string().cuid().optional(),
  ),
});

type CategoriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CategoriesPage({
  searchParams,
}: CategoriesPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = categoriesAdminQuerySchema.safeParse(rawParams);
  const q = parsed.success ? parsed.data.q : undefined;
  const initialEditId = parsed.success ? parsed.data.edit : undefined;

  const [tree, parentOptions] = await Promise.all([
    getCategoriesTree(q),
    getCategoryParentOptions(),
  ]);

  return (
    <CategoriesAdminClient
      initialTree={tree}
      parentOptions={parentOptions}
      q={q}
      initialEditId={initialEditId}
    />
  );
}
