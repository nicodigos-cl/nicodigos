"use server";

import { UserRole } from "@/generated/prisma/enums";
import prisma from "@/lib/prisma";

function getAdminAllowlist() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** True if email matches an allowlisted address or domain in ADMIN_EMAILS. */
function isAdminEmailByEnv(email: string) {
  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) return false;

  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf("@");
  if (at <= 0 || at === normalized.length - 1) return false;

  const domain = normalized.slice(at + 1);

  return allowlist.some((entry) => {
    if (entry.includes("@")) {
      return entry === normalized;
    }

    const entryDomain = entry.replace(/^@/, "");
    return domain === entryDomain;
  });
}

/**
 * Promotes the user to ADMIN when their email (or domain) is listed in
 * ADMIN_EMAILS, e.g. `admin@nicodigos.com,nicotordev.com`.
 */
export async function makeUserAdminByEnv(email: string) {
  if (!isAdminEmailByEnv(email)) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: email.trim(),
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    return null;
  }

  if (user.role === UserRole.ADMIN) {
    return user;
  }

  return prisma.user.update({
    where: { id: user.id },
    data: { role: UserRole.ADMIN },
  });
}
