"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { getCommunicationAttachmentDownloadAction } from "@/lib/actions/communication-attachments";
import { Button } from "@/components/ui/button";
export function AttachmentDownload({ id, label }: { id: string; label: string }) { const [pending, startTransition] = useTransition(); return <Button size="sm" variant="outline" disabled={pending} aria-label={`Descargar ${label}`} onClick={() => startTransition(async () => { const result = await getCommunicationAttachmentDownloadAction({ attachmentId: id }); if (!result.success) toast.error(result.message); else window.open(result.data.url, "_blank", "noopener,noreferrer"); })}>{pending ? "Preparando…" : "Descargar"}</Button>; }
