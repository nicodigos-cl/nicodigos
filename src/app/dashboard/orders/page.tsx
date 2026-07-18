import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { CustomerOrdersMobileList } from "@/components/dashboard/customer-orders-mobile-list";
import { CustomerOrdersTable } from "@/components/dashboard/customer-orders-table";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { getSession } from "@/lib/auth/session";
import { getCustomerOrdersPage } from "@/lib/customer-dashboard/queries";
import { getCustomerOrderStatusView } from "@/lib/customer-dashboard/status";
import {
  customerOrdersListQuerySchema,
  type CustomerOrdersListQuery,
} from "@/lib/customer-dashboard/validations";
import { orderStatusValues } from "@/lib/validations/orders";
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
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query.pageSize !== 10) params.set("pageSize", String(query.pageSize));
  if (query.q) params.set("q", query.q);
  if (query.status) params.set("status", query.status);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  const qs = params.toString();
  return qs ? `/dashboard/orders?${qs}` : "/dashboard/orders";
}

export default async function CustomerOrdersPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/orders");
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerOrdersListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/dashboard/orders");
  }

  const query = parsed.data;
  const result = await getCustomerOrdersPage(session.user.id, query);
  const hasFilters = Boolean(query.q || query.status || query.from || query.to);
  const isEmpty = result.total === 0 && !hasFilters;

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Mis pedidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Busca y filtra el historial de tus compras.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Buscar por número o producto"
          aria-label="Buscar pedidos"
        />
        <NativeSelect
          name="status"
          defaultValue={query.status ?? ""}
          aria-label="Filtrar por estado"
        >
          <NativeSelectOption value="">Todos los estados</NativeSelectOption>
          {orderStatusValues.map((status) => (
            <NativeSelectOption key={status} value={status}>
              {getCustomerOrderStatusView(status).label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Input
          type="date"
          name="from"
          defaultValue={query.from ?? ""}
          aria-label="Desde"
        />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

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
            <Button render={<Link href="/cart" />} nativeButton={false}>
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
              render={<Link href="/dashboard/orders" />}
              nativeButton={false}
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <CustomerOrdersTable data={result.items} />
          </div>
          <div className="md:hidden">
            <CustomerOrdersMobileList data={result.items} />
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
