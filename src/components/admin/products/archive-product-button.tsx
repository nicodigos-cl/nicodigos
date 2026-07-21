"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineArchive, HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveProductAction,
  deleteProductAction,
} from "@/lib/actions/products";

type ProductDangerActionsProps = {
  productId: string;
  productName: string;
};

export function ProductDangerActions({
  productId,
  productName,
}: ProductDangerActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(() => {
      void (async () => {
        const confirmed = await confirmDialog.warning({
          title: "Archivar producto",
          description: `“${productName}” se marcará como Archivado. No se borra el historial comercial y puedes reactivarlo después.`,
          confirmLabel: "Archivar",
        });
        if (!confirmed) return;

        const result = await archiveProductAction({ id: productId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Producto archivado");
        router.push("/admin/products");
        router.refresh();
      })();
    });
  }

  function handleDelete() {
    startTransition(() => {
      void (async () => {
        const confirmed = await confirmDialog.danger({
          title: "Eliminar definitivamente",
          description: `¿Borrar “${productName}” de forma permanente? No se puede deshacer. Si tiene ventas, deberás archivarlo en su lugar.`,
          confirmLabel: "Eliminar para siempre",
        });
        if (!confirmed) return;

        const result = await deleteProductAction({ id: productId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Producto eliminado");
        router.push("/admin/products");
        router.refresh();
      })();
    });
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={isPending}
        onClick={handleArchive}
      >
        <HiOutlineArchive className="size-4" />
        {isPending ? "…" : "Archivar"}
      </Button>
      <Button
        type="button"
        variant="destructive"
        className="w-full sm:w-auto"
        disabled={isPending}
        onClick={handleDelete}
      >
        <HiOutlineTrash className="size-4" />
        {isPending ? "…" : "Eliminar"}
      </Button>
    </div>
  );
}

/** @deprecated Use ProductDangerActions */
export function ArchiveProductButton(props: ProductDangerActionsProps) {
  return <ProductDangerActions {...props} />;
}
