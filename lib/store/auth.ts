import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { storeRoutes } from "@/lib/store/navigation";

export async function getOptionalStoreSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireStoreUser(
  callbackPath: string = storeRoutes.cart,
) {
  const session = await getOptionalStoreSession();

  if (!session?.user) {
    redirect(`/auth/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  return session;
}
