import { redirect } from "next/navigation";
import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { DeliveriesMobileList } from "@/components/admin/deliveries/deliveries-mobile-list";
import { DeliveriesPagination } from "@/components/admin/deliveries/deliveries-pagination";
import { DeliveriesTable } from "@/components/admin/deliveries/deliveries-table";
import { DeliveriesToolbar } from "@/components/admin/deliveries/deliveries-toolbar";
import { DeliveryMetricsCards } from "@/components/admin/deliveries/delivery-metrics-cards";
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
  getDeliveriesPage,
  getDeliveryMetrics,
} from "@/lib/deliveries/queries";
import { deliveriesListQuerySchema } from "@/lib/validations/deliveries";
import { parseSearchParamsRecord } from "@/lib/validations/products";

type DeliveriesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DeliveriesPage({
  searchParams,
}: DeliveriesPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = deliveriesListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/deliveries");
  }

  const query = parsed.data;
  const [result, metrics] = await Promise.all([
    getDeliveriesPage(query),
    getDeliveryMetrics(query),
  ]);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    if (query.method) params.set("method", query.method);
    if (query.hasError) params.set("hasError", "true");
    if (query.needsManual) params.set("needsManual", "true");
    if (query.hasExternal) params.set("hasExternal", "true");
    if (query.sort !== "createdAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/deliveries?${params.toString()}`);
  }

  const isEmpty =
    result.total === 0 &&
    !query.q &&
    !query.status &&
    !query.method &&
    !query.hasError &&
    !query.needsManual &&
    !query.hasExternal;

  const isFilteredEmpty = result.total === 0 && !isEmpty;

  return (
    <div className="flex flex-col gap-6">
      <DeliveriesToolbar query={query} />
      <DeliveryMetricsCards metrics={metrics} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineTruck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin entregas todavía</EmptyTitle>
            <EmptyDescription>
              Las entregas se crean automáticamente cuando un pedido queda
              pagado. También puedes abrir un pedido y revisar sus ítems.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/orders" />}
              nativeButton={false}
            >
              Ir a órdenes
            </Button>
          </EmptyContent>
        </Empty>
      ) : isFilteredEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineTruck className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No hay entregas que coincidan con los filtros actuales. Prueba
              limpiar la búsqueda o ampliar el rango.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/deliveries" />}
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
          <DeliveriesPagination
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            totalPages={result.totalPages}
            query={query}
          />
        </>
      )}
    </div>
  );
}
