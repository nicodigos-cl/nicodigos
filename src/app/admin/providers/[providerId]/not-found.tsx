import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProviderNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-card p-8">
      <h1 className="font-heading text-xl font-semibold">
        Provider no encontrado
      </h1>
      <p className="text-sm text-muted-foreground">
        El provider solicitado no existe o fue eliminado.
      </p>
      <Button render={<Link href="/admin/providers" />} nativeButton={false}>
        Volver a providers
      </Button>
    </div>
  );
}
