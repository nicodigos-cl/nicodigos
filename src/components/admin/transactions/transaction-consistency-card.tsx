import { HiOutlineCheckCircle, HiOutlineExclamationCircle } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
import type { TransactionConsistencyIssue } from "@/lib/transactions/consistency";

export function TransactionConsistencyCard({ issues }: { issues: TransactionConsistencyIssue[] }) {
  return <section className="rounded-2xl border border-border bg-card p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-medium">Revisión de consistencia</h2><Badge variant={issues.length ? "destructive" : "outline"}>{issues.length ? `${issues.length} problema(s)` : "Consistente"}</Badge></div>{issues.length ? <ul className="mt-4 space-y-3">{issues.map((issue) => <li key={issue.type} className="flex gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3"><HiOutlineExclamationCircle className="mt-0.5 size-5 shrink-0 text-destructive" /><div><p className="text-sm font-medium">{issue.type.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{issue.message}</p><Badge variant="outline" className="mt-2">Severidad: {issue.severity}</Badge></div></li>)}</ul> : <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><HiOutlineCheckCircle className="size-5 text-primary" />Payment local, pedido y entregas no presentan diferencias detectables.</div>}</section>;
}
