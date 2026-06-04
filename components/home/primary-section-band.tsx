import { cn } from "@/lib/utils";

type PrimarySectionBandProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** Extra decorative accent: warm glow vs cool glow */
  accent?: "warm" | "cool";
};

export function PrimarySectionBand({
  id,
  children,
  className,
  accent = "cool",
}: PrimarySectionBandProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative overflow-hidden bg-primary text-primary-foreground",
        className,
      )}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 admin-dashboard-grid opacity-[0.12] pointer-events-none"
        aria-hidden
      />

      {/* Diagonal shine */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary-foreground/10 via-transparent to-transparent pointer-events-none"
        aria-hidden
      />

      {/* Orbs */}
      <div
        className={cn(
          "absolute -top-24 -right-24 size-80 rounded-full blur-[100px] pointer-events-none",
          accent === "warm" ? "bg-amber-300/25" : "bg-primary-foreground/15",
        )}
        aria-hidden
      />
      <div
        className={cn(
          "absolute -bottom-32 -left-20 size-96 rounded-full blur-[120px] pointer-events-none",
          accent === "warm" ? "bg-rose-400/20" : "bg-indigo-400/25",
        )}
        aria-hidden
      />

      {/* Edge fade into page background */}
      <div
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/30 to-transparent pointer-events-none"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent pointer-events-none"
        aria-hidden
      />

      <div className="relative z-10">{children}</div>
    </section>
  );
}
