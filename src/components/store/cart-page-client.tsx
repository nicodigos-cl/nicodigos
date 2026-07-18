"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiCheckCircle,
  HiOutlineClock,
  HiOutlineShoppingBag,
  HiOutlineX,
} from "react-icons/hi";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/lib/actions/orders";
import { formatMoney } from "@/lib/products/format";
import type { CartDto } from "@/types/orders";

export function CartPageClient({ cart }: { cart: CartDto | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineShoppingBag className="size-5" />
            </EmptyMedia>
            <EmptyTitle>Tu carrito está vacío</EmptyTitle>
            <EmptyDescription>
              Agrega productos al carrito para continuar con la compra.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/" />} nativeButton={false}>
              Seguir comprando
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  function updateQuantity(cartItemId: string, quantity: number) {
    startTransition(async () => {
      const result = await updateCartItemAction({ cartItemId, quantity });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  }

  function removeItem(cartItemId: string) {
    startTransition(async () => {
      const result = await removeCartItemAction({ cartItemId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Producto eliminado");
      router.refresh();
    });
  }

  return (
    <div className="bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo size={32} href="/" />
          <Button
            variant="ghost"
            size="sm"
            render={<Link href="/checkout" />}
            nativeButton={false}
          >
            Ir al checkout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-12 pb-24 sm:px-6 lg:max-w-7xl lg:px-8">
        <h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Carrito
        </h1>

        <div className="mt-12 lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">
          <section aria-labelledby="cart-heading" className="lg:col-span-7">
            <h2 id="cart-heading" className="sr-only">
              Productos en tu carrito
            </h2>
            <ul
              role="list"
              className="divide-y divide-border border-t border-b border-border"
            >
              {cart.items.map((product, index) => (
                <li key={product.id} className="flex py-6 sm:py-10">
                  <div className="shrink-0">
                    {product.coverImageUrl ? (
                      <Image
                        alt=""
                        src={product.coverImageUrl}
                        width={192}
                        height={192}
                        unoptimized
                        className="size-24 rounded-2xl object-cover sm:size-48"
                      />
                    ) : (
                      <div className="size-24 rounded-2xl bg-muted sm:size-48" />
                    )}
                  </div>

                  <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
                    <div className="relative pr-9 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:pr-0">
                      <div>
                        <h3 className="text-sm font-medium text-foreground">
                          {product.productName}
                        </h3>
                        <p className="mt-1 text-sm font-medium tabular-nums">
                          {formatMoney(product.unitPrice, product.currency)}
                        </p>
                      </div>

                      <div className="mt-4 sm:mt-0 sm:pr-9">
                        <NativeSelect
                          className="w-20"
                          aria-label={`Cantidad, ${product.productName}`}
                          value={product.quantity}
                          disabled={pending}
                          onChange={(event) =>
                            updateQuantity(
                              product.id,
                              Number.parseInt(event.target.value, 10),
                            )
                          }
                        >
                          {Array.from({ length: 8 }, (_, i) => i + 1).map(
                            (value) => (
                              <NativeSelectOption key={value} value={value}>
                                {value}
                              </NativeSelectOption>
                            ),
                          )}
                        </NativeSelect>

                        <div className="absolute top-0 right-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Eliminar"
                            disabled={pending}
                            onClick={() => removeItem(product.id)}
                          >
                            <HiOutlineX className="size-5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      {product.inStock ? (
                        <HiCheckCircle className="size-5 shrink-0 text-primary" />
                      ) : (
                        <HiOutlineClock className="size-5 shrink-0" />
                      )}
                      <span>
                        {product.inStock ? "En stock" : "Stock limitado"}
                      </span>
                      <span className="sr-only">{index}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="summary-heading"
            className="mt-16 rounded-2xl bg-muted/50 px-4 py-6 sm:p-6 lg:col-span-5 lg:mt-0 lg:p-8"
          >
            <h2
              id="summary-heading"
              className="text-lg font-medium text-foreground"
            >
              Resumen
            </h2>

            <dl className="mt-6 space-y-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">Subtotal</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {formatMoney(cart.subtotal, cart.currency)}
                </dd>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-4">
                <dt className="text-base font-medium">Total</dt>
                <dd className="text-base font-medium tabular-nums">
                  {formatMoney(cart.subtotal, cart.currency)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <Button
                className="w-full"
                size="lg"
                render={<Link href="/checkout" />}
                nativeButton={false}
              >
                Ir al checkout
              </Button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
