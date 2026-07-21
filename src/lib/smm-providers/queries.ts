import type { Prisma } from "@/generated/prisma/client";
import type { SmmProviderStatus } from "@/generated/prisma/client";

import prisma from "@/lib/prisma";
import { decimalToString } from "@/lib/products/format";
import type {
  ProviderServicesQuery,
  ProvidersListQuery,
  ProvidersSortField,
  ServicesListQuery,
  ServicesSortField,
} from "@/lib/validations/smm-providers";
import { maskApiKey } from "@/lib/validations/smm-providers";
import type {
  SmmProviderDetailDto,
  SmmProviderListItemDto,
  SmmProviderOptionDto,
  SmmProvidersPageResult,
  SmmServiceDto,
  SmmServiceListItemDto,
  SmmServicesListPageResult,
  SmmServicesPageResult,
} from "@/types/smm-provider";

function buildOrderBy(
  sort: ProvidersSortField,
  order: "asc" | "desc",
): Prisma.SmmProviderOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: order };
    case "status":
      return { status: order };
    case "createdAt":
      return { createdAt: order };
    case "updatedAt":
      return { updatedAt: order };
    case "lastSyncedAt":
      return { lastSyncedAt: order };
  }
}

function toListItem(provider: {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  apiUrl: string;
  apiKey: string;
  status: SmmProviderStatus;
  isDefault: boolean;
  lastSyncedAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { services: number };
}): SmmProviderListItemDto {
  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    description: provider.description,
    apiUrl: provider.apiUrl,
    apiKeyMasked: maskApiKey(provider.apiKey),
    status: provider.status,
    isDefault: provider.isDefault,
    servicesCount: provider._count.services,
    lastSyncedAt: provider.lastSyncedAt?.toISOString() ?? null,
    lastError: provider.lastError,
    createdAt: provider.createdAt.toISOString(),
    updatedAt: provider.updatedAt.toISOString(),
  };
}

export async function getSmmProvidersPage(
  input: ProvidersListQuery,
): Promise<SmmProvidersPageResult> {
  const where: Prisma.SmmProviderWhereInput = {};

  if (input.q) {
    where.OR = [
      { name: { contains: input.q, mode: "insensitive" } },
      { slug: { contains: input.q, mode: "insensitive" } },
      { apiUrl: { contains: input.q, mode: "insensitive" } },
      { description: { contains: input.q, mode: "insensitive" } },
    ];
  }

  if (input.status) {
    where.status = input.status;
  }

  const skip = (input.page - 1) * input.pageSize;

  const [total, providers] = await prisma.$transaction([
    prisma.smmProvider.count({ where }),
    prisma.smmProvider.findMany({
      where,
      orderBy: buildOrderBy(input.sort, input.order),
      skip,
      take: input.pageSize,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        apiUrl: true,
        apiKey: true,
        status: true,
        isDefault: true,
        lastSyncedAt: true,
        lastError: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { services: true } },
      },
    }),
  ]);

  return {
    items: providers.map(toListItem),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getSmmProviderById(
  id: string,
): Promise<SmmProviderDetailDto | null> {
  const provider = await prisma.smmProvider.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      apiUrl: true,
      apiKey: true,
      status: true,
      isDefault: true,
      lastSyncedAt: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { services: true } },
    },
  });

  if (!provider) {
    return null;
  }

  return {
    ...toListItem(provider),
    apiKey: provider.apiKey,
  };
}

export async function getSmmProviderServicesPage(
  providerId: string,
  input: ProviderServicesQuery,
): Promise<SmmServicesPageResult> {
  const where: Prisma.SmmServiceWhereInput = { providerId };

  if (input.servicesQuery) {
    where.OR = [
      { name: { contains: input.servicesQuery, mode: "insensitive" } },
      { type: { contains: input.servicesQuery, mode: "insensitive" } },
      { category: { contains: input.servicesQuery, mode: "insensitive" } },
    ];
  }

  if (input.servicesCategory) {
    where.category = {
      equals: input.servicesCategory,
      mode: "insensitive",
    };
  }

  const skip = (input.servicesPage - 1) * input.servicesPageSize;

  const [total, services] = await prisma.$transaction([
    prisma.smmService.count({ where }),
    prisma.smmService.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip,
      take: input.servicesPageSize,
      select: {
        id: true,
        remoteServiceId: true,
        name: true,
        type: true,
        category: true,
        rate: true,
        min: true,
        max: true,
        refill: true,
        cancel: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const items: SmmServiceDto[] = services.map((service) => ({
    id: service.id,
    remoteServiceId: service.remoteServiceId,
    name: service.name,
    type: service.type,
    category: service.category,
    rate: decimalToString(service.rate) ?? "0",
    min: service.min,
    max: service.max,
    refill: service.refill,
    cancel: service.cancel,
    isActive: service.isActive,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page: input.servicesPage,
    pageSize: input.servicesPageSize,
    totalPages: Math.max(1, Math.ceil(total / input.servicesPageSize)),
  };
}

export async function getSmmServiceCategories(
  providerId?: string,
): Promise<string[]> {
  const rows = await prisma.smmService.findMany({
    where: providerId ? { providerId } : undefined,
    distinct: ["category"],
    select: { category: true },
    orderBy: { category: "asc" },
  });

  return rows.map((row) => row.category);
}

function buildServicesOrderBy(
  sort: ServicesSortField,
  order: "asc" | "desc",
): Prisma.SmmServiceOrderByWithRelationInput {
  switch (sort) {
    case "name":
      return { name: order };
    case "category":
      return { category: order };
    case "rate":
      return { rate: order };
    case "remoteServiceId":
      return { remoteServiceId: order };
    case "createdAt":
      return { createdAt: order };
    case "updatedAt":
      return { updatedAt: order };
  }
}

function buildServicesWhere(
  input: Pick<
    ServicesListQuery,
    "providerId" | "category" | "isActive" | "q"
  >,
): Prisma.SmmServiceWhereInput {
  const where: Prisma.SmmServiceWhereInput = {};

  if (input.providerId) {
    where.providerId = input.providerId;
  }

  if (input.category) {
    where.category = {
      equals: input.category,
      mode: "insensitive",
    };
  }

  if (input.isActive === "true") {
    where.isActive = true;
  } else if (input.isActive === "false") {
    where.isActive = false;
  }

  if (input.q) {
    const or: Prisma.SmmServiceWhereInput[] = [
      { name: { contains: input.q, mode: "insensitive" } },
      { type: { contains: input.q, mode: "insensitive" } },
      { category: { contains: input.q, mode: "insensitive" } },
      { provider: { name: { contains: input.q, mode: "insensitive" } } },
      { provider: { slug: { contains: input.q, mode: "insensitive" } } },
    ];

    const remoteId = Number.parseInt(input.q, 10);
    if (Number.isFinite(remoteId) && String(remoteId) === input.q.trim()) {
      or.push({ remoteServiceId: remoteId });
    }

    where.OR = or;
  }

  return where;
}

const smmServiceListSelect = {
  id: true,
  providerId: true,
  remoteServiceId: true,
  name: true,
  type: true,
  category: true,
  rate: true,
  min: true,
  max: true,
  refill: true,
  cancel: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  provider: {
    select: {
      name: true,
      slug: true,
      apiUrl: true,
    },
  },
} as const;

function mapServiceListItem(service: {
  id: string;
  providerId: string;
  remoteServiceId: number;
  name: string;
  type: string;
  category: string;
  rate: { toString(): string };
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  provider: { name: string; slug: string; apiUrl: string };
}): SmmServiceListItemDto {
  return {
    id: service.id,
    providerId: service.providerId,
    providerName: service.provider.name,
    providerSlug: service.provider.slug,
    providerApiUrl: service.provider.apiUrl,
    remoteServiceId: service.remoteServiceId,
    name: service.name,
    type: service.type,
    category: service.category,
    rate: decimalToString(service.rate) ?? "0",
    min: service.min,
    max: service.max,
    refill: service.refill,
    cancel: service.cancel,
    isActive: service.isActive,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export async function getSmmProviderOptions(): Promise<SmmProviderOptionDto[]> {
  return prisma.smmProvider.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function getSmmServicesPage(
  input: ServicesListQuery,
): Promise<SmmServicesListPageResult> {
  const where = buildServicesWhere(input);
  const skip = (input.page - 1) * input.pageSize;

  const [total, services] = await prisma.$transaction([
    prisma.smmService.count({ where }),
    prisma.smmService.findMany({
      where,
      orderBy: buildServicesOrderBy(input.sort, input.order),
      skip,
      take: input.pageSize,
      select: smmServiceListSelect,
    }),
  ]);

  return {
    items: services.map(mapServiceListItem),
    total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
  };
}

export async function getSmmServiceIdsForQuery(
  input: ServicesListQuery,
  limit: number,
): Promise<SmmServiceListItemDto[]> {
  const where = buildServicesWhere(input);
  const services = await prisma.smmService.findMany({
    where,
    orderBy: buildServicesOrderBy(input.sort, input.order),
    take: limit,
    select: smmServiceListSelect,
  });

  return services.map(mapServiceListItem);
}

export async function getSmmServicesByIds(
  ids: string[],
): Promise<SmmServiceListItemDto[]> {
  if (ids.length === 0) {
    return [];
  }

  const BATCH_SIZE = 1000;
  const result: SmmServiceListItemDto[] = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batchIds = ids.slice(i, i + BATCH_SIZE);
    const services = await prisma.smmService.findMany({
      where: { id: { in: batchIds } },
      select: smmServiceListSelect,
    });

    const byId = new Map(services.map((service) => [service.id, service]));
    result.push(
      ...batchIds
        .map((id) => byId.get(id))
        .filter((service): service is NonNullable<typeof service> => Boolean(service))
        .map(mapServiceListItem),
    );
  }

  return result;
}
