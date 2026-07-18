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
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { DataTablePagination } from "./data-table-pagination";
import { DataTableViewOptions } from "./data-table-view-options";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  /** SSR / server-driven mode: skip client filtering, sorting and pagination. */
  manual?: boolean;
  hideToolbar?: boolean;
  hidePagination?: boolean;
  emptyMessage?: string;
  className?: string;
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
  hideToolbar = false,
  hidePagination = false,
  emptyMessage = "No results.",
  className,
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
  const onSortingChange =
    controlledOnSortingChange ?? setUncontrolledSorting;

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
    getSortedRowModel: manual ? undefined : getSortedRowModel(),
    manualPagination: manual,
    manualSorting: manual,
    manualFiltering: manual,
  });

  const showToolbar = !hideToolbar && (!manual || Boolean(searchKey));

  return (
    <div className={className ?? "flex flex-col gap-4"}>
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
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
