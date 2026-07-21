"use client";

import { create } from "zustand";

export type ConfirmDialogVariant =
  | "message"
  | "info"
  | "confirm"
  | "warning"
  | "danger"
  | "success";

export type ConfirmDialogRequest = {
  variant: ConfirmDialogVariant;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
};

type ConfirmDialogState = {
  open: boolean;
  request: ConfirmDialogRequest | null;
  resolve: ((value: boolean) => void) | null;
  openDialog: (request: ConfirmDialogRequest) => Promise<boolean>;
  close: (result: boolean) => void;
};

const DEFAULTS: Record<
  ConfirmDialogVariant,
  Pick<
    ConfirmDialogRequest,
    "confirmLabel" | "cancelLabel" | "dismissLabel"
  >
> = {
  message: { dismissLabel: "Entendido" },
  info: { dismissLabel: "Entendido" },
  success: { dismissLabel: "Listo" },
  confirm: { confirmLabel: "Confirmar", cancelLabel: "Cancelar" },
  warning: { confirmLabel: "Continuar", cancelLabel: "Cancelar" },
  danger: { confirmLabel: "Eliminar", cancelLabel: "Cancelar" },
};

function isAckOnly(variant: ConfirmDialogVariant): boolean {
  return variant === "message" || variant === "info" || variant === "success";
}

export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  open: false,
  request: null,
  resolve: null,
  openDialog: (request) => {
    const defaults = DEFAULTS[request.variant];
    const normalized: ConfirmDialogRequest = {
      ...request,
      confirmLabel: request.confirmLabel ?? defaults.confirmLabel,
      cancelLabel: request.cancelLabel ?? defaults.cancelLabel,
      dismissLabel: request.dismissLabel ?? defaults.dismissLabel,
    };

    return new Promise<boolean>((resolve) => {
      const previous = get().resolve;
      if (previous) previous(false);

      set({
        open: true,
        request: normalized,
        resolve,
      });
    });
  },
  close: (result) => {
    const { resolve } = get();
    set({ open: false, request: null, resolve: null });
    resolve?.(result);
  },
}));

export type ConfirmDialogOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dismissLabel?: string;
};

async function openWithVariant(
  variant: ConfirmDialogVariant,
  options: ConfirmDialogOptions,
): Promise<boolean> {
  return useConfirmDialogStore.getState().openDialog({
    variant,
    ...options,
  });
}

/**
 * Imperative confirm/alert dialog (Zustand).
 * Two-button variants return true/false; ack-only variants resolve true on dismiss.
 */
export const confirmDialog = Object.assign(
  function confirmDialog(
    options: ConfirmDialogOptions & { variant?: ConfirmDialogVariant },
  ): Promise<boolean> {
    return openWithVariant(options.variant ?? "confirm", options);
  },
  {
    message: (options: ConfirmDialogOptions) =>
      openWithVariant("message", options),
    info: (options: ConfirmDialogOptions) => openWithVariant("info", options),
    confirm: (options: ConfirmDialogOptions) =>
      openWithVariant("confirm", options),
    warning: (options: ConfirmDialogOptions) =>
      openWithVariant("warning", options),
    danger: (options: ConfirmDialogOptions) =>
      openWithVariant("danger", options),
    success: (options: ConfirmDialogOptions) =>
      openWithVariant("success", options),
    isAckOnly,
  },
);
