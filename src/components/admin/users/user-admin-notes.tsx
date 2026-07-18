"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  deleteUserAdminNoteAction,
  reopenUserAdminNoteAction,
  resolveUserAdminNoteAction,
} from "@/lib/actions/users";
import { formatDateTime } from "@/lib/format-date";
import {
  userAdminNoteCategoryLabel,
  userAdminNotePriorityLabel,
} from "@/lib/validations/users";
import type { UserAdminNoteDto } from "@/types/users";

export function UserAdminNotes({ notes }: { notes: UserAdminNoteDto[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay notas administrativas.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notes.map((note) => (
        <li key={note.id} className="rounded-xl border border-border p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              {userAdminNoteCategoryLabel[note.category]}
            </Badge>
            <Badge variant="outline">
              {userAdminNotePriorityLabel[note.priority]}
            </Badge>
            {note.resolvedAt ? (
              <Badge variant="outline">Resuelta</Badge>
            ) : (
              <Badge variant="destructive">Activa</Badge>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap">{note.content}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {note.authorEmail ?? "Sistema"} · {formatDateTime(note.createdAt)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {note.resolvedAt ? (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void (async () => {
                      const result = await reopenUserAdminNoteAction({
                        noteId: note.id,
                      });
                      if (!result.success) return toast.error(result.message);
                      toast.success("Nota reabierta");
                      router.refresh();
                    })();
                  })
                }
              >
                Reabrir
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(() => {
                    void (async () => {
                      const result = await resolveUserAdminNoteAction({
                        noteId: note.id,
                      });
                      if (!result.success) return toast.error(result.message);
                      toast.success("Nota resuelta");
                      router.refresh();
                    })();
                  })
                }
              >
                Resolver
              </Button>
            )}
            <Button
              size="xs"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  void (async () => {
                    const result = await deleteUserAdminNoteAction({
                      noteId: note.id,
                      confirmation: "ELIMINAR_NOTA",
                    });
                    if (!result.success) return toast.error(result.message);
                    toast.success("Nota eliminada");
                    router.refresh();
                  })();
                })
              }
            >
              Eliminar
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
