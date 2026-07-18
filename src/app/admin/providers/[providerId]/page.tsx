import { notFound, redirect } from "next/navigation";

import { ProviderForm } from "@/components/admin/smm-providers/provider-form";
import { ProviderServicesManager } from "@/components/admin/smm-providers/provider-services-manager";
import {
  getSmmProviderById,
  getSmmProviderServicesPage,
  getSmmServiceCategories,
} from "@/lib/smm-providers/queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { providerServicesQuerySchema } from "@/lib/validations/smm-providers";

type ProviderEditPageProps = {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ProviderEditPage({
  params,
  searchParams,
}: ProviderEditPageProps) {
  const { providerId } = await params;
  const rawParams = parseSearchParamsRecord(await searchParams);
  const servicesQuery = providerServicesQuerySchema.safeParse(rawParams);

  if (!servicesQuery.success) {
    redirect(`/admin/providers/${providerId}`);
  }

  const [provider, servicesPage, categories] = await Promise.all([
    getSmmProviderById(providerId),
    getSmmProviderServicesPage(providerId, servicesQuery.data),
    getSmmServiceCategories(providerId),
  ]);

  if (!provider) {
    notFound();
  }

  if (
    servicesPage.total > 0 &&
    servicesQuery.data.servicesPage > servicesPage.totalPages
  ) {
    const paramsNext = new URLSearchParams();
    paramsNext.set("servicesPage", String(servicesPage.totalPages));
    if (servicesQuery.data.servicesPageSize !== 20) {
      paramsNext.set(
        "servicesPageSize",
        String(servicesQuery.data.servicesPageSize),
      );
    }
    if (servicesQuery.data.servicesQuery) {
      paramsNext.set("servicesQuery", servicesQuery.data.servicesQuery);
    }
    if (servicesQuery.data.servicesCategory) {
      paramsNext.set("servicesCategory", servicesQuery.data.servicesCategory);
    }
    redirect(`/admin/providers/${providerId}?${paramsNext.toString()}`);
  }

  return (
    <ProviderForm
      mode="edit"
      provider={provider}
      servicesSlot={
        <ProviderServicesManager
          providerId={provider.id}
          servicesPage={servicesPage}
          query={servicesQuery.data}
          categories={categories}
        />
      }
    />
  );
}
