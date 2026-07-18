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
import { CUSTOMER_ORDERS_PATH } from "@/lib/customer-dashboard/paths";

export default function CustomerPedidoNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineShoppingBag className="size-5" />
        </EmptyMedia>
        <EmptyTitle>No encontramos este pedido</EmptyTitle>
        <EmptyDescription>
          El pedido solicitado no existe o no tienes acceso a él.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          render={<Link href={CUSTOMER_ORDERS_PATH} />}
          nativeButton={false}
        >
          Volver a mis pedidos
        </Button>
      </EmptyContent>
    </Empty>
  );
}
