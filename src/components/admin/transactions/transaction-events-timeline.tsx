import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format-date";
import type { TransactionEventDto } from "@/types/transactions";

export function TransactionEventsTimeline({ events }: { events: TransactionEventDto[] }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No hay eventos registrados para esta transacción histórica.</p>;
  return <ol className="relative space-y-4 border-l border-border pl-5">{events.map((event) => <li key={event.id} className="relative"><span className="absolute -left-[1.55rem] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-card" /><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{event.type.replaceAll("_", " ")}</p><Badge variant={event.result === "FAILED" ? "destructive" : "outline"}>{event.result}</Badge><Badge variant="secondary">{event.source}</Badge></div><p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}{event.actorEmail ? ` · ${event.actorEmail}` : ""}</p>{event.message ? <p className="mt-1 text-sm text-muted-foreground">{event.message}</p> : null}</li>)}</ol>;
}
