"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
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
    <div className="mx-auto flex min-h-full max-w-2xl flex-col px-4 py-10 sm:py-16">
      <div className="flex items-center justify-between gap-3">
        <Logo size={36} />
        <p className="text-xs text-muted-foreground">
          {transport === "ws"
            ? "En vivo"
            : transport === "poll"
              ? "Actualización periódica"
              : "Conectando…"}
        </p>
      </div>

      <div className="mt-10 space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Pedido {order.id.slice(0, 8).toUpperCase()}
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {snapshot.title}
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {snapshot.message}
        </p>
        {delayed ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Entrega en 12–24 horas para uno o más ítems de este pedido.
          </p>
        ) : null}
      </div>

      <div className="mt-8 space-y-3 rounded-2xl border border-border bg-card/40 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-medium tabular-nums">
            {formatMoney(order.total, order.currency)}
          </span>
        </div>
        <ul className="divide-y divide-border">
          {order.items.map((item) => {
            const itemSnap = snapshot.items.find(
              (row) => row.orderItemId === item.id,
            );
            return (
              <li key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    Cant. {item.quantity}
                    {item.deliveryPromise
                      ? ` · ${deliveryPromiseCustomerCopy(item.deliveryPromise)}`
                      : null}
                  </p>
                  {itemSnap?.customerMessage ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {itemSnap.customerMessage}
                    </p>
                  ) : null}
                </div>
                <p className="shrink-0 tabular-nums">
                  {formatMoney(item.lineTotal, order.currency)}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {awaitingPayment ? (
          <Button onClick={pay} disabled={pending}>
            {pending ? "Redirigiendo…" : "Pagar con Flow"}
          </Button>
        ) : null}
        <Button
          variant="outline"
          render={<Link href={`/dashboard/pedidos/${order.id}`} />}
          nativeButton={false}
        >
          Ver en mi cuenta
        </Button>
        <Button
          variant="ghost"
          render={<Link href="/" />}
          nativeButton={false}
        >
          Inicio
        </Button>
      </div>

      <ol className="mt-10 space-y-2">
        {(
          [
            "AWAITING_PAYMENT",
            "PAYMENT_CONFIRMED",
            "PREPARING_DELIVERY",
            "PROCESSING_PROVIDER",
            "DELIVERED",
          ] as const
        ).map((phase) => {
          const active = snapshot.phase === phase;
          const passed =
            TERMINAL_PHASES.has(snapshot.phase) ||
            [
              "AWAITING_PAYMENT",
              "PAYMENT_CONFIRMED",
              "PREPARING_DELIVERY",
              "PROCESSING_PROVIDER",
              "DELIVERED",
            ].indexOf(snapshot.phase) >
              [
                "AWAITING_PAYMENT",
                "PAYMENT_CONFIRMED",
                "PREPARING_DELIVERY",
                "PROCESSING_PROVIDER",
                "DELIVERED",
              ].indexOf(phase);
          return (
            <li
              key={phase}
              className={cn(
                "flex items-center gap-2 text-sm",
                active
                  ? "font-medium text-foreground"
                  : passed
                    ? "text-muted-foreground"
                    : "text-muted-foreground/60",
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  active
                    ? "bg-primary"
                    : passed
                      ? "bg-muted-foreground/50"
                      : "bg-border",
                )}
              />
              {phase === "AWAITING_PAYMENT"
                ? "Esperando pago"
                : phase === "PAYMENT_CONFIRMED"
                  ? "Pago confirmado"
                  : phase === "PREPARING_DELIVERY"
                    ? "Preparando entrega"
                    : phase === "PROCESSING_PROVIDER"
                      ? "Procesando proveedor"
                      : "Entrega completada"}
            </li>
          );
        })}
        {snapshot.phase === "MANUAL_REVIEW" ||
        snapshot.phase === "PARTIALLY_DELIVERED" ||
        snapshot.phase === "ERROR" ? (
          <li className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="size-2 rounded-full bg-primary" />
            {snapshot.title}
          </li>
        ) : null}
      </ol>
    </div>
  );
}
