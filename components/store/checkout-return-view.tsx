"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClock,
  IconKey,
  IconX,
} from "@tabler/icons-react";

import { CheckoutReturnKeys } from "@/components/store/checkout-return-keys";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  confirmCheckoutReturnAction,
  syncCheckoutReturnDeliveryAction,
} from "@/lib/store/checkout/return-actions";
import type { CheckoutReturnResult } from "@/lib/store/checkout/return-actions";
import {
  checkoutReturnDeliveryCopy,
  checkoutReturnPhaseLabels,
  formatCheckoutOrderRef,
  getCheckoutReturnPresentation,
  hasCheckoutReturnKeys,
  type CheckoutReturnPhase,
} from "@/lib/store/checkout/return-ui";
import { playSound, useLoopingSound } from "@/lib/sounds";
import { storeRoutes } from "@/lib/store/navigation";
import { cn } from "@/lib/utils";

const RETURN_POLL_MS = 4000;
const RETURN_POLL_MAX = 15;
const RETURN_LOADING_MAX_MS = 25_000;

type CheckoutReturnViewProps = {
  token: string | null;
};

type ViewState =
  | { status: "loading"; phase: CheckoutReturnPhase; label: string }
  | { status: "ready"; result: CheckoutReturnResult };

export function CheckoutReturnView({ token }: CheckoutReturnViewProps) {
  const lastReadySoundRef = useRef<string | null>(null);
  const [view, setView] = useState<ViewState>(() =>
    token
      ? {
          status: "loading",
          phase: "confirming_payment",
          label: checkoutReturnPhaseLabels.confirming_payment,
        }
      : {
          status: "ready",
          result: {
            outcome: "not_found",
            message:
              "No recibimos el token de pago. Si acabas de pagar, espera unos segundos e intenta de nuevo desde el correo de Flow.",
          },
        },
  );

  useLoopingSound("progressLoop", view.status === "loading", { volume: 0.14 });

  useEffect(() => {
    if (view.status !== "ready") return;

    const presentation = getCheckoutReturnPresentation(view.result);
    const soundKey = [
      view.result.outcome,
      view.result.orderId ?? "no-order",
      presentation.variant,
      hasCheckoutReturnKeys(view.result) ? "keys" : "no-keys",
    ].join(":");

    if (lastReadySoundRef.current === soundKey) return;
    lastReadySoundRef.current = soundKey;

    if (presentation.showKeys && hasCheckoutReturnKeys(view.result)) {
      playSound("celebration", { volume: 0.42 });
      return;
    }

    if (presentation.variant === "waiting") {
      playSound("notification");
      return;
    }

    if (presentation.variant === "error") {
      playSound("caution");
    }
  }, [view]);

  useEffect(() => {
    const safeToken = token?.trim() ?? "";
    if (!safeToken) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;
    let pollCount = 0;
    let activeOrderId: string | undefined;

    async function run() {
      setView({
        status: "loading",
        phase: "confirming_payment",
        label: checkoutReturnPhaseLabels.confirming_payment,
      });

      const paymentTimer = window.setTimeout(() => {
        if (!cancelled) {
          setView((current) =>
            current.status === "loading"
              ? {
                  status: "loading",
                  phase: "fulfilling_order",
                  label: checkoutReturnPhaseLabels.fulfilling_order,
                }
              : current,
          );
        }
      }, 800);

      const loadingGuard = window.setTimeout(() => {
        if (cancelled) return;
        const fallbackResult: CheckoutReturnResult = {
          outcome: "paid",
          orderId: activeOrderId,
          message:
            "Confirmamos tu pago, pero la respuesta del proveedor está tardando. Seguiremos buscando tus keys aquí.",
          fulfillment: {
            status: "processing",
            message:
              "Estamos obteniendo tus keys del proveedor; aparecerán en esta página.",
            keysDelivered: 0,
          },
        };
        setView((current) => {
          if (current.status !== "loading") return current;
          return { status: "ready", result: fallbackResult };
        });
        schedulePollIfNeeded(fallbackResult);
      }, RETURN_LOADING_MAX_MS);

      try {
        const confirmed = await confirmCheckoutReturnAction(safeToken);

        if (cancelled) return;

        if (confirmed.outcome !== "paid" || !confirmed.orderId) {
          setView({ status: "ready", result: confirmed });
          return;
        }

        activeOrderId = confirmed.orderId;

        if (hasCheckoutReturnKeys(confirmed)) {
          setView({ status: "ready", result: confirmed });
          return;
        }

        setView({
          status: "ready",
          result: {
            ...confirmed,
            fulfillment: {
              status: "processing",
              message: confirmed.message,
              keysDelivered: 0,
            },
          },
        });

        const delivered = await syncCheckoutReturnDeliveryAction(
          confirmed.orderId,
        );

        if (cancelled) return;

        setView({ status: "ready", result: delivered });
        schedulePollIfNeeded(delivered);
      } catch {
        if (cancelled) return;
        setView({
          status: "ready",
          result: {
            outcome: "not_found",
            message:
              "No pudimos completar la verificación. Recarga la página o revisa tu correo de Flow.",
          },
        });
      } finally {
        window.clearTimeout(paymentTimer);
        window.clearTimeout(loadingGuard);
      }
    }

    function schedulePollIfNeeded(result: CheckoutReturnResult) {
      if (cancelled || hasCheckoutReturnKeys(result)) return;

      const presentation = getCheckoutReturnPresentation(result);
      if (!presentation.pollForKeys || result.outcome !== "paid") return;

      pollTimer = setTimeout(() => {
        void poll();
      }, RETURN_POLL_MS);
    }

    async function poll() {
      if (cancelled || !activeOrderId) return;

      if (pollCount >= RETURN_POLL_MAX) {
        setView((current) => {
          if (
            current.status !== "ready" ||
            hasCheckoutReturnKeys(current.result)
          ) {
            return current;
          }
          return {
            status: "ready",
            result: {
              ...current.result,
              outcome: "paid",
              orderId: activeOrderId,
              message:
                "Tu pago está confirmado. La entrega puede tardar un poco más; recarga esta página en un minuto o revisa tu correo.",
              fulfillment: {
                status: "processing",
                message:
                  "Seguimos esperando las keys del proveedor. Si no aparecen, contáctanos con tu número de pedido.",
                keysDelivered: 0,
              },
            },
          };
        });
        return;
      }

      pollCount += 1;

      try {
        const delivery = await syncCheckoutReturnDeliveryAction(activeOrderId);
        if (cancelled) return;

        setView({ status: "ready", result: delivery });

        if (!hasCheckoutReturnKeys(delivery)) {
          const presentation = getCheckoutReturnPresentation(delivery);
          if (presentation.pollForKeys) {
            pollTimer = setTimeout(() => {
              void poll();
            }, RETURN_POLL_MS);
          }
        }
      } catch {
        if (!cancelled && pollCount < RETURN_POLL_MAX) {
          pollTimer = setTimeout(() => {
            void poll();
          }, RETURN_POLL_MS);
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [token]);

  if (view.status === "loading") {
    return (
      <CheckoutReturnShell accent="primary">
        <Card className="w-full max-w-lg glass-card overflow-hidden border border-border/85 shadow-xl rounded-3xl">
          <div className="h-1.5 w-full bg-primary/80 animate-pulse" />
          <CardHeader className="items-center text-center pt-10 pb-4 space-y-4">
            <div className="mx-auto relative flex size-20 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Spinner className="size-10 text-primary" />
              <span className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full bg-background border border-border/60 shadow-sm">
                <IconKey className="size-4 text-primary" aria-hidden />
              </span>
            </div>
            <div className="space-y-2">
              <CardTitle className="font-heading text-2xl font-extrabold tracking-tight">
                Procesando tu compra
              </CardTitle>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                {view.label}
              </p>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-10">
            <ul className="space-y-3 text-xs text-muted-foreground">
              <CheckoutStepRow
                active={view.phase === "confirming_payment"}
                done={view.phase === "fulfilling_order"}
                label="Validar pago en Flow"
              />
              <CheckoutStepRow
                active={view.phase === "fulfilling_order"}
                done={false}
                label="Obtener y mostrar tus keys"
              />
              <CheckoutStepRow
                active={false}
                done={false}
                label="Listo para copiar"
              />
            </ul>
          </CardContent>
        </Card>
      </CheckoutReturnShell>
    );
  }

  const { result } = view;
  const presentation = getCheckoutReturnPresentation(result);
  const keys = result.keys ?? [];
  const isPending = result.outcome === "pending";
  const accent = presentation.accent;

  const icon =
    presentation.variant === "success" ? (
      <div className="mx-auto relative flex size-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/25 shadow-inner">
        <IconCircleCheck className="size-11 text-emerald-500" aria-hidden />
      </div>
    ) : presentation.variant === "waiting" ? (
      <div className="mx-auto relative flex size-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/25 shadow-inner">
        <IconClock className="size-11 text-amber-500" aria-hidden />
        <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-amber-500 border-2 border-background pulse-dot" />
      </div>
    ) : (
      <div className="mx-auto relative flex size-20 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/25 shadow-inner">
        {presentation.deliveryHint === "delivery_issue" ? (
          <IconAlertTriangle className="size-11 text-rose-500" aria-hidden />
        ) : (
          <IconX className="size-11 text-rose-500" aria-hidden />
        )}
      </div>
    );

  const stripClass =
    accent === "emerald"
      ? "bg-emerald-500"
      : accent === "amber"
        ? "bg-amber-500"
        : "bg-rose-500";

  const orbClass =
    accent === "emerald"
      ? "bg-emerald-500/10"
      : accent === "amber"
        ? "bg-amber-500/10"
        : "bg-rose-500/10";

  return (
    <CheckoutReturnShell accent={accent}>
      <Card className="w-full max-w-lg glass-card overflow-hidden border border-border/85 shadow-xl relative z-10 rounded-3xl">
        <div className={cn("h-1.5 w-full", stripClass)} />

        <CardHeader className="items-center text-center pt-8 pb-4">
          <div className="mb-4">{icon}</div>
          <CardTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">
            {presentation.title}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-6 py-2 space-y-5 text-center">
          <p className="text-sm text-muted-foreground/90 max-w-sm mx-auto leading-relaxed">
            {result.message}
          </p>

          {presentation.showKeys && keys.length > 0 ? (
            <CheckoutReturnKeys keys={keys} />
          ) : null}

          {result.orderId ? (
            <div className="inline-flex flex-col items-center justify-center bg-muted/40 border border-border/40 rounded-2xl p-4 w-full">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Número de pedido
              </span>
              <span className="font-mono text-sm font-extrabold text-foreground mt-1 bg-background px-3 py-1.5 rounded-lg border border-border/60 shadow-inner">
                {formatCheckoutOrderRef(result.orderId)}
              </span>
            </div>
          ) : null}

          {presentation.deliveryHint && !presentation.showKeys ? (
            <>
              <div className="relative py-2">
                <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-border/50" />
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border-r border-border/50" />
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border-l border-border/50" />
              </div>

              <div className="rounded-xl bg-muted/30 border border-border/50 px-4 py-3 text-left text-xs text-muted-foreground space-y-1.5">
                <p className="font-semibold text-foreground/90 flex items-center gap-2">
                  <IconKey className="size-3.5 text-primary shrink-0" />
                  {
                    checkoutReturnDeliveryCopy[presentation.deliveryHint]
                      .heading
                  }
                </p>
                <p>
                  {checkoutReturnDeliveryCopy[presentation.deliveryHint].body}
                </p>
              </div>
            </>
          ) : null}

          {presentation.pollForKeys ? (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Spinner className="size-3" />
              Buscando tus keys…
            </p>
          ) : null}
        </CardContent>

        <CardFooter className="px-6 pb-8 pt-2 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {presentation.showOrdersLink ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto font-bold shadow-md"
            >
              <Link href={storeRoutes.orders}>Ver en Mis pedidos</Link>
            </Button>
          ) : null}
          {presentation.showSupportLink ? (
            <Button
              asChild
              size="lg"
              className="w-full sm:w-auto font-bold shadow-md"
            >
              <Link href={storeRoutes.support}>Contactar soporte</Link>
            </Button>
          ) : null}
          {isPending ? (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto font-semibold"
            >
              <Link href={storeRoutes.orders}>Mis pedidos</Link>
            </Button>
          ) : null}
          <Button
            variant="outline"
            asChild
            size="lg"
            className="w-full sm:w-auto font-semibold"
          >
            <Link href={storeRoutes.catalog}>Seguir comprando</Link>
          </Button>
        </CardFooter>
      </Card>

      <div
        className={cn(
          "absolute inset-0 -z-10 blur-[150px] opacity-40 pointer-events-none rounded-full w-[520px] h-[520px] mx-auto my-auto",
          orbClass,
        )}
        aria-hidden
      />
    </CheckoutReturnShell>
  );
}

function CheckoutReturnShell({
  children,
  accent = "primary",
}: {
  children: React.ReactNode;
  accent?: "primary" | "emerald" | "amber" | "rose";
}) {
  const orb =
    accent === "emerald"
      ? "bg-emerald-500/10"
      : accent === "amber"
        ? "bg-amber-500/10"
        : accent === "rose"
          ? "bg-rose-500/10"
          : "bg-primary/10";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 relative overflow-hidden bg-background min-h-[calc(100vh-4rem)]">
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div
        className={cn(
          "absolute inset-0 -z-10 blur-[150px] opacity-35 pointer-events-none rounded-full w-[560px] h-[560px] mx-auto my-auto",
          orb,
        )}
        aria-hidden
      />
      <div className="relative z-10 w-full flex justify-center">{children}</div>
    </main>
  );
}

function CheckoutStepRow({
  active,
  done,
  label,
}: {
  active: boolean;
  done: boolean;
  label: string;
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
        active && "bg-primary/5 text-foreground",
        done && "text-muted-foreground",
        !active && !done && "opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
          done
            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
            : active
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border/60",
        )}
      >
        {done ? "✓" : active ? <Spinner className="size-3" /> : "·"}
      </span>
      {label}
    </li>
  );
}
