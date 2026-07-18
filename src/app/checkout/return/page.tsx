import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { getOrderById } from "@/lib/orders/queries";
import { formatMoney } from "@/lib/products/format";
import { getFlowClient } from "@/lib/flow/client";
import { markOrderPaidFromFlow } from "@/lib/actions/orders";

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

  if (token && orderId && !paid) {
    try {
      const flow = getFlowClient();
      const status = await flow.payments.status.byToken(token);
      if (status.status === 2) {
        await markOrderPaidFromFlow({
          orderId: status.commerceOrder || orderId,
          token,
        });
        paid = true;
      }
    } catch {
      // Keep pending UI if verification fails.
    }
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
        {orderId ? (
          <Button
            variant="outline"
            render={
              <Link href={`/checkout?orderId=${encodeURIComponent(orderId)}`} />
            }
            nativeButton={false}
          >
            Ver checkout
          </Button>
        ) : null}
      </div>
    </div>
  );
}
