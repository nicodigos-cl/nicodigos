import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function UserNotFound() {
  return (
    <Empty className="border border-border bg-card">
      <EmptyHeader>
        <EmptyTitle>Usuario no encontrado</EmptyTitle>
        <EmptyDescription>
          El usuario solicitado no existe o ya no está disponible.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link href="/admin/users" />} nativeButton={false}>
          Volver a usuarios
        </Button>
      </EmptyContent>
    </Empty>
  );
}
