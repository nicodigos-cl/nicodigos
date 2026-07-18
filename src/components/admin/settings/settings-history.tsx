import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format-date";
import { SETTINGS_SECTION_META } from "@/lib/settings/sections";
import type { SettingsChangeEntry, SettingsHistoryItem } from "@/types/settings";

function sectionLabel(section: string): string {
  if (section in SETTINGS_SECTION_META) {
    return SETTINGS_SECTION_META[
      section as keyof typeof SETTINGS_SECTION_META
    ].title;
  }
  return section;
}

function resultVariant(
  result: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (result === "success") return "secondary";
  if (result === "failure") return "destructive";
  return "outline";
}

function resultLabel(result: string): string {
  if (result === "success") return "Éxito";
  if (result === "failure") return "Fallo";
  return result;
}

function isSensitiveKey(key: string): boolean {
  return /secret|apikey|api_key|password|token|credential/i.test(key);
}

function formatChange(entry: SettingsChangeEntry): string {
  if (isSensitiveKey(entry.key)) {
    return entry.key;
  }
  return `${entry.key}: ${String(entry.from ?? "—")} → ${String(entry.to ?? "—")}`;
}

export function SettingsHistory({ items }: { items: SettingsHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-border/80 p-6 text-center font-mono text-xs text-muted-foreground bg-muted/5">
        <p className="font-bold uppercase tracking-wider text-muted-foreground">[HISTORIAL: VACÍO]</p>
        <p className="mt-1 text-[10px] text-muted-foreground/80 leading-relaxed">
          Los cambios en ajustes aparecerán aquí cuando se guarden o se ejecuten pruebas de conexión.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="hidden divide-y divide-border/80 rounded-sm border border-border/80 bg-muted/5 lg:block">
        {items.map((item) => (
          <li key={item.id} className="px-4 py-3.5 sm:px-5">
            <HistoryRow item={item} layout="desktop" />
          </li>
        ))}
      </ul>

      <ul className="grid gap-3 lg:hidden">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-sm border border-border/80 bg-muted/5 p-4"
          >
            <HistoryRow item={item} layout="mobile" />
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryRow({
  item,
  layout,
}: {
  item: SettingsHistoryItem;
  layout: "desktop" | "mobile";
}) {
  return (
    <div className="space-y-2 text-xs font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <time
          dateTime={item.createdAt}
          className="text-[10px] text-muted-foreground"
        >
          {formatDateTime(item.createdAt)}
        </time>
        <Badge
          variant={resultVariant(item.result)}
          className="rounded-sm font-mono text-[9px] tracking-wider uppercase px-1.5 py-0.5 h-auto border-border/50"
        >
          {resultLabel(item.result).toUpperCase()}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-foreground">{sectionLabel(item.section).toUpperCase()}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground font-semibold">
          {item.action.toUpperCase()}
        </span>
      </div>

      {item.actorEmail ? (
        <p className="text-[10px] text-muted-foreground">[ACTOR: {item.actorEmail}]</p>
      ) : null}

      {item.message ? (
        <p className="text-xs text-foreground bg-background/30 p-2 rounded-sm border border-border/40 leading-relaxed font-sans">{item.message}</p>
      ) : null}

      {item.changes && item.changes.length > 0 ? (
        <ul
          className={
            layout === "desktop"
              ? "flex flex-wrap gap-1.5"
              : "grid gap-1.5"
          }
        >
          {item.changes.map((change) => (
            <li key={`${item.id}-${change.key}`}>
              <Badge
                variant="outline"
                className="font-mono text-[10px] rounded-sm border-border/60 bg-background/50 py-0.5 px-1.5"
              >
                {formatChange(change)}
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
