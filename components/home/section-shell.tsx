import Link from "next/link";
import { IconChevronRight } from "@tabler/icons-react";

import { PrimarySectionBand } from "@/components/home/primary-section-band";
import { cn } from "@/lib/utils";

type SectionShellProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "primary";
  primaryAccent?: "warm" | "cool";
};

export function SectionShell({
  id,
  eyebrow,
  title,
  description,
  href,
  linkLabel = "Ver más",
  children,
  className,
  variant = "default",
  primaryAccent = "cool",
}: SectionShellProps) {
  const isPrimary = variant === "primary";

  const header = (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p
            className={cn(
              "text-xs font-bold uppercase tracking-widest",
              isPrimary ? "text-primary-foreground/70" : "text-primary",
            )}
          >
            {eyebrow}
          </p>
        ) : null}
        <h2
          className={cn(
            "font-heading text-2xl font-extrabold tracking-tight sm:text-3xl",
            isPrimary ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {title}
        </h2>
        {description ? (
          <p
            className={cn(
              "max-w-2xl text-sm leading-relaxed",
              isPrimary
                ? "text-primary-foreground/80"
                : "text-muted-foreground/90",
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className={cn(
            "shrink-0 text-sm font-medium transition-colors flex items-center gap-0.5 group",
            isPrimary
              ? "text-primary-foreground hover:text-primary-foreground/80"
              : "text-primary hover:text-primary/80",
          )}
        >
          {linkLabel}
          <IconChevronRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : null}
    </div>
  );

  const inner = (
    <div className={cn("mx-auto max-w-7xl px-4 sm:px-6 lg:px-8", className)}>
      {header}
      {children}
    </div>
  );

  if (isPrimary) {
    return (
      <PrimarySectionBand id={id} accent={primaryAccent}>
        {inner}
      </PrimarySectionBand>
    );
  }

  return (
    <section id={id} className={cn("relative", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {header}
        {children}
      </div>
    </section>
  );
}
