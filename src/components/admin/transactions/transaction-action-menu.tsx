"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineDotsHorizontal } from "react-icons/hi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { addTransactionNoteAction, markTransactionForReviewAction, reconcileTransactionAction, refundTransactionAction, reprocessPaymentConfirmationAction, resolveTransactionReviewAction, retryRefundAction, syncTransactionStatusAction } from "@/lib/actions/transactions";
import type { TransactionDetailDto } from "@/types/transactions";

type Kind = "review" | "resolve" | "note" | "reprocess" | "refund" | null;
const inputClass = "w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";
export function TransactionActionMenu({ transaction }: { transaction: TransactionDetailDto }) {
  const router = useRouter(); const [pending, startTransition] = useTransition(); const [kind, setKind] = useState<Kind>(null); const [reason, setReason] = useState(""); const [note, setNote] = useState(""); const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH"); const [amount, setAmount] = useState(String(Math.max(0, transaction.amount - transaction.refundAmount))); const [confirmation, setConfirmation] = useState("");
  function run(label: string, task: () => Promise<{ success: boolean; message?: string }>) { startTransition(() => { void (async () => { const result = await task(); if (!result.success) return toast.error(result.message ?? "No se pudo completar la acción"); toast.success(label); setKind(null); setReason(""); setNote(""); setConfirmation(""); router.refresh(); })(); }); }
  function submit() { if (kind === "review") run("Marcada para revisión", () => markTransactionForReviewAction({ paymentId: transaction.id, reason, priority, note: note || undefined })); if (kind === "resolve") run("Revisión resuelta", () => resolveTransactionReviewAction({ paymentId: transaction.id, reason })); if (kind === "note") run("Nota agregada", () => addTransactionNoteAction({ paymentId: transaction.id, note: reason })); if (kind === "reprocess") run("Confirmación reprocesada", () => reprocessPaymentConfirmationAction({ paymentId: transaction.id, reason, confirmation })); if (kind === "refund") run("Reembolso solicitado a Flow", () => refundTransactionAction({ paymentId: transaction.id, amount, reason, confirmation })); }
  const canRefund = transaction.provider === "FLOW" && ["PAID", "PARTIALLY_REFUNDED"].includes(transaction.status) && transaction.refundAmount < transaction.amount;
  return <><DropdownMenu><DropdownMenuTrigger render={<Button variant="outline" size="sm" disabled={pending} aria-label="Acciones administrativas" />}><HiOutlineDotsHorizontal className="size-4" />Acciones</DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64">
    <DropdownMenuItem disabled={pending || transaction.provider !== "FLOW"} onClick={() => run("Estado consultado", () => syncTransactionStatusAction({ paymentId: transaction.id, reason: "Consulta administrativa" }))}>Consultar estado en Flow</DropdownMenuItem>
    <DropdownMenuItem disabled={pending || transaction.provider !== "FLOW"} onClick={() => run("Conciliación completada", () => reconcileTransactionAction({ paymentId: transaction.id, reason: "Conciliación administrativa" }))}>Conciliar con Flow</DropdownMenuItem>
    <DropdownMenuItem disabled={pending || transaction.provider !== "FLOW"} onClick={() => setKind("reprocess")}>Reprocesar confirmación</DropdownMenuItem><DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => setKind("note")}>Agregar nota</DropdownMenuItem>{transaction.requiresReview ? <DropdownMenuItem onClick={() => setKind("resolve")}>Resolver revisión</DropdownMenuItem> : <DropdownMenuItem onClick={() => setKind("review")}>Marcar para revisión</DropdownMenuItem>}
    <DropdownMenuSeparator /><DropdownMenuItem disabled={!canRefund} onClick={() => setKind("refund")}>Solicitar reembolso{!canRefund ? " (no disponible)" : ""}</DropdownMenuItem>
  </DropdownMenuContent></DropdownMenu>
  <Dialog open={kind !== null} onOpenChange={(open) => { if (!open) setKind(null); }}><DialogContent><DialogHeader><DialogTitle>{kind === "review" ? "Marcar para revisión" : kind === "resolve" ? "Resolver revisión" : kind === "note" ? "Agregar nota administrativa" : kind === "reprocess" ? "Reprocesar confirmación" : "Solicitar reembolso"}</DialogTitle><DialogDescription>{kind === "refund" ? "Flow solicitará aceptación al receptor. El estado financiero solo cambiará cuando el proveedor confirme el reembolso." : kind === "reprocess" ? "Se consultará Flow primero y solo se repetirán efectos internos idempotentes; no se realizará un nuevo cobro." : "La operación quedará registrada con tu identidad en el timeline."}</DialogDescription></DialogHeader><div className="space-y-3">
    {kind === "refund" ? <label className="grid gap-1 text-sm">Monto máximo {transaction.amount - transaction.refundAmount} {transaction.currency}<input className={inputClass} type="number" min="1" max={transaction.amount - transaction.refundAmount} value={amount} onChange={(e) => setAmount(e.target.value)} /></label> : null}
    {kind === "review" ? <label className="grid gap-1 text-sm">Prioridad<select className={inputClass} value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="CRITICAL">Crítica</option></select></label> : null}
    <label className="grid gap-1 text-sm">{kind === "note" ? "Nota" : "Motivo"}<textarea className={inputClass} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
    {kind === "review" ? <label className="grid gap-1 text-sm">Nota adicional<textarea className={inputClass} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label> : null}
    {kind === "refund" || kind === "reprocess" ? <label className="grid gap-1 text-sm">Escribe <strong>{kind === "refund" ? "REEMBOLSAR" : "REPROCESAR"}</strong> para confirmar<input className={inputClass} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></label> : null}
  </div><DialogFooter><Button variant="outline" onClick={() => setKind(null)} disabled={pending}>Cancelar</Button><Button onClick={submit} disabled={pending || !reason.trim() || (kind === "refund" && confirmation !== "REEMBOLSAR") || (kind === "reprocess" && confirmation !== "REPROCESAR")}>{pending ? "Procesando…" : "Confirmar"}</Button></DialogFooter></DialogContent></Dialog></>;
}

export function RefundStatusButton({ refundId }: { refundId: string }) {
  const router = useRouter(); const [pending, startTransition] = useTransition();
  return <Button size="xs" variant="outline" disabled={pending} onClick={() => startTransition(() => { void (async () => { const result = await retryRefundAction({ refundId }); if (!result.success) return toast.error(result.message); toast.success("Estado de reembolso actualizado"); router.refresh(); })(); })}>{pending ? "Consultando…" : "Consultar en Flow"}</Button>;
}
