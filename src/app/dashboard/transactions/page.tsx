import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineCreditCard } from "react-icons/hi";

import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { TransactionsFilters } from "@/components/dashboard/transactions/transactions-filters";
import { TransactionsMobileList } from "@/components/dashboard/transactions/transactions-mobile-list";
import { TransactionsSummary } from "@/components/dashboard/transactions/transactions-summary";
import { TransactionsTable } from "@/components/dashboard/transactions/transactions-table";
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
import { getCustomerTransactionsPage } from "@/lib/customer-dashboard/queries";
import {
  CUSTOMER_ORDERS_PATH,
  CUSTOMER_TRANSACTIONS_PATH,
  customerTransactionsPath,
} from "@/lib/customer-dashboard/paths";
import {
  customerTransactionsListQuerySchema,
  type CustomerTransactionsListQuery,
} from "@/lib/customer-dashboard/validations";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export const metadata: Metadata = {
  title: "Transacciones",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildTransactionsHref(
  query: CustomerTransactionsListQuery,
  page: number,
): string {
  return customerTransactionsPath({
    page: page > 1 ? page : undefined,
    pageSize: query.pageSize !== 10 ? query.pageSize : undefined,
    q: query.q,
    status: query.status !== "all" ? query.status : undefined,
    sort: query.sort !== "newest" ? query.sort : undefined,
    from: query.from,
    to: query.to,
  });
}

function hasActiveFilters(query: CustomerTransactionsListQuery): boolean {
  return Boolean(
    query.q ||
      query.status !== "all" ||
      query.from ||
      query.to ||
      query.sort !== "newest",
  );
}

export default async function CustomerTransactionsPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/auth/login?callbackUrl=${CUSTOMER_TRANSACTIONS_PATH}`);
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerTransactionsListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect(CUSTOMER_TRANSACTIONS_PATH);
  }

  const query = parsed.data;
  const result = await getCustomerTransactionsPage(session.user.id, query);
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
            <BreadcrumbPage>Transacciones</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Transacciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Historial de pagos asociados a tus pedidos.
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

      <TransactionsSummary
        metrics={result.metrics}
        activeStatus={query.status}
      />

      <TransactionsFilters query={query} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineCreditCard className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Todavía no tienes transacciones</EmptyTitle>
            <EmptyDescription>
              Cuando inicies un pago, aquí verás el estado de cada transacción.
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
              <HiOutlineCreditCard className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay transacciones que coincidan con los filtros actuales.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href={CUSTOMER_TRANSACTIONS_PATH} />}
              nativeButton={false}
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <TransactionsTable data={result.items} />
          </div>
          <div className="md:hidden">
            <TransactionsMobileList data={result.items} />
          </div>
          <CustomerListPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            itemLabel="transacciones"
            buildHref={(page) => buildTransactionsHref(query, page)}
          />
        </>
      )}
    </div>
  );
}
