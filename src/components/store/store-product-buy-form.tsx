"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useTransition } from "react";
import { HiOutlineHeart, HiOutlineClock, HiOutlineShieldCheck } from "react-icons/hi";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { SmmOrderFieldsForm } from "@/components/store/smm-order-fields-form";
import { ResponsiveOverlay } from "@/components/store/responsive-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cartKeys } from "@/hooks/use-cart";
import type { DeliveryMethod } from "@/generated/prisma/client";
import {
  addCartItemAction,
  addSmmCartItemAction,
} from "@/lib/actions/orders";
import { useSession } from "@/lib/auth-client";
import { formatMoney } from "@/lib/products/format";
import { estimateSmmLineTotalClp } from "@/lib/products/smm-pricing";
import { getVolumeDiscountPct } from "@/lib/products/volume-discount";
import {
  normalizeSmmServiceKind,
  parseSmmOrderFieldsForType,
  type SmmOrderFieldsPayload,
} from "@/lib/validations/smm-order-fields";

const SMM_DEFAULT_QUANTITY = 1_000;

type StoreProductBuyFormProps = {
  productId: string;
  productName: string;
  productHref: string;
  deliveryMethod: DeliveryMethod;
  inStock: boolean;
  price: string;
  currency: string;
  priceIsPerThousand: boolean;
  deliveryDelayed: boolean;
  regionAvailabilityLabel: string | null;
  maxOrderQuantity: number;
  smmServiceType: string | null;
  smmMin: number | null;
  smmMax: number | null;
};

export function StoreProductBuyForm({
  productId,
  productName,
  productHref,
  deliveryMethod,
  inStock,
  price,
  currency,
  priceIsPerThousand,
  deliveryDelayed,
  regionAvailabilityLabel,
  maxOrderQuantity,
  smmServiceType,
  smmMin,
  smmMax,
}: StoreProductBuyFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isPending: sessionPending } = useSession();
  const [pending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);

  const isSmm = deliveryMethod === "SMM";
  const smmKind = normalizeSmmServiceKind(smmServiceType);
  const needsQuantity =
    !isSmm ||
    (smmKind !== "package" &&
      smmKind !== "subscriptions" &&
      smmKind !== "custom_comments" &&
      smmKind !== "mentions_custom");

  const minQty = isSmm ? (smmMin ?? 1) : 1;
  const maxQty = Math.max(minQty, maxOrderQuantity);

  /** Free-typed quantity; empty while editing. Defaults to 1000 for SMM. */
  const [quantityInput, setQuantityInput] = useState(
    String(isSmm ? SMM_DEFAULT_QUANTITY : 1),
  );
  const [smmValues, setSmmValues] = useState<SmmOrderFieldsPayload>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(productHref)}`;
  const isAuthenticated = Boolean(session?.user);
  const catalogPrice = Number.parseFloat(price);

  const quantity = useMemo(() => {
    const parsed = Number.parseInt(quantityInput.replace(/\D/g, ""), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [quantityInput]);

  const discountPct = useMemo(() => {
    return getVolumeDiscountPct(quantity, isSmm);
  }, [quantity, isSmm]);

  const originalTotal = useMemo(() => {
    if (isSmm) {
      const qty =
        needsQuantity
          ? quantity || SMM_DEFAULT_QUANTITY
          : smmKind === "custom_comments" && smmValues.comments
            ? smmValues.comments
                .split("\n")
                .filter((line) => line.trim()).length || 1
            : 1;
      return estimateSmmLineTotalClp(catalogPrice, smmServiceType, qty);
    }
    return Math.round(catalogPrice * Math.max(quantity, 1));
  }, [isSmm, needsQuantity, quantity, smmKind, smmValues.comments, catalogPrice, smmServiceType]);

  const estimatedTotal = useMemo(() => {
    if (isSmm) {
      return originalTotal;
    }
    return Math.round(originalTotal * (1 - discountPct));
  }, [isSmm, originalTotal, discountPct]);

  const savings = originalTotal - estimatedTotal;

  function requireAuth(): boolean {
    if (sessionPending) return false;
    if (!isAuthenticated) {
      router.push(loginHref);
      return false;
    }
    return true;
  }

  function parseFreeQuantity(): number | null {
    const parsed = Number.parseInt(quantityInput.replace(/\D/g, ""), 10);
    if (!Number.isFinite(parsed) || parsed < 1) return null;
    return parsed;
  }

  function handleStepChange(direction: number) {
    const currentVal = parseFreeQuantity() ?? (isSmm ? SMM_DEFAULT_QUANTITY : 1);
    const step = isSmm ? 100 : 1;
    const newVal = Math.max(minQty, Math.min(maxQty, currentVal + direction * step));
    setQuantityInput(String(newVal));
  }

  function handleAddToCart() {
    if (!inStock) {
      toast.error("Este producto no tiene stock disponible.");
      return;
    }
    if (!requireAuth()) return;

    setFieldErrors({});

    if (isSmm) {
      const freeQty = needsQuantity ? parseFreeQuantity() : null;
      if (needsQuantity && freeQty == null) {
        setFieldErrors({ quantity: ["Ingresa una cantidad válida"] });
        toast.error("Ingresa una cantidad válida.");
        return;
      }

      const payload: SmmOrderFieldsPayload = {
        ...smmValues,
        ...(needsQuantity && freeQty != null ? { quantity: freeQty } : {}),
      };

      if (smmKind === "custom_comments" && payload.comments) {
        const lines = payload.comments
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean).length;
        if (lines > 0) {
          payload.quantity = lines;
        }
      }

      const parsed = parseSmmOrderFieldsForType(smmServiceType, payload);
      if (!parsed.success) {
        const errors: Record<string, string[]> = {};
        for (const issue of parsed.error.issues) {
          const key = String(issue.path[0] ?? "form");
          errors[key] = [...(errors[key] ?? []), issue.message];
        }
        setFieldErrors(errors);
        toast.error("Completa los datos del servicio.");
        return;
      }

      if (
        parsed.data.quantity != null &&
        smmMin != null &&
        parsed.data.quantity < smmMin
      ) {
        setFieldErrors({
          quantity: [`Mínimo ${smmMin.toLocaleString("es-CL")}`],
        });
        toast.error(`La cantidad mínima es ${smmMin.toLocaleString("es-CL")}.`);
        return;
      }
      if (
        parsed.data.quantity != null &&
        smmMax != null &&
        parsed.data.quantity > smmMax
      ) {
        setFieldErrors({
          quantity: [`Máximo ${smmMax.toLocaleString("es-CL")}`],
        });
        toast.error(`La cantidad máxima es ${smmMax.toLocaleString("es-CL")}.`);
        return;
      }

      startTransition(() => {
        void (async () => {
          const result = await addSmmCartItemAction({
            productId,
            smm: parsed.data,
          });
          if (!result.success) {
            setFieldErrors(result.fieldErrors ?? {});
            toast.error(result.message);
            return;
          }
          toast.success("Agregado al carrito");
          setIsOpen(false);
          await queryClient.invalidateQueries({ queryKey: cartKeys.all });
          router.refresh();
        })();
      });
      return;
    }

    const freeQty = parseFreeQuantity();
    if (freeQty == null) {
      setFieldErrors({ quantity: ["Ingresa una cantidad válida"] });
      toast.error("Ingresa una cantidad válida.");
      return;
    }
    if (freeQty > maxQty) {
      setFieldErrors({
        quantity: [`Máximo ${maxQty.toLocaleString("es-CL")}`],
      });
      toast.error(`La cantidad máxima es ${maxQty.toLocaleString("es-CL")}.`);
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await addCartItemAction({
          productId,
          quantity: freeQty,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success("Agregado al carrito");
        await queryClient.invalidateQueries({ queryKey: cartKeys.all });
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-5">
      {needsQuantity ? (
        <div className="space-y-2.5">
          <div className="flex items-end justify-between gap-3">
            <Label htmlFor="page-product-quantity" className="text-sm font-medium">
              Cantidad
            </Label>
            {isSmm && (smmMin != null || smmMax != null) ? (
              <span className="text-xs text-muted-foreground">
                {minQty.toLocaleString("es-CL")}–{maxQty.toLocaleString("es-CL")}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={pending || quantity <= minQty}
              onClick={() => handleStepChange(-1)}
              className="size-10 shrink-0"
            >
              −
            </Button>
            <Input
              id="page-product-quantity"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="1"
              value={quantityInput}
              disabled={pending}
              aria-invalid={Boolean(fieldErrors.quantity)}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d]/g, "");
                setQuantityInput(raw);
                if (fieldErrors.quantity) {
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.quantity;
                    return next;
                  });
                }
              }}
              className="h-10 flex-1 text-center font-medium tabular-nums"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={pending || quantity >= maxQty}
              onClick={() => handleStepChange(1)}
              className="size-10 shrink-0"
            >
              +
            </Button>
          </div>
          {fieldErrors.quantity?.[0] ? (
            <p className="text-xs text-destructive">{fieldErrors.quantity[0]}</p>
          ) : null}

          {!isSmm ? (
            <p className="text-xs text-muted-foreground">
              {discountPct === 0 ? (
                <>
                  3+ uds. −5% · 5+ uds. −10%
                </>
              ) : (
                <>
                  Descuento por volumen −{discountPct * 100}% aplicado
                </>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        {discountPct > 0 ? (
          <>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums line-through">
                {formatMoney(originalTotal, currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400">
              <span>Ahorro (−{discountPct * 100}%)</span>
              <span className="tabular-nums">
                −{formatMoney(savings, currency)}
              </span>
            </div>
          </>
        ) : null}

        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-heading text-2xl font-bold tabular-nums text-foreground">
            {formatMoney(estimatedTotal, currency)}
          </span>
        </div>

        {isSmm && priceIsPerThousand ? (
          <p className="text-xs text-muted-foreground">
            {formatMoney(price, currency)} / 1.000 ×{" "}
            {quantity.toLocaleString("es-CL")}
          </p>
        ) : null}
      </div>

      <div className={cn(
        "flex gap-2",
        "max-lg:fixed max-lg:bottom-0 max-lg:inset-x-0 max-lg:z-40 max-lg:bg-background/95 max-lg:backdrop-blur-md max-lg:border-t max-lg:border-border/40 max-lg:px-4 max-lg:py-3 max-lg:shadow-lg max-lg:m-0"
      )}>
        <div className="hidden max-lg:flex flex-col justify-center min-w-[100px] text-left pr-2">
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none mb-1">Total</span>
          <span className="text-lg font-black text-foreground tabular-nums leading-none">
            {formatMoney(estimatedTotal, currency)}
          </span>
        </div>

        {isSmm ? (
          <Button
            type="button"
            size="lg"
            className="h-11 flex-1 font-bold max-lg:rounded-full"
            disabled={!inStock || sessionPending}
            onClick={() => setIsOpen(true)}
          >
            Configurar servicio
          </Button>
        ) : (
          <Button
            type="button"
            size="lg"
            className="h-11 flex-1 font-bold max-lg:rounded-full"
            disabled={!inStock || pending || sessionPending}
            onClick={handleAddToCart}
          >
            {!inStock
              ? "Sin stock"
              : pending
                ? "Agregando…"
                : "Agregar al carrito"}
          </Button>
        )}

        <Button
          type="button"
          size="icon-lg"
          variant="outline"
          nativeButton={false}
          render={
            <Link
              href={
                isAuthenticated
                  ? "/dashboard/wishlist"
                  : `/auth/login?callbackUrl=${encodeURIComponent(productHref)}`
              }
            />
          }
          className="size-11 shrink-0 max-lg:rounded-full"
          aria-label="Ir a lista de deseos"
        >
          <HiOutlineHeart className="size-5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {deliveryDelayed ? "Entrega en 12–24 h" : "Entrega inmediata"}
        {" · "}
        Webpay, MACH y más
        {regionAvailabilityLabel ? ` · ${regionAvailabilityLabel}` : ""}
      </p>

      {isSmm ? (
        <ResponsiveOverlay
          open={isOpen}
          onOpenChange={setIsOpen}
          title="Datos del servicio"
          description={productName}
        >
          <div className="space-y-5 pt-2 text-left">
            <SmmOrderFieldsForm
              serviceType={smmServiceType}
              smmMin={smmMin}
              smmMax={smmMax}
              fieldErrors={fieldErrors}
              disabled={pending}
              omitFields={needsQuantity ? ["quantity"] : []}
              idPrefix={`overlay-pdp-${productId}`}
              onChange={setSmmValues}
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums text-foreground">
                {formatMoney(estimatedTotal, currency)}
              </span>
            </div>

            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={pending}
              onClick={handleAddToCart}
            >
              {pending ? "Agregando…" : "Agregar al carrito"}
            </Button>
          </div>
        </ResponsiveOverlay>
      ) : null}

      <p className="sr-only">{productName}</p>
    </div>
  );
}
