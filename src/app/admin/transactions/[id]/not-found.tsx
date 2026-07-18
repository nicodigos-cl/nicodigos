import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
export default function TransactionNotFound() { return <Empty className="border border-border bg-card"><EmptyHeader><EmptyTitle>Transacción no encontrada</EmptyTitle><EmptyDescription>La transacción no existe o ya no está disponible.</EmptyDescription></EmptyHeader><EmptyContent><Button render={<Link href="/admin/transactions" />} nativeButton={false}>Volver a Transacciones</Button></EmptyContent></Empty>; }
