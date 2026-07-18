"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type CustomerNotificationsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function CustomerNotificationsError({
  error,
  reset,
}: CustomerNotificationsErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">
        No pudimos cargar tus preferencias de notificaciones. Intenta
        nuevamente.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
