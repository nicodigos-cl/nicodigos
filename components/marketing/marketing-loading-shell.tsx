import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type MarketingLoadingShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "default" | "rose" | "warm";
};

const orbVariants = {
  default: {
    primary: "bg-primary/10",
    secondary: "bg-indigo-500/10",
  },
  rose: {
    primary: "bg-rose-500/10",
    secondary: "bg-pink-500/5",
  },
  warm: {
    primary: "bg-rose-500/10",
    secondary: "bg-amber-500/10",
  },
} as const;

export function MarketingLoadingShell({
  children,
  className,
  contentClassName = "mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 relative z-10",
  variant = "default",
}: MarketingLoadingShellProps) {
  const orbs = orbVariants[variant];

  return (
    <main
      className={cn("flex-1 relative overflow-hidden bg-background", className)}
      aria-busy="true"
    >
      <div className="absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none" />
      <div
        className={cn(
          "absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full blur-[130px] pointer-events-none",
          orbs.primary,
        )}
      />
      <div
        className={cn(
          "absolute bottom-[-10%] left-[-10%] -z-10 h-[400px] w-[400px] rounded-full blur-[110px] pointer-events-none",
          orbs.secondary,
        )}
      />
      <div className={contentClassName}>{children}</div>
    </main>
  );
}
