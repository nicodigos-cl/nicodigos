import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineCreditCard } from "react-icons/hi";
import { TransactionMetrics } from "@/components/admin/transactions/transaction-metrics";
import { TransactionsMobileList } from "@/components/admin/transactions/transactions-mobile-list";
import { TransactionsPagination } from "@/components/admin/transactions/transactions-pagination";
import { TransactionsTable } from "@/components/admin/transactions/transactions-table";
import { TransactionsToolbar } from "@/components/admin/transactions/transactions-toolbar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminTransactions, getTransactionMetrics } from "@/lib/transactions/queries";
import { transactionsHref } from "@/lib/transactions/url";
import { transactionsListQuerySchema } from "@/lib/validations/transactions";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminSession(); const parsed = transactionsListQuerySchema.safeParse(parseSearchParamsRecord(await searchParams)); if (!parsed.success) redirect("/admin/transactions"); const query = parsed.data;
  const [result, metrics] = await Promise.all([getAdminTransactions(query), getTransactionMetrics(query)]);
  if (result.total && query.page > result.totalPages) redirect(transactionsHref(query, { page: result.totalPages }));
  const hasFilters = Object.entries(query).some(([key, value]) => !["page", "pageSize", "sort", "order"].includes(key) && value !== undefined);
  return <div className="flex flex-col gap-6"><TransactionsToolbar query={query} /><TransactionMetrics metrics={metrics} />{result.total === 0 ? <Empty className="border border-border bg-card"><EmptyHeader><EmptyMedia variant="icon"><HiOutlineCreditCard className="size-5" /></EmptyMedia><EmptyTitle>{hasFilters ? "Sin resultados" : "Sin transacciones todavía"}</EmptyTitle><EmptyDescription>{hasFilters ? "No hay transacciones que coincidan con los filtros actuales." : "Las transacciones aparecerán cuando se inicie el primer checkout."}</EmptyDescription></EmptyHeader>{hasFilters ? <EmptyContent><Button render={<Link href="/admin/transactions" />} nativeButton={false}>Limpiar filtros</Button></EmptyContent> : null}</Empty> : <><div className="hidden md:block"><TransactionsTable data={result.items} /></div><div className="md:hidden"><TransactionsMobileList data={result.items} /></div><TransactionsPagination page={result.page} pageSize={result.pageSize} total={result.total} totalPages={result.totalPages} query={query} /></>}</div>;
}
