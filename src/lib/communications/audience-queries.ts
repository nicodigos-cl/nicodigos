import "server-only";

import prisma from "@/lib/prisma";

export async function getAudienceMetrics() {
  const [totalUsers, validEmails, marketingConsent, optedOut, activePush, deniedPush, anonymousPush, linkedPush, devices] = await Promise.all([
    prisma.user.count({ where: { accountStatus: { not: "ANONYMIZED" } } }),
    prisma.user.count({ where: { email: { contains: "@" }, accountStatus: { not: "ANONYMIZED" } } }),
    prisma.communicationPreference.count({ where: { marketingEmail: true, marketingConsentAt: { not: null }, marketingOptOutAt: null } }),
    prisma.communicationPreference.count({ where: { marketingOptOutAt: { not: null } } }),
    prisma.webPushSubscription.count({ where: { optedIn: true, permissionStatus: "GRANTED" } }),
    prisma.webPushSubscription.count({ where: { permissionStatus: "DENIED" } }),
    prisma.webPushSubscription.count({ where: { userId: null } }),
    prisma.webPushSubscription.count({ where: { userId: { not: null }, optedIn: true } }),
    prisma.webPushSubscription.groupBy({ by: ["userId"], where: { userId: { not: null } }, _count: true }),
  ]);
  const usersWithDevices = devices.length;
  const deviceCount = devices.reduce((sum, row) => sum + row._count, 0);
  return { totalUsers, validEmails, marketingConsent, optedOut, activePush, deniedPush, anonymousPush, linkedPush, usersWithDevices, deviceCount };
}

export async function getUserCommunicationPreferences(userId: string) {
  return prisma.communicationPreference.findUnique({ where: { userId }, select: { marketingEmail: true, webPushEnabled: true, orders: true, payments: true, deliveries: true, smm: true, security: true, newProducts: true, promotions: true, marketingConsentAt: true, marketingOptOutAt: true, updatedAt: true } });
}

export async function getAudienceSegments() {
  return prisma.communicationAudienceSegment.findMany({ where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, select: { id: true, name: true, description: true, definition: true, estimatedRecipients: true, excludedRecipients: true, estimatedAt: true, archivedAt: true, updatedAt: true } });
}
