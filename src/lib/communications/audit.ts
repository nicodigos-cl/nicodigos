import "server-only";

import type { CommunicationChannel, Prisma } from "@/generated/prisma/client";
import prisma from "@/lib/prisma";
import { externalIdSuffix } from "@/lib/communications/security";

type AuditInput = {
  actor?: { userId: string; email: string } | null;
  action: string;
  channel?: CommunicationChannel;
  resourceType: string;
  resourceId: string;
  statusBefore?: string | null;
  statusAfter?: string | null;
  audienceSummary?: Prisma.InputJsonValue;
  estimatedRecipients?: number | null;
  affectedRecipients?: number | null;
  maskedRecipient?: string | null;
  externalId?: string | null;
  result?: "SUCCESS" | "PARTIAL" | "FAILED" | "IGNORED";
  errorCode?: string | null;
  safeMetadata?: Prisma.InputJsonValue;
};

export async function recordCommunicationAudit(input: AuditInput, tx: Prisma.TransactionClient | typeof prisma = prisma) {
  return tx.communicationAuditEvent.create({
    data: {
      actorUserId: input.actor?.userId,
      actorEmail: input.actor?.email,
      action: input.action,
      channel: input.channel,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      statusBefore: input.statusBefore,
      statusAfter: input.statusAfter,
      audienceSummary: input.audienceSummary,
      estimatedRecipients: input.estimatedRecipients,
      affectedRecipients: input.affectedRecipients,
      maskedRecipient: input.maskedRecipient,
      externalIdSuffix: externalIdSuffix(input.externalId),
      result: input.result ?? "SUCCESS",
      errorCode: input.errorCode,
      safeMetadata: input.safeMetadata,
    },
  });
}
