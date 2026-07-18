"use client";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { HiOutlineDotsHorizontal, HiOutlineEye } from "react-icons/hi";
import { DataTable } from "@/components/data-table";
import { TransactionStatusBadge } from "@/components/admin/transactions/transaction-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { paymentProviderLabel } from "@/lib/validations/transactions";
import type { TransactionListItemDto } from "@/types/transactions";

const columns: ColumnDef<TransactionListItemDto>[] = [
  { id: "transaction", header: "Transacción", cell: ({ row }) => <div className="max-w-48"><Link href={`/admin/transactions/${row.original.id}`} className="block truncate font-medium hover:underline">{row.original.id.slice(0, 12)}…</Link><span className="text-xs text-muted-foreground">{row.original.type === "REFUND" ? "Con reembolso" : "Pago"}</span></div> },
  { id: "order", header: "Pedido / cliente", cell: ({ row }) => <div className="max-w-56"><Link href={`/admin/orders/${row.original.orderId}`} className="font-medium hover:underline">#{row.original.orderNumber}</Link><p className="truncate text-xs text-muted-foreground">{row.original.customerName || row.original.customerEmail}</p></div> },
  { id: "provider", header: "Proveedor", cell: ({ row }) => <Badge variant="secondary">{paymentProviderLabel[row.original.provider]}</Badge> },
  { id: "status", header: "Estado", cell: ({ row }) => <TransactionStatusBadge status={row.original.status} /> },
  { id: "amount", header: "Monto", cell: ({ row }) => <div className="font-medium tabular-nums">{formatMoney(row.original.amount, row.original.currency)}<p className="text-xs font-normal text-muted-foreground">{row.original.currency}</p></div> },
  { id: "method", header: "Método / referencia", cell: ({ row }) => <div className="max-w-40"><p className="truncate">{row.original.paymentMethod || "Sin informar"}</p><p className="truncate font-mono text-xs text-muted-foreground">{row.original.externalReference || "—"}</p></div> },
  { id: "dates", header: "Fechas", cell: ({ row }) => <div className="text-xs text-muted-foreground"><p>{formatDateTime(row.original.createdAt)}</p><p>Act. {formatDateTime(row.original.updatedAt)}</p></div> },
  { id: "review", header: "Conciliación", cell: ({ row }) => row.original.requiresReview || row.original.consistencyIssueCount ? <Badge variant="destructive">Revisar ({row.original.consistencyIssueCount})</Badge> : <Badge variant="outline">Consistente</Badge> },
  { id: "actions", header: "", cell: ({ row }) => <DropdownMenu><DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}><HiOutlineDotsHorizontal className="size-4" /></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem render={<Link href={`/admin/transactions/${row.original.id}`} />}><HiOutlineEye className="size-4" />Abrir detalle</DropdownMenuItem></DropdownMenuContent></DropdownMenu> },
];
export function TransactionsTable({ data }: { data: TransactionListItemDto[] }) { return <DataTable columns={columns} data={data} manual hideToolbar hidePagination emptyMessage="No hay transacciones para mostrar." />; }
