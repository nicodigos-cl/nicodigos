import "server-only";

import prisma from "@/lib/prisma";

export async function getCommunicationTemplates() {
  const rows = await prisma.communicationTemplate.findMany({
    where: { deletedAt: null }, orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    select: { id: true, name: true, slug: true, channel: true, kind: true, status: true, currentVersion: true, updatedByEmail: true, createdByEmail: true, updatedAt: true, versions: { orderBy: { version: "desc" }, take: 1, select: { id: true, subject: true, title: true, content: true, variables: true } } },
  });
  return rows.map((row) => ({ ...row, updatedAt: row.updatedAt.toISOString(), latest: row.versions[0] ?? null }));
}

export async function getTemplateWithVersions(id: string) {
  const row = await prisma.communicationTemplate.findFirst({ where: { id, deletedAt: null }, include: { versions: { orderBy: { version: "desc" } } } });
  return row ? { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), versions: row.versions.map((version) => ({ ...version, createdAt: version.createdAt.toISOString() })) } : null;
}
