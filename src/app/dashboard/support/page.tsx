import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineChevronDown } from "react-icons/hi";

import { CustomerSupportLive } from "@/components/dashboard/support/customer-support-live";
import { SupportFaq } from "@/components/dashboard/support/support-faq";
import { SupportForm } from "@/components/dashboard/support-form";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getSession } from "@/lib/auth/session";
import {
  getCustomerLiveThreads,
  getLiveThreadForCustomer,
} from "@/lib/support-live/queries";

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
  const threadId = first(params.threadId);

  const threads = await getCustomerLiveThreads(session.user.id);
  const active =
    threadId != null
      ? await getLiveThreadForCustomer(threadId, session.user.id)
      : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb & Header */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Soporte</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
          Soporte
        </h1>
        <p className="text-sm text-muted-foreground">
          Chatea en vivo con nuestro equipo de soporte para resolver dudas o problemas con tus compras.
        </p>
      </div>

      {/* Main Live Chat Area */}
      <CustomerSupportLive
        threads={threads}
        activeThread={active?.thread ?? null}
        initialMessages={active?.messages ?? []}
        orderId={orderId}
        deliveryId={deliveryId}
        category={category}
      />

      {/* FAQ Section */}
      <SupportFaq />

      {/* Optional Email Ticket Collapsible */}
      <details className="group rounded-2xl border border-border bg-card p-5 sm:p-6 transition-all duration-300">
        <summary className="flex cursor-pointer items-center justify-between font-heading text-base font-semibold list-none select-none text-foreground">
          <span>¿Prefieres enviar un ticket por correo?</span>
          <HiOutlineChevronDown className="size-5 text-muted-foreground transition-transform duration-300 group-open:rotate-180" />
        </summary>
        <div className="mt-5 border-t border-border/60 pt-5">
          <SupportForm
            orderId={orderId}
            deliveryId={deliveryId}
            category={category}
          />
        </div>
      </details>
    </div>
  );
}
