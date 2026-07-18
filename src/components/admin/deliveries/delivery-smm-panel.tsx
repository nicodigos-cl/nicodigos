"use client";

import { formatDateTime } from "@/lib/format-date";
import type { DeliverySmmDto } from "@/types/deliveries";

function Row({ label, value }: { label: string; value: string | number | null }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="max-w-[60%] break-all text-right font-medium">{value}</dd>
    </div>
  );
}

export function DeliverySmmPanel({ smm }: { smm: DeliverySmmDto }) {
  return (
    <dl>
      <Row label="Link" value={smm.link} />
      <Row label="Username" value={smm.username} />
      <Row label="Cantidad" value={smm.quantity} />
      <Row label="Comentarios" value={smm.comments} />
      <Row label="Runs" value={smm.runs} />
      <Row label="Intervalo (min)" value={smm.intervalMinutes} />
      <Row label="Usernames" value={smm.usernames} />
      <Row label="Hashtags" value={smm.hashtags} />
      <Row label="Media URL" value={smm.mediaUrl} />
      <Row label="Min" value={smm.min} />
      <Row label="Max" value={smm.max} />
      <Row label="Delay (min)" value={smm.delayMinutes} />
      <Row label="Posts" value={smm.posts} />
      <Row label="Old posts" value={smm.oldPosts} />
      <Row label="Expiry" value={smm.expiry} />
      <Row label="Answer number" value={smm.answerNumber} />
      <Row label="ID remoto" value={smm.remoteOrderId} />
      <Row label="Estado remoto" value={smm.remoteStatus} />
      <Row
        label="Cargo"
        value={
          smm.charge
            ? `${smm.charge}${smm.currency ? ` ${smm.currency}` : ""}`
            : null
        }
      />
      <Row label="Start count" value={smm.startCount} />
      <Row label="Remains" value={smm.remains} />
      <Row label="Refill ID" value={smm.refillId} />
      <Row
        label="Última sync"
        value={smm.lastSyncedAt ? formatDateTime(smm.lastSyncedAt) : null}
      />
      <Row label="Error" value={smm.errorMessage} />
    </dl>
  );
}
