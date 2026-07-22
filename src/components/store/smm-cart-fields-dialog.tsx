"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ResponsiveOverlay } from "@/components/store/responsive-overlay";
import { SmmOrderFieldsForm } from "@/components/store/smm-order-fields-form";
import { Button } from "@/components/ui/button";
import { cartKeys } from "@/hooks/use-cart";
import {
  addSmmCartItemAction,
  updateCartItemSmmAction,
} from "@/lib/actions/orders";
import type { SmmOrderFieldsPayload } from "@/lib/validations/smm-order-fields";
import type { CartLineSmmDto } from "@/types/orders";

type Mode =
  | {
      mode: "add";
      productId: string;
      productName: string;
      serviceType: string | null;
      smmMin?: number | null;
      smmMax?: number | null;
    }
  | {
      mode: "edit";
      cartItemId: string;
      productName: string;
      serviceType: string | null;
      smmMin?: number | null;
      smmMax?: number | null;
      initialSmm: CartLineSmmDto | null;
    };

type SmmCartFieldsDialogProps = Mode & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toPayload(
  smm: CartLineSmmDto | null | undefined,
): SmmOrderFieldsPayload {
  if (!smm) return {};
  return {
    link: smm.link ?? undefined,
    username: smm.username ?? undefined,
    quantity: smm.quantity ?? undefined,
    comments: smm.comments ?? undefined,
    runs: smm.runs ?? undefined,
    intervalMinutes: smm.intervalMinutes ?? undefined,
    usernames: smm.usernames ?? undefined,
    hashtags: smm.hashtags ?? undefined,
    mediaUrl: smm.mediaUrl ?? undefined,
    min: smm.min ?? undefined,
    max: smm.max ?? undefined,
    delayMinutes: smm.delayMinutes ?? undefined,
    posts: smm.posts ?? undefined,
    oldPosts: smm.oldPosts ?? undefined,
    expiry: smm.expiry ?? undefined,
    answerNumber: smm.answerNumber ?? undefined,
  };
}

export function SmmCartFieldsDialog(props: SmmCartFieldsDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<SmmOrderFieldsPayload>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const formKey =
    props.mode === "edit"
      ? `edit-${props.cartItemId}`
      : `add-${props.productId}`;

  const [prevFormKey, setPrevFormKey] = useState(formKey);
  const [prevOpen, setPrevOpen] = useState(props.open);

  if (props.open !== prevOpen || formKey !== prevFormKey) {
    setPrevOpen(props.open);
    setPrevFormKey(formKey);
    if (props.open) {
      setFieldErrors({});
      setValues(props.mode === "edit" ? toPayload(props.initialSmm) : {});
    }
  }

  function submit() {
    setFieldErrors({});
    startTransition(() => {
      void (async () => {
        const result =
          props.mode === "add"
            ? await addSmmCartItemAction({
                productId: props.productId,
                smm: values,
              })
            : await updateCartItemSmmAction({
                cartItemId: props.cartItemId,
                smm: values,
              });

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          return;
        }

        toast.success(
          props.mode === "add" ? "Agregado al carrito" : "Destino actualizado",
        );
        props.onOpenChange(false);
        await queryClient.invalidateQueries({ queryKey: cartKeys.all });
        router.refresh();
      })();
    });
  }

  return (
    <ResponsiveOverlay
      open={props.open}
      onOpenChange={props.onOpenChange}
      title={
        props.mode === "add"
          ? "Datos del servicio"
          : "Editar destino del servicio"
      }
      description={`Completa los datos para “${props.productName}” antes de continuar.`}
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => props.onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="button" disabled={pending} onClick={submit}>
            {pending
              ? "Guardando…"
              : props.mode === "add"
                ? "Agregar al carrito"
                : "Guardar"}
          </Button>
        </div>
      }
    >
      <SmmOrderFieldsForm
        key={formKey}
        serviceType={props.serviceType}
        smmMin={props.smmMin}
        smmMax={props.smmMax}
        initialValues={
          props.mode === "edit" ? toPayload(props.initialSmm) : undefined
        }
        fieldErrors={fieldErrors}
        disabled={pending}
        onChange={setValues}
      />
    </ResponsiveOverlay>
  );
}

type AddSmmToCartButtonProps = {
  productId: string;
  productName: string;
  serviceType: string | null;
  smmMin?: number | null;
  smmMax?: number | null;
  className?: string;
  children?: React.ReactNode;
};

export function AddSmmToCartButton({
  productId,
  productName,
  serviceType,
  smmMin,
  smmMax,
  className,
  children,
}: AddSmmToCartButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className={className} onClick={() => setOpen(true)}>
        {children ?? "Agregar al carrito"}
      </Button>
      <SmmCartFieldsDialog
        mode="add"
        open={open}
        onOpenChange={setOpen}
        productId={productId}
        productName={productName}
        serviceType={serviceType}
        smmMin={smmMin}
        smmMax={smmMax}
      />
    </>
  );
}
