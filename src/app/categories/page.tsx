import type { Metadata } from "next";

import StoreLayout from "@/components/layout/store-layout";
import StoreCategoriesClient from "@/components/store/categories-client";
import { getStoreCategoriesPageData } from "@/lib/categories/queries";

export const metadata: Metadata = {
  title: "Categorías",
  description:
    "Explora todas las categorías: videojuegos, tarjetas de regalo, redes sociales, software premium y servicios SMM. Compra al instante en CLP.",
  alternates: { canonical: "/categories" },
  openGraph: {
    title: "Categorías · Nicodigos",
    description:
      "Explora categorías de Nicodigos: videojuegos, software, gift cards y SMM en Chile.",
    url: "/categories",
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
