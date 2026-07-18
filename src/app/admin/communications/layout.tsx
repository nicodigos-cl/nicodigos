import { CommunicationsNav } from "@/components/admin/communications/communications-nav";

export default function CommunicationsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-5"><CommunicationsNav />{children}</div>;
}
