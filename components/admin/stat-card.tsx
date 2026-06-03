import * as React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    label?: string;
    positive?: boolean;
  };
  glowColor?: "primary" | "emerald" | "indigo" | "amber" | "rose" | "sky";
};

const glowMap = {
  primary: "group-hover:bg-primary/10 bg-primary/5 dark:bg-primary/5",
  emerald: "group-hover:bg-emerald-500/10 bg-emerald-500/5 dark:bg-emerald-500/5",
  indigo: "group-hover:bg-indigo-500/10 bg-indigo-500/5 dark:bg-indigo-500/5",
  amber: "group-hover:bg-amber-500/10 bg-amber-500/5 dark:bg-amber-500/5",
  rose: "group-hover:bg-rose-500/10 bg-rose-500/5 dark:bg-rose-500/5",
  sky: "group-hover:bg-sky-500/10 bg-sky-500/5 dark:bg-sky-500/5",
};

const iconGlowMap = {
  primary: "text-primary bg-primary/10 border-primary/20",
  emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  indigo: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  rose: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  sky: "text-sky-500 bg-sky-500/10 border-sky-500/20",
};

export function StatCard({
  title,
  value,
  description,
  className,
  icon,
  trend,
  glowColor = "primary",
}: StatCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "glass-card glass-card-hover border-none relative overflow-hidden group flex flex-col justify-between min-h-[120px] p-5 transition-all duration-300",
        className
      )}
    >
      {/* Decorative ambient background glow */}
      <div
        className={cn(
          "absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-all duration-500 pointer-events-none",
          glowMap[glowColor]
        )}
      />

      <div className="flex items-start justify-between relative z-10 w-full">
        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-wider uppercase text-muted-foreground/80">
            {title}
          </span>
          <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </div>
        </div>

        {icon ? (
          <div
            className={cn(
              "flex items-center justify-center p-2.5 rounded-xl border transition-all duration-300",
              iconGlowMap[glowColor]
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/10 relative z-10 w-full text-xs">
        {trend ? (
          <div className="flex items-center gap-1.5 font-medium">
            <span
              className={cn(
                "px-1.5 py-0.5 rounded-md",
                trend.positive
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {trend.value}
            </span>
            {trend.label ? (
              <span className="text-muted-foreground">{trend.label}</span>
            ) : null}
          </div>
        ) : (
          <span className="text-muted-foreground/80 truncate">
            {description}
          </span>
        )}
      </div>
    </Card>
  );
}

