import type { Metadata } from "next";

import { CheckoutReturnView } from "@/components/store/checkout-return-view";

export const metadata: Metadata = {
  title: "Confirmando tu pago",
  description:
    "Validamos tu pago con Flow y preparamos la entrega de tus keys digitales en Chile.",
  robots: {
    index: false,
    follow: false,
  },
  alternates: {
    canonical: "/checkout/return",
  },
};

type CheckoutReturnPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function CheckoutReturnPage({
  searchParams,
}: CheckoutReturnPageProps) {
  const { token } = await searchParams;

  return <CheckoutReturnView token={token?.trim() ?? null} />;
}
