import type { Metadata } from "next";
import Link from "next/link";
import { FiCheckCircle, FiClock, FiXCircle } from "react-icons/fi";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { confirmFlowPaymentByToken } from "@/lib/store/checkout/confirm-payment";
import { storeRoutes } from "@/lib/store/navigation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Estado del pago",
};

type CheckoutReturnPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CheckoutReturnPage({
  searchParams,
}: CheckoutReturnPageProps) {
  const { token } = await searchParams;
  const result = token
    ? await confirmFlowPaymentByToken(token)
    : {
        outcome: "not_found" as const,
        message:
          "No recibimos el token de pago. Si acabas de pagar, espera unos segundos o revisa tus pedidos.",
      };

  const statusConfig = {
    paid: {
      color: "emerald-500",
      bgOrb: "bg-emerald-500/5",
    },
    pending: {
      color: "amber-500",
      bgOrb: "bg-amber-500/5",
    },
    default: {
      color: "rose-500",
      bgOrb: "bg-rose-500/5",
    },
  };

  const currentStatus =
    result.outcome === "paid"
      ? statusConfig.paid
      : result.outcome === "pending"
        ? statusConfig.pending
        : statusConfig.default;

  const icon =
    result.outcome === "paid" ? (
      <div className="relative p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-inner">
        <FiCheckCircle className="size-10 text-emerald-500" aria-hidden />
        <div className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-emerald-500 border-2 border-background pulse-dot" />
      </div>
    ) : result.outcome === "pending" ? (
      <div className="relative p-4 rounded-full bg-amber-500/10 border border-amber-500/20 shadow-inner">
        <FiClock className="size-10 text-amber-500" aria-hidden />
        <div className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full bg-amber-500 border-2 border-background pulse-dot" />
      </div>
    ) : (
      <div className="relative p-4 rounded-full bg-rose-500/10 border border-rose-500/20 shadow-inner">
        <FiXCircle className="size-10 text-rose-500" aria-hidden />
      </div>
    );

  const title =
    result.outcome === "paid"
      ? "Pago confirmado"
      : result.outcome === "pending"
        ? "Pago pendiente"
        : result.outcome === "rejected" || result.outcome === "canceled"
          ? "Pago no completado"
          : "No pudimos verificar el pago";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16 relative overflow-hidden bg-background min-h-[calc(100vh-4rem)]">
      {/* Decorative backgrounds */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div className={cn("absolute inset-0 -z-10 blur-[150px] opacity-40 pointer-events-none rounded-full w-[600px] h-[600px] mx-auto my-auto", currentStatus.bgOrb)} />

      <Card className="w-full max-w-lg glass-card overflow-hidden border border-border/85 shadow-xl relative z-10 rounded-3xl">
        {/* Top colored strip indicator */}
        <div className={cn("h-1.5 w-full", `bg-${currentStatus.color}`)} />

        <CardHeader className="items-center text-center pt-8 pb-4">
          <div className="mb-4">{icon}</div>
          <CardTitle className="font-heading text-2xl font-extrabold tracking-tight text-foreground">{title}</CardTitle>
        </CardHeader>

        <CardContent className="px-6 py-4 space-y-5 text-center">
          <p className="text-sm text-muted-foreground/90 max-w-sm mx-auto leading-relaxed">
            {result.message}
          </p>

          {result.orderId ? (
            <div className="inline-flex flex-col items-center justify-center bg-muted/40 border border-border/40 rounded-2xl p-4 w-full">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Identificador de Pedido</span>
              <span className="font-mono text-sm font-extrabold text-foreground mt-1 bg-background px-3 py-1.5 rounded-lg border border-border/60 shadow-inner">
                {result.orderId}
              </span>
            </div>
          ) : null}

          {/* Dotted invoice separator line */}
          <div className="relative py-2">
            <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-border/50" />
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border-r border-border/50" />
            <div className="absolute -right-8 top-1/2 -translate-y-1/2 size-4 rounded-full bg-background border-l border-border/50" />
          </div>
          
          <div className="text-[10px] text-muted-foreground/80 space-y-1 font-medium">
            <p>Entrega Digital y Soporte las 24 Horas</p>
            <p>Si tienes alguna consulta, contáctanos a soporte.</p>
          </div>
        </CardContent>

        <CardFooter className="px-6 pb-8 pt-2 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {result.outcome === "paid" || result.outcome === "pending" ? (
            <Button asChild size="lg" className="w-full sm:w-auto font-bold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform">
              <Link href={storeRoutes.orders}>Ver mis pedidos</Link>
            </Button>
          ) : null}
          <Button variant="outline" asChild size="lg" className="w-full sm:w-auto font-semibold hover:bg-muted/50">
            <Link href={storeRoutes.catalog}>Volver al catálogo</Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
