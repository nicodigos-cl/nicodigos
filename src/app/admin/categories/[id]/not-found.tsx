import Link from "next/link";
import { HiOutlineFolder } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function CategoryNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineFolder className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Categoría no encontrada</EmptyTitle>
        <EmptyDescription>
          La categoría solicitada no existe o fue eliminada.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          render={<Link href="/admin/categories" />}
          nativeButton={false}
        >
          Volver a categorías
        </Button>
      </EmptyContent>
    </Empty>
  );
}
