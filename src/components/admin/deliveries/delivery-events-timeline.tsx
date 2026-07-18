import { DeliveryStatusBadge } from "@/components/admin/deliveries/delivery-status-badge";
import { formatDateTime } from "@/lib/format-date";
import type { DeliveryEventDto } from "@/types/deliveries";

export function DeliveryEventsTimeline({
  events,
}: {
  events: DeliveryEventDto[];
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
    );
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full bg-primary" />
          <div className="flex flex-wrap items-center gap-2">
            <DeliveryStatusBadge status={event.status} />
            <span className="text-xs text-muted-foreground">
              {formatDateTime(event.createdAt)}
            </span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {event.source}
            </span>
          </div>
          {event.message ? (
            <p className="mt-1 text-sm">{event.message}</p>
          ) : null}
          {event.actorEmail ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Por {event.actorEmail}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
