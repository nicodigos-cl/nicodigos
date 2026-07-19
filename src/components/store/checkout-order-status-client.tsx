"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { HiCheck, HiOutlineClock, HiOutlineExclamation, HiOutlineTruck, HiOutlineReceiptTax } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { startCheckoutPaymentAction } from "@/lib/actions/orders";
import {
  deliveryPromiseCustomerCopy,
} from "@/lib/delivery-promise/calculate";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type { OrderLiveSnapshot } from "@/lib/order-live/events";
import type { OrderDetailDto } from "@/types/orders";

type CheckoutOrderStatusClientProps = {
  order: OrderDetailDto;
  initialSnapshot: OrderLiveSnapshot;
};

const TERMINAL_PHASES = new Set([
  "DELIVERED",
  "PARTIALLY_DELIVERED",
  "MANUAL_REVIEW",
  "ERROR",
]);

function getPhaseImage(phase: string) {
  switch (phase) {
    case "AWAITING_PAYMENT":
      return "/images/order-status/undraw_online-payments_d5ef.svg";
    case "PAYMENT_CONFIRMED":
      return "/images/order-status/undraw_order-confirmed_m9e9.svg";
    case "PREPARING_DELIVERY":
      return "/images/order-status/undraw_logistics_8vri.svg";
    case "PROCESSING_PROVIDER":
      return "/images/order-status/undraw_order-status_swsl.svg";
    case "DELIVERED":
    case "PARTIALLY_DELIVERED":
      return "/images/order-status/undraw_order-delivered_puaw.svg";
    case "ERROR":
    case "MANUAL_REVIEW":
    default:
      return "/images/order-status/undraw_confirmation_31jc.svg";
  }
}

export function CheckoutOrderStatusClient({
  order,
  initialSnapshot,
}: CheckoutOrderStatusClientProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [transport, setTransport] = useState<"ws" | "poll" | "connecting">(
    "connecting",
  );
  const [pending, startTransition] = useTransition();
  const backoffRef = useRef(1_000);
  const wsRef = useRef<WebSocket | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function pollOnce() {
      try {
        const res = await fetch(`/api/orders/${order.id}/live-status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok?: boolean;
          snapshot?: OrderLiveSnapshot;
        };
        if (data.snapshot && !cancelled) {
          setSnapshot(data.snapshot);
        }
      } catch {
        // ignore transient poll errors
      }
    }

    function startPolling() {
      setTransport("poll");
      if (pollRef.current) clearInterval(pollRef.current);
      void pollOnce();
      pollRef.current = setInterval(() => {
        void pollOnce();
      }, 4_000);
    }

    async function connectWs() {
      try {
        const res = await fetch(`/api/orders/${order.id}/ws-ticket`, {
          method: "POST",
        });
        if (!res.ok) {
          startPolling();
          return;
        }
        const data = (await res.json()) as {
          ok?: boolean;
          wsUrl?: string;
        };
        if (!data.wsUrl) {
          startPolling();
          return;
        }

        const ws = new WebSocket(data.wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (cancelled) return;
          setTransport("ws");
          backoffRef.current = 1_000;
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          ws.send(JSON.stringify({ type: "ping" }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(String(event.data)) as {
              type?: string;
              snapshot?: OrderLiveSnapshot;
            };
            if (message.type === "pong") return;
            if (message.type === "order.status" && message.snapshot) {
              setSnapshot(message.snapshot);
            }
          } catch {
            // ignore malformed
          }
        };

        ws.onclose = () => {
          if (cancelled) return;
          startPolling();
          const delay = backoffRef.current;
          backoffRef.current = Math.min(delay * 2, 30_000);
          reconnectTimer = setTimeout(() => {
            void connectWs();
          }, delay);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        startPolling();
      }
    }

    void connectWs();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pollRef.current) clearInterval(pollRef.current);
      wsRef.current?.close();
    };
  }, [order.id]);

  const pay = () => {
    startTransition(async () => {
      const result = await startCheckoutPaymentAction(order.id);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      window.location.href = result.data.redirectUrl;
    });
  };

  const awaitingPayment = snapshot.phase === "AWAITING_PAYMENT";
  const delayed =
    snapshot.hasDelayedPromise ||
    order.hasDelayedPromise ||
    order.items.some((item) => item.deliveryPromise === "DELAYED_12_24H");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-end gap-3 mb-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
          <span className={cn("relative flex h-2 w-2", transport === "ws" ? "text-emerald-500" : transport === "connecting" ? "text-amber-500" : "text-blue-500")}>
            {transport === "ws" ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
            )}
          </span>
          {transport === "ws"
            ? "Conexión en vivo"
            : transport === "poll"
              ? "Actualización periódica"
              : "Conectando…"}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="border-b border-border bg-muted/20 px-6 py-8 text-center sm:px-8">
          <div className="mx-auto w-48 h-48 mb-6 relative">
            <Image 
              src={getPhaseImage(snapshot.phase)} 
              alt="Ilustración de estado" 
              fill 
              className="object-contain" 
              priority
            />
          </div>
          <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-3">
            Pedido #{order.id.slice(0, 8).toUpperCase()}
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {snapshot.title}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {snapshot.message}
          </p>
          
          {delayed ? (
            <div className="mx-auto mt-6 inline-flex max-w-xl items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100 ring-1 ring-amber-500/20">
              <HiOutlineClock className="size-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p>Entrega en 12–24 horas para uno o más ítems de este pedido.</p>
            </div>
          ) : null}
        </div>

        <div className="px-6 py-8 sm:px-8">
          <h2 className="text-base font-semibold text-foreground mb-4">Resumen de la compra</h2>
          <div className="space-y-4">
            <ul className="divide-y divide-border border-y border-border">
              {order.items.map((item) => {
                const itemSnap = snapshot.items.find(
                  (row) => row.orderItemId === item.id,
                );
                return (
                  <li key={item.id} className="flex justify-between gap-4 py-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{item.productName}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Cant. {item.quantity}</span>
                        {item.deliveryPromise ? (
                          <>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                            <span className="flex items-center gap-1">
                              <HiOutlineTruck className="size-3.5" />
                              {deliveryPromiseCustomerCopy(item.deliveryPromise, item.deliveryMethod as "SMM" | "KINGUIN" | "MANUAL")}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {itemSnap?.customerMessage ? (
                        <p className="mt-2 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg inline-block">
                          {itemSnap.customerMessage}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 font-medium tabular-nums text-foreground">
                      {formatMoney(item.lineTotal, order.currency)}
                    </p>
                  </li>
                );
              })}
            </ul>
            
            <div className="flex items-center justify-between text-base pt-2">
              <span className="font-medium text-foreground">Total pagado</span>
              <span className="text-xl font-bold tabular-nums text-foreground">
                {formatMoney(order.total, order.currency)}
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-border bg-muted/10 px-6 py-8 sm:px-8">
          <h2 className="text-base font-semibold text-foreground mb-6">Estado del pedido</h2>
          
          <ol className="relative space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-border">
            {(
              [
                "AWAITING_PAYMENT",
                "PAYMENT_CONFIRMED",
                "PREPARING_DELIVERY",
                "PROCESSING_PROVIDER",
                "DELIVERED",
              ] as const
            ).map((phase, idx) => {
              const active = snapshot.phase === phase;
              const passed =
                TERMINAL_PHASES.has(snapshot.phase) ||
                [
                  "AWAITING_PAYMENT",
                  "PAYMENT_CONFIRMED",
                  "PREPARING_DELIVERY",
                  "PROCESSING_PROVIDER",
                  "DELIVERED",
                ].indexOf(snapshot.phase) > idx;

              return (
                <li
                  key={phase}
                  className={cn(
                    "relative flex items-start gap-4 text-sm",
                    active
                      ? "font-medium text-foreground"
                      : passed
                        ? "text-muted-foreground"
                        : "text-muted-foreground/40",
                  )}
                >
                  <div
                    className={cn(
                      "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 bg-background ring-4 ring-background",
                      active
                        ? "border-primary text-primary"
                        : passed
                          ? "border-muted-foreground text-muted-foreground bg-muted"
                          : "border-border text-transparent",
                    )}
                  >
                    {passed && !active ? <HiCheck className="size-3.5" /> : <div className={cn("size-2 rounded-full", active ? "bg-primary" : "bg-border")} />}
                  </div>
                  <div className="flex flex-col mt-0.5">
                    <span className="font-medium">
                      {phase === "AWAITING_PAYMENT"
                        ? "Esperando pago"
                        : phase === "PAYMENT_CONFIRMED"
                          ? "Pago confirmado"
                          : phase === "PREPARING_DELIVERY"
                            ? "Preparando entrega"
                            : phase === "PROCESSING_PROVIDER"
                              ? "Procesando con proveedor"
                              : "Entrega completada"}
                    </span>
                    {active ? (
                      <span className="text-xs font-normal text-muted-foreground mt-1">
                        {phase === "AWAITING_PAYMENT"
                          ? "Por favor completa el pago para continuar."
                          : phase === "DELIVERED" 
                            ? "Tu pedido ha sido entregado exitosamente."
                            : "Estamos trabajando en tu pedido."}
                      </span>
                    ) : null}
                  </div>
                </li>
              );
            })}
            
            {snapshot.phase === "MANUAL_REVIEW" ||
            snapshot.phase === "PARTIALLY_DELIVERED" ||
            snapshot.phase === "ERROR" ? (
              <li className="relative flex items-start gap-4 text-sm font-medium text-foreground mt-6">
                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background ring-4 ring-background text-primary">
                  {snapshot.phase === "ERROR" ? <HiOutlineExclamation className="size-3.5" /> : <div className="size-2 rounded-full bg-primary" />}
                </div>
                <div className="flex flex-col mt-0.5">
                  <span className="text-primary">{snapshot.title}</span>
                  <span className="text-xs font-normal text-muted-foreground mt-1">
                    {snapshot.message}
                  </span>
                </div>
              </li>
            ) : null}
          </ol>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 justify-center">
        {awaitingPayment ? (
          <Button onClick={pay} disabled={pending} className="w-full sm:w-auto h-12 px-8 text-base shadow-md">
            {pending ? "Redirigiendo…" : "Pagar con Flow"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          render={<Link href={`/dashboard/pedidos/${order.id}`} />}
          nativeButton={false}
          className="w-full sm:w-auto h-12 px-8"
        >
          <HiOutlineReceiptTax className="mr-2 size-5" />
          Ver comprobante
        </Button>
        <Button
          variant="ghost"
          render={<Link href="/" />}
          nativeButton={false}
          className="w-full sm:w-auto h-12 px-8 text-muted-foreground hover:text-foreground"
        >
          Volver a la tienda
        </Button>
      </div>
    </main>
  );
}
