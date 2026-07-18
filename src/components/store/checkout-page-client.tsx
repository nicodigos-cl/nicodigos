"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiLockClosed, HiOutlineChevronDown } from "react-icons/hi";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  checkoutFromCartAction,
  startCheckoutPaymentAction,
} from "@/lib/actions/orders";
import { formatMoney } from "@/lib/products/format";
import { cn } from "@/lib/utils";
import type { CartDto, OrderDetailDto } from "@/types/orders";

type CheckoutLine = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  imageUrl: string | null;
  href?: string;
};

type CheckoutPageClientProps = {
  mode: "cart" | "order";
  cart?: CartDto | null;
  order?: OrderDetailDto | null;
  defaultEmail?: string;
  defaultName?: string;
};

function OrderSummaryList({
  lines,
  currency,
}: {
  lines: CheckoutLine[];
  currency: string;
}) {
  return (
    <ul role="list" className="divide-y divide-border">
      {lines.map((product) => (
        <li key={product.id} className="flex space-x-4 py-6">
          {product.imageUrl ? (
            <Image
              alt=""
              src={product.imageUrl}
              width={160}
              height={160}
              unoptimized
              className="size-24 flex-none rounded-2xl bg-muted object-cover sm:size-40"
            />
          ) : (
            <div className="size-24 flex-none rounded-2xl bg-muted sm:size-40" />
          )}
          <div className="flex flex-col justify-between space-y-3">
            <div className="space-y-1 text-sm font-medium">
              <h3 className="text-foreground">
                {product.href ? (
                  <Link href={product.href}>{product.name}</Link>
                ) : (
                  product.name
                )}
              </h3>
              <p className="tabular-nums text-foreground">
                {formatMoney(product.price, currency)}
              </p>
              <p className="text-muted-foreground">Cant. {product.quantity}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CheckoutPageClient({
  mode,
  cart,
  order,
  defaultEmail = "",
  defaultName = "",
}: CheckoutPageClientProps) {
  const [pending, startTransition] = useTransition();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail || order?.email || "");
  const [customerName, setCustomerName] = useState(
    defaultName || order?.customerName || "",
  );
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [sameAsShipping, setSameAsShipping] = useState(true);

  const lines: CheckoutLine[] =
    mode === "order" && order
      ? order.items.map((item) => ({
          id: item.id,
          name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          imageUrl: item.coverImageUrl,
        }))
      : (cart?.items ?? []).map((item) => ({
          id: item.id,
          name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          imageUrl: item.coverImageUrl,
        }));

  const currency = order?.currency ?? cart?.currency ?? "CLP";
  const subtotal = order?.subtotal ?? cart?.subtotal ?? "0";
  const total = order?.total ?? cart?.subtotal ?? "0";
  const isPaid = order?.status === "PAID" || order?.status === "FULFILLED";

  function pay() {
    startTransition(async () => {
      if (mode === "order" && order) {
        const result = await startCheckoutPaymentAction(order.id);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        window.location.href = result.data.redirectUrl;
        return;
      }

      const result = await checkoutFromCartAction({
        email: email || undefined,
        customerName: customerName || undefined,
        phone: phone || undefined,
        addressLine1: addressLine1 || undefined,
        city: city || undefined,
        region: region || undefined,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      window.location.href = result.data.redirectUrl;
    });
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Logo size={40} className="mx-auto" />
        <h1 className="mt-8 font-heading text-2xl font-semibold">
          Nada que pagar
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu carrito está vacío o la orden no tiene ítems.
        </p>
        <Button className="mt-6" render={<Link href="/cart" />} nativeButton={false}>
          Ir al carrito
        </Button>
      </div>
    );
  }

  if (isPaid && order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Logo size={40} className="mx-auto" />
        <h1 className="mt-8 font-heading text-2xl font-semibold">
          Orden pagada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Gracias. Ya recibimos el pago de esta orden.
        </p>
        <p className="mt-4 font-mono text-xs text-muted-foreground">{order.id}</p>
      </div>
    );
  }

  return (
    <main className="lg:flex lg:min-h-full lg:flex-row-reverse lg:overflow-hidden">
      <div className="px-4 py-6 sm:px-6 lg:hidden">
        <div className="mx-auto flex max-w-lg">
          <Logo size={32} href="/" />
        </div>
      </div>

      <h1 className="sr-only">Checkout</h1>

      {/* Mobile order summary — Collapsible (shadcn) replaces Headless Disclosure */}
      <section
        aria-labelledby="order-heading"
        className="bg-muted/40 px-4 py-6 sm:px-6 lg:hidden"
      >
        <Collapsible
          open={summaryOpen}
          onOpenChange={setSummaryOpen}
          className="mx-auto max-w-lg"
        >
          <div className="flex items-center justify-between">
            <h2
              id="order-heading"
              className="text-lg font-medium text-foreground"
            >
              Tu pedido
            </h2>
            <CollapsibleTrigger className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <span>{summaryOpen ? "Ocultar resumen" : "Ver resumen"}</span>
              <HiOutlineChevronDown
                className={cn(
                  "size-4 transition-transform",
                  summaryOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="border-b border-border">
              <OrderSummaryList lines={lines} currency={currency} />
            </div>
            <dl className="mt-6 space-y-4 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-foreground">
                  {formatMoney(subtotal, currency)}
                </dd>
              </div>
            </dl>
          </CollapsibleContent>

          <p className="mt-6 flex items-center justify-between border-t border-border pt-6 text-sm font-medium text-foreground">
            <span className="text-base">Total</span>
            <span className="text-base tabular-nums">
              {formatMoney(total, currency)}
            </span>
          </p>
        </Collapsible>
      </section>

      {/* Desktop order summary */}
      <section
        aria-labelledby="summary-heading"
        className="hidden w-full max-w-md flex-col bg-muted/40 lg:flex"
      >
        <h2 id="summary-heading" className="sr-only">
          Resumen del pedido
        </h2>
        <div className="flex-auto overflow-y-auto px-6">
          <OrderSummaryList lines={lines} currency={currency} />
        </div>
        <div className="sticky bottom-0 flex-none border-t border-border bg-muted/40 p-6">
          <dl className="space-y-4 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd className="tabular-nums text-foreground">
                {formatMoney(subtotal, currency)}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-6 text-foreground">
              <dt className="text-base">Total</dt>
              <dd className="text-base tabular-nums">
                {formatMoney(total, currency)}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Checkout form */}
      <section
        aria-labelledby="payment-heading"
        className="flex-auto overflow-y-auto px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8 lg:pt-0 lg:pb-24"
      >
        <div className="mx-auto max-w-lg">
          <div className="hidden pt-10 pb-10 lg:flex">
            <Logo size={32} href="/" />
          </div>

          <h2
            id="payment-heading"
            className="font-heading text-xl font-semibold tracking-tight"
          >
            {mode === "order" ? "Pagar orden" : "Información de contacto"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El pago se procesa de forma segura en el portal de Flow.cl.
          </p>

          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              pay();
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email-address">Email</FieldLabel>
                <Input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required={mode === "cart"}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={mode === "order"}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="customer-name">Nombre</FieldLabel>
                <Input
                  id="customer-name"
                  name="customer-name"
                  autoComplete="name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={mode === "order"}
                />
              </Field>

              {mode === "cart" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="phone">Teléfono</FieldLabel>
                    <Input
                      id="phone"
                      name="phone"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="address">Dirección</FieldLabel>
                    <Input
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="city">Ciudad</FieldLabel>
                      <Input
                        id="city"
                        name="city"
                        autoComplete="address-level2"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="region">Región</FieldLabel>
                      <Input
                        id="region"
                        name="region"
                        autoComplete="address-level1"
                        value={region}
                        onChange={(event) => setRegion(event.target.value)}
                      />
                    </Field>
                  </div>
                  <label className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={sameAsShipping}
                      onCheckedChange={(checked) =>
                        setSameAsShipping(checked === true)
                      }
                    />
                    Facturación igual a envío
                  </label>
                </>
              ) : null}
            </FieldGroup>

            <Separator className="my-8" />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={pending}
            >
              {pending
                ? "Redirigiendo a Flow…"
                : `Pagar ${formatMoney(total, currency)}`}
            </Button>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <HiLockClosed className="size-4" />
              Pago seguro con Flow.cl (Webpay, MACH y más)
            </p>

            {mode === "cart" ? (
              <FieldDescription className="mt-4 text-center">
                o{" "}
                <Link href="/cart" className="font-medium text-primary">
                  volver al carrito
                </Link>
              </FieldDescription>
            ) : (
              <FieldDescription className="mt-4 text-center">
                Orden {order?.id}
              </FieldDescription>
            )}
          </form>
        </div>
      </section>
    </main>
  );
}
