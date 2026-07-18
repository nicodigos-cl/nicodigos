import { CheckoutSettingsForm } from "@/components/admin/settings/checkout-settings-form";
import { DeliverySettingsForm } from "@/components/admin/settings/delivery-settings-form";
import { EmailSettingsForm } from "@/components/admin/settings/email-settings-form";
import { GeneralSettingsForm } from "@/components/admin/settings/general-settings-form";
import { IntegrationsPanel } from "@/components/admin/settings/integrations-panel";
import { MaintenanceSettingsForm } from "@/components/admin/settings/maintenance-settings-form";
import { PaymentSettingsForm } from "@/components/admin/settings/payment-settings-form";
import { ProviderSettings } from "@/components/admin/settings/provider-settings";
import { SecuritySettingsForm } from "@/components/admin/settings/security-settings-form";
import { SettingsOverview } from "@/components/admin/settings/settings-overview";
import { SettingsShell } from "@/components/admin/settings/settings-shell";
import { StoreSettingsForm } from "@/components/admin/settings/store-settings-form";
import { requireAdminSession } from "@/lib/auth/session";
import {
  getAdminSettingsOverview,
  getSettingsHistory,
} from "@/lib/settings/integrations";
import { getStoreSettings } from "@/lib/settings/queries";
import { parseSettingsSection } from "@/lib/settings/sections";
import prisma from "@/lib/prisma";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminSession();
  const params = await searchParams;
  const section = parseSettingsSection(params.section);

  const [overview, history, settings] = await Promise.all([
    getAdminSettingsOverview(),
    getSettingsHistory(40),
    getStoreSettings(),
  ]);

  let providers: Array<{
    id: string;
    name: string;
    status: string;
    isDefault: boolean;
    lastSyncedAt: string | null;
    lastError: string | null;
    productCount: number;
  }> = [];

  if (section === "providers") {
    const rows = await prisma.smmProvider.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        status: true,
        isDefault: true,
        lastSyncedAt: true,
        lastError: true,
        _count: { select: { services: true } },
      },
    });

    providers = rows.map((row) => ({
      id: row.id,
      name: row.name,
      status: row.status,
      isDefault: row.isDefault,
      lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
      lastError: row.lastError,
      productCount: row._count.services,
    }));
  }

  return (
    <SettingsShell active={section}>
      {section === "overview" ? (
        <SettingsOverview overview={overview} history={history} />
      ) : null}
      {section === "general" ? (
        <GeneralSettingsForm settings={settings} />
      ) : null}
      {section === "store" ? <StoreSettingsForm settings={settings} /> : null}
      {section === "checkout" ? (
        <CheckoutSettingsForm settings={settings} />
      ) : null}
      {section === "payments" ? (
        <PaymentSettingsForm settings={settings} />
      ) : null}
      {section === "deliveries" ? (
        <DeliverySettingsForm settings={settings} />
      ) : null}
      {section === "email" ? <EmailSettingsForm settings={settings} /> : null}
      {section === "providers" ? (
        <ProviderSettings providers={providers} />
      ) : null}
      {section === "security" ? (
        <SecuritySettingsForm
          settings={settings}
          adminCount={overview.adminCount}
          envAdminCount={overview.envAdminCount}
        />
      ) : null}
      {section === "integrations" ? (
        <IntegrationsPanel overview={overview} />
      ) : null}
      {section === "maintenance" ? (
        <MaintenanceSettingsForm settings={settings} />
      ) : null}
    </SettingsShell>
  );
}
