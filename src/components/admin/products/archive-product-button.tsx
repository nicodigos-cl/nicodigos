"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { archiveProductAction } from "@/lib/actions/products";

type ArchiveProductButtonProps = {
  productId: string;
  productName: string;
};

export function ArchiveProductButton({
  productId,
  productName,
}: ArchiveProductButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleArchive() {
    startTransition(() => {
      void (async () => {
        const result = await archiveProductAction({ id: productId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Producto archivado");
        setOpen(false);
        router.push("/admin/products");
        router.refresh();
      })();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            className="w-full sm:w-auto"
          />
        }
      >
        <HiOutlineTrash className="size-4" />
        Eliminar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Archivar producto?</AlertDialogTitle>
          <AlertDialogDescription>
            “{productName}” se marcará como <strong>Archivado</strong>. No se
            borrará el historial comercial (órdenes, keys, carritos). Puedes
            reactivarlo más tarde cambiando su estado.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              handleArchive();
            }}
          >
            {isPending ? "Archivando..." : "Archivar producto"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
