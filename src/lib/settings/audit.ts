import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import type { SettingsChangeEntry } from "@/types/settings";

export async function appendSettingsEvent(input: {
  section: string;
  action: string;
  actorUserId: string | null;
  actorEmail: string | null;
  changes?: SettingsChangeEntry[];
  message?: string;
  result?: "success" | "failure";
}) {
  await prisma.adminSettingsEvent.create({
    data: {
      section: input.section,
      action: input.action,
      actorUserId: input.actorUserId,
      actorEmail: input.actorEmail,
      message: input.message,
      result: input.result ?? "success",
      changes: input.changes
        ? (input.changes as unknown as Prisma.InputJsonValue)
        : undefined,
    },
  });
}
