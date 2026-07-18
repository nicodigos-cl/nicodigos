"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { HiOutlineUser, HiOutlineLockClosed } from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCustomerProfileAction } from "@/lib/actions/customer-dashboard";

export function PersonalInfoForm({
  initialName,
  initialPhone,
  email,
}: {
  initialName: string | null;
  initialPhone: string | null;
  email: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName ?? "");
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    startTransition(() => {
      void (async () => {
        const result = await updateCustomerProfileAction({ name, phone });
        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message || "Error al actualizar el perfil");
          return;
        }
        toast.success("Perfil actualizado con éxito");
        router.refresh();
      })();
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center gap-3 border-b border-border pb-4 mb-5">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <HiOutlineUser className="size-5" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Datos personales
          </h2>
          <p className="text-xs text-muted-foreground">
            Información básica de contacto de tu cuenta.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Email (Read only) */}
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email">Email</Label>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <HiOutlineLockClosed className="size-3" /> Gestionado desde Seguridad
              </span>
            </div>
            <Input
              id="email"
              value={email}
              disabled
              readOnly
              className="bg-muted/50 cursor-not-allowed opacity-80"
            />
          </div>

          {/* Nombre */}
          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(fieldError("name"))}
              placeholder="Tu nombre completo"
            />
            {fieldError("name") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("name")}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-1 sm:col-span-2 md:col-span-1">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={pending}
              aria-invalid={Boolean(fieldError("phone"))}
              placeholder="+56 9 1234 5678"
            />
            {fieldError("phone") && (
              <p className="text-xs text-destructive mt-1" role="alert">
                {fieldError("phone")}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto font-medium">
            {pending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </div>
      </form>
    </section>
  );
}
