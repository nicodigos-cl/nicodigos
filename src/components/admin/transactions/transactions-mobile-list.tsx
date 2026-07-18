import Link from "next/link";
import { TransactionStatusBadge } from "@/components/admin/transactions/transaction-status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { paymentProviderLabel } from "@/lib/validations/transactions";
import type { TransactionListItemDto } from "@/types/transactions";

export function TransactionsMobileList({ data }: { data: TransactionListItemDto[] }) { return <ul className="space-y-3">{data.map((row) => <li key={row.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-heading text-lg font-semibold">{formatMoney(row.amount, row.currency)}</p><p className="text-xs text-muted-foreground">Pedido #{row.orderNumber}</p></div><TransactionStatusBadge status={row.status} /></div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="truncate">{row.customerName || row.customerEmail}</dd></div><div><dt className="text-xs text-muted-foreground">Proveedor</dt><dd><Badge variant="secondary">{paymentProviderLabel[row.provider]}</Badge></dd></div><div><dt className="text-xs text-muted-foreground">Fecha</dt><dd>{formatDateTime(row.createdAt)}</dd></div><div><dt className="text-xs text-muted-foreground">Referencia</dt><dd className="font-mono text-xs">{row.externalReference || "—"}</dd></div></dl><Button className="mt-3 w-full" size="sm" variant="outline" render={<Link href={`/admin/transactions/${row.id}`} />} nativeButton={false}>Abrir detalle</Button></li>)}</ul>; }
