"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  updateUserBillingAction,
  updateUserProfileAction,
} from "@/lib/actions/users";
import type { UserDetailDto } from "@/types/users";

const inputClass =
  "h-9 w-full rounded-xl border border-input bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

export function UserProfileForms({ user }: { user: UserDetailDto }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const locked = user.accountStatus === "ANONYMIZED";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(() => {
            void (async () => {
              const result = await updateUserProfileAction({
                userId: user.id,
                name: String(form.get("name") ?? ""),
                phone: String(form.get("phone") ?? ""),
                reason: String(form.get("reason") ?? ""),
              });
              if (!result.success) return toast.error(result.message);
              toast.success("Perfil actualizado");
              router.refresh();
            })();
          });
        }}
      >
        <h2 className="text-sm font-medium">Perfil editable</h2>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Nombre
          <input
            name="name"
            className={inputClass}
            defaultValue={user.name}
            disabled={locked || pending}
            required
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Teléfono
          <input
            name="phone"
            className={inputClass}
            defaultValue={user.phone ?? ""}
            disabled={locked || pending}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Motivo administrativo
          <input
            name="reason"
            className={inputClass}
            disabled={locked || pending}
            required
            minLength={5}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Email e ID no son editables desde este panel.
        </p>
        <Button type="submit" size="sm" disabled={locked || pending}>
          Guardar perfil
        </Button>
      </form>

      <form
        className="space-y-3 rounded-2xl border border-border bg-card p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          startTransition(() => {
            void (async () => {
              const result = await updateUserBillingAction({
                userId: user.id,
                rut: String(form.get("rut") ?? ""),
                invoiceType: String(form.get("invoiceType") ?? "BOLETA"),
                businessName: String(form.get("businessName") ?? ""),
                businessActivity: String(form.get("businessActivity") ?? ""),
                addressLine1: String(form.get("addressLine1") ?? ""),
                addressLine2: String(form.get("addressLine2") ?? ""),
                commune: String(form.get("commune") ?? ""),
                city: String(form.get("city") ?? ""),
                region: String(form.get("region") ?? ""),
                reason: String(form.get("reason") ?? ""),
              });
              if (!result.success) return toast.error(result.message);
              toast.success("Facturación actualizada");
              router.refresh();
            })();
          });
        }}
      >
        <h2 className="text-sm font-medium">Facturación editable</h2>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Tipo de documento
          <select
            name="invoiceType"
            className={inputClass}
            defaultValue={user.billing.invoiceType}
            disabled={locked || pending}
          >
            <option value="BOLETA">Boleta</option>
            <option value="FACTURA">Factura</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          RUT
          <input
            name="rut"
            className={inputClass}
            defaultValue={user.billing.rut ?? ""}
            disabled={locked || pending}
            placeholder="12345678-9"
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Razón social
          <input
            name="businessName"
            className={inputClass}
            defaultValue={user.billing.businessName ?? ""}
            disabled={locked || pending}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Giro
          <input
            name="businessActivity"
            className={inputClass}
            defaultValue={user.billing.businessActivity ?? ""}
            disabled={locked || pending}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Dirección
          <input
            name="addressLine1"
            className={inputClass}
            defaultValue={user.billing.addressLine1 ?? ""}
            disabled={locked || pending}
          />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Complemento
          <input
            name="addressLine2"
            className={inputClass}
            defaultValue={user.billing.addressLine2 ?? ""}
            disabled={locked || pending}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Comuna
            <input
              name="commune"
              className={inputClass}
              defaultValue={user.billing.commune ?? ""}
              disabled={locked || pending}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Ciudad
            <input
              name="city"
              className={inputClass}
              defaultValue={user.billing.city ?? ""}
              disabled={locked || pending}
            />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Región
            <input
              name="region"
              className={inputClass}
              defaultValue={user.billing.region ?? ""}
              disabled={locked || pending}
            />
          </label>
        </div>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Motivo administrativo
          <input
            name="reason"
            className={inputClass}
            disabled={locked || pending}
            required
            minLength={5}
          />
        </label>
        <Button type="submit" size="sm" disabled={locked || pending}>
          Guardar facturación
        </Button>
      </form>
    </div>
  );
}
