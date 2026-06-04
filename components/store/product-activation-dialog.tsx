"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type ProductActivationDialogProps = {
  activationDetails: string | null;
};

export function ProductActivationDialog({
  activationDetails,
}: ProductActivationDialogProps) {
  const [open, setOpen] = useState(false);

  if (!activationDetails) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="font-medium text-primary hover:text-primary/80 cursor-pointer transition-colors bg-transparent border-0 p-0 text-left"
        >
          Ver detalles de activación
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">
            Detalles de Activación
          </DialogTitle>
          <DialogDescription className="text-xs">
            Instrucciones para activar tu clave de producto oficial.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-line bg-muted/30 border border-border/40 rounded-xl p-4 mt-2 max-h-[50vh]">
          {activationDetails}
        </div>
      </DialogContent>
    </Dialog>
  );
}
