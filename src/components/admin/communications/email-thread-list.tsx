import Link from "next/link";
import { HiOutlinePaperClip } from "react-icons/hi2";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Thread = {
  id: string; subject: string; status: string; priority: string; category: string | null; unreadCount: number;
  lastMessageAt: string; assignedEmail: string | null; orderId: string | null; deliveryId: string | null;
  user: { id: string; name: string; email: string } | null; messageCount: number;
  lastMessage: { textContent: string; direction: string; fromAddress: string | null; fromName: string | null; hasAttachments: boolean } | null;
};
const statuses: Record<string, string> = { OPEN: "Requiere respuesta", PENDING: "Esperando al usuario", RESOLVED: "Resuelta", ARCHIVED: "Archivada", SPAM: "Correo no deseado" };
const priorities: Record<string, string> = { LOW: "Baja", NORMAL: "Normal", HIGH: "Alta", URGENT: "Urgente" };

export function EmailThreadList({ threads }: { threads: Thread[] }) {
  return <div className="overflow-hidden rounded-2xl border border-border bg-card">
    <ul className="divide-y divide-border">{threads.map((thread) => {
      const sender = thread.user?.name ?? thread.lastMessage?.fromName ?? thread.lastMessage?.fromAddress ?? "Remitente desconocido";
      return <li key={thread.id}><Link href={`/admin/communications/email/${thread.id}`} className={cn("block p-4 transition-colors hover:bg-muted/50", thread.unreadCount > 0 && "border-l-4 border-l-primary bg-primary/[0.03]")}>
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className={cn("truncate text-sm", thread.unreadCount > 0 && "font-semibold")}>{sender}</p>{thread.unreadCount > 0 ? <Badge>Sin leer · {thread.unreadCount}</Badge> : null}{thread.priority !== "NORMAL" ? <Badge variant="outline">{priorities[thread.priority]}</Badge> : null}{thread.lastMessage?.hasAttachments ? <HiOutlinePaperClip className="size-4 text-muted-foreground" aria-label="Tiene adjuntos" /> : null}</div><p className="mt-1 truncate text-sm font-medium">{thread.subject}</p><p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{thread.lastMessage?.textContent ?? "Sin mensajes"}</p></div><time dateTime={thread.lastMessageAt} className="shrink-0 text-xs text-muted-foreground">{new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short", timeZone: "America/Santiago" }).format(new Date(thread.lastMessageAt))}</time></div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="secondary">{statuses[thread.status]}</Badge><span>{thread.messageCount} mensaje{thread.messageCount === 1 ? "" : "s"}</span>{thread.orderId ? <span>Pedido · {thread.orderId.slice(-8).toUpperCase()}</span> : null}{thread.deliveryId ? <span>Entrega · {thread.deliveryId.slice(-8).toUpperCase()}</span> : null}<span>{thread.assignedEmail ? `Asignada a ${thread.assignedEmail}` : "Sin asignar"}</span></div>
      </Link></li>;
    })}</ul>
  </div>;
}
