import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type DashboardSessionUser = AuthSession["user"] & {
  role?: "USER" | "ADMIN" | null;
};

export type DashboardSession = Omit<AuthSession, "user"> & {
  user: DashboardSessionUser;
};

export async function requireUser(): Promise<DashboardSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in?callbackUrl=/dashboard");
  }

  return session as DashboardSession;
}
