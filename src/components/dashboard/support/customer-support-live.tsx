"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, useRef } from "react";
import { toast } from "sonner";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlinePlus,
  HiOutlineClock,
} from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useSupportLiveSocket } from "@/components/dashboard/support/use-support-live-socket";
import {
  openLiveThreadAction,
  sendLiveMessageAction,
} from "@/lib/support-live/actions";
import type {
  SupportLiveMessagePayload,
  SupportLiveThreadPayload,
} from "@/lib/support-live/events";
import { formatCustomerOrderNumber } from "@/lib/customer-dashboard/format";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "soporte@nicodigos.cl";

const categoryLabels: Record<string, string> = {
  payment: "Pago",
  delivery: "Entrega",
  key: "Clave/Licencia",
  smm: "Servicio SMM",
  refund: "Reembolso",
  account: "Cuenta",
  billing: "Facturación",
  other: "Soporte General",
};

type Props = {
  threads: SupportLiveThreadPayload[];
  activeThread: SupportLiveThreadPayload | null;
  initialMessages: SupportLiveMessagePayload[];
  orderId?: string;
  deliveryId?: string;
  category?: string;
};

export function CustomerSupportLive({
  threads: initialThreads,
  activeThread,
  initialMessages,
  orderId,
  deliveryId,
  category,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [threads, setThreads] = useState(initialThreads);
  const [prevInitialThreads, setPrevInitialThreads] = useState(initialThreads);
  if (initialThreads !== prevInitialThreads) {
    setPrevInitialThreads(initialThreads);
    setThreads(initialThreads);
  }

  const [messages, setMessages] = useState(initialMessages);
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages);
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages);
    setMessages(initialMessages);
  }

  const [composer, setComposer] = useState("");
  const [typingLabel, setTypingLabel] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(!activeThread && threads.length === 0);
  const [subject, setSubject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category ?? "other");
  const [firstMessage, setFirstMessage] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = (behavior: "auto" | "smooth" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom("auto");
  }, []);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [messages, typingLabel]);


  const { state, error, sendTyping } = useSupportLiveSocket({
    enabled: true,
    threadId: activeThread?.id,
    onEvent: (event) => {
      if (event.type === "message.new") {
        setThreads((prev) => {
          const without = prev.filter((t) => t.id !== event.thread.id);
          return [event.thread, ...without];
        });
        if (activeThread && event.threadId === activeThread.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === event.message.id)) return prev;
            return [...prev, event.message];
          });
          setTypingLabel(null);
        }
      }
      if (event.type === "thread.updated") {
        setThreads((prev) => {
          const without = prev.filter((t) => t.id !== event.thread.id);
          return [event.thread, ...without];
        });
      }
      if (
        event.type === "typing" &&
        activeThread &&
        event.threadId === activeThread.id &&
        event.role === "ADMIN"
      ) {
        setTypingLabel(`${event.actorName} está escribiendo…`);
        window.setTimeout(() => setTypingLabel(null), 2500);
      }
    },
  });

  const connectionLabel = useMemo(() => {
    if (state === "connected") return "Conectado";
    if (state === "connecting") return "Conectando…";
    if (state === "error") return error ?? "Sin conexión";
    return "Reconectando…";
  }, [state, error]);

  const connectionIndicator = useMemo(() => {
    if (state === "connected") {
      return (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
      );
    }
    if (state === "connecting") {
      return (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
      );
    }
    return (
      <span className="relative flex h-2 w-2">
        <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
      </span>
    );
  }, [state]);

  const formatThreadTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      if (date.toDateString() === now.toDateString()) {
        return new Intl.DateTimeFormat("es-CL", {
          timeStyle: "short",
        }).format(date);
      }
      return new Intl.DateTimeFormat("es-CL", {
        month: "short",
        day: "numeric",
      }).format(date);
    } catch {
      return "";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Sidebar - Thread list */}
      <aside className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="font-heading text-sm font-semibold text-foreground">
            Tus conversaciones
          </h2>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowNew(true)}
            className="h-8 gap-1 px-2.5 font-medium"
          >
            <HiOutlinePlus className="size-3.5" />
            <span>Nueva</span>
          </Button>
        </div>

        <div className="flex-1 overflow-hidden rounded-2xl border border-border bg-card">
          {threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <HiOutlineChatBubbleLeftRight className="size-8 text-muted-foreground/45 mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                Aún no tienes chats
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-[200px]">
                Inicia una consulta haciendo clic en &quot;Nueva&quot;.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {threads.map((thread) => {
                const isActive = activeThread?.id === thread.id && !showNew;
                return (
                  <li key={thread.id}>
                    <Link
                      href={`/dashboard/support?threadId=${thread.id}`}
                      className={cn(
                        "relative block p-4 transition-all hover:bg-muted/40",
                        isActive && "bg-primary/5",
                      )}
                      onClick={() => setShowNew(false)}
                    >
                      {/* Left active line indicator */}
                      {isActive && (
                        <span className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r" />
                      )}

                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground/85">
                          {categoryLabels[thread.category ?? ""] || "Soporte"}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                          {formatThreadTime(thread.lastMessageAt)}
                        </span>
                      </div>

                      <p
                        className={cn(
                          "truncate text-sm font-semibold text-foreground",
                          thread.unreadCount > 0 && "font-bold text-primary",
                        )}
                      >
                        {thread.subject}
                      </p>

                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="line-clamp-1 text-xs text-muted-foreground flex-1">
                          {thread.lastMessagePreview ?? "Sin mensajes aún"}
                        </p>
                        {thread.unreadCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground leading-relaxed">
          <span>¿No puedes conectar? También respondemos en </span>
          <a
            className="font-semibold text-primary hover:underline"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
        </div>
      </aside>

      {/* Main chat window container */}
      <section className="flex min-h-[30rem] flex-col rounded-2xl border border-border bg-card overflow-hidden">
        {activeThread ? (
          <>
            {/* Header */}
            <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 bg-muted/10">
              <div className="min-w-0">
                <p className="truncate font-heading text-base font-bold text-foreground">
                  {activeThread.subject}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {connectionIndicator}
                  <span className="text-xs font-semibold text-muted-foreground">
                    {connectionLabel}
                  </span>
                </div>
              </div>
              <div className="rounded-full bg-muted p-2 text-muted-foreground shrink-0">
                <HiOutlineChatBubbleLeftRight className="size-5" />
              </div>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5 min-h-[22rem]">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center h-full">
                  <HiOutlineClock className="size-8 text-muted-foreground/45 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    Cargando historial de mensajes...
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.direction === "INBOUND";
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex flex-col gap-1 max-w-[80%]",
                        isMine ? "ml-auto items-end" : "mr-auto items-start",
                      )}
                    >
                      {/* Name tag for agent */}
                      {!isMine && (
                        <span className="text-[10px] font-semibold text-muted-foreground/80 pl-1">
                          {message.fromName || "Soporte Nicodigos"}
                        </span>
                      )}
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm shadow-sm leading-relaxed",
                          isMine
                            ? "bg-primary text-primary-foreground rounded-tr-none"
                            : "bg-muted text-foreground rounded-tl-none border border-border/40",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.textContent}</p>
                        <p
                          className={cn(
                            "mt-1.5 text-[9px] text-right font-medium",
                            isMine
                              ? "text-primary-foreground/75"
                              : "text-muted-foreground",
                          )}
                        >
                          {new Intl.DateTimeFormat("es-CL", {
                            timeStyle: "short",
                          }).format(new Date(message.createdAt))}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {typingLabel && (
                <div className="flex items-center gap-2 rounded-2xl border border-border/40 bg-muted/30 px-3 py-2 text-xs text-muted-foreground max-w-fit rounded-tl-none mr-auto animate-pulse">
                  <span className="flex gap-1 shrink-0">
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  <span>{typingLabel}</span>
                </div>
              )}

              {/* Ref element for scroll anchoring */}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer footer */}
            <form
              className="border-t border-border/60 p-4 bg-muted/10"
              onSubmit={(event) => {
                event.preventDefault();
                const text = composer.trim();
                if (!text || !activeThread) return;
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
                  placeholder="Escribe un mensaje..."
                  disabled={pending}
                  className="h-10 bg-background"
                />
                <Button
                  type="submit"
                  disabled={pending || !composer.trim()}
                  className="gap-2 font-medium"
                >
                  <HiOutlinePaperAirplane className="size-4 rotate-90" />
                  <span>Enviar</span>
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/5 min-h-[22rem]">
            <HiOutlineChatBubbleLeftRight className="size-12 text-muted-foreground/35 mb-3" />
            <h3 className="text-sm font-semibold text-foreground">
              Ninguna conversación seleccionada
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[280px] leading-relaxed">
              Selecciona un chat en la barra lateral o presiona &quot;Nueva&quot; para iniciar una conversación con nuestro equipo.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowNew(true)}
              className="mt-5 gap-1.5 font-medium"
            >
              <HiOutlinePlus className="size-4" />
              <span>Nueva conversación</span>
            </Button>
          </div>
        )}
      </section>

      {/* Dialog for new conversation */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Completa los datos a continuación para iniciar un chat en vivo con soporte.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              startTransition(() => {
                void (async () => {
                  const result = await openLiveThreadAction({
                    subject,
                    message: firstMessage,
                    orderId,
                    deliveryId,
                    category: selectedCategory,
                  });
                  if (!result.success) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Conversación iniciada");
                  setShowNew(false);
                  setSubject("");
                  setFirstMessage("");
                  router.push(
                    `/dashboard/support?threadId=${result.data.threadId}`,
                  );
                  router.refresh();
                })();
              });
            }}
          >
            {(orderId || deliveryId) && (
              <div className="rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                {orderId ? (
                  <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 border border-border/60">
                    Pedido: <strong className="font-mono text-foreground">#{formatCustomerOrderNumber(orderId)}</strong>
                  </span>
                ) : null}
                {deliveryId ? (
                  <span className="inline-flex items-center gap-1 rounded bg-background px-2 py-0.5 border border-border/60">
                    Entrega: <strong className="font-mono text-foreground">{deliveryId}</strong>
                  </span>
                ) : null}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="live-category">Categoría</Label>
                <NativeSelect
                  id="live-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={pending}
                >
                  <NativeSelectOption value="payment">
                    Problema con el pago
                  </NativeSelectOption>
                  <NativeSelectOption value="delivery">
                    No recibí mi entrega
                  </NativeSelectOption>
                  <NativeSelectOption value="key">
                    Problema con una key
                  </NativeSelectOption>
                  <NativeSelectOption value="smm">
                    Problema con un servicio SMM
                  </NativeSelectOption>
                  <NativeSelectOption value="refund">
                    Solicitud de reembolso
                  </NativeSelectOption>
                  <NativeSelectOption value="account">Cuenta</NativeSelectOption>
                  <NativeSelectOption value="billing">
                    Facturación
                  </NativeSelectOption>
                  <NativeSelectOption value="other">Otro</NativeSelectOption>
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="live-subject">Asunto</Label>
                <Input
                  id="live-subject"
                  required
                  minLength={3}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={pending}
                  placeholder="Ej: Problema con activación de clave"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="live-first">Mensaje inicial</Label>
              <Textarea
                id="live-first"
                required
                minLength={1}
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                disabled={pending}
                placeholder="Describe tu duda o inconveniente en detalle. Por tu seguridad, no compartas claves ni contraseñas."
                className="min-h-[8rem] resize-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNew(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending} className="gap-2 font-medium">
                <HiOutlinePaperAirplane className="size-4 rotate-90" />
                <span>{pending ? "Iniciando…" : "Iniciar chat"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
