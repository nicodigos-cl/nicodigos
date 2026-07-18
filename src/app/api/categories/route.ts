import { NextResponse } from "next/server";

import { getStoreNavCategories } from "@/lib/categories/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const categories = await getStoreNavCategories();

  return NextResponse.json(
    { categories },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
