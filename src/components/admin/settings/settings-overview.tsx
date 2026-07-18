import Link from "next/link";
import { HiOutlineExclamation } from "react-icons/hi";

import { IntegrationStatusCard } from "@/components/admin/settings/integration-status-card";
import { SettingsHistory } from "@/components/admin/settings/settings-history";
import { TestConnectionButton } from "@/components/admin/settings/test-connection-button";
import { Button } from "@/components/ui/button";
import {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_META,
  settingsHref,
} from "@/lib/settings/sections";
import type { AdminSettingsOverview, SettingsHistoryItem } from "@/types/settings";

export function SettingsOverview({
  overview,
  history,
}: {
  overview: AdminSettingsOverview;
  history: SettingsHistoryItem[];
}) {
  const quickSections = SETTINGS_SECTIONS.filter(
    (section) => section !== "overview",
  );

  return (
    <div className="space-y-8">
      <header className="max-w-2xl border-b border-border/40 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-primary font-bold px-1.5 py-0.5 border border-primary bg-primary/10 rounded-sm select-none">
            CFG_ROOT
          </span>
          <h1 className="font-mono text-lg font-bold uppercase tracking-tight">
            {SETTINGS_SECTION_META.overview.title}
          </h1>
        </div>
        <p className="mt-1.5 font-mono text-xs text-muted-foreground">
          {SETTINGS_SECTION_META.overview.description}
        </p>
      </header>

      {overview.warnings.length > 0 ? (
        <section
          role="alert"
          className="rounded-sm border border-amber-500/40 bg-amber-500/5 p-4 font-mono text-xs relative overflow-hidden"
        >
          <div className="flex gap-3">
            <span className="flex h-2 w-2 mt-1.5 shrink-0 rounded-full bg-amber-500 animate-pulse" />
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-600">
                [ALERT_WARNING: ADVERTENCIAS_OPERATIVAS]
              </h2>
              <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
                {overview.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3 font-mono text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Accesos rápidos</h2>
        <div className="flex flex-wrap gap-2">
          {quickSections.map((section) => (
            <Button
              key={section}
              size="sm"
              variant="outline"
              render={<Link href={settingsHref(section)} />}
              nativeButton={false}
              className="rounded-sm font-mono text-xs border border-border/60 hover:bg-muted/50"
            >
              {SETTINGS_SECTION_META[section].title.toUpperCase()}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-4 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">Estado de integraciones</h2>
          <div className="flex flex-wrap gap-2">
            <TestConnectionButton kind="flow" />
            <TestConnectionButton kind="resend" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {overview.integrations.map((item) => (
            <IntegrationStatusCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <section className="space-y-4 font-mono text-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-foreground font-mono">Historial reciente</h2>
        <SettingsHistory items={history} />
      </section>
    </div>
  );
}
