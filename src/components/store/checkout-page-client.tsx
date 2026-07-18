"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiLockClosed, HiOutlineChevronDown } from "react-icons/hi";
import { toast } from "sonner";

import { Logo } from "@/components/logo";
import { SmmCartFieldsDialog } from "@/components/store/smm-cart-fields-dialog";
import { smmSummaryLabel } from "@/components/store/smm-order-fields-form";
import { Button } from "@/components/ui/button";
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
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  checkoutFromCartAction,
  startCheckoutPaymentAction,
} from "@/lib/actions/orders";
import { formatMoney } from "@/lib/products/format";
import { BOLETA_NAMED_THRESHOLD_CLP } from "@/lib/validations/checkout-billing";
import { cn } from "@/lib/utils";
import type { CartDto, CartLineDto, OrderDetailDto } from "@/types/orders";

export type CheckoutBillingDefaults = {
  email: string;
  customerName: string;
  phone: string;
  invoiceType: "BOLETA" | "FACTURA";
  rut: string;
  businessName: string;
  businessActivity: string;
  addressLine1: string;
  addressLine2: string;
  commune: string;
  city: string;
  region: string;
};

export type CheckoutBillingFlags = {
  requireRut: boolean;
  requireBillingData: boolean;
  allowBoleta: boolean;
  allowFactura: boolean;
  boletaNamedThresholdClp: number;
};

type CheckoutLine = {
  id: string;
  name: string;
  price: string;
  quantity: number;
  imageUrl: string | null;
  href?: string;
  deliveryMethod?: string;
  smmSummary?: string | null;
  smmComplete?: boolean;
  cartLine?: CartLineDto;
};

type CheckoutPageClientProps = {
  mode: "cart" | "order";
  cart?: CartDto | null;
  order?: OrderDetailDto | null;
  billingDefaults?: CheckoutBillingDefaults;
  billingFlags?: CheckoutBillingFlags;
};

function OrderSummaryList({
  lines,
  currency,
  onEditSmm,
}: {
  lines: CheckoutLine[];
  currency: string;
  onEditSmm?: (line: CartLineDto) => void;
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
              {product.deliveryMethod === "SMM" ? (
                <div className="space-y-1 pt-1">
                  <p className="truncate text-xs font-normal text-muted-foreground">
                    {product.smmSummary
                      ? `Destino: ${product.smmSummary}`
                      : "Sin destino"}
                  </p>
                  {product.smmComplete === false ? (
                    <p className="text-xs font-normal text-amber-700 dark:text-amber-400">
                      Faltan datos del servicio
                    </p>
                  ) : null}
                  {onEditSmm && product.cartLine ? (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto px-0 text-xs"
                      onClick={() => onEditSmm(product.cartLine!)}
                    >
                      Editar destino
                    </Button>
                  ) : null}
                </div>
              ) : null}
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
  billingDefaults,
  billingFlags,
}: CheckoutPageClientProps) {
  const [pending, startTransition] = useTransition();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editing, setEditing] = useState<CartLineDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const [email, setEmail] = useState(
    billingDefaults?.email || order?.email || "",
  );
  const [customerName, setCustomerName] = useState(
    billingDefaults?.customerName || order?.customerName || "",
  );
  const [phone, setPhone] = useState(billingDefaults?.phone ?? "");
  const [invoiceType, setInvoiceType] = useState<"BOLETA" | "FACTURA">(
    billingDefaults?.invoiceType ?? "BOLETA",
  );
  const [rut, setRut] = useState(billingDefaults?.rut ?? "");
  const [businessName, setBusinessName] = useState(
    billingDefaults?.businessName ?? "",
  );
  const [businessActivity, setBusinessActivity] = useState(
    billingDefaults?.businessActivity ?? "",
  );
  const [addressLine1, setAddressLine1] = useState(
    billingDefaults?.addressLine1 ?? "",
  );
  const [addressLine2, setAddressLine2] = useState(
    billingDefaults?.addressLine2 ?? "",
  );
  const [commune, setCommune] = useState(billingDefaults?.commune ?? "");
  const [city, setCity] = useState(billingDefaults?.city ?? "");
  const [region, setRegion] = useState(billingDefaults?.region ?? "");

  const flags: CheckoutBillingFlags = billingFlags ?? {
    requireRut: false,
    requireBillingData: false,
    allowBoleta: true,
    allowFactura: true,
    boletaNamedThresholdClp: BOLETA_NAMED_THRESHOLD_CLP,
  };

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
          deliveryMethod: item.deliveryMethod,
          smmSummary: smmSummaryLabel(item.smm ?? undefined),
          smmComplete: item.smmComplete,
          cartLine: item,
        }));

  const currency = order?.currency ?? cart?.currency ?? "CLP";
  const subtotal = order?.subtotal ?? cart?.subtotal ?? "0";
  const total = order?.total ?? cart?.subtotal ?? "0";
  const isPaid = order?.status === "PAID" || order?.status === "FULFILLED";
  const orderTotalClp = Number.parseFloat(total);
  const needsNamedBoleta =
    invoiceType === "BOLETA" &&
    orderTotalClp >= flags.boletaNamedThresholdClp;
  const showFacturaFields = invoiceType === "FACTURA";
  const rutRequired =
    flags.requireRut || showFacturaFields || needsNamedBoleta;
  const addressRequired = flags.requireBillingData || showFacturaFields;

  const hasIncompleteSmm = useMemo(
    () =>
      mode === "cart" &&
      (cart?.items ?? []).some(
        (item) => item.deliveryMethod === "SMM" && !item.smmComplete,
      ),
    [mode, cart?.items],
  );

  const invoiceOptions = [
    ...(flags.allowBoleta
      ? [{ value: "BOLETA" as const, label: "Boleta" }]
      : []),
    ...(flags.allowFactura
      ? [{ value: "FACTURA" as const, label: "Factura" }]
      : []),
  ];

  function fieldError(key: string) {
    return fieldErrors[key]?.[0];
  }

  function pay() {
    if (mode === "cart" && hasIncompleteSmm) {
      toast.error("Completa los datos de tus servicios antes de pagar.");
      return;
    }

    startTransition(async () => {
      setFieldErrors({});

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
        phone: phone || null,
        invoiceType,
        rut: rut || null,
        businessName: businessName || null,
        businessActivity: businessActivity || null,
        addressLine1: addressLine1 || null,
        addressLine2: addressLine2 || null,
        commune: commune || null,
        city: city || null,
        region: region || null,
      });

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});
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
              <OrderSummaryList
                lines={lines}
                currency={currency}
                onEditSmm={mode === "cart" ? setEditing : undefined}
              />
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

      <section
        aria-labelledby="summary-heading"
        className="hidden w-full max-w-md flex-col bg-muted/40 lg:flex"
      >
        <h2 id="summary-heading" className="sr-only">
          Resumen del pedido
        </h2>
        <div className="flex-auto overflow-y-auto px-6">
          <OrderSummaryList
            lines={lines}
            currency={currency}
            onEditSmm={mode === "cart" ? setEditing : undefined}
          />
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
            {mode === "order" ? "Pagar orden" : "Datos de facturación"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            El pago se procesa de forma segura en el portal de Flow.cl.
          </p>

          {hasIncompleteSmm ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-400">
              Completa los destinos de tus servicios SMM en el resumen antes de
              pagar.
            </p>
          ) : null}

          {needsNamedBoleta ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Por normativa SII, las boletas sobre 135 UF requieren RUT y nombre
              del comprador.
            </p>
          ) : null}

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
                {fieldError("email") ? (
                  <p className="text-xs text-destructive">{fieldError("email")}</p>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="customer-name">
                  Nombre completo
                  {mode === "cart" ? (
                    <span className="text-destructive"> *</span>
                  ) : null}
                </FieldLabel>
                <Input
                  id="customer-name"
                  name="customer-name"
                  autoComplete="name"
                  required={mode === "cart"}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  disabled={mode === "order"}
                />
                {fieldError("customerName") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("customerName")}
                  </p>
                ) : null}
              </Field>

              {mode === "cart" ? (
                <>
                  <Field>
                    <FieldLabel htmlFor="invoiceType">
                      Tipo de documento
                    </FieldLabel>
                    <NativeSelect
                      id="invoiceType"
                      value={invoiceType}
                      onChange={(event) =>
                        setInvoiceType(
                          event.target.value as "BOLETA" | "FACTURA",
                        )
                      }
                    >
                      {invoiceOptions.map((option) => (
                        <NativeSelectOption
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                    {fieldError("invoiceType") ? (
                      <p className="text-xs text-destructive">
                        {fieldError("invoiceType")}
                      </p>
                    ) : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="rut">
                      RUT
                      {rutRequired ? (
                        <span className="text-destructive"> *</span>
                      ) : (
                        <span className="text-muted-foreground">
                          {" "}
                          (opcional)
                        </span>
                      )}
                    </FieldLabel>
                    <Input
                      id="rut"
                      name="rut"
                      autoComplete="off"
                      placeholder="12345678-9"
                      required={rutRequired}
                      value={rut}
                      onChange={(event) => setRut(event.target.value)}
                    />
                    {fieldError("rut") ? (
                      <p className="text-xs text-destructive">
                        {fieldError("rut")}
                      </p>
                    ) : null}
                  </Field>

                  {showFacturaFields ? (
                    <>
                      <Field>
                        <FieldLabel htmlFor="businessName">
                          Razón social{" "}
                          <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="businessName"
                          value={businessName}
                          required
                          onChange={(event) =>
                            setBusinessName(event.target.value)
                          }
                        />
                        {fieldError("businessName") ? (
                          <p className="text-xs text-destructive">
                            {fieldError("businessName")}
                          </p>
                        ) : null}
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="businessActivity">
                          Giro <span className="text-destructive">*</span>
                        </FieldLabel>
                        <Input
                          id="businessActivity"
                          value={businessActivity}
                          required
                          onChange={(event) =>
                            setBusinessActivity(event.target.value)
                          }
                        />
                        {fieldError("businessActivity") ? (
                          <p className="text-xs text-destructive">
                            {fieldError("businessActivity")}
                          </p>
                        ) : null}
                      </Field>
                    </>
                  ) : null}

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
                    <FieldLabel htmlFor="address">
                      Dirección
                      {addressRequired ? (
                        <span className="text-destructive"> *</span>
                      ) : null}
                    </FieldLabel>
                    <Input
                      id="address"
                      name="address"
                      autoComplete="street-address"
                      required={addressRequired}
                      value={addressLine1}
                      onChange={(event) => setAddressLine1(event.target.value)}
                    />
                    {fieldError("addressLine1") ? (
                      <p className="text-xs text-destructive">
                        {fieldError("addressLine1")}
                      </p>
                    ) : null}
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="address2">
                      Depto / oficina (opcional)
                    </FieldLabel>
                    <Input
                      id="address2"
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                    />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="commune">
                        Comuna
                        {addressRequired ? (
                          <span className="text-destructive"> *</span>
                        ) : null}
                      </FieldLabel>
                      <Input
                        id="commune"
                        required={addressRequired}
                        value={commune}
                        onChange={(event) => setCommune(event.target.value)}
                      />
                      {fieldError("commune") ? (
                        <p className="text-xs text-destructive">
                          {fieldError("commune")}
                        </p>
                      ) : null}
                    </Field>
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
                  </div>

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
                </>
              ) : null}
            </FieldGroup>

            <Separator className="my-8" />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={pending || hasIncompleteSmm}
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

      {editing ? (
        <SmmCartFieldsDialog
          mode="edit"
          open={Boolean(editing)}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
          cartItemId={editing.id}
          productName={editing.productName}
          serviceType={editing.smmServiceType}
          smmMin={editing.smmMin}
          smmMax={editing.smmMax}
          initialSmm={editing.smm}
        />
      ) : null}
    </main>
  );
}
