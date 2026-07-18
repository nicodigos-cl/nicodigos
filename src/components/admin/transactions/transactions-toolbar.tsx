"use client";

import { useTransition } from "react";
import Link from "next/link";
import { HiOutlineDownload, HiOutlineFilter, HiOutlineRefresh } from "react-icons/hi";
import { toast } from "sonner";
import { SsrSearchInput } from "@/components/admin/ssr-search-input";
import { Button } from "@/components/ui/button";
import { exportTransactionsAction } from "@/lib/actions/transactions";
import { transactionsHref } from "@/lib/transactions/url";
import { paymentProviderLabel, paymentStatusLabel, type TransactionsListQuery } from "@/lib/validations/transactions";

const inputClass = "h-9 rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

export function TransactionsToolbar({ query }: { query: TransactionsListQuery }) {
  const [exporting, startExport] = useTransition();
  function exportCsv() { startExport(() => { void (async () => {
    const { page: _page, pageSize: _pageSize, ...filters } = query; void _page; void _pageSize;
    const result = await exportTransactionsAction({ ...filters, confirmation: "EXPORTAR" });
    if (!result.success) return toast.error(result.message);
    const url = URL.createObjectURL(new Blob([result.data.content], { type: "text/csv;charset=utf-8" })); const link = document.createElement("a"); link.href = url; link.download = result.data.filename; link.click(); URL.revokeObjectURL(url); toast.success("Exportación preparada");
  })(); }); }
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h1 className="font-heading text-2xl font-semibold tracking-tight">Transacciones</h1><p className="max-w-2xl text-sm text-muted-foreground">Consulta, audita y gestiona los pagos procesados en Nicodigos.</p></div><Button type="button" variant="outline" size="sm" disabled={exporting} onClick={exportCsv}><HiOutlineDownload className="size-4" />{exporting ? "Exportando…" : "Exportar CSV"}</Button></div>
    <div className="flex flex-wrap items-center gap-2"><SsrSearchInput value={query.q ?? ""} buildHref={(q) => transactionsHref(query, { q, page: 1 })} placeholder="ID, pedido, cliente o referencia…" aria-label="Buscar transacciones" className="w-full max-w-sm sm:w-80" /><Button variant="outline" size="sm" render={<Link href="/admin/transactions" />} nativeButton={false}><HiOutlineRefresh className="size-4" />Limpiar</Button></div>
    <details className="rounded-2xl border border-border bg-card"><summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium"><HiOutlineFilter className="size-4" />Filtros y ordenamiento</summary><form method="get" className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
      {query.q ? <input type="hidden" name="q" value={query.q} /> : null}
      <label className="grid gap-1 text-xs text-muted-foreground">Estado<select name="status" defaultValue={query.status ?? ""} className={inputClass}><option value="">Todos</option>{Object.entries(paymentStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Proveedor<select name="provider" defaultValue={query.provider ?? ""} className={inputClass}><option value="">Todos</option>{Object.entries(paymentProviderLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Tipo<select name="type" defaultValue={query.type ?? ""} className={inputClass}><option value="">Todos</option><option value="PAYMENT">Transacción</option><option value="REFUND">Con reembolso</option></select></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Método<input name="method" defaultValue={query.method} className={inputClass} placeholder="Webpay, Mach…" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Moneda<input name="currency" defaultValue={query.currency} className={inputClass} maxLength={3} placeholder="CLP" /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Desde<input type="date" name="from" defaultValue={query.from?.slice(0, 10)} className={inputClass} /></label><label className="grid gap-1 text-xs text-muted-foreground">Hasta<input type="date" name="to" defaultValue={query.to?.slice(0, 10)} className={inputClass} /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Monto mínimo<input type="number" min="0" name="minAmount" defaultValue={query.minAmount} className={inputClass} /></label><label className="grid gap-1 text-xs text-muted-foreground">Monto máximo<input type="number" min="0" name="maxAmount" defaultValue={query.maxAmount} className={inputClass} /></label>
      <label className="grid gap-1 text-xs text-muted-foreground">Orden<select name="sort" defaultValue={query.sort} className={inputClass}><option value="createdAt">Creación</option><option value="updatedAt">Actualización</option><option value="amount">Monto</option><option value="status">Estado</option></select></label><label className="grid gap-1 text-xs text-muted-foreground">Dirección<select name="order" defaultValue={query.order} className={inputClass}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></label><label className="grid gap-1 text-xs text-muted-foreground">Resultados<select name="pageSize" defaultValue={query.pageSize} className={inputClass}><option value="10">10</option><option value="20">20</option><option value="50">50</option><option value="100">100</option></select></label>
      <fieldset className="grid gap-2 text-sm sm:col-span-2 lg:col-span-4"><legend className="mb-1 text-xs text-muted-foreground">Diagnóstico</legend><div className="flex flex-wrap gap-x-4 gap-y-2">{[
        ["hasError", "Con error", query.hasError], ["withoutConfirmation", "Sin confirmación", query.withoutConfirmation], ["webhookReceived", "Callback recibido", query.webhookReceived], ["needsReconciliation", "Pendiente de conciliación", query.needsReconciliation], ["refunded", "Reembolsadas", query.refunded], ["possibleDuplicate", "Posibles duplicadas", query.possibleDuplicate], ["inconsistentPaidOrder", "Pedido inconsistente", query.inconsistentPaidOrder], ["approvedWithoutDelivery", "Aprobada sin entrega", query.approvedWithoutDelivery], ["requiresReview", "Revisión manual", query.requiresReview],
      ].map(([name, label, checked]) => <label key={String(name)} className="flex items-center gap-2"><input type="checkbox" name={String(name)} value="true" defaultChecked={Boolean(checked)} />{String(label)}</label>)}</div></fieldset>
      <div className="sm:col-span-2 lg:col-span-4"><Button type="submit" size="sm">Aplicar filtros</Button></div>
    </form></details>
  </div>;
}
