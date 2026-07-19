import { redirect } from "next/navigation";

import {
  CheckoutPageClient,
  type CheckoutBillingDefaults,
  type CheckoutBillingFlags,
} from "@/components/store/checkout-page-client";
import { getSession } from "@/lib/auth/session";
import { getCurrentCart } from "@/lib/cart/current";
import prisma from "@/lib/prisma";
import { getOperationalSettings } from "@/lib/settings/runtime";
import { BOLETA_NAMED_THRESHOLD_CLP } from "@/lib/validations/checkout-billing";

type CheckoutPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const params = await searchParams;
  const orderIdRaw = params.orderId;
  const orderId = Array.isArray(orderIdRaw) ? orderIdRaw[0] : orderIdRaw;

  if (orderId) {
    redirect(`/checkout/${encodeURIComponent(orderId)}`);
  }

  const session = await getSession();
  const [cart, user, settings] = await Promise.all([
    getCurrentCart(session?.user.id),
    session?.user
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            email: true,
            name: true,
            phone: true,
            invoiceType: true,
            rut: true,
            businessName: true,
            businessActivity: true,
            addressLine1: true,
            addressLine2: true,
            commune: true,
            city: true,
            region: true,
          },
        })
      : null,
    getOperationalSettings(),
  ]);

  if (!cart || cart.items.length === 0) {
    redirect("/cart");
  }

  const billingDefaults: CheckoutBillingDefaults = {
    email: user?.email ?? session?.user.email ?? "",
    customerName: user?.name ?? session?.user.name ?? "",
    phone: user?.phone ?? "",
    invoiceType: user?.invoiceType ?? "BOLETA",
    rut: user?.rut ?? "",
    businessName: user?.businessName ?? "",
    businessActivity: user?.businessActivity ?? "",
    addressLine1: user?.addressLine1 ?? "",
    addressLine2: user?.addressLine2 ?? "",
    commune: user?.commune ?? "",
    city: user?.city ?? "",
    region: user?.region ?? "",
  };

  const billingFlags: CheckoutBillingFlags = {
    requireRut: settings.requireRut,
    requireBillingData: settings.requireBillingData,
    allowBoleta: settings.allowBoleta,
    allowFactura: settings.allowFactura,
    boletaNamedThresholdClp: BOLETA_NAMED_THRESHOLD_CLP,
  };

  return (
    <CheckoutPageClient
      mode="cart"
      cart={cart}
      billingDefaults={billingDefaults}
      billingFlags={billingFlags}
      authenticated={Boolean(session?.user)}
    />
  );
}
