import type { Metadata } from "next";

import StoreLayout from "@/components/layout/store-layout";
import StoreCategoriesClient from "@/components/store/categories-client";
import { getStoreCategoriesPageData } from "@/lib/categories/queries";

export const metadata: Metadata = {
  title: "Categorías · Nicodigos",
  description:
    "Explora todas las categorías de la tienda: videojuegos, tarjetas de regalo, redes sociales, software premium y más. Compra al instante en CLP.",
  openGraph: {
    title: "Categorías · Nicodigos",
    description:
      "Explora todas las categorías de Nicodigos: videojuegos, software, SMM y más.",
  },
};

export default async function CategoriesPage() {
  const categories = await getStoreCategoriesPageData();

  return (
    <StoreLayout>
      <StoreCategoriesClient categories={categories} />
    </StoreLayout>
  );
}
