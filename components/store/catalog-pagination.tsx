import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type StorePaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
};

function pageHref(basePath: string, page: number): string {
  if (page <= 1) {
    return basePath;
  }

  return `${basePath}?page=${page}`;
}

function getVisiblePages(
  page: number,
  totalPages: number,
): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);

  const sorted = [...pages]
    .filter((value) => value >= 1 && value <= totalPages)
    .sort((a, b) => a - b);

  const result: Array<number | "ellipsis"> = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const previous = sorted[index - 1];

    if (previous !== undefined && current - previous > 1) {
      result.push("ellipsis");
    }

    result.push(current);
  }

  return result;
}

export function StorePagination({
  page,
  totalPages,
  basePath,
}: StorePaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <Pagination className="mt-10">
      <PaginationContent>
        <PaginationItem>
          {page > 1 ? (
            <PaginationPrevious
              href={pageHref(basePath, page - 1)}
              text="Anterior"
            />
          ) : (
            <PaginationPrevious
              href={pageHref(basePath, 1)}
              text="Anterior"
              aria-disabled
              className="pointer-events-none opacity-50"
            />
          )}
        </PaginationItem>

        {visiblePages.map((item, index) =>
          item === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={item}>
              <PaginationLink
                href={pageHref(basePath, item)}
                isActive={item === page}
              >
                {item}
              </PaginationLink>
            </PaginationItem>
          ),
        )}

        <PaginationItem>
          {page < totalPages ? (
            <PaginationNext
              href={pageHref(basePath, page + 1)}
              text="Siguiente"
            />
          ) : (
            <PaginationNext
              href={pageHref(basePath, totalPages)}
              text="Siguiente"
              aria-disabled
              className="pointer-events-none opacity-50"
            />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
