"use server";

import { UserRole } from "@/generated/prisma/enums";
import { isAdminEmailByEnv } from "@/lib/auth/admin-allowlist";
import prisma from "@/lib/prisma";

/**
 * Promotes the user to ADMIN when their email (or domain) is listed in
 * ADMIN_EMAILS, e.g. `admin@nicodigos.cl,nicotordev.com`.
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
