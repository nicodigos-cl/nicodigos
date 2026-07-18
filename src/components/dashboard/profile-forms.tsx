"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  updateBillingProfileAction,
  updateCustomerProfileAction,
} from "@/lib/actions/customer-dashboard";
import type { CustomerProfileCompleteness } from "@/lib/customer-dashboard/types";

export function ProfileForms({
  profile,
}: {
  profile: CustomerProfileCompleteness;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [invoiceType, setInvoiceType] = useState<"BOLETA" | "FACTURA">(
    profile.invoiceType,
  );
  const [rut, setRut] = useState(profile.rut ?? "");
  const [businessName, setBusinessName] = useState(profile.businessName ?? "");
  const [businessActivity, setBusinessActivity] = useState(
    profile.businessActivity ?? "",
  );
  const [addressLine1, setAddressLine1] = useState(profile.addressLine1 ?? "");
  const [addressLine2, setAddressLine2] = useState(profile.addressLine2 ?? "");
  const [commune, setCommune] = useState(profile.commune ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [region, setRegion] = useState(profile.region ?? "");

  return (
    <div className="space-y-8">
      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void (async () => {
              const result = await updateCustomerProfileAction({ name, phone });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Perfil actualizado");
              router.refresh();
            })();
          });
        }}
      >
        <h2 className="font-heading text-lg font-semibold">Datos personales</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled readOnly />
            <p className="text-xs text-muted-foreground">
              El email se gestiona desde Seguridad.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          Guardar perfil
        </Button>
      </form>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void (async () => {
              const result = await updateBillingProfileAction({
                invoiceType,
                rut,
                businessName,
                businessActivity,
                addressLine1,
                addressLine2,
                commune,
                city,
                region,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Datos de facturación guardados");
              router.refresh();
            })();
          });
        }}
      >
        <h2 className="font-heading text-lg font-semibold">Facturación</h2>
        <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <div className="space-y-1">
            <Label htmlFor="rut">RUT</Label>
            <Input
              id="rut"
              value={rut}
              onChange={(event) => setRut(event.target.value)}
              disabled={pending}
              placeholder="12345678-9"
            />
          </div>
          {invoiceType === "FACTURA" ? (
            <>
              <div className="space-y-1">
                <Label htmlFor="businessName">Razón social</Label>
                <Input
                  id="businessName"
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="businessActivity">Giro</Label>
                <Input
                  id="businessActivity"
                  value={businessActivity}
                  onChange={(event) => setBusinessActivity(event.target.value)}
                  disabled={pending}
                />
              </div>
            </>
          ) : null}
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="addressLine1">Dirección</Label>
            <Input
              id="addressLine1"
              value={addressLine1}
              onChange={(event) => setAddressLine1(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="addressLine2">Dirección (línea 2)</Label>
            <Input
              id="addressLine2"
              value={addressLine2}
              onChange={(event) => setAddressLine2(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="commune">Comuna</Label>
            <Input
              id="commune"
              value={commune}
              onChange={(event) => setCommune(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="city">Ciudad</Label>
            <Input
              id="city"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="region">Región</Label>
            <Input
              id="region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              disabled={pending}
            />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          Guardar facturación
        </Button>
      </form>
    </div>
  );
}
