import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { OrdersListQuery } from "@/lib/validations/orders";

type OrdersPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  query: OrdersListQuery;
};

function buildHref(
  query: OrdersListQuery,
  overrides: Partial<OrdersListQuery>,
): string {
  const next = { ...query, ...overrides };
  const params = new URLSearchParams();
  if (next.page > 1) params.set("page", String(next.page));
  if (next.pageSize !== 20) params.set("pageSize", String(next.pageSize));
  if (next.q) params.set("q", next.q);
  if (next.status) params.set("status", next.status);
  if (next.paymentStatus) params.set("paymentStatus", next.paymentStatus);
  if (next.sort !== "createdAt") params.set("sort", next.sort);
  if (next.order !== "desc") params.set("order", next.order);
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}

function getPageNumbers(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  if (page > 3) pages.push("ellipsis");
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  for (let current = start; current <= end; current += 1) pages.push(current);
  if (page < totalPages - 2) pages.push("ellipsis");
  pages.push(totalPages);
  return pages;
}

export function OrdersPagination({
  page,
  pageSize,
  total,
  totalPages,
  query,
}: OrdersPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Mostrando{" "}
        <span className="font-medium text-foreground">
          {from}–{to}
        </span>{" "}
        de <span className="font-medium text-foreground">{total}</span> órdenes
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={
                page > 1
                  ? buildHref(query, { page: page - 1 })
                  : buildHref(query, { page: 1 })
              }
              text="Anterior"
              aria-disabled={page <= 1}
              className={
                page <= 1 ? "pointer-events-none opacity-50" : undefined
              }
            />
          </PaginationItem>
          {getPageNumbers(page, totalPages).map((item, index) =>
            item === "ellipsis" ? (
              <PaginationItem key={`e-${index}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href={buildHref(query, { page: item })}
                  isActive={item === page}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href={
                page < totalPages
                  ? buildHref(query, { page: page + 1 })
                  : buildHref(query, { page: totalPages })
              }
              text="Siguiente"
              aria-disabled={page >= totalPages}
              className={
                page >= totalPages
                  ? "pointer-events-none opacity-50"
                  : undefined
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
