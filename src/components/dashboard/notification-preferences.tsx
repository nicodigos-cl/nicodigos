"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { useWebPush } from "@/components/notifications/onesignal-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { updateCommunicationPreferencesAction } from "@/lib/actions/communication-preferences";
import type { PreferenceInput } from "@/lib/validations/communications";
import { cn } from "@/lib/utils";

const operationalCategories: Array<{
  key: keyof PreferenceInput;
  label: string;
  description: string;
  mandatory?: boolean;
}> = [
  {
    key: "orders",
    label: "Pedidos",
    description: "Cambios relevantes en tus pedidos",
  },
  {
    key: "payments",
    label: "Pagos",
    description: "Confirmaciones y problemas de pago",
  },
  {
    key: "deliveries",
    label: "Entregas",
    description: "Contenido disponible y problemas de entrega",
  },
  {
    key: "smm",
    label: "Servicios SMM",
    description: "Progreso y acciones requeridas",
  },
  {
    key: "security",
    label: "Seguridad",
    description: "Alertas indispensables de tu cuenta",
    mandatory: true,
  },
];

const marketingCategories: Array<{
  key: keyof PreferenceInput;
  label: string;
  description: string;
}> = [
  {
    key: "newProducts",
    label: "Productos nuevos",
    description: "Novedades de catálogo",
  },
  {
    key: "promotions",
    label: "Promociones",
    description: "Descuentos y campañas",
  },
];

const pushStateLabels = {
  unsupported: "No compatibles",
  blocked: "Bloqueadas por el navegador",
  inactive: "No activadas",
  active: "Activadas",
  unavailable: "Temporalmente no disponibles",
} as const;

export function NotificationPreferences({
  initial,
}: {
  initial: PreferenceInput;
}) {
  const [prefs, setPrefs] = useState(initial);
  const [pending, startTransition] = useTransition();
  const push = useWebPush();

  function setPreference(key: keyof PreferenceInput, checked: boolean) {
    setPrefs((current) => ({ ...current, [key]: checked }));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="font-heading text-lg font-semibold">
              Notificaciones web
            </h2>
            <p className="text-sm text-muted-foreground">
              Estado:{" "}
              <strong className="text-foreground">
                {pushStateLabels[push.state]}
              </strong>
              . El permiso del navegador y tu preferencia son estados distintos.
            </p>
          </div>
          {push.state === "active" ? (
            <Button
              variant="outline"
              disabled={push.pending}
              onClick={() => void push.disable()}
              className="shrink-0"
            >
              {push.pending ? "Desactivando…" : "Desactivar en este navegador"}
            </Button>
          ) : (
            <Button
              disabled={
                push.pending ||
                push.state === "unsupported" ||
                push.state === "blocked" ||
                push.state === "unavailable"
              }
              onClick={() => void push.requestPermission()}
              className="shrink-0"
            >
              {push.pending ? "Activando…" : "Activar notificaciones"}
            </Button>
          )}
        </div>
        {push.state === "blocked" ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            El navegador bloqueó el permiso. Habilítalo desde el icono de
            candado de la barra de direcciones y recarga la página.
          </p>
        ) : null}
        {push.state === "unsupported" ? (
          <p className="mt-4 rounded-xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Este navegador no soporta notificaciones push web.
          </p>
        ) : null}
      </section>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void (async () => {
              const result = await updateCommunicationPreferencesAction({
                ...prefs,
                webPushEnabled: push.state === "active",
                security: true,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Preferencias actualizadas");
            })();
          });
        }}
      >
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold">
                Email de marketing
              </h2>
              <p className="text-sm text-muted-foreground">
                Promociones y novedades. No afecta emails operacionales o de
                seguridad indispensables.
              </p>
            </div>
            <Switch
              checked={prefs.marketingEmail}
              onCheckedChange={(checked) =>
                setPreference("marketingEmail", checked)
              }
              aria-label="Email de marketing"
            />
          </div>

          <div className="pt-4">
            <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Categorías operativas
            </h3>
            <div className="divide-y divide-border">
              {operationalCategories.map((category) => (
                <div
                  key={category.key}
                  className="flex items-center justify-between gap-4 py-4"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {category.label}
                      {category.mandatory ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          · indispensable
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                  <Switch
                    checked={prefs[category.key]}
                    disabled={category.mandatory}
                    onCheckedChange={(checked) =>
                      setPreference(category.key, checked)
                    }
                    aria-label={category.label}
                    className={cn(category.mandatory && "opacity-60")}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1 border-b border-border pb-4">
            <h2 className="font-heading text-lg font-semibold">
              Contenido comercial
            </h2>
            <p className="text-sm text-muted-foreground">
              Opcional. Puedes desactivar estas categorías en cualquier momento.
            </p>
          </div>
          <div className="divide-y divide-border">
            {marketingCategories.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-4 py-4"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{category.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <Switch
                  checked={prefs[category.key]}
                  onCheckedChange={(checked) =>
                    setPreference(category.key, checked)
                  }
                  aria-label={category.label}
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar preferencias"}
          </Button>
        </div>
      </form>
    </div>
  );
}
