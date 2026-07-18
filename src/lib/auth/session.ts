import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { AUTH_HOME_PATH } from "@/lib/auth/otp";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireSession() {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  return session;
}

export async function requireAdminSession() {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect(AUTH_HOME_PATH);
  }

  return session;
}
