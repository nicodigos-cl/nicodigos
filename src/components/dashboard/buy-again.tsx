"use client";

import Image from "next/image";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { HiOutlineShoppingCart } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { buyAgainAction } from "@/lib/actions/customer-dashboard";
import type { CustomerBuyAgainProduct } from "@/lib/customer-dashboard/types";
import { formatMoney } from "@/lib/products/format";

export function BuyAgain({ products }: { products: CustomerBuyAgainProduct[] }) {
  const [pending, startTransition] = useTransition();

  if (products.length === 0) return null;

  return (
    <section aria-labelledby="buy-again-heading" className="space-y-4">
      <h2 id="buy-again-heading" className="font-heading text-lg font-semibold text-foreground">
        Comprar nuevamente
      </h2>
      <ul className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <li
            key={product.productId}
            className="group flex gap-4 rounded-2xl border border-border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-xs"
          >
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
              {product.coverImageUrl ? (
                <Image
                  src={product.coverImageUrl}
                  alt=""
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="80px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground bg-muted">
                  <HiOutlineShoppingCart className="size-6" />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-between">
              <div className="space-y-1">
                <p className="truncate font-semibold text-sm text-foreground transition-colors group-hover:text-primary">
                  {product.name}
                </p>
                <p className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {formatMoney(product.price, product.currency)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  size="sm"
                  disabled={pending || !product.inStock}
                  className="font-medium"
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
                  className="text-xs text-muted-foreground hover:text-foreground font-medium"
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
