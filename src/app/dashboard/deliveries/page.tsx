import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineTruck } from "react-icons/hi";

import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { DeliveriesFilters } from "@/components/dashboard/deliveries/deliveries-filters";
import { DeliveriesMobileList } from "@/components/dashboard/deliveries/deliveries-mobile-list";
import { DeliveriesSummary } from "@/components/dashboard/deliveries/deliveries-summary";
import { DeliveriesTable } from "@/components/dashboard/deliveries/deliveries-table";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getSession } from "@/lib/auth/session";
import { getCustomerDeliveriesPage } from "@/lib/customer-dashboard/queries";
import {
  CUSTOMER_DELIVERIES_PATH,
  CUSTOMER_ORDERS_PATH,
  customerDeliveriesPath,
} from "@/lib/customer-dashboard/paths";
import {
  customerDeliveriesListQuerySchema,
  type CustomerDeliveriesListQuery,
} from "@/lib/customer-dashboard/validations";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { buildDeliveriesHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mis entregas",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
function hasActiveFilters(query: CustomerDeliveriesListQuery): boolean {
  return Boolean(
    query.q ||
      query.filter !== "all" ||
      query.method ||
      query.status ||
      query.from ||
      query.to ||
      query.sort !== "newest",
  );
}

export default async function CustomerDeliveriesPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${CUSTOMER_DELIVERIES_PATH}`);
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerDeliveriesListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect(CUSTOMER_DELIVERIES_PATH);
  }

  const query = parsed.data;
  const result = await getCustomerDeliveriesPage(session.user.id, query);
  const hasFilters = hasActiveFilters(query);
  const isEmpty = result.total === 0 && !hasFilters;

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mis entregas</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Mis entregas
          </h1>
          <p className="text-sm text-muted-foreground">
            Keys, cuentas y servicios asociados a tus compras.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href={CUSTOMER_ORDERS_PATH} />}
          nativeButton={false}
          className="shrink-0"
        >
          Ver mis pedidos
        </Button>
      </div>

      <DeliveriesSummary
        metrics={result.metrics}
        activeFilter={query.filter}
      />

      <DeliveriesFilters query={query} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineTruck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes entregas</EmptyTitle>
            <EmptyDescription>
              Cuando un pedido se complete, aquí aparecerán tus keys, cuentas y
              servicios.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/" />} nativeButton={false}>
              Explorar productos
            </Button>
          </EmptyContent>
        </Empty>
      ) : result.total === 0 ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineTruck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay entregas que coincidan con los filtros actuales.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={CUSTOMER_DELIVERIES_PATH} />}
              nativeButton={false}
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <DeliveriesTable data={result.items} />
          </div>
          <div className="md:hidden">
            <DeliveriesMobileList data={result.items} />
          </div>
          <CustomerListPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            itemLabel="entregas"
            buildHref={(page) => buildDeliveriesHref(query, page)}
          />
        </>
      )}
    </div>
  );
}
