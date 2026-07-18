import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { CustomerProfileCompleteness } from "@/lib/customer-dashboard/types";

export function ProfileCompletionCard({
  profile,
}: {
  profile: CustomerProfileCompleteness;
}) {
  if (profile.level === "complete") return null;

  const items =
    profile.missing.length > 0 ? profile.missing : profile.recommended;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="font-medium">Completa tu perfil</h2>
          <p className="text-sm text-muted-foreground">
            Falta: {items.slice(0, 4).join(", ")}
            {items.length > 4 ? "…" : null}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/dashboard/profile" />}
          nativeButton={false}
        >
          Ir al perfil
        </Button>
      </div>
    </section>
  );
}
