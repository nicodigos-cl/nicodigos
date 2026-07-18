import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { OrdersFilters } from "@/components/dashboard/orders/orders-filters";
import { OrdersMobileList } from "@/components/dashboard/orders/orders-mobile-list";
import { OrdersSummary } from "@/components/dashboard/orders/orders-summary";
import { OrdersTable } from "@/components/dashboard/orders/orders-table";
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
import { getCustomerOrdersPage } from "@/lib/customer-dashboard/queries";
import {
  CUSTOMER_ORDERS_PATH,
  customerOrdersPath,
} from "@/lib/customer-dashboard/paths";
import {
  customerOrdersListQuerySchema,
  type CustomerOrdersListQuery,
} from "@/lib/customer-dashboard/validations";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export const metadata: Metadata = {
  title: "Mis pedidos",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildOrdersHref(
  query: CustomerOrdersListQuery,
  page: number,
): string {
  return customerOrdersPath({
    page: page > 1 ? page : undefined,
    pageSize: query.pageSize !== 10 ? query.pageSize : undefined,
    q: query.q,
    status: query.status,
    payment: query.payment,
    delivery: query.delivery,
    sort: query.sort !== "newest" ? query.sort : undefined,
    from: query.from,
    to: query.to,
  });
}

function hasActiveFilters(query: CustomerOrdersListQuery): boolean {
  return Boolean(
    query.q ||
      (query.status && query.status !== "all") ||
      query.payment ||
      query.delivery ||
      query.from ||
      query.to ||
      query.sort !== "newest",
  );
}

export default async function CustomerPedidosPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/pedidos");
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerOrdersListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect(CUSTOMER_ORDERS_PATH);
  }

  const query = parsed.data;
  const result = await getCustomerOrdersPage(session.user.id, query);
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
            <BreadcrumbPage>Mis pedidos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Mis pedidos
          </h1>
          <p className="text-sm text-muted-foreground">
            Busca, filtra y da seguimiento a tus compras.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href="/" />}
          nativeButton={false}
          className="shrink-0"
        >
          Seguir comprando
        </Button>
      </div>

      <OrdersSummary
        metrics={result.metrics}
        activeStatus={query.status}
      />

      <OrdersFilters query={query} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes pedidos</EmptyTitle>
            <EmptyDescription>
              Cuando compres, aquí verás el estado de tus pagos y entregas.
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
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay pedidos que coincidan con los filtros actuales.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={CUSTOMER_ORDERS_PATH} />}
              nativeButton={false}
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <OrdersTable data={result.items} />
          </div>
          <div className="md:hidden">
            <OrdersMobileList data={result.items} />
          </div>
          <CustomerListPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            itemLabel="pedidos"
            buildHref={(page) => buildOrdersHref(query, page)}
          />
        </>
      )}
    </div>
  );
}
