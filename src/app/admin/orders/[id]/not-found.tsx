import Link from "next/link";
import { HiOutlineShoppingBag } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function OrderNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineShoppingBag className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Orden no encontrada</EmptyTitle>
        <EmptyDescription>
          La orden solicitada no existe o fue eliminada.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/admin/orders" />} nativeButton={false}>
          Volver a órdenes
        </Button>
      </EmptyContent>
    </Empty>
  );
}
