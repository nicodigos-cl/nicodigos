import { normalizePlatformKey } from "@/lib/store/platform-icons";

/** Platform badge Tailwind classes used across storefront grids. */
export const platformBadgeStyles: Record<string, string> = {
  steam:
    "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400 dark:border-sky-500/30",
  xbox: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  playstation:
    "bg-blue-600/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  ps4: "bg-blue-600/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  ps5: "bg-blue-600/10 text-blue-600 border-blue-500/20 dark:text-blue-400 dark:border-blue-500/30",
  nintendo:
    "bg-rose-600/10 text-rose-600 border-rose-500/20 dark:text-rose-400 dark:border-rose-500/30",
  epic: "bg-slate-500/10 text-slate-600 border-slate-500/20 dark:text-slate-300",
  gog: "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
  origin:
    "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  ubisoft: "bg-sky-600/10 text-sky-700 border-sky-500/20 dark:text-sky-300",
  battlenet:
    "bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400",
  rockstar:
    "bg-yellow-500/10 text-yellow-700 border-yellow-500/20 dark:text-yellow-400",
  activision:
    "bg-neutral-500/10 text-neutral-700 border-neutral-500/20 dark:text-neutral-300",
  ea: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:text-orange-400",
  android: "bg-lime-500/10 text-lime-600 border-lime-500/20 dark:text-lime-400",
  apple: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 dark:text-zinc-300",
  other: "bg-muted text-muted-foreground border-border/20",
};

export function platformBadgeClass(platform: string): string {
  const key = normalizePlatformKey(platform);
  return platformBadgeStyles[key] ?? platformBadgeStyles.other;
}
