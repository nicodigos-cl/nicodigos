"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { buyAgainAction } from "@/lib/actions/customer-dashboard";
import type { CustomerBuyAgainProduct } from "@/lib/customer-dashboard/types";
import { formatMoney } from "@/lib/products/format";

export function BuyAgain({ products }: { products: CustomerBuyAgainProduct[] }) {
  const [pending, startTransition] = useTransition();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="buy-again-heading" className="space-y-3">
      <h2 id="buy-again-heading" className="font-heading text-lg font-semibold">
        Comprar nuevamente
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {products.map((product) => (
          <li
            key={product.productId}
            className="flex gap-3 rounded-2xl border border-border bg-card p-3"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {product.coverImageUrl ? (
                <Image
                  src={product.coverImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div>
                <p className="truncate font-medium">{product.name}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatMoney(product.price, product.currency)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={pending || !product.inStock}
                  onClick={() => {
                    startTransition(() => {
                      void (async () => {
                        const result = await buyAgainAction({
                          productId: product.productId,
                        });
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success("Agregado al carrito");
                      })();
                    });
                  }}
                >
                  Volver a comprar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  render={<Link href="/cart" />}
                  nativeButton={false}
                >
                  Ver carrito
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
