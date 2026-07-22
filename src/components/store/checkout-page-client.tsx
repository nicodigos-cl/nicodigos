"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { HiLockClosed, HiOutlineChevronDown } from "react-icons/hi";
import { toast } from "sonner";

import { ChileLocationFields } from "@/components/store/chile-location-fields";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  checkoutFromCartAction,
  prepareGuestCheckoutOtpAction,
  startCheckoutPaymentAction,
} from "@/lib/actions/orders";
import { authClient } from "@/lib/auth-client";
import { AUTH_OTP_LENGTH } from "@/lib/auth/otp";
import {
  cartMeetsMinimumTotal,
  cartMinimumTotalMessage,
} from "@/lib/cart/constants";
import {
  chileCheckoutBreakdown,
  FLOW_FEE_LABEL,
} from "@/lib/pricing/chile-checkout";
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
  deliveryPromise?: "INSTANT" | "DELAYED_12_24H" | "UNAVAILABLE" | null;
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
  authenticated?: boolean;
};

function CheckoutTotalsBreakdown({
  total,
  currency,
  compact = false,
}: {
  total: string;
  currency: string;
  compact?: boolean;
}) {
  const breakdown = chileCheckoutBreakdown(total);

  return (
    <dl className={cn("space-y-3", compact ? "text-sm" : "text-sm")}>
      <div className="flex justify-between text-muted-foreground">
        <dt>Neto (sin IVA)</dt>
        <dd className="tabular-nums text-foreground">
          {formatMoney(breakdown.net, currency)}
        </dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <dt>IVA (19%)</dt>
        <dd className="tabular-nums text-foreground">
          {formatMoney(breakdown.iva, currency)}
        </dd>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <dt>Comisión Flow ({FLOW_FEE_LABEL})</dt>
        <dd className="tabular-nums text-foreground">
          {formatMoney(breakdown.flowFee, currency)}
        </dd>
      </div>
      <p className="text-xs text-muted-foreground">
        IVA incluido en el precio. Comisión Flow según tarifa pública (abono a 3
        días hábiles); no se suma aparte al total.
      </p>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <dt className={cn("font-medium text-foreground", !compact && "text-lg")}>
          Total a pagar
        </dt>
        <dd
          className={cn(
            "font-bold tabular-nums text-foreground",
            compact ? "text-lg" : "text-2xl",
          )}
        >
          {formatMoney(breakdown.total, currency)}
        </dd>
      </div>
    </dl>
  );
}

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
        <li key={product.id} className="flex space-x-4 py-4 sm:py-6">
          {product.imageUrl ? (
            <Image
              alt=""
              src={product.imageUrl}
              width={160}
              height={160}
              unoptimized
              className="size-20 sm:size-24 flex-none rounded-2xl bg-muted object-cover"
            />
          ) : (
            <div className="size-20 sm:size-24 flex-none rounded-2xl bg-muted" />
          )}
          <div className="flex flex-col justify-between space-y-2 flex-1">
            <div className="space-y-1 text-sm font-medium">
              <h3 className="text-foreground line-clamp-2">
                {product.href ? (
                  <Link href={product.href}>{product.name}</Link>
                ) : (
                  product.name
                )}
              </h3>
              <p className="tabular-nums text-foreground">
                {formatMoney(product.price, currency)}
              </p>
              <p className="text-muted-foreground text-xs">Cant. {product.quantity}</p>
              {product.deliveryPromise === "DELAYED_12_24H" ||
              product.deliveryMethod === "MANUAL" ? (
                <p className="text-xs font-normal text-amber-700 dark:text-amber-400">
                  Entrega en 12–24 horas
                </p>
              ) : product.deliveryMethod === "SMM" ? (
                <p className="text-xs font-normal text-muted-foreground">
                  Entrega en minutos a unas horas
                </p>
              ) : product.deliveryPromise === "INSTANT" ? (
                <p className="text-xs font-normal text-muted-foreground">
                  Entrega inmediata
                </p>
              ) : null}
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
                      className="h-auto px-0 text-xs text-primary"
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
  authenticated = false,
}: CheckoutPageClientProps) {
  const [pending, startTransition] = useTransition();
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [editing, setEditing] = useState<CartLineDto | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [otpSentTo, setOtpSentTo] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [guestVerified, setGuestVerified] = useState(false);

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
  const [region, setRegion] = useState(billingDefaults?.region ?? "");
  // Ciudad no es división oficial (región → comuna). Se conserva si ya existía.
  const city = billingDefaults?.city ?? "";

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
          deliveryMethod: item.deliveryMethod,
          deliveryPromise: item.deliveryPromise,
        }))
      : (cart?.items ?? []).map((item) => ({
          id: item.id,
          name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          imageUrl: item.coverImageUrl,
          deliveryMethod: item.deliveryMethod,
          deliveryPromise: item.deliveryPromise,
          smmSummary: smmSummaryLabel(item.smm ?? undefined),
          smmComplete: item.smmComplete,
          cartLine: item,
        }));

  const hasDelayedPromise = lines.some(
    (line) => line.deliveryPromise === "DELAYED_12_24H",
  );

  const currency = order?.currency ?? cart?.currency ?? "CLP";
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
  const belowMinimum =
    mode === "cart" && !cartMeetsMinimumTotal(cart?.subtotal ?? "0");
  const awaitingGuestOtp =
    mode === "cart" && !authenticated && !guestVerified && Boolean(otpSentTo);

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

  async function requestGuestOtp() {
    const result = await prepareGuestCheckoutOtpAction({
      email,
      customerName,
    });
    if (!result.success) {
      setFieldErrors(result.fieldErrors ?? {});
      toast.error(result.message);
      return false;
    }

    const { error } = await authClient.emailOtp.sendVerificationOtp({
      email: result.data.email,
      type: "sign-in",
    });
    if (error) {
      toast.error(error.message ?? "No se pudo enviar el código.");
      return false;
    }

    setOtpSentTo(result.data.email);
    setOtp("");
    toast.success("Te enviamos un código a tu email");
    return true;
  }

  async function submitCartCheckout() {
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
  }

  function pay() {
    if (mode === "cart" && hasIncompleteSmm) {
      toast.error("Completa los datos de tus servicios antes de pagar.");
      return;
    }
    if (mode === "cart" && belowMinimum) {
      toast.error(cartMinimumTotalMessage(currency));
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

      if (!authenticated && !guestVerified) {
        const normalizedEmail = email.trim().toLowerCase();
        if (otpSentTo !== normalizedEmail) {
          await requestGuestOtp();
          return;
        }
        if (otp.length !== AUTH_OTP_LENGTH) {
          toast.error("Ingresa el código de 6 dígitos.");
          return;
        }

        const { error } = await authClient.signIn.emailOtp({
          email: normalizedEmail,
          otp,
          name: customerName.trim(),
        });
        if (error) {
          toast.error(error.message ?? "El código es inválido o expiró.");
          return;
        }
        setGuestVerified(true);
      }

      await submitCartCheckout();
    });
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mt-8 font-heading text-3xl font-semibold tracking-tight">
          Nada que pagar
        </h1>
        <p className="mt-4 text-muted-foreground">
          Tu carrito está vacío o la orden no tiene ítems.
        </p>
        <Button className="mt-8" render={<Link href="/cart" />} nativeButton={false}>
          Ir al carrito
        </Button>
      </div>
    );
  }

  if (isPaid && order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="mt-8 font-heading text-3xl font-semibold tracking-tight">
          Orden pagada
        </h1>
        <p className="mt-4 text-muted-foreground">
          Gracias. Ya recibimos el pago de esta orden.
        </p>
        <p className="mt-6 font-mono text-xs text-muted-foreground/60">{order.id}</p>
        <Button className="mt-8" render={<Link href="/" />} nativeButton={false}>
          Volver a la tienda
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="sr-only">Checkout</h1>

      <div className="lg:grid lg:grid-cols-12 lg:items-start lg:gap-x-12 xl:gap-x-16">

        {/* Mobile Summary Section */}
        <section
          aria-labelledby="order-heading"
          className="lg:hidden mb-8 rounded-3xl bg-muted/40 p-5 border border-border"
        >
          <Collapsible
            open={summaryOpen}
            onOpenChange={setSummaryOpen}
          >
            <div className="flex items-center justify-between">
              <h2
                id="order-heading"
                className="text-lg font-medium text-foreground"
              >
                Resumen del pedido
              </h2>
              <CollapsibleTrigger className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                <span>{summaryOpen ? "Ocultar" : "Ver todo"}</span>
                <HiOutlineChevronDown
                  className={cn(
                    "size-4 transition-transform",
                    summaryOpen && "rotate-180",
                  )}
                />
              </CollapsibleTrigger>
            </div>

            <CollapsibleContent className="mt-4">
              <div className="border-t border-border">
                <OrderSummaryList
                  lines={lines}
                  currency={currency}
                  onEditSmm={mode === "cart" ? setEditing : undefined}
                />
              </div>
            </CollapsibleContent>

            <div className="mt-4 border-t border-border pt-4">
              <CheckoutTotalsBreakdown
                total={total}
                currency={currency}
                compact
              />
            </div>
          </Collapsible>
        </section>

        {/* Form Section */}
        <section
          aria-labelledby="payment-heading"
          className="lg:col-span-7 lg:col-start-1"
        >
          <div className="mb-8">
            <h2
              id="payment-heading"
              className="font-heading text-3xl font-semibold tracking-tight"
            >
              {mode === "order"
                ? "Pagar orden"
                : awaitingGuestOtp
                  ? "Verifica tu email"
                  : "Datos de facturación"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {awaitingGuestOtp
                ? "Ingresa el código que enviamos a tu correo."
                : "Completa los datos requeridos. El pago se procesa de forma segura en Flow."}
            </p>
          </div>

          {hasIncompleteSmm ? (
            <p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              Completa los destinos de tus servicios SMM en el resumen antes de
              pagar.
            </p>
          ) : null}

          {needsNamedBoleta ? (
            <p className="mb-6 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
              Por normativa SII, las boletas sobre 135 UF requieren RUT y nombre
              del comprador.
            </p>
          ) : null}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              pay();
            }}
          >
            <FieldGroup className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {!awaitingGuestOtp ? (
                  <>
                    <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="email-address">Email</FieldLabel>
                  <Input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required={mode === "cart"}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setOtpSentTo(null);
                      setOtp("");
                    }}
                    disabled={mode === "order" || authenticated || guestVerified}
                  />
                  {mode === "cart" && !authenticated ? (
                    <FieldDescription>
                      Te enviaremos un código para confirmar dónde recibirás tu compra.
                    </FieldDescription>
                  ) : null}
                  {fieldError("email") ? (
                    <p className="mt-1 text-xs text-destructive">{fieldError("email")}</p>
                  ) : null}
                    </Field>

                    <Field className="sm:col-span-2">
                  <FieldLabel htmlFor="customer-name">
                    Nombre completo
                    {mode === "cart" ? (
                      <span className="text-destructive ml-1">*</span>
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
                    <p className="mt-1 text-xs text-destructive">
                      {fieldError("customerName")}
                    </p>
                  ) : null}
                    </Field>

                    {mode === "cart" ? (
                      <>
                    <Field>
                      <FieldLabel htmlFor="invoiceType">
                        Documento
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
                        <p className="mt-1 text-xs text-destructive">
                          {fieldError("invoiceType")}
                        </p>
                      ) : null}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="rut">
                        RUT
                        {rutRequired ? (
                          <span className="text-destructive ml-1">*</span>
                        ) : (
                          <span className="text-muted-foreground ml-1 font-normal">
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
                        <p className="mt-1 text-xs text-destructive">
                          {fieldError("rut")}
                        </p>
                      ) : null}
                    </Field>

                    {showFacturaFields ? (
                      <>
                        <Field className="sm:col-span-2">
                          <FieldLabel htmlFor="businessName">
                            Razón social <span className="text-destructive ml-1">*</span>
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
                            <p className="mt-1 text-xs text-destructive">
                              {fieldError("businessName")}
                            </p>
                          ) : null}
                        </Field>
                        <Field className="sm:col-span-2">
                          <FieldLabel htmlFor="businessActivity">
                            Giro <span className="text-destructive ml-1">*</span>
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
                            <p className="mt-1 text-xs text-destructive">
                              {fieldError("businessActivity")}
                            </p>
                          ) : null}
                        </Field>
                      </>
                    ) : null}

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="phone">Teléfono <span className="text-muted-foreground ml-1 font-normal">(opcional)</span></FieldLabel>
                      <Input
                        id="phone"
                        name="phone"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                      />
                    </Field>

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="address">
                        Dirección
                        {addressRequired ? (
                          <span className="text-destructive ml-1">*</span>
                        ) : <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>}
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
                        <p className="mt-1 text-xs text-destructive">
                          {fieldError("addressLine1")}
                        </p>
                      ) : null}
                    </Field>

                    <Field className="sm:col-span-2">
                      <FieldLabel htmlFor="address2">
                        Depto / oficina <span className="text-muted-foreground ml-1 font-normal">(opcional)</span>
                      </FieldLabel>
                      <Input
                        id="address2"
                        value={addressLine2}
                        onChange={(event) => setAddressLine2(event.target.value)}
                      />
                    </Field>

                    <ChileLocationFields
                      region={region}
                      commune={commune}
                      onRegionChange={setRegion}
                      onCommuneChange={setCommune}
                      communeRequired={addressRequired}
                      communeError={fieldError("commune")}
                      disabled={pending}
                    />
                      </>
                    ) : null}
                  </>
                ) : (
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="checkout-otp">Código de verificación</FieldLabel>
                    <InputOTP
                      id="checkout-otp"
                      maxLength={AUTH_OTP_LENGTH}
                      value={otp}
                      onChange={setOtp}
                      disabled={pending}
                      autoFocus
                    >
                      <InputOTPGroup>
                        {Array.from({ length: AUTH_OTP_LENGTH }, (_, index) => (
                          <InputOTPSlot key={index} index={index} />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                    <div className="flex items-center justify-between gap-3">
                      <FieldDescription>
                        Código enviado a {otpSentTo}.
                      </FieldDescription>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto px-0"
                        disabled={pending}
                        onClick={() => {
                          startTransition(async () => {
                            await requestGuestOtp();
                          });
                        }}
                      >
                        Reenviar código
                      </Button>
                    </div>
                  </Field>
                )}
              </div>
            </FieldGroup>

            {hasDelayedPromise ? (
              <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                Algunos productos se entregarán en 12–24 horas. Al continuar
                aceptas ese plazo.
              </p>
            ) : null}

            {belowMinimum ? (
              <p className="mt-8 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                {cartMinimumTotalMessage(currency)}{" "}
                <Link href="/cart" className="font-medium underline underline-offset-2">
                  Volver al carrito
                </Link>
              </p>
            ) : null}

            <div className="mt-8 space-y-4">
              <Button
                type="submit"
                className="w-full h-14 text-base font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
                size="lg"
                disabled={
                  pending ||
                  hasIncompleteSmm ||
                  belowMinimum ||
                  (awaitingGuestOtp && otp.length !== AUTH_OTP_LENGTH)
                }
              >
                {pending
                  ? otpSentTo && !authenticated && !guestVerified
                    ? "Verificando…"
                    : "Redirigiendo a Flow…"
                  : awaitingGuestOtp
                    ? "Verificar email"
                  : !authenticated && !guestVerified && !otpSentTo
                    ? "Enviar código y continuar"
                    : `Pagar ${formatMoney(total, currency)}`}
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium">
                <HiLockClosed className="size-4" />
                Pago seguro con Flow.cl (Webpay, MACH y más)
              </p>

              {mode === "cart" ? (
                <div className="pt-4 text-center">
                  <Link href="/cart" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4">
                    Volver al carrito
                  </Link>
                </div>
              ) : (
                <div className="pt-4 text-center text-sm font-medium text-muted-foreground">
                  Orden {order?.id}
                </div>
              )}
            </div>
          </form>
        </section>

        {/* Desktop Summary Section */}
        <section
          aria-labelledby="summary-heading-desktop"
          className="hidden lg:block lg:col-span-5 lg:col-start-8 lg:sticky lg:top-24 rounded-3xl bg-card border border-border p-6 shadow-sm"
        >
          <h2 id="summary-heading-desktop" className="text-lg font-bold text-foreground mb-4">
            Resumen del pedido
          </h2>
          <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
            <OrderSummaryList
              lines={lines}
              currency={currency}
              onEditSmm={mode === "cart" ? setEditing : undefined}
            />
          </div>
          <div className="mt-6 border-t border-border pt-6">
            <CheckoutTotalsBreakdown total={total} currency={currency} />
          </div>
        </section>
      </div>

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
