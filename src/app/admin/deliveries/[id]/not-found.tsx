import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function DeliveryNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="font-heading text-2xl font-semibold">Entrega no encontrada</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La entrega no existe o fue eliminada junto con su ítem de pedido.
      </p>
      <Button render={<Link href="/admin/deliveries" />} nativeButton={false}>
        Volver a entregas
      </Button>
    </div>
  );
}
