"use client";

import { Toaster } from "sonner";

export function StoreToaster() {
  return (
    <Toaster
      position="top-center"
      closeButton
      toastOptions={{
        classNames: {
          toast: "bg-popover text-popover-foreground border-border",
        },
      }}
    />
  );
}
