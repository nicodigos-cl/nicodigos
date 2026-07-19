"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  HiCheckCircle,
  HiOutlineClock,
  HiOutlineShoppingBag,
  HiOutlineX,
} from "react-icons/hi";

import { useIsMobile } from "@/hooks/use-mobile";
import { SmmCartFieldsDialog } from "@/components/store/smm-cart-fields-dialog";
import { smmSummaryLabel } from "@/components/store/smm-order-fields-form";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  useCart,
  useRemoveCartItem,
  useUpdateCartItem,
} from "@/hooks/use-cart";
import { formatMoney } from "@/lib/products/format";
import type { CartLineDto } from "@/types/orders";

type StoreCartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CartEmpty({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <Empty className="border-0 bg-transparent py-6">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HiOutlineShoppingBag className="size-5" />
        </EmptyMedia>
        <EmptyTitle>Tu carrito está vacío</EmptyTitle>
        <EmptyDescription>
          Agrega productos para continuar con la compra.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" onClick={onClose}>
          Seguir comprando
        </Button>
      </EmptyContent>
    </Empty>
  );
}

function CartLines({
  items,
  pending,
  onEditSmm,
  onUpdateQuantity,
  onRemove,
}: {
  items: CartLineDto[];
  pending: boolean;
  onEditSmm: (item: CartLineDto) => void;
  onUpdateQuantity: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
}) {
  return (
    <ul role="list" className="divide-y divide-border">
      {items.map((item) => {
        const isSmm = item.deliveryMethod === "SMM";
        const summary = smmSummaryLabel(item.smm ?? undefined);

        return (
          <li key={item.id} className="flex gap-3 py-4 first:pt-0 last:pb-0">
            <div className="shrink-0">
              {item.coverImageUrl ? (
                <Image
                  alt=""
                  src={item.coverImageUrl}
                  width={72}
                  height={72}
                  unoptimized
                  className="size-16 rounded-xl object-cover sm:size-[72px]"
                />
              ) : (
                <div className="size-16 rounded-xl bg-muted sm:size-[72px]" />
              )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.productName}
                  </p>
                  <p className="mt-0.5 text-sm font-medium tabular-nums text-muted-foreground">
                    {formatMoney(item.unitPrice, item.currency)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar ${item.productName}`}
                  disabled={pending}
                  onClick={() => onRemove(item.id)}
                >
                  <HiOutlineX className="size-4" />
                </Button>
              </div>

              {isSmm ? (
                <div className="space-y-1">
                  <p className="truncate text-xs text-muted-foreground">
                    {summary
                      ? `Destino: ${summary}`
                      : "Sin destino configurado"}
                  </p>
                  {!item.smmComplete ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      Faltan datos del servicio
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto px-0"
                    onClick={() => onEditSmm(item)}
                  >
                    {item.smmComplete ? "Editar destino" : "Completar destino"}
                  </Button>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2">
                {isSmm ? (
                  <p className="text-xs text-muted-foreground">
                    Cant. {item.quantity}
                  </p>
                ) : (
                  <NativeSelect
                    size="sm"
                    className="w-18"
                    aria-label={`Cantidad, ${item.productName}`}
                    value={item.quantity}
                    disabled={pending}
                    onChange={(event) =>
                      onUpdateQuantity(
                        item.id,
                        Number.parseInt(event.target.value, 10),
                      )
                    }
                  >
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {value}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                )}

                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {item.inStock ? (
                    <HiCheckCircle className="size-4 shrink-0 text-primary" />
                  ) : (
                    <HiOutlineClock className="size-4 shrink-0" />
                  )}
                  <span>{item.inStock ? "En stock" : "Stock limitado"}</span>
                </p>
              </div>

              <p className="text-sm font-medium tabular-nums">
                {formatMoney(item.lineTotal, item.currency)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function StoreCartDrawer({ open, onOpenChange }: StoreCartDrawerProps) {
  const { data, isPending, isError } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();
  const [editing, setEditing] = useState<CartLineDto | null>(null);

  const cart = data?.cart ?? null;
  const itemsCount = cart?.itemsCount ?? 0;
  const mutating = updateItem.isPending || removeItem.isPending;
  const hasItems = Boolean(cart && cart.items.length > 0);
  const hasIncompleteSmm =
    cart?.items.some(
      (item) => item.deliveryMethod === "SMM" && !item.smmComplete,
    ) ?? false;

  const title = itemsCount > 0 ? `Carrito (${itemsCount})` : "Carrito";

  let body: ReactNode;
  if (isPending) {
    body = (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Cargando carrito…
      </p>
    );
  } else if (isError) {
    body = (
      <p className="py-10 text-center text-sm text-destructive">
        No se pudo cargar el carrito.
      </p>
    );
  } else if (!hasItems) {
    body = (
      <CartEmpty
        onClose={() => onOpenChange(false)}
      />
    );
  } else {
    body = (
      <>
        {hasIncompleteSmm ? (
          <p className="mb-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            Completa los datos de destino de tus servicios antes de pagar.
          </p>
        ) : null}
        <CartLines
          items={cart!.items}
          pending={mutating}
          onEditSmm={setEditing}
          onUpdateQuantity={(cartItemId, quantity) =>
            updateItem.mutate({ cartItemId, quantity })
          }
          onRemove={(cartItemId) => removeItem.mutate({ cartItemId })}
        />
      </>
    );
  }

  const footer =
    hasItems && cart ? (
      <div className="flex w-full flex-col gap-3">
        <dl className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium tabular-nums">
              {formatMoney(cart.subtotal, cart.currency)}
            </dd>
          </div>
          <div className="flex items-center justify-between text-base font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">
              {formatMoney(cart.subtotal, cart.currency)}
            </dd>
          </div>
        </dl>

        {hasIncompleteSmm ? (
          <Button className="w-full" size="lg" disabled>
            Completa los destinos SMM
          </Button>
        ) : (
          <Button
            className="w-full"
            size="lg"
            render={<Link href="/checkout" />}
            nativeButton={false}
            onClick={() => onOpenChange(false)}
          >
            Ir al checkout
          </Button>
        )}

        <Button
          variant="ghost"
          className="w-full"
          render={<Link href="/cart" />}
          nativeButton={false}
          onClick={() => onOpenChange(false)}
        >
          Ver carrito completo
        </Button>
      </div>
    ) : null;

  const isMobile = useIsMobile();

  const editingDialog = editing ? (
    <SmmCartFieldsDialog
      mode="edit"
      open={Boolean(editing)}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setEditing(null);
      }}
      cartItemId={editing.id}
      productName={editing.productName}
      serviceType={editing.smmServiceType}
      smmMin={editing.smmMin}
      smmMax={editing.smmMax}
      initialSmm={editing.smm}
    />
  ) : null;

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
          <DrawerContent className="max-h-[90dvh]">
            <DrawerHeader className="text-left border-b border-border/40 pb-4">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>Revisa tus productos antes de pagar.</DrawerDescription>
            </DrawerHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {body}
            </div>
            {footer ? (
              <DrawerFooter className="border-t border-border/40 p-4 bg-background">
                {footer}
              </DrawerFooter>
            ) : null}
          </DrawerContent>
        </Drawer>
        {editingDialog}
      </>
    );
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="sm:max-w-md flex flex-col h-full p-0">
          <SheetHeader className="p-6 border-b border-border/40">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>Revisa tus productos antes de pagar.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {body}
          </div>
          {footer ? (
            <SheetFooter className="p-6 border-t border-border/40 mt-auto bg-background">
              {footer}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>
      {editingDialog}
    </>
  );
}
