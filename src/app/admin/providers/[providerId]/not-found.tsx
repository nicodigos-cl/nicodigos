import Link from "next/link";
import { HiOutlineServer } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function ProviderNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineServer className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Provider no encontrado</EmptyTitle>
        <EmptyDescription>
          El provider solicitado no existe o fue eliminado.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/admin/providers" />} nativeButton={false}>
          Volver a providers
        </Button>
      </EmptyContent>
    </Empty>
  );
}
