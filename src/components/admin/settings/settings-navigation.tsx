"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import {
  SETTINGS_SECTIONS,
  SETTINGS_SECTION_META,
  settingsHref,
  type SettingsSection,
} from "@/lib/settings/sections";

export function SettingsNavigation({ active }: { active: SettingsSection }) {
  const router = useRouter();

  return (
    <nav aria-label="Secciones de ajustes" className="w-full">
      <label className="grid gap-1.5 lg:hidden">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Sección
        </span>
        <select
          className="h-9 w-full rounded-sm border border-border/80 bg-muted/10 px-3 font-mono text-xs outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-inner"
          value={active}
          onChange={(event) => {
            const section = event.currentTarget.value as SettingsSection;
            router.push(settingsHref(section));
          }}
        >
          {SETTINGS_SECTIONS.map((section) => (
            <option key={section} value={section} className="bg-background text-foreground">
              {SETTINGS_SECTION_META[section].title}
            </option>
          ))}
        </select>
      </label>

      <ul className="hidden flex-col gap-1 lg:flex">
        {SETTINGS_SECTIONS.map((section) => {
          const meta = SETTINGS_SECTION_META[section];
          const isActive = section === active;
          return (
            <li key={section}>
              <Link
                href={settingsHref(section)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-sm border px-3 py-2 text-sm font-mono transition-all",
                  isActive
                    ? "border-border bg-sidebar-accent text-primary border-l-2 border-l-primary font-bold pl-4"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/30 hover:text-foreground",
                )}
              >
                {meta.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
