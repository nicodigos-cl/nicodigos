import Link from "next/link";
import type { ReactNode } from "react";
import { Package01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type AuthShellProps = {
  title: string;
  description: ReactNode;
  children: ReactNode;
  className?: string;
};

export function AuthShell({
  title,
  description,
  children,
  className,
}: AuthShellProps) {
  return (
    <div className={cn("flex min-h-full flex-1", className)}>
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 text-foreground"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <HugeiconsIcon icon={Package01Icon} strokeWidth={2} />
              </span>
              <span className="font-heading text-xl font-bold tracking-tight">
                Nicodigos
              </span>
            </Link>
            <h1 className="mt-8 text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="mt-10">{children}</div>
        </div>
      </div>

      <div className="relative hidden w-0 flex-1 lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1908&q=80"
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/55 via-primary/25 to-background/30" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-primary-foreground">
          <p className="max-w-md font-heading text-3xl font-semibold tracking-tight">
            Productos digitales, entrega inmediata
          </p>
          <p className="mt-3 max-w-sm text-sm text-primary-foreground/85">
            Claves, cuentas y servicios SMM listos para tu biblioteca. Compra
            segura y acceso al instante.
          </p>
        </div>
      </div>
    </div>
  );
}
