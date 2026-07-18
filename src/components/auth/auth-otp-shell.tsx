import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type AuthOtpShellProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AuthOtpShell({
  title,
  description,
  children,
  className,
}: AuthOtpShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col items-center justify-center px-4 py-16",
        className,
      )}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Logo size={64} priority />
          <h1 className="mt-8 text-xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
