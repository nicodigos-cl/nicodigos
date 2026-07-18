import { redirect } from "next/navigation";
export default async function LegacyPaymentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; redirect(`/admin/transactions/${id}`); }
