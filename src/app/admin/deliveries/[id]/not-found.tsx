import Link from "next/link";
import { HiOutlineTruck } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function DeliveryNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineTruck className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Entrega no encontrada</EmptyTitle>
        <EmptyDescription>
          La entrega no existe o fue eliminada junto con su ítem de pedido.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/admin/deliveries" />} nativeButton={false}>
          Volver a entregas
        </Button>
      </EmptyContent>
    </Empty>
  );
}
