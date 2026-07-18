import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineCreditCard } from "react-icons/hi";

import { CustomerListPagination } from "@/components/dashboard/customer-list-pagination";
import { CustomerTransactionsMobileList } from "@/components/dashboard/customer-transactions-mobile-list";
import { CustomerTransactionsTable } from "@/components/dashboard/customer-transactions-table";
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
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (query.pageSize !== 10) params.set("pageSize", String(query.pageSize));
  const qs = params.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

export default async function CustomerTransactionsPage({
  searchParams,
}: PageProps) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/auth/login?callbackUrl=/dashboard/transactions");
  }

  const raw = parseSearchParamsRecord(await searchParams);
  const parsed = customerTransactionsListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    redirect("/dashboard/transactions");
  }

  const query = parsed.data;
  const result = await getCustomerTransactionsPage(session.user.id, query);

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Transacciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Historial de pagos asociados a tus pedidos.
        </p>
      </div>

      {result.total === 0 ? (
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
            <Button
              render={<Link href="/dashboard/orders" />}
              nativeButton={false}
            >
              Ver mis pedidos
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="hidden md:block">
            <CustomerTransactionsTable data={result.items} />
          </div>
          <div className="md:hidden">
            <CustomerTransactionsMobileList data={result.items} />
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
