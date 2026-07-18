import { HiOutlineSearch } from "react-icons/hi";

import { AdminRouteStatus } from "@/components/admin/admin-route-status";

export default function AdminNotFound() {
  return (
    <AdminRouteStatus
      icon={HiOutlineSearch}
      title="Página no encontrada"
      description="Esta ruta no existe en el dashboard o el recurso fue eliminado."
      actions={[
        { label: "Ir al dashboard", href: "/admin" },
        { label: "Ver productos", href: "/admin/products", variant: "outline" },
      ]}
    />
  );
}
