import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function isAdminUser(user: { email: string; role?: string | null }): boolean {
  const allowlist = getAdminEmailAllowlist();
  const email = user.email.trim().toLowerCase();

  if (user.role === "ADMIN") {
    return true;
  }

  return allowlist.has(email);
}

export async function requireAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/");
  }

  if (!isAdminUser(session.user)) {
    redirect("/");
  }

  return session;
}
