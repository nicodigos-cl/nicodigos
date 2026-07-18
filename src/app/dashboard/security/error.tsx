"use client";

import { useEffect } from "react";
import { HiOutlineShieldExclamation } from "react-icons/hi2";

import { Button } from "@/components/ui/button";

export default function CustomerSecurityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-80 w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <HiOutlineShieldExclamation className="size-7" />
      </div>
      <h1 className="mt-4 font-heading text-xl font-semibold">No pudimos cargar tu seguridad</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Tus datos no fueron modificados. Intenta cargar la página nuevamente.
      </p>
      <Button className="mt-5" type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
