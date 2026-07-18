import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const login = new URL("/auth/login", request.url);
    const pathname = request.nextUrl.pathname;
    const search = request.nextUrl.search;
    const callbackUrl = `${pathname}${search}`;
    if (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) {
      login.searchParams.set("callbackUrl", callbackUrl);
    }
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard", "/dashboard/:path*"],
};
