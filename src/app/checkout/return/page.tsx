import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getOrderById } from "@/lib/orders/queries";
import { formatMoney } from "@/lib/products/format";
import { getFlowClient } from "@/lib/flow/client";
import { processVerifiedFlowPayment } from "@/lib/transactions/processing";
import { mapFlowStatus } from "@/lib/transactions/status";

type ReturnPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutReturnPage({
  searchParams,
}: ReturnPageProps) {
  const params = await searchParams;
  const orderIdRaw = params.orderId;
  const tokenRaw = params.token;
  const orderId = Array.isArray(orderIdRaw) ? orderIdRaw[0] : orderIdRaw;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  const order = orderId ? await getOrderById(orderId) : null;

  let paid = order?.status === "PAID" || order?.status === "FULFILLED";

  // Never trust browser params alone — always verify with Flow when a token is present.
  if (token && orderId) {
    try {
      const flow = getFlowClient();
      const status = await flow.payments.status.byToken(token);
      await processVerifiedFlowPayment({
        token,
        source: "CALLBACK",
        snapshot: {
          status: mapFlowStatus(status.status),
          providerStatus: status.statusStr,
          flowOrder: status.flowOrder,
          commerceOrder: status.commerceOrder,
          amount: status.amount,
          currency: status.currency,
          payerEmail: status.payer,
          paymentMethod: status.paymentData?.media ?? null,
          paidAt: status.paymentData?.date
            ? new Date(status.paymentData.date.replace(" ", "T"))
            : null,
        },
      });
      paid = status.status === 2;
    } catch {
      // Keep pending UI if verification fails.
    }
  }

  if (orderId) {
    redirect(`/checkout/${encodeURIComponent(orderId)}`);
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center px-4 py-20 text-center">
      <Logo size={40} />
      <h1 className="mt-8 font-heading text-2xl font-semibold tracking-tight">
        {paid ? "Pago confirmado" : "Pago en proceso"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {paid
          ? "Recibimos tu pago correctamente."
          : "Si ya pagaste, la confirmación puede tardar unos segundos."}
      </p>
      {order ? (
        <p className="mt-4 text-sm tabular-nums">
          Total {formatMoney(order.total, order.currency)}
        </p>
      ) : null}
      <div className="mt-8 flex gap-2">
        <Button render={<Link href="/" />} nativeButton={false}>
          Ir al inicio
        </Button>
      </div>
    </div>
  );
}
