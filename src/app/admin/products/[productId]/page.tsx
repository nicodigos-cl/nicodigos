import { notFound, redirect } from "next/navigation";

import { ArchiveProductButton } from "@/components/admin/products/archive-product-button";
import { ProductAccountsManager } from "@/components/admin/products/product-accounts-manager";
import { ProductForm } from "@/components/admin/products/product-form";
import { ProductKeysManager } from "@/components/admin/products/product-keys-manager";
import {
  getCategoryOptions,
  getProductAccountsPage,
  getProductById,
  getProductKeysPage,
} from "@/lib/products/queries";
import {
  parseSearchParamsRecord,
  productAccountsQuerySchema,
  productKeysQuerySchema,
} from "@/lib/validations/products";

type ProductEditPageProps = {
  params: Promise<{ productId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProductEditPage({
  params,
  searchParams,
}: ProductEditPageProps) {
  const { productId } = await params;
  const rawParams = parseSearchParamsRecord(await searchParams);
  const keysQuery = productKeysQuerySchema.safeParse(rawParams);
  const accountsQuery = productAccountsQuerySchema.safeParse(rawParams);

  if (!keysQuery.success || !accountsQuery.success) {
    redirect(`/admin/products/${productId}`);
  }

  const [product, categories, keysPage, accountsPage] = await Promise.all([
    getProductById(productId),
    getCategoryOptions(),
    getProductKeysPage(productId, keysQuery.data),
    getProductAccountsPage(productId, accountsQuery.data),
  ]);

  if (!product) {
    notFound();
  }

  if (
    keysPage.total > 0 &&
    keysQuery.data.keysPage > keysPage.totalPages
  ) {
    const paramsNext = new URLSearchParams();
    paramsNext.set("keysPage", String(keysPage.totalPages));
    if (keysQuery.data.keysPageSize !== 10) {
      paramsNext.set("keysPageSize", String(keysQuery.data.keysPageSize));
    }
    if (keysQuery.data.keysQuery) {
      paramsNext.set("keysQuery", keysQuery.data.keysQuery);
    }
    if (keysQuery.data.keysStatus) {
      paramsNext.set("keysStatus", keysQuery.data.keysStatus);
    }
    redirect(`/admin/products/${productId}?${paramsNext.toString()}`);
  }

  return (
    <ProductForm
      mode="edit"
      categories={categories}
      product={product}
      archiveSlot={
        <ArchiveProductButton
          productId={product.id}
          productName={product.name}
        />
      }
      keysSlot={
        product.deliveryMethod === "MANUAL" ? (
          <ProductKeysManager
            productId={product.id}
            keysPage={keysPage}
            query={keysQuery.data}
          />
        ) : null
      }
      accountsSlot={
        product.deliveryMethod === "MANUAL" ? (
          <ProductAccountsManager
            productId={product.id}
            accountsPage={accountsPage}
          />
        ) : null
      }
    />
  );
}
