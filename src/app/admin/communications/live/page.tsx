import { AdminLiveInbox } from "@/components/admin/communications/admin-live-inbox";
import { requireAdminSession } from "@/lib/auth/session";
import { getAdminLiveThreads } from "@/lib/support-live/queries";

export default async function AdminLiveCommunicationsPage() {
  await requireAdminSession();
  const threads = await getAdminLiveThreads();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Soporte en vivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversaciones en tiempo real con clientes. Los mensajes se persisten
          y se empujan por WebSocket.
        </p>
      </header>
      <AdminLiveInbox
        threads={threads}
        activeThread={null}
        initialMessages={[]}
      />
    </div>
  );
}
