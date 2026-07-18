import Link from "next/link";
import { HiOutlineCube } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ProductNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineCube className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Producto no encontrado</EmptyTitle>
        <EmptyDescription>
          El producto solicitado no existe o fue eliminado.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/admin/products" />} nativeButton={false}>
          Volver al inventario
        </Button>
      </EmptyContent>
    </Empty>
  );
}
