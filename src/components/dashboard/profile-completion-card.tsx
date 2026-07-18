import Link from "next/link";
import { HiOutlineUser, HiOutlineArrowRight } from "react-icons/hi";

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

  const percentage = profile.level === "missing" ? 35 : 70;

  return (
    <section className="group relative overflow-hidden rounded-2xl border border-amber-200/50 bg-amber-500/5 p-5 dark:border-amber-900/30 dark:bg-amber-950/10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600 dark:text-amber-400">
            <HiOutlineUser className="size-5" />
          </div>
          <div className="space-y-1">
            <h2 className="font-heading text-base font-semibold text-foreground">
              Completa tu perfil de cliente
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl">
              Falta completar: <span className="font-medium text-foreground">{items.slice(0, 4).join(", ")}</span>
              {items.length > 4 ? "..." : ""}
            </p>
            <div className="flex items-center gap-2 pt-1.5">
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-950">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                {percentage}%
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0">
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/dashboard/profile" />}
            nativeButton={false}
            className="w-full sm:w-auto gap-1 border-amber-300/40 hover:bg-amber-500/10 hover:text-amber-700 dark:border-amber-800/40 text-amber-700 dark:text-amber-400 font-medium"
          >
            <span>Ir al perfil</span>
            <HiOutlineArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
