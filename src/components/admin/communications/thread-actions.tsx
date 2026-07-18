"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { assignThreadAction, markThreadReadAction, updateThreadStatusAction } from "@/lib/actions/admin-email";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

export function ThreadActions({ threadId, status, unreadCount, assignedUserId, admins }: { threadId: string; status: string; unreadCount: number; assignedUserId: string | null; admins: Array<{ id: string; name: string; email: string }> }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  function run(action: Promise<{ success: boolean; message?: string }>) { startTransition(async () => { const result = await action; if (!result.success) toast.error(result.message ?? "No se pudo completar la acción."); else { toast.success("Conversación actualizada"); router.refresh(); } }); }
  return <div className="flex flex-wrap items-center gap-2"><NativeSelect aria-label="Asignar conversación" value={assignedUserId ?? ""} disabled={pending} onChange={(e) => run(assignThreadAction({ threadId, assignedUserId: e.target.value || null }))}><NativeSelectOption value="">Sin asignar</NativeSelectOption>{admins.map((admin) => <NativeSelectOption key={admin.id} value={admin.id}>{admin.name} · {admin.email}</NativeSelectOption>)}</NativeSelect><NativeSelect aria-label="Estado de conversación" value={status} disabled={pending} onChange={(e) => run(updateThreadStatusAction({ threadId, status: e.target.value }))}><NativeSelectOption value="OPEN">Requiere revisión</NativeSelectOption><NativeSelectOption value="PENDING">Esperando al usuario</NativeSelectOption><NativeSelectOption value="RESOLVED">Resuelta</NativeSelectOption><NativeSelectOption value="ARCHIVED">Archivada</NativeSelectOption><NativeSelectOption value="SPAM">Correo no deseado</NativeSelectOption></NativeSelect><Button size="sm" variant="outline" disabled={pending} onClick={() => run(markThreadReadAction({ threadId, read: unreadCount > 0 }))}>{unreadCount > 0 ? "Marcar como leída" : "Marcar no leída"}</Button></div>;
}
