"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { HiOutlineCreditCard } from "react-icons/hi";

import { ChileLocationFields } from "@/components/store/chile-location-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { updateBillingProfileAction } from "@/lib/actions/customer-dashboard";
import type { CustomerProfileCompleteness } from "@/lib/customer-dashboard/types";

export function BillingInfoForm({
  profile,
}: {
  profile: CustomerProfileCompleteness;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [invoiceType, setInvoiceType] = useState<"BOLETA" | "FACTURA">(
    profile.invoiceType ?? "BOLETA",
  );
  const [rut, setRut] = useState(profile.rut ?? "");
  const [businessName, setBusinessName] = useState(profile.businessName ?? "");
  const [businessActivity, setBusinessActivity] = useState(
    profile.businessActivity ?? "",
  );
  const [addressLine1, setAddressLine1] = useState(profile.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(profile.addressLine2 ?? "");
  const [commune, setCommune] = useState(profile.commune ?? "");
  const [city] = useState(profile.city ?? "");
  const [region, setRegion] = useState(profile.region ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  // If validation errors change, focus on the first input with an error
  useEffect(() => {
    const errorKeys = Object.keys(fieldErrors);
    if (errorKeys.length > 0) {
      const firstErrorKey = errorKeys[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.focus();
      }
    }
  }, [fieldErrors]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(() => {
      void (async () => {
        const result = await updateBillingProfileAction({
          invoiceType,
          rut,
          businessName: invoiceType === "FACTURA" ? businessName : "",
          businessActivity: invoiceType === "FACTURA" ? businessActivity : "",
          addressLine1,
          addressLine2,
          commune,
          city,
          region,
        });

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(
            result.message || "Error al actualizar los datos de facturación",
          );
          return;
        }

        toast.success("Datos de facturación actualizados");
        router.refresh();
      })();
    });
  };

  return (
    <section
      id="billing-form"
      className="rounded-2xl border border-border bg-card p-4 sm:p-6 scroll-mt-6"
    >
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <HiOutlineCreditCard className="size-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Datos de facturación
          </h2>
          <p className="text-xs text-muted-foreground">
            Utilizados para emitir tus boletas o facturas de compra.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-xl bg-muted/40 p-3.5 text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-foreground block mb-1">
          ¿Por qué solicitamos esta información?
        </span>
        Emitimos comprobantes válidos ante el SII para cada transacción. Si necesitas
        declarar IVA, selecciona **Factura** y completa los campos obligatorios de
        empresa.
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Tipo de Documento */}
          <div className="space-y-1">
            <Label htmlFor="invoiceType">Tipo de documento</Label>
            <NativeSelect
              id="invoiceType"
              value={invoiceType}
              onChange={(event) =>
                setInvoiceType(event.target.value as "BOLETA" | "FACTURA")
              }
              disabled={pending}
            >
              <NativeSelectOption value="BOLETA">Boleta</NativeSelectOption>
              <NativeSelectOption value="FACTURA">Factura</NativeSelectOption>
            </NativeSelect>
            {fieldError("invoiceType") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("invoiceType")}
              </p>
            )}
          </div>

          {/* RUT */}
          <div className="space-y-1">
            <Label htmlFor="rut">
              RUT{" "}
              {invoiceType === "FACTURA" ? (
                <span className="text-destructive font-medium">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (Recomendado)
                </span>
              )}
            </Label>
            <Input
              id="rut"
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              disabled={pending}
              placeholder="12.345.678-9"
              aria-invalid={Boolean(fieldError("rut"))}
            />
            {fieldError("rut") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("rut")}
              </p>
            )}
          </div>

          {/* Company Fields (only visible if FACTURA) */}
          {invoiceType === "FACTURA" && (
            <>
              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label htmlFor="businessName">
                  Razón social <span className="text-destructive font-medium">*</span>
                </Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  disabled={pending}
                  placeholder="Nombre de la empresa S.A."
                  aria-invalid={Boolean(fieldError("businessName"))}
                />
                {fieldError("businessName") && (
                  <p className="text-xs text-destructive mt-1" role="alert">
                    {fieldError("businessName")}
                  </p>
                )}
              </div>

              <div className="space-y-1 sm:col-span-2 md:col-span-1">
                <Label htmlFor="businessActivity">
                  Giro <span className="text-destructive font-medium">*</span>
                </Label>
                <Input
                  id="businessActivity"
                  value={businessActivity}
                  onChange={(event) => setBusinessActivity(event.target.value)}
                  disabled={pending}
                  placeholder="Venta de servicios informáticos"
                  aria-invalid={Boolean(fieldError("businessActivity"))}
                />
                {fieldError("businessActivity") && (
                  <p className="text-xs text-destructive mt-1" role="alert">
                    {fieldError("businessActivity")}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Dirección línea 1 */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="addressLine1">
              Dirección{" "}
              {invoiceType === "FACTURA" ? (
                <span className="text-destructive font-medium">*</span>
              ) : (
                <span className="text-muted-foreground font-normal">
                  (Recomendado)
                </span>
              )}
            </Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              disabled={pending}
              placeholder="Calle Ejemplo 123"
              aria-invalid={Boolean(fieldError("addressLine1"))}
            />
            {fieldError("addressLine1") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("addressLine1")}
              </p>
            )}
          </div>

          {/* Dirección línea 2 */}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="addressLine2">
              Dirección (línea 2){" "}
              <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <Input
              id="addressLine2"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
              disabled={pending}
              placeholder="Depto 402, Oficina B, Block C"
              aria-invalid={Boolean(fieldError("addressLine2"))}
            />
            {fieldError("addressLine2") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("addressLine2")}
              </p>
            )}
          </div>

          <ChileLocationFields
            region={region}
            commune={commune}
            onRegionChange={setRegion}
            onCommuneChange={setCommune}
            communeError={fieldError("commune")}
            disabled={pending}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto font-medium">
            {pending ? "Guardando..." : "Guardar facturación"}
          </Button>
        </div>
      </form>
    </section>
  );
}
