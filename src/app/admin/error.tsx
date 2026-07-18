"use client";

import { useEffect } from "react";
import { HiOutlineExclamationCircle } from "react-icons/hi";

import { AdminRouteStatus } from "@/components/admin/admin-route-status";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AdminRouteStatus
      icon={HiOutlineExclamationCircle}
      title="Algo salió mal"
      description="No pudimos cargar esta sección del dashboard. Puedes reintentar o volver al inicio."
      digest={error.digest}
      actions={[
        { label: "Reintentar", onClick: reset },
        { label: "Ir al dashboard", href: "/admin", variant: "outline" },
      ]}
    />
  );
}
