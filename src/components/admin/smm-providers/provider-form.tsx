"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlineKey,
  HiOutlineRefresh,
  HiOutlineSave,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createSmmProviderAction,
  deleteSmmProviderAction,
  syncSmmProviderServicesAction,
  updateSmmProviderAction,
} from "@/lib/actions/smm-providers";
import { slugify } from "@/lib/products/format";
import type { SmmProviderDetailDto } from "@/types/smm-provider";

type ProviderFormProps = {
  mode: "create" | "edit";
  provider?: SmmProviderDetailDto;
  servicesSlot?: React.ReactNode;
};

type FormState = {
  name: string;
  slug: string;
  description: string;
  apiUrl: string;
  apiKey: string;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  isDefault: boolean;
};

function toFormState(provider?: SmmProviderDetailDto): FormState {
  if (!provider) {
    return {
      name: "",
      slug: "",
      description: "",
      apiUrl: "",
      apiKey: "",
      status: "ACTIVE",
      isDefault: false,
    };
  }

  return {
    name: provider.name,
    slug: provider.slug,
    description: provider.description ?? "",
    apiUrl: provider.apiUrl,
    apiKey: "",
    status: provider.status,
    isDefault: provider.isDefault,
  };
}

export function ProviderForm({
  mode,
  provider,
  servicesSlot,
}: ProviderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState<FormState>(() => toFormState(provider));

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const payload = {
      ...(mode === "edit" && provider ? { id: provider.id } : {}),
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      apiUrl: form.apiUrl,
      status: form.status,
      isDefault: form.isDefault,
      ...(mode === "create"
        ? { apiKey: form.apiKey }
        : form.apiKey.trim()
          ? { apiKey: form.apiKey }
          : {}),
    };

    startTransition(() => {
      void (async () => {
        const result =
          mode === "create"
            ? await createSmmProviderAction(payload)
            : await updateSmmProviderAction(payload);

        if (!result.success) {
          setFieldErrors(result.fieldErrors ?? {});
          toast.error(result.message);
          return;
        }

        toast.success(
          mode === "create" ? "Provider creado" : "Cambios guardados",
        );
        router.push(`/admin/providers/${result.data.id}`);
        router.refresh();
      })();
    });
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            render={<Link href="/admin/providers" />}
            nativeButton={false}
            aria-label="Volver"
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0 space-y-1">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-tight">
              {mode === "create"
                ? "Nuevo provider SMM"
                : (provider?.name ?? "Editar provider")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {mode === "create"
                ? "Configura apiUrl y apiKey del panel."
                : `Slug: ${provider?.slug}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mode === "edit" && provider ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  startTransition(() => {
                    void (async () => {
                      const result = await syncSmmProviderServicesAction({
                        id: provider.id,
                      });
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success(
                        `Sincronizados ${result.data.synced} · retirados ${result.data.removed} · productos archivados ${result.data.archivedProducts}`,
                      );
                      router.refresh();
                    })();
                  });
                }}
              >
                <HiOutlineRefresh className="size-4" />
                Sincronizar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={isPending}
                onClick={() => {
                  const confirmed = window.confirm(
                    `¿Eliminar "${provider.name}"?`,
                  );
                  if (!confirmed) return;
                  startTransition(() => {
                    void (async () => {
                      const result = await deleteSmmProviderAction({
                        id: provider.id,
                      });
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Provider eliminado");
                      router.push("/admin/providers");
                      router.refresh();
                    })();
                  });
                }}
              >
                <HiOutlineTrash className="size-4" />
                Eliminar
              </Button>
            </>
          ) : null}
          <Button type="submit" disabled={isPending}>
            <HiOutlineSave className="size-4" />
            {isPending ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Información general</CardTitle>
              <CardDescription>
                Identidad del panel y endpoint de la API v2.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={form.name}
                  aria-invalid={Boolean(fieldError("name"))}
                  onChange={(event) => {
                    const name = event.target.value;
                    updateField("name", name);
                    if (!slugTouched) updateField("slug", slugify(name));
                  }}
                />
                {fieldError("name") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("name")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  aria-invalid={Boolean(fieldError("slug"))}
                  onChange={(event) => {
                    setSlugTouched(true);
                    updateField("slug", event.target.value);
                  }}
                />
                {fieldError("slug") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("slug")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HiOutlineKey className="size-4" />
                Credenciales API
              </CardTitle>
              <CardDescription>
                `apiUrl` (ej. https://panel.com/api/v2) y `apiKey` del
                proveedor.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiUrl">API URL</Label>
                <Input
                  id="apiUrl"
                  value={form.apiUrl}
                  placeholder="https://perfectsmm.com/api/v2"
                  aria-invalid={Boolean(fieldError("apiUrl"))}
                  onChange={(event) =>
                    updateField("apiUrl", event.target.value)
                  }
                />
                {fieldError("apiUrl") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("apiUrl")}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">
                  API Key
                  {mode === "edit" ? (
                    <span className="ml-1 font-normal text-muted-foreground">
                      (dejar vacío para conservar)
                    </span>
                  ) : null}
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  autoComplete="off"
                  value={form.apiKey}
                  placeholder={
                    mode === "edit" ? provider?.apiKeyMasked : "••••••••"
                  }
                  aria-invalid={Boolean(fieldError("apiKey"))}
                  onChange={(event) =>
                    updateField("apiKey", event.target.value)
                  }
                />
                {fieldError("apiKey") ? (
                  <p className="text-xs text-destructive">
                    {fieldError("apiKey")}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {servicesSlot}
        </div>

        <div className="flex flex-col gap-6">
          <Card className="shadow-none ring-border">
            <CardHeader>
              <CardTitle>Estado</CardTitle>
              <CardDescription>Disponibilidad del provider.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  items={[
                    { value: "ACTIVE", label: "Activo" },
                    { value: "INACTIVE", label: "Inactivo" },
                    { value: "ERROR", label: "Error" },
                  ]}
                  value={form.status}
                  onValueChange={(value) => {
                    if (
                      value === "ACTIVE" ||
                      value === "INACTIVE" ||
                      value === "ERROR"
                    ) {
                      updateField("status", value);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Activo</SelectItem>
                    <SelectItem value="INACTIVE">Inactivo</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl border border-border p-3">
                <div className="space-y-1">
                  <Label htmlFor="isDefault">Provider por defecto</Label>
                  <p className="text-xs text-muted-foreground">
                    Se usará cuando no se especifique otro panel.
                  </p>
                </div>
                <Switch
                  id="isDefault"
                  checked={form.isDefault}
                  onCheckedChange={(checked) =>
                    updateField("isDefault", checked)
                  }
                />
              </div>

              {provider?.lastSyncedAt ? (
                <p className="text-xs text-muted-foreground">
                  Última sync:{" "}
                  {new Intl.DateTimeFormat("es-CL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(provider.lastSyncedAt))}
                </p>
              ) : null}

              {provider?.lastError ? (
                <p className="rounded-2xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {provider.lastError}
                </p>
              ) : null}

              {provider ? (
                <p className="text-sm text-muted-foreground">
                  Servicios cacheados:{" "}
                  <span className="font-medium text-foreground">
                    {provider.servicesCount}
                  </span>
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
