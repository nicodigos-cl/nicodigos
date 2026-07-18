import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { audienceDefinitionSchema, type AudienceDefinition } from "@/lib/validations/communications";

export type AudienceResolution = {
  userIds: string[];
  estimated: number;
  excluded: number;
  warnings: string[];
  resolvedAt: string;
};

async function eligibleWhere(kind: "OPERATIONAL" | "MARKETING" | "SECURITY"): Promise<Prisma.UserWhereInput> {
  const preference = kind === "MARKETING"
    ? { webPushEnabled: true, marketingConsentAt: { not: null }, marketingOptOutAt: null }
    : { webPushEnabled: true };
  return {
    accountStatus: "ACTIVE",
    communicationPreference: { is: preference },
    webPushSubscriptions: { some: { optedIn: true, permissionStatus: "GRANTED" } },
  };
}

export async function resolvePushAudience(definition: AudienceDefinition, kind: "OPERATIONAL" | "MARKETING" | "SECURITY"): Promise<AudienceResolution> {
  if (definition.type === "ONESIGNAL_SEGMENT") {
    return { userIds: [], estimated: 0, excluded: 0, warnings: ["La cantidad final la resolverá OneSignal para este segmento."], resolvedAt: new Date().toISOString() };
  }

  let candidateIds: string[] | undefined;
  if (definition.type === "SPECIFIC_USERS") candidateIds = definition.userIds;
  if (definition.type === "INTERNAL_SEGMENT") {
    const segment = await prisma.communicationAudienceSegment.findFirst({
      where: { id: definition.segmentId, deletedAt: null, archivedAt: null },
      select: { definition: true },
    });
    if (!segment) throw new Error("SEGMENT_NOT_FOUND");
    const parsed = audienceDefinitionSchema.safeParse(segment.definition);
    if (!parsed.success || parsed.data.type === "INTERNAL_SEGMENT") throw new Error("INVALID_SEGMENT");
    return resolvePushAudience(parsed.data, kind);
  }

  const baseWhere = await eligibleWhere(kind);
  const users = await prisma.user.findMany({
    where: { ...baseWhere, ...(candidateIds ? { id: { in: candidateIds } } : {}) },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 20_000,
  });
  const totalCandidates = candidateIds?.length ?? await prisma.user.count({ where: { accountStatus: "ACTIVE" } });
  return {
    userIds: users.map((user) => user.id),
    estimated: users.length,
    excluded: Math.max(0, totalCandidates - users.length),
    warnings: users.length === 20_000 ? ["La audiencia alcanzó el límite operativo de 20.000 usuarios."] : [],
    resolvedAt: new Date().toISOString(),
  };
}
