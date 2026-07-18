import type { ReactNode } from "react";

import { SettingsNavigation } from "@/components/admin/settings/settings-navigation";
import {
  SETTINGS_SECTION_META,
  type SettingsSection,
} from "@/lib/settings/sections";

export function SettingsShell({
  active,
  children,
}: {
  active: SettingsSection;
  children: ReactNode;
}) {
  const meta = SETTINGS_SECTION_META[active];

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
      <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-56">
        <SettingsNavigation active={active} />
      </aside>

      <div className="min-w-0 flex-1 max-w-3xl">
        {active !== "overview" ? (
          <header className="mb-6 max-w-2xl border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-primary font-bold px-1.5 py-0.5 border border-primary bg-primary/10 rounded-sm select-none">
                CFG_SECTION
              </span>
              <h1 className="font-mono text-lg font-bold uppercase tracking-tight">
                {meta.title}
              </h1>
            </div>
            <p className="mt-1.5 font-mono text-xs text-muted-foreground">
              {meta.description}
            </p>
          </header>
        ) : null}
        {children}
      </div>
    </div>
  );
}
