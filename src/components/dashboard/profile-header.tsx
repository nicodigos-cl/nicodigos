import Link from "next/link";
import { HiOutlineLockClosed, HiOutlineShoppingBag } from "react-icons/hi";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

export function ProfileHeader() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/dashboard" />}>
              Cuenta
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Perfil</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground">
            Perfil
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra tus datos personales y de facturación.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            render={<Link href="/dashboard/security" />}
            nativeButton={false}
            className="gap-2 font-medium"
          >
            <HiOutlineLockClosed className="size-4 text-muted-foreground" />
            <span>Ir a Seguridad</span>
          </Button>
          <Button
            variant="outline"
            render={<Link href="/dashboard/pedidos" />}
            nativeButton={false}
            className="gap-2 font-medium"
          >
            <HiOutlineShoppingBag className="size-4 text-muted-foreground" />
            <span>Ver mis pedidos</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
