import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineInbox } from "react-icons/hi2";
import { EmailThreadList } from "@/components/admin/communications/email-thread-list";
import { EmailToolbar } from "@/components/admin/communications/email-toolbar";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { requireAdminSession } from "@/lib/auth/session";
import { getEmailThreads } from "@/lib/communications/email-queries";
import { parseSearchParamsRecord } from "@/lib/validations/products";
import { threadListQuerySchema } from "@/lib/validations/communications";

export default async function EmailPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdminSession();
  const parsed = threadListQuerySchema.safeParse(parseSearchParamsRecord(await searchParams));
  if (!parsed.success) redirect("/admin/communications/email");
  const result = await getEmailThreads(parsed.data, session.user.id);
  return <div className="space-y-5"><EmailToolbar query={parsed.data} />{result.total ? <><EmailThreadList threads={result.items} /><div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">{result.total} conversaciones · página {result.page} de {result.totalPages}</span><div className="flex gap-2">{result.page > 1 ? <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : String(value)])), page: String(result.page - 1) })}`} />}>Anterior</Button> : null}{result.page < result.totalPages ? <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`?${new URLSearchParams({ ...Object.fromEntries(Object.entries(parsed.data).filter(([, value]) => value !== undefined).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : String(value)])), page: String(result.page + 1) })}`} />}>Siguiente</Button> : null}</div></div></> : <Empty className="border border-border bg-card"><EmptyHeader><EmptyMedia variant="icon"><HiOutlineInbox /></EmptyMedia><EmptyTitle>Sin conversaciones</EmptyTitle><EmptyDescription>No hay correos reales que coincidan con esta vista. Los emails entrantes aparecerán después de configurar Resend Inbound.</EmptyDescription></EmptyHeader><EmptyContent><Button variant="outline" nativeButton={false} render={<Link href="/admin/communications/settings" />}>Revisar configuración</Button></EmptyContent></Empty>}</div>;
}
