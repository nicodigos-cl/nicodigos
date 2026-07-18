import type { SmmProviderStatus } from "@/generated/prisma/client";

export type SmmProviderListItemDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  apiUrl: string;
  apiKeyMasked: string;
  status: SmmProviderStatus;
  isDefault: boolean;
  servicesCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SmmProvidersPageResult = {
  items: SmmProviderListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SmmServiceDto = {
  id: string;
  remoteServiceId: number;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: number;
  max: number;
  refill: boolean;
  cancel: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SmmServicesPageResult = {
  items: SmmServiceDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SmmProviderDetailDto = SmmProviderListItemDto & {
  apiKey: string;
};
