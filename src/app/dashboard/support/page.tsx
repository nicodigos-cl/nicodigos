import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SupportForm } from "@/components/dashboard/support-form";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Soporte",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CustomerSupportPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/support");
  }

  const params = await searchParams;
  const orderId = first(params.orderId);
  const deliveryId = first(params.deliveryId);
  const category = first(params.category);

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Soporte
        </h1>
        <p className="text-sm text-muted-foreground">
          Cuéntanos qué necesitas. No incluyas keys ni contraseñas en el mensaje.
        </p>
      </div>
      <SupportForm
        orderId={orderId}
        deliveryId={deliveryId}
        category={category}
      />
    </div>
  );
}
