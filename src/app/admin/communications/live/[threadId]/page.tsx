import { notFound } from "next/navigation";

import { AdminLiveInbox } from "@/components/admin/communications/admin-live-inbox";
import { requireAdminSession } from "@/lib/auth/session";
import {
  getAdminLiveThreads,
  getLiveThreadForAdmin,
} from "@/lib/support-live/queries";

export default async function AdminLiveThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  await requireAdminSession();
  const { threadId } = await params;
  const [threads, active] = await Promise.all([
    getAdminLiveThreads(),
    getLiveThreadForAdmin(threadId),
  ]);

  if (!active) notFound();

  return (
    <div className="space-y-5">
      <header>
        <h1 className="font-heading text-2xl font-semibold">Soporte en vivo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversación con {active.thread.userName ?? active.thread.userEmail}
        </p>
      </header>
      <AdminLiveInbox
        threads={threads}
        activeThread={active.thread}
        initialMessages={active.messages}
      />
    </div>
  );
}
