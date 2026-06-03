import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function getOptionalStoreSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireStoreUser(callbackPath = "/carrito") {
  const session = await getOptionalStoreSession();

  if (!session?.user) {
    redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return session;
}
