"use client";

import { HiOutlineCheckCircle, HiOutlineExclamation, HiOutlineInformationCircle, HiOutlineQuestionMarkCircle, HiOutlineShieldExclamation } from "react-icons/hi";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  confirmDialog,
  useConfirmDialogStore,
  type ConfirmDialogVariant,
} from "@/stores/confirm-dialog-store";

const VARIANT_UI: Record<
  ConfirmDialogVariant,
  {
    mediaClass: string;
    contentClass: string;
    icon: typeof HiOutlineInformationCircle;
    actionClass?: string;
  }
> = {
  message: {
    mediaClass: "bg-muted text-muted-foreground",
    contentClass: "ring-border",
    icon: HiOutlineInformationCircle,
  },
  info: {
    mediaClass: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    contentClass: "ring-sky-500/25",
    icon: HiOutlineInformationCircle,
  },
  confirm: {
    mediaClass: "bg-primary/15 text-primary",
    contentClass: "ring-primary/20",
    icon: HiOutlineQuestionMarkCircle,
  },
  warning: {
    mediaClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    contentClass: "ring-amber-500/30",
    icon: HiOutlineExclamation,
    actionClass:
      "bg-amber-600 text-white hover:bg-amber-600/90 focus-visible:ring-amber-500/40",
  },
  danger: {
    mediaClass: "bg-destructive/15 text-destructive",
    contentClass: "ring-destructive/30",
    icon: HiOutlineShieldExclamation,
    actionClass: cn(buttonVariants({ variant: "destructive" })),
  },
  success: {
    mediaClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    contentClass: "ring-emerald-500/25",
    icon: HiOutlineCheckCircle,
  },
};

export function ConfirmDialogHost() {
  const open = useConfirmDialogStore((state) => state.open);
  const request = useConfirmDialogStore((state) => state.request);
  const close = useConfirmDialogStore((state) => state.close);

  const variant = request?.variant ?? "confirm";
  const ui = VARIANT_UI[variant];
  const Icon = ui.icon;
  const ackOnly = confirmDialog.isAckOnly(variant);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close(false);
      }}
    >
      <AlertDialogContent
        className={cn("sm:max-w-md", ui.contentClass)}
        size="default"
      >
        {request ? (
          <>
            <AlertDialogHeader>
              <AlertDialogMedia className={ui.mediaClass}>
                <Icon />
              </AlertDialogMedia>
              <AlertDialogTitle>{request.title}</AlertDialogTitle>
              {request.description ? (
                <AlertDialogDescription>
                  {request.description}
                </AlertDialogDescription>
              ) : (
                <AlertDialogDescription className="sr-only">
                  {request.title}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              {ackOnly ? (
                <AlertDialogAction
                  className={ui.actionClass}
                  onClick={(event) => {
                    event.preventDefault();
                    close(true);
                  }}
                >
                  {request.dismissLabel ?? "Entendido"}
                </AlertDialogAction>
              ) : (
                <>
                  <AlertDialogCancel
                    onClick={(event) => {
                      event.preventDefault();
                      close(false);
                    }}
                  >
                    {request.cancelLabel ?? "Cancelar"}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className={ui.actionClass}
                    onClick={(event) => {
                      event.preventDefault();
                      close(true);
                    }}
                  >
                    {request.confirmLabel ?? "Confirmar"}
                  </AlertDialogAction>
                </>
              )}
            </AlertDialogFooter>
          </>
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Re-export for convenient imports from the host module. */
export { confirmDialog, type ConfirmDialogVariant };
