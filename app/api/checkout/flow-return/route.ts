import { NextResponse } from "next/server";

import { storeRoutes } from "@/lib/store/navigation";

export const dynamic = "force-dynamic";

async function readTokenFromBody(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await request.text();
    return new URLSearchParams(body).get("token");
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return formData.get("token")?.toString() ?? null;
  }

  return null;
}

function redirectToReturnPage(request: Request, token: string | null) {
  const target = new URL(storeRoutes.checkoutReturn, request.url);

  if (token) {
    target.searchParams.set("token", token);
  }

  return NextResponse.redirect(target, 303);
}

/** Flow redirige o POSTea el token aquí; enviamos al usuario a la página de estado. */
export async function POST(request: Request) {
  const token = await readTokenFromBody(request);
  return redirectToReturnPage(request, token);
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  return redirectToReturnPage(request, token);
}
