import { redirect } from "next/navigation";
import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { OrdersMobileList } from "@/components/admin/orders/orders-mobile-list";
import { OrdersPagination } from "@/components/admin/orders/orders-pagination";
import { OrdersTable } from "@/components/admin/orders/orders-table";
import { OrdersToolbar } from "@/components/admin/orders/orders-toolbar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getOrdersPage } from "@/lib/orders/queries";
import { ordersListQuerySchema } from "@/lib/validations/orders";
import { parseSearchParamsRecord } from "@/lib/validations/products";

type OrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const rawParams = parseSearchParamsRecord(await searchParams);
  const parsed = ordersListQuerySchema.safeParse(rawParams);

  if (!parsed.success) {
    redirect("/admin/orders");
  }

  const query = parsed.data;
  const result = await getOrdersPage(query);

  if (result.total > 0 && query.page > result.totalPages) {
    const params = new URLSearchParams();
    params.set("page", String(result.totalPages));
    if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
    if (query.q) params.set("q", query.q);
    if (query.status) params.set("status", query.status);
    if (query.paymentStatus) {
      params.set("paymentStatus", query.paymentStatus);
    }
    if (query.sort !== "createdAt") params.set("sort", query.sort);
    if (query.order !== "desc") params.set("order", query.order);
    redirect(`/admin/orders?${params.toString()}`);
  }

  const isEmpty =
    result.total === 0 && !query.q && !query.status && !query.paymentStatus;

  return (
    <div className="flex flex-col gap-6">
      <OrdersToolbar query={query} />

      {isEmpty ? (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Sin órdenes todavía</EmptyTitle>
            <EmptyDescription>
              Crea una orden y genera un link de pago Flow para tu cliente.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              render={<Link href="/admin/orders/new" />}
              nativeButton={false}
            >
              Crear orden
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
          <OrdersPagination
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
