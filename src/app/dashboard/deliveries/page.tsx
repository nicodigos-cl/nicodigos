import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineTruck } from "react-icons/hi";

import { CustomerDeliveriesMobileList } from "@/components/dashboard/customer-deliveries-mobile-list";
import { CustomerDeliveriesTable } from "@/components/dashboard/customer-deliveries-table";
import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { getSession } from "@/lib/auth/session";
import { getCustomerDeliveriesPage } from "@/lib/customer-dashboard/queries";
import {
  customerDeliveriesFilterValues,
  customerDeliveriesListQuerySchema,
  type CustomerDeliveriesListQuery,
} from "@/lib/customer-dashboard/validations";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export const metadata: Metadata = {
  title: "Mis entregas",
};

const filterLabels: Record<
  (typeof customerDeliveriesFilterValues)[number],
  string
> = {
  all: "Todas",
  available: "Disponibles",
  processing: "En proceso",
  completed: "Completadas",
  problems: "Con problemas",
  keys: "Keys",
  accounts: "Cuentas",
  smm: "SMM",
};

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function buildDeliveriesHref(
  query: CustomerDeliveriesListQuery,
  page: number,
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query.pageSize !== 10) params.set("pageSize", String(query.pageSize));
  if (query.filter !== "all") params.set("filter", query.filter);
  if (query.status) params.set("status", query.status);
  if (query.method) params.set("method", query.method);
  const qs = params.toString();
  return qs ? `/dashboard/deliveries?${qs}` : "/dashboard/deliveries";
}

export default async function CustomerDeliveriesPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/deliveries");
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerDeliveriesListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/dashboard/deliveries");
  }

  const query = parsed.data;
  const result = await getCustomerDeliveriesPage(session.user.id, query);
  const hasFilters = query.filter !== "all" || Boolean(query.status || query.method);
  const isEmpty = result.total === 0 && !hasFilters;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Mis entregas
        </h1>
        <p className="text-sm text-muted-foreground">
          Keys, cuentas y servicios asociados a tus compras.
        </p>
      </div>

      <form className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row">
        <NativeSelect
          name="filter"
          defaultValue={query.filter}
          aria-label="Filtrar entregas"
          className="sm:max-w-xs"
        >
          {customerDeliveriesFilterValues.map((filter) => (
            <NativeSelectOption key={filter} value={filter}>
              {filterLabels[filter]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

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
            <Button
              render={<Link href="/dashboard/pedidos" />}
              nativeButton={false}
            >
              Ver mis pedidos
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
              No hay entregas que coincidan con este filtro.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              variant="outline"
              render={<Link href="/dashboard/deliveries" />}
              nativeButton={false}
            >
              Ver todas
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <CustomerDeliveriesTable data={result.items} />
          </div>
          <div className="md:hidden">
            <CustomerDeliveriesMobileList data={result.items} />
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
