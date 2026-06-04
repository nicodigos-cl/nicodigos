"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChileLocationFields } from "@/components/chile/chile-location-fields";
import { CheckoutDataNotice } from "@/components/store/checkout-data-notice";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { startFlowCheckoutAction } from "@/lib/store/checkout/actions";
import {
  checkoutDocumentTypeOptions,
  isCheckoutAddressComplete,
  isCheckoutBillingComplete,
  isCheckoutBillingIdentityComplete,
  isCheckoutContactComplete,
  type CheckoutBillingInitial,
  type CheckoutDocumentType,
} from "@/lib/store/checkout/billing";
import { CHECKOUT_NEW_ADDRESS_ID } from "@/lib/store/checkout/constants";
import {
  clearCheckoutDraftFromStorage,
  loadCheckoutDraftFromStorage,
  saveCheckoutDraftToStorage,
} from "@/lib/store/checkout/draft-storage";
import type { CheckoutPageData } from "@/lib/store/checkout/get-checkout-initial";
import { footerLegalLinks, storeRoutes } from "@/lib/store/navigation";
import type { UserAddress } from "@/lib/settings/types";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency/format";
import { playSound } from "@/lib/sounds";

type CheckoutFormProps = CheckoutPageData & {
  userId: string;
  subtotal: number;
  itemCount: number;
  className?: string;
};

function RequiredLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Label htmlFor={htmlFor}>
      {children}
      <span className="text-destructive" aria-hidden="true">
        {" "}
        *
      </span>
    </Label>
  );
}

function CheckoutSection({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-2 duration-300 fill-mode-both",
        className,
      )}
    >
      {children}
    </div>
  );
}

function findSavedAddress(
  addresses: UserAddress[],
  id: string,
): UserAddress | undefined {
  return addresses.find((address) => address.id === id);
}

export function CheckoutForm({
  userId,
  initialValues,
  savedAddresses,
  subtotal,
  itemCount,
  className,
}: CheckoutFormProps) {
  const iva = Math.round(subtotal * 0.19);
  const flowCommission = Math.round((subtotal + iva) * 0.037961);
  const total = subtotal + iva + flowCommission;

  const [values, setValues] = useState(initialValues);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [isPending, startTransition] = useTransition();
  const skipNextDraftSave = useRef(false);
  const initialValuesRef = useRef(initialValues);
  const isFactura = values.documentType === "factura";
  const isNewAddress =
    values.addressSelection === CHECKOUT_NEW_ADDRESS_ID ||
    savedAddresses.length === 0;

  const showAddressSelect = savedAddresses.length > 0;

  const addressSelectValue = useMemo(() => {
    if (isNewAddress) {
      return CHECKOUT_NEW_ADDRESS_ID;
    }
    return values.addressSelection;
  }, [isNewAddress, values.addressSelection]);

  const contactComplete = useMemo(
    () => isCheckoutContactComplete(values),
    [values],
  );

  const billingIdentityComplete = useMemo(
    () => isCheckoutBillingIdentityComplete(values),
    [values],
  );

  const addressComplete = useMemo(
    () => isCheckoutAddressComplete(values),
    [values],
  );

  const canSubmit = useMemo(() => isCheckoutBillingComplete(values), [values]);

  const showBillingSection = contactComplete;
  const showAddressSection = contactComplete && billingIdentityComplete;
  const showCheckoutFooter =
    contactComplete && billingIdentityComplete && addressComplete;

  useEffect(() => {
    let cancelled = false;

    async function hydrateDraft() {
      const restored = await loadCheckoutDraftFromStorage(
        userId,
        initialValuesRef.current,
      );

      if (cancelled) return;

      if (restored) {
        skipNextDraftSave.current = true;
        setValues(restored);
      }

      setDraftHydrated(true);
    }

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!draftHydrated || !contactComplete) return;

    if (skipNextDraftSave.current) {
      skipNextDraftSave.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveCheckoutDraftToStorage(userId, values).then((saved) => {
        if (saved === false && contactComplete) {
          console.warn("[checkout] borrador local no guardado");
        }
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    draftHydrated,
    userId,
    values,
    contactComplete,
    billingIdentityComplete,
    addressComplete,
  ]);

  function updateField<K extends keyof CheckoutBillingInitial>(
    key: K,
    value: CheckoutBillingInitial[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function applySavedAddress(address: UserAddress) {
    setValues((current) => ({
      ...current,
      addressSelection: address.id,
      addressLabel: address.label,
      region: address.region,
      commune: address.commune,
      city: address.city,
      street: address.street,
      unit: address.unit,
    }));
  }

  function handleAddressSelectionChange(selection: string) {
    if (selection === CHECKOUT_NEW_ADDRESS_ID) {
      setValues((current) => ({
        ...current,
        addressSelection: CHECKOUT_NEW_ADDRESS_ID,
        addressLabel: "",
        region: "",
        commune: "",
        city: "",
        street: "",
        unit: "",
      }));
      return;
    }

    const address = findSavedAddress(savedAddresses, selection);
    if (address) {
      applySavedAddress(address);
    }
  }

  function handleDocumentTypeChange(next: CheckoutDocumentType) {
    setValues((current) => ({
      ...current,
      documentType: next,
      ...(next === "boleta" ? { giro: "", companyName: "" } : {}),
    }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await startFlowCheckoutAction({
        ...values,
        acceptTerms: values.acceptTerms,
      });

      if (!result.success) {
        playSound("caution");
        toast.error(result.error);
        return;
      }

      playSound("transitionUp");
      clearCheckoutDraftFromStorage(userId);
      window.location.href = result.data!.redirectUrl;
    });
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      <CheckoutDataNotice />

      <Card className="border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">
            Datos de contacto
          </CardTitle>
          <CardDescription>
            Correo y teléfono para la entrega de tus keys y avisos del pedido.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="checkout-email">
              Correo electrónico
            </RequiredLabel>
            <Input
              id="checkout-email"
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredLabel htmlFor="checkout-phone">Teléfono</RequiredLabel>
            <Input
              id="checkout-phone"
              type="tel"
              value={values.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              autoComplete="tel"
              placeholder="+56 9 1234 5678"
              required
              disabled={isPending}
            />
          </div>
        </CardContent>
      </Card>

      {showBillingSection ? (
        <CheckoutSection>
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Datos de facturación
              </CardTitle>
              <CardDescription>
                Tipo de documento e identificación para tu comprobante.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <RequiredLabel htmlFor="checkout-documentType">
                  Tipo de documento
                </RequiredLabel>
                <Select
                  value={values.documentType}
                  onValueChange={(value) =>
                    handleDocumentTypeChange(value as CheckoutDocumentType)
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="checkout-documentType" className="w-full">
                    <SelectValue placeholder="Selecciona un documento" />
                  </SelectTrigger>
                  <SelectContent>
                    {checkoutDocumentTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {
                    checkoutDocumentTypeOptions.find(
                      (option) => option.value === values.documentType,
                    )?.description
                  }
                </p>
              </div>

              {!isFactura ? (
                <div className="sm:col-span-2 space-y-2">
                  <RequiredLabel htmlFor="checkout-fullName">
                    Nombre completo
                  </RequiredLabel>
                  <Input
                    id="checkout-fullName"
                    value={values.fullName}
                    onChange={(event) =>
                      updateField("fullName", event.target.value)
                    }
                    autoComplete="name"
                    placeholder="Como debe figurar en la boleta"
                    required
                    disabled={isPending}
                  />
                </div>
              ) : null}

              <div className={cn("space-y-2", !isFactura && "sm:col-span-2")}>
                <RequiredLabel htmlFor="checkout-rut">RUT</RequiredLabel>
                <Input
                  id="checkout-rut"
                  value={values.rut}
                  onChange={(event) => updateField("rut", event.target.value)}
                  placeholder="12.345.678-9"
                  required
                  disabled={isPending}
                />
              </div>

              {isFactura ? (
                <>
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="checkout-giro">
                      Giro o actividad
                    </RequiredLabel>
                    <Input
                      id="checkout-giro"
                      value={values.giro}
                      onChange={(event) =>
                        updateField("giro", event.target.value)
                      }
                      placeholder="Servicios digitales, comercio…"
                      required
                      disabled={isPending}
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <RequiredLabel htmlFor="checkout-companyName">
                      Razón social
                    </RequiredLabel>
                    <Input
                      id="checkout-companyName"
                      value={values.companyName}
                      onChange={(event) =>
                        updateField("companyName", event.target.value)
                      }
                      placeholder="Nombre de la empresa"
                      required
                      disabled={isPending}
                    />
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </CheckoutSection>
      ) : null}

      {showAddressSection ? (
        <CheckoutSection>
          <Card className="border border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="font-heading text-lg">
                Dirección de facturación
              </CardTitle>
              <CardDescription>
                Elige una dirección guardada o agrega una nueva. Puedes editar
                los datos antes de pagar; se guardan en tu cuenta al confirmar.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {showAddressSelect ? (
                <div className="space-y-2 sm:col-span-2">
                  <RequiredLabel htmlFor="checkout-addressSelection">
                    Dirección guardada
                  </RequiredLabel>
                  <Select
                    value={addressSelectValue}
                    onValueChange={handleAddressSelectionChange}
                    disabled={isPending}
                  >
                    <SelectTrigger
                      id="checkout-addressSelection"
                      className="w-full"
                    >
                      <SelectValue placeholder="Elige una dirección" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedAddresses.map((address) => (
                        <SelectItem key={address.id} value={address.id}>
                          {address.label}
                          {address.isDefault ? " (predeterminada)" : ""}
                        </SelectItem>
                      ))}
                      <SelectItem value={CHECKOUT_NEW_ADDRESS_ID}>
                        Agregar nueva dirección
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2 sm:col-span-2">
                <RequiredLabel htmlFor="checkout-addressLabel">
                  Nombre de esta dirección
                </RequiredLabel>
                <Input
                  id="checkout-addressLabel"
                  value={values.addressLabel}
                  onChange={(event) =>
                    updateField("addressLabel", event.target.value)
                  }
                  placeholder="Ej. Casa, Empresa, Oficina"
                  required
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Así la reconocerás la próxima vez que compres.
                </p>
              </div>

              <ChileLocationFields
                idPrefix="checkout"
                values={{
                  region: values.region,
                  commune: values.commune,
                  city: values.city,
                }}
                onChange={(patch) =>
                  setValues((current) => ({ ...current, ...patch }))
                }
                disabled={isPending}
                className="sm:col-span-2"
              />

              <div className="space-y-2 sm:col-span-2">
                <RequiredLabel htmlFor="checkout-street">
                  Calle y número
                </RequiredLabel>
                <Input
                  id="checkout-street"
                  value={values.street}
                  onChange={(event) =>
                    updateField("street", event.target.value)
                  }
                  required
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-unit">
                  Depto / oficina / block (opcional)
                </Label>
                <Input
                  id="checkout-unit"
                  value={values.unit}
                  onChange={(event) => updateField("unit", event.target.value)}
                  disabled={isPending}
                />
              </div>
            </CardContent>
          </Card>
        </CheckoutSection>
      ) : null}

      {showCheckoutFooter ? (
        <CheckoutSection className="space-y-6">
          <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 p-4">
            <Checkbox
              id="checkout-terms"
              checked={values.acceptTerms}
              onCheckedChange={(checked) =>
                updateField("acceptTerms", checked === true)
              }
              disabled={isPending}
            />
            <Label
              htmlFor="checkout-terms"
              className="text-sm leading-relaxed text-muted-foreground font-normal"
            >
              <span className="text-destructive" aria-hidden="true">
                *{" "}
              </span>
              Acepto los{" "}
              <Link
                href={footerLegalLinks[0]?.href ?? "/legal/terms"}
                className="font-medium text-primary hover:underline"
                target="_blank"
              >
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link
                href={footerLegalLinks[1]?.href ?? "/legal/privacy"}
                className="font-medium text-primary hover:underline"
                target="_blank"
              >
                política de privacidad
              </Link>
              .
            </Label>
          </div>

          {/* Resumen de Pago */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-sm animate-in fade-in-0 duration-300">
            <h3 className="font-heading font-bold text-sm text-foreground uppercase tracking-wider">
              Resumen de Pago
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (Neto)</span>
                <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA (19%)</span>
                <span className="font-medium text-foreground">{formatMoney(iva)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Comisión de Pago (Flow.cl)</span>
                <span className="font-medium text-foreground">{formatMoney(flowCommission)}</span>
              </div>
              <div className="border-t border-border/40 my-3" />
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-foreground text-base">Total final</span>
                <span className="font-black text-2xl text-primary tabular-nums">
                  {formatMoney(total)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border/60 bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">
                {itemCount} {itemCount === 1 ? "producto" : "productos"}
              </p>
              <p className="text-xl font-black text-primary tabular-nums">
                {formatMoney(total)}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                type="button"
                asChild
                disabled={isPending}
              >
                <Link href={storeRoutes.cart}>Volver al carrito</Link>
              </Button>
              <Button
                type="submit"
                disabled={isPending || !canSubmit}
                className="font-bold"
              >
                {isPending ? "Redirigiendo a Flow…" : "Ir a pagar con Flow"}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center sm:text-left">
            <span className="text-destructive" aria-hidden="true">
              *
            </span>{" "}
            requerido
          </p>
        </CheckoutSection>
      ) : (
        <div className="flex justify-start">
          <Button variant="outline" type="button" asChild disabled={isPending}>
            <Link href={storeRoutes.cart}>Volver al carrito</Link>
          </Button>
        </div>
      )}
    </form>
  );
}
