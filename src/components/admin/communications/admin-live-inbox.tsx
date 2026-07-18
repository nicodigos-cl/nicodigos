"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSupportLiveSocket } from "@/components/dashboard/support/use-support-live-socket";
import {
  markLiveThreadReadAction,
  sendLiveMessageAction,
  updateLiveThreadStatusAction,
} from "@/lib/support-live/actions";
import type {
  SupportLiveMessagePayload,
  SupportLiveThreadPayload,
} from "@/lib/support-live/events";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  OPEN: "Abierta",
  PENDING: "Esperando cliente",
  RESOLVED: "Resuelta",
  ARCHIVED: "Archivada",
};

type Props = {
  threads: SupportLiveThreadPayload[];
  activeThread: SupportLiveThreadPayload | null;
  initialMessages: SupportLiveMessagePayload[];
};

export function AdminLiveInbox({
  threads: initialThreads,
  activeThread,
  initialMessages,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [threads, setThreads] = useState(initialThreads);
  const [messages, setMessages] = useState(initialMessages);
  const [composer, setComposer] = useState("");
  const [typingLabel, setTypingLabel] = useState<string | null>(null);

  useEffect(() => setThreads(initialThreads), [initialThreads]);
  useEffect(() => setMessages(initialMessages), [initialMessages]);

  useEffect(() => {
    if (!activeThread) return;
    void markLiveThreadReadAction({ threadId: activeThread.id });
  }, [activeThread?.id]);

  const { state, sendTyping } = useSupportLiveSocket({
    enabled: true,
    threadId: activeThread?.id,
    onEvent: (event) => {
      if (event.type === "message.new" || event.type === "thread.updated") {
        setThreads((prev) => {
          const without = prev.filter((t) => t.id !== event.thread.id);
          return [event.thread, ...without];
        });
      }
      if (
        event.type === "message.new" &&
        activeThread &&
        event.threadId === activeThread.id
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === event.message.id)) return prev;
          return [...prev, event.message];
        });
        setTypingLabel(null);
      }
      if (
        event.type === "typing" &&
        activeThread &&
        event.threadId === activeThread.id &&
        event.role === "USER"
      ) {
        setTypingLabel(`${event.actorName} está escribiendo…`);
        window.setTimeout(() => setTypingLabel(null), 2500);
      }
    },
  });

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-medium">Cola en vivo</p>
          <p className="text-xs text-muted-foreground">
            {state === "connected" ? "Conectado" : "Reconectando…"}
          </p>
        </div>
        <ul className="divide-y divide-border">
          {threads.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">
              No hay conversaciones live.
            </li>
          ) : (
            threads.map((thread) => {
              const active = activeThread?.id === thread.id;
              return (
                <li key={thread.id}>
                  <Link
                    href={`/admin/communications/live/${thread.id}`}
                    className={cn(
                      "block p-4 transition-colors hover:bg-muted/40",
                      active && "bg-primary/5",
                      thread.unreadCount > 0 && "border-l-4 border-l-primary",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">
                        {thread.userName ?? thread.userEmail ?? "Cliente"}
                      </p>
                      {thread.unreadCount > 0 ? (
                        <Badge>{thread.unreadCount}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-sm">{thread.subject}</p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {thread.lastMessagePreview ?? "Sin mensajes"}
                    </p>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </aside>

      <section className="flex min-h-[32rem] flex-col rounded-2xl border border-border bg-card">
        {!activeThread ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            Selecciona una conversación para responder en vivo.
          </div>
        ) : (
          <>
            <header className="space-y-3 border-b border-border p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="font-heading text-lg font-semibold">
                    {activeThread.subject}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {activeThread.userName} · {activeThread.userEmail}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {statusLabels[activeThread.status] ?? activeThread.status}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(() => {
                        void (async () => {
                          const result = await updateLiveThreadStatusAction({
                            threadId: activeThread.id,
                            status: "RESOLVED",
                          });
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          toast.success("Conversación resuelta");
                          router.refresh();
                        })();
                      });
                    }}
                  >
                    Resolver
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(() => {
                        void (async () => {
                          const result = await updateLiveThreadStatusAction({
                            threadId: activeThread.id,
                            status: "OPEN",
                          });
                          if (!result.success) {
                            toast.error(result.message);
                            return;
                          }
                          router.refresh();
                        })();
                      });
                    }}
                  >
                    Reabrir
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {activeThread.orderId ? (
                  <Link
                    className="hover:text-primary"
                    href={`/admin/orders/${activeThread.orderId}`}
                  >
                    Pedido {activeThread.orderId.slice(-8).toUpperCase()}
                  </Link>
                ) : (
                  <span>Sin pedido</span>
                )}
                {activeThread.deliveryId ? (
                  <Link
                    className="hover:text-primary"
                    href={`/admin/deliveries/${activeThread.deliveryId}`}
                  >
                    Entrega {activeThread.deliveryId.slice(-8).toUpperCase()}
                  </Link>
                ) : null}
              </div>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => {
                const fromAdmin = message.direction === "OUTBOUND";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      fromAdmin ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        fromAdmin
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted",
                      )}
                    >
                      <p className="text-xs opacity-70">
                        {fromAdmin
                          ? "Nicodigos"
                          : message.fromName || message.fromAddress || "Cliente"}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">
                        {message.textContent}
                      </p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {new Intl.DateTimeFormat("es-CL", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(message.createdAt))}
                      </p>
                    </div>
                  </div>
                );
              })}
              {typingLabel ? (
                <p className="text-xs text-muted-foreground">{typingLabel}</p>
              ) : null}
            </div>

            <form
              className="border-t border-border p-3"
              onSubmit={(event) => {
                event.preventDefault();
                const text = composer.trim();
                if (!text) return;
                startTransition(() => {
                  void (async () => {
                    const result = await sendLiveMessageAction({
                      threadId: activeThread.id,
                      message: text,
                    });
                    if (!result.success) {
                      toast.error(result.message);
                      return;
                    }
                    setComposer("");
                    router.refresh();
                  })();
                });
              }}
            >
              <div className="flex gap-2">
                <Input
                  value={composer}
                  onChange={(e) => {
                    setComposer(e.target.value);
                    sendTyping();
                  }}
                  placeholder="Responder al cliente…"
                  disabled={pending}
                  className="h-10"
                />
                <Button type="submit" disabled={pending || !composer.trim()}>
                  Enviar
                </Button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
