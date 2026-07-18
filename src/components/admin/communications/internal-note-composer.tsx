"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInternalNoteAction } from "@/lib/actions/admin-email";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
export function InternalNoteComposer({ threadId }: { threadId: string }) { const [content, setContent] = useState(""); const [pending, startTransition] = useTransition(); const router = useRouter(); return <form className="space-y-2 rounded-xl border border-amber-300/60 bg-amber-50/50 p-4 dark:bg-amber-950/10" onSubmit={(e) => { e.preventDefault(); startTransition(async () => { const result = await createInternalNoteAction({ threadId, content }); if (!result.success) toast.error(result.message); else { toast.success("Nota interna guardada"); setContent(""); router.refresh(); } }); }}><Label htmlFor="internal-note">Nota interna</Label><Textarea id="internal-note" value={content} onChange={(e) => setContent(e.target.value)} required rows={3} disabled={pending} placeholder="Solo visible para administradores. No incluyas passwords, keys ni tokens." /><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Nunca se envía por email.</p><Button type="submit" size="sm" variant="outline" disabled={pending}>{pending ? "Guardando…" : "Agregar nota"}</Button></div></form>; }
