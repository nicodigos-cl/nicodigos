"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type Row,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableColumnHeader } from "./data-table-column-header";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  /** SSR / server-driven mode: skip client filtering and pagination. */
  manual?: boolean;
  /** Skip client sorting because the consumer handles it on the server. */
  manualSorting?: boolean;
  hideToolbar?: boolean;
  hidePagination?: boolean;
  emptyMessage?: string;
  className?: string;
  containerClassName?: string;
  tableContainerClassName?: string;
  tableClassName?: string;
  headerClassName?: string;
  getRowClassName?: (row: Row<TData>) => string | undefined;
  onRowClick?: (row: Row<TData>) => void;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  /** Controlled sorting (use with `manual` for server-driven order). */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  getRowId?: (originalRow: TData, index: number) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
  manual = false,
  manualSorting,
  hideToolbar = false,
  hidePagination = false,
  emptyMessage = "No results.",
  className,
  containerClassName,
  tableContainerClassName,
  tableClassName,
  headerClassName,
  getRowClassName,
  onRowClick,
  enableRowSelection,
  rowSelection: controlledRowSelection,
  onRowSelectionChange: controlledOnRowSelectionChange,
  sorting: controlledSorting,
  onSortingChange: controlledOnSortingChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [uncontrolledSorting, setUncontrolledSorting] =
    React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [uncontrolledRowSelection, setUncontrolledRowSelection] =
    React.useState<RowSelectionState>({});

  const isSortingControlled = controlledSorting !== undefined;
  const sorting = isSortingControlled ? controlledSorting : uncontrolledSorting;
  const onSortingChange = controlledOnSortingChange ?? setUncontrolledSorting;
  const isSortingManual =
    manualSorting ??
    (manual && isSortingControlled && controlledOnSortingChange !== undefined);

  const isSelectionControlled = controlledRowSelection !== undefined;
  const rowSelection = isSelectionControlled
    ? controlledRowSelection
    : uncontrolledRowSelection;
  const onRowSelectionChange =
    controlledOnRowSelectionChange ?? setUncontrolledRowSelection;

  const selectionEnabled =
    enableRowSelection ?? (!manual || isSelectionControlled);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: selectionEnabled,
    onSortingChange,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange,
    getRowId,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: manual ? undefined : getFilteredRowModel(),
    getPaginationRowModel: manual ? undefined : getPaginationRowModel(),
    getSortedRowModel: isSortingManual ? undefined : getSortedRowModel(),
    manualPagination: manual,
    manualSorting: isSortingManual,
    manualFiltering: manual,
  });

  const showToolbar = !hideToolbar && (!manual || Boolean(searchKey));

  return (
    <div className={className ?? "flex flex-col gap-4 w-full"}>
      {showToolbar ? (
        <div className="flex items-center gap-2">
          {searchKey ? (
            <Input
              placeholder={searchPlaceholder}
              value={
                (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
              }
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="max-w-sm"
            />
          ) : null}
          {!manual ? <DataTableViewOptions table={table} /> : null}
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border bg-card w-full",
          containerClassName,
        )}
      >
        <Table
          className={tableClassName}
          containerClassName={tableContainerClassName}
        >
          <TableHeader className={headerClassName}>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : typeof header.column
                        .columnDef.header === "string" ? (
                      <DataTableColumnHeader
                        column={header.column}
                        title={header.column.columnDef.header}
                      />
                    ) : (
                      flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  className={getRowClassName?.(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="p-0">
                  <Empty className="rounded-none border-0 py-10">
                    <EmptyHeader>
                      <EmptyDescription>{emptyMessage}</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!hidePagination && !manual ? (
        <DataTablePagination table={table} />
      ) : null}
    </div>
  );
}
