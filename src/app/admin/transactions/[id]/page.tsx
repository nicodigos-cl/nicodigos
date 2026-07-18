import { notFound } from "next/navigation";
import { TransactionDetail } from "@/components/admin/transactions/transaction-detail";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminTransactionById } from "@/lib/transactions/queries";
export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) { await requireAdminSession(); const { id } = await params; const transaction = await getAdminTransactionById(id); if (!transaction) notFound(); return <TransactionDetail transaction={transaction} />; }
