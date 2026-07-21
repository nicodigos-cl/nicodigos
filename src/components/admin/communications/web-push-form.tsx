"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createWebPushDraftAction,
  estimateWebPushAudienceAction,
  scheduleWebPushAction,
  sendWebPushNowAction,
} from "@/lib/actions/admin-web-push";
import { confirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { WebPushPreview } from "@/components/admin/communications/web-push-preview";

type Initial = {
  id?: string;
  name?: string;
  title?: string;
  body?: string;
  kind?: "OPERATIONAL" | "MARKETING" | "SECURITY";
  targetUrl?: string | null;
  iconUrl?: string | null;
  imageUrl?: string | null;
  priority?: number;
  ttlSeconds?: number | null;
};
export function WebPushForm({ initial = {} }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [draftIdempotencyKey] = useState(() => crypto.randomUUID());
  const [id, setId] = useState(initial.id);
  const [name, setName] = useState(initial.name ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [body, setBody] = useState(initial.body ?? "");
  const [kind, setKind] = useState<"OPERATIONAL" | "MARKETING" | "SECURITY">(
    initial.kind ?? "OPERATIONAL",
  );
  const [targetUrl, setTargetUrl] = useState(initial.targetUrl ?? "");
  const [iconUrl, setIconUrl] = useState(initial.iconUrl ?? "");
  const [imageUrl, setImageUrl] = useState(initial.imageUrl ?? "");
  const [audienceType, setAudienceType] = useState<
    "ALL_ELIGIBLE" | "SPECIFIC_USERS" | "ONESIGNAL_SEGMENT"
  >("ALL_ELIGIBLE");
  const [audienceValue, setAudienceValue] = useState("");
  const [dataType, setDataType] = useState<
    "GENERAL" | "ORDER" | "DELIVERY" | "PRODUCT"
  >("GENERAL");
  const [dataId, setDataId] = useState("");
  const [actionText, setActionText] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [estimate, setEstimate] = useState<{
    estimated: number;
    excluded: number;
    resolvedAt: string;
  } | null>(null);
  const audience = useMemo(
    () =>
      audienceType === "ALL_ELIGIBLE"
        ? { type: "ALL_ELIGIBLE" as const }
        : audienceType === "ONESIGNAL_SEGMENT"
          ? { type: "ONESIGNAL_SEGMENT" as const, segment: audienceValue }
          : {
              type: "SPECIFIC_USERS" as const,
              userIds: audienceValue.split(/[\s,]+/).filter(Boolean),
            },
    [audienceType, audienceValue],
  );
  const data = useMemo(
    () =>
      dataType === "GENERAL"
        ? { type: "GENERAL" as const }
        : dataType === "ORDER"
          ? { type: "ORDER" as const, orderId: dataId }
          : dataType === "DELIVERY"
            ? { type: "DELIVERY" as const, deliveryId: dataId }
            : { type: "PRODUCT" as const, productId: dataId },
    [dataType, dataId],
  );
  function draftPayload() {
    return {
      notificationId: id,
      idempotencyKey: draftIdempotencyKey,
      name,
      title,
      body,
      kind,
      targetUrl,
      iconUrl,
      imageUrl,
      buttons:
        actionText && actionUrl
          ? [{ id: "primary", text: actionText, url: actionUrl }]
          : [],
      data,
      audience,
      language: "es" as const,
      priority: initial.priority ?? 5,
      ttlSeconds: initial.ttlSeconds ?? undefined,
    };
  }
  async function ensureDraft() {
    const result = await createWebPushDraftAction(draftPayload());
    if (!result.success) {
      toast.error(result.message);
      return null;
    }
    setId(result.data.id);
    return result.data.id;
  }
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form
        className="space-y-5 rounded-2xl border border-border bg-card p-5"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const savedId = await ensureDraft();
            if (savedId) {
              toast.success("Borrador guardado");
              router.push(`/admin/communications/web-push/${savedId}`);
              router.refresh();
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="push-name">Nombre interno</Label>
            <Input
              id="push-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="push-title">Título</Label>
            <Input
              id="push-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="push-body">Mensaje</Label>
            <Textarea
              id="push-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              maxLength={240}
              rows={4}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/240 caracteres
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-kind">Tipo</Label>
            <NativeSelect
              id="push-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
            >
              <NativeSelectOption value="OPERATIONAL">
                Operacional
              </NativeSelectOption>
              <NativeSelectOption value="SECURITY">
                Seguridad
              </NativeSelectOption>
              <NativeSelectOption value="MARKETING">
                Marketing
              </NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-url">URL de destino</Label>
            <Input
              id="push-url"
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://nicodigos.cl/…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-icon">Icono (URL HTTPS)</Label>
            <Input
              id="push-icon"
              type="url"
              value={iconUrl}
              onChange={(e) => setIconUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="push-image">Imagen (URL HTTPS)</Label>
            <Input
              id="push-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
        </div>
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Audiencia</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="audience-type">Destino</Label>
              <NativeSelect
                id="audience-type"
                value={audienceType}
                onChange={(e) => {
                  setAudienceType(e.target.value as typeof audienceType);
                  setEstimate(null);
                }}
              >
                <NativeSelectOption value="ALL_ELIGIBLE">
                  Todos los suscriptores elegibles
                </NativeSelectOption>
                <NativeSelectOption value="SPECIFIC_USERS">
                  Usuarios específicos
                </NativeSelectOption>
                <NativeSelectOption value="ONESIGNAL_SEGMENT">
                  Segmento OneSignal
                </NativeSelectOption>
              </NativeSelect>
            </div>
            {audienceType !== "ALL_ELIGIBLE" ? (
              <div className="space-y-1.5">
                <Label htmlFor="audience-value">
                  {audienceType === "SPECIFIC_USERS"
                    ? "IDs de usuario"
                    : "Nombre del segmento"}
                </Label>
                <Input
                  id="audience-value"
                  value={audienceValue}
                  onChange={(e) => setAudienceValue(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await estimateWebPushAudienceAction({
                    audience,
                    kind,
                  });
                  if (!result.success) toast.error(result.message);
                  else setEstimate(result.data);
                })
              }
            >
              Estimar audiencia
            </Button>
            {estimate ? (
              <p className="text-sm">
                <strong>{estimate.estimated}</strong> elegibles ·{" "}
                {estimate.excluded} excluidos por preferencias
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                La audiencia se resuelve y valida en servidor.
              </p>
            )}
          </div>
        </fieldset>
        <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Datos tipados</legend>
          <div className="space-y-1.5">
            <Label htmlFor="data-type">Destino relacionado</Label>
            <NativeSelect
              id="data-type"
              value={dataType}
              onChange={(e) => setDataType(e.target.value as typeof dataType)}
            >
              <NativeSelectOption value="GENERAL">General</NativeSelectOption>
              <NativeSelectOption value="ORDER">Pedido</NativeSelectOption>
              <NativeSelectOption value="DELIVERY">Entrega</NativeSelectOption>
              <NativeSelectOption value="PRODUCT">Producto</NativeSelectOption>
            </NativeSelect>
          </div>
          {dataType !== "GENERAL" ? (
            <div className="space-y-1.5">
              <Label htmlFor="data-id">ID interno</Label>
              <Input
                id="data-id"
                value={dataId}
                onChange={(e) => setDataId(e.target.value)}
                required
              />
            </div>
          ) : null}
        </fieldset>
        <fieldset className="grid gap-3 rounded-xl border border-border p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Botón opcional</legend>
          <div className="space-y-1.5">
            <Label htmlFor="action-text">Texto</Label>
            <Input
              id="action-text"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="action-url">URL</Label>
            <Input
              id="action-url"
              type="url"
              value={actionUrl}
              onChange={(e) => setActionUrl(e.target.value)}
            />
          </div>
        </fieldset>
        <fieldset className="space-y-3 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-medium">Programación</legend>
          <Label htmlFor="scheduled-at">Fecha y hora · America/Santiago</Label>
          <Input
            id="scheduled-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Se guardará como timestamp UTC y siempre se mostrará junto a la zona
            horaria.
          </p>
        </fieldset>
        <div aria-live="polite" className="flex flex-wrap justify-end gap-2">
          <Button type="submit" variant="outline" disabled={pending}>
            Guardar borrador
          </Button>
          {id && scheduledAt ? (
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await scheduleWebPushAction({
                    notificationId: id,
                    idempotencyKey: crypto.randomUUID(),
                    scheduledAt: new Date(scheduledAt).toISOString(),
                  });
                  if (!result.success) toast.error(result.message);
                  else {
                    toast.success("Notificación programada");
                    router.refresh();
                  }
                })
              }
            >
              Programar
            </Button>
          ) : null}
          {id ? (
            <Button
              type="button"
              disabled={pending}
              onClick={() => {
                void (async () => {
                  const confirmed = await confirmDialog.confirm({
                    title: "Enviar notificación",
                    description: `¿Enviar “${title}” a ${estimate?.estimated ?? "la audiencia resuelta"} destinatarios elegibles ahora?`,
                    confirmLabel: "Enviar ahora",
                  });
                  if (!confirmed) return;
                  startTransition(async () => {
                    const result = await sendWebPushNowAction({
                      notificationId: id,
                      idempotencyKey: crypto.randomUUID(),
                      confirmation: "ENVIAR",
                    });
                    if (!result.success) toast.error(result.message);
                    else {
                      toast.success("Notificación en cola");
                      router.refresh();
                    }
                  });
                })();
              }}
            >
              Enviar ahora
            </Button>
          ) : null}
        </div>
      </form>
      <aside className="xl:sticky xl:top-6 xl:self-start">
        <WebPushPreview
          title={title}
          body={body}
          iconUrl={iconUrl}
          imageUrl={imageUrl}
          actionText={actionText}
        />
      </aside>
    </div>
  );
}
