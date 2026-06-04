import { cn } from "@/lib/utils";

type LandingBackgroundProps = {
  className?: string;
  variant?: "default" | "warm" | "violet";
};

export function LandingBackground({
  className,
  variant = "default",
}: LandingBackgroundProps) {
  return (
    <>
      <div
        className={cn(
          "absolute inset-0 admin-dashboard-grid opacity-20 pointer-events-none z-0",
          className,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute top-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full blur-[120px] pointer-events-none z-0",
          variant === "warm"
            ? "bg-rose-500/15 dark:bg-rose-500/5"
            : variant === "violet"
              ? "bg-violet-500/15 dark:bg-violet-500/5"
              : "bg-primary/50 dark:bg-primary/5",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute top-[30%] left-[-10%] h-[600px] w-[600px] rounded-full blur-[150px] pointer-events-none z-0",
          variant === "warm" ? "bg-amber-500/15" : "bg-indigo-500/50",
        )}
        aria-hidden
      />
    </>
  );
}
