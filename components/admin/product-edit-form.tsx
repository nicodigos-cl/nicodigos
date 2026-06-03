"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  mapProductImagesToGallery,
  ProductGalleryEditor,
  type GalleryImageItem,
} from "@/components/admin/product-gallery-editor";
import { AiTextAssistToolbar } from "@/components/admin/ai-text-assist-toolbar";
import {
  buildMetadataFormState,
  parseMetadataFormSlice,
  ProductKinguinMetadataCard,
} from "@/components/admin/product-kinguin-metadata-card";
import {
  mapProductSystemRequirements,
  type SystemRequirementItem,
} from "@/components/admin/product-system-requirements-editor";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import type { AiProductContext } from "@/lib/admin/ai/types";
import {
  mapProductVideosToTrailers,
  ProductTrailerEditor,
  type TrailerItem,
} from "@/components/admin/product-trailer-editor";
import { updateProductAction } from "@/lib/admin/products/actions";
import type { AdminProductEditData } from "@/lib/admin/products/get-product";
import type {
  SystemRequirementInput,
  UpdateProductInput,
} from "@/lib/admin/products/schemas";
import {
  htmlToPlainText,
  looksLikeHtml,
  normalizeDescriptionForEditor,
  normalizeDescriptionForSave,
  plainTextToHtml,
} from "@/lib/html/text";
import { formatMoney, formatSourceMoney } from "@/lib/currency/format";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProductEditFormProps = {
  product: AdminProductEditData;
  exchangeRate: number;
  r2Configured: boolean;
  openAiConfigured: boolean;
};

function buildAiProductContext(
  product: AdminProductEditData,
  form: { name: string; platform: string; isPreorder: boolean },
  metadataForm: { regionalLimitations: string; languages: string },
): AiProductContext {
  const languages = metadataForm.languages
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    name: form.name.trim() || product.name,
    platform: form.platform.trim() || product.platform,
    originalName: product.originalName,
    regionalLimitations:
      metadataForm.regionalLimitations.trim() || product.regionalLimitations,
    developers: product.developers,
    publishers: product.publishers,
    languages: languages.length > 0 ? languages : product.languages,
    isPreorder: form.isPreorder,
  };
}

function parseSystemRequirementsForSave(
  items: SystemRequirementItem[],
): SystemRequirementInput[] {
  return items
    .map(({ clientId: _id, system, requirement }) => ({
      system: system.trim(),
      requirement: requirement.map((line) => line.trim()).filter(Boolean),
    }))
    .filter((item) => item.system.length > 0 && item.requirement.length > 0);
}

function applyAiTextToDescription(text: string): string {
  if (looksLikeHtml(text)) {
    return text.trim();
  }
  return plainTextToHtml(text);
}

export function ProductEditForm({
  product,
  exchangeRate,
  r2Configured,
  openAiConfigured,
}: ProductEditFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [gallery, setGallery] = useState<GalleryImageItem[]>(() =>
    mapProductImagesToGallery(product.images),
  );
  const [trailers, setTrailers] = useState<TrailerItem[]>(() =>
    mapProductVideosToTrailers(product.videos),
  );
  const [metadataForm, setMetadataForm] = useState(() =>
    buildMetadataFormState(product),
  );
  const [systemRequirements, setSystemRequirements] = useState(() =>
    mapProductSystemRequirements(product.systemRequirements),
  );

  const [form, setForm] = useState<
    Omit<
      UpdateProductInput,
      | "images"
      | "videos"
      | "systemRequirements"
      | keyof ReturnType<typeof parseMetadataFormSlice>
    >
  >({
    name: product.name,
    description: normalizeDescriptionForEditor(product.description),
    platform: product.platform,
    costPrice: Math.round(Number(product.costPrice)),
    sellPrice: Math.round(Number(product.sellPrice)),
    qty: product.qty,
    isActive: product.isActive,
    isOffer: product.isOffer,
    isPreorder: product.isPreorder,
  });

  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const aiProductContext = buildAiProductContext(product, form, metadataForm);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const payload: UpdateProductInput = {
      ...form,
      description: normalizeDescriptionForSave(form.description),
      ...parseMetadataFormSlice(metadataForm),
      images: gallery.map(({ clientId: _id, ...image }) => image),
      videos: trailers.map(({ clientId: _id, ...video }) => video),
      systemRequirements: parseSystemRequirementsForSave(systemRequirements),
    };

    startTransition(async () => {
      const result = await updateProductAction(product.id, payload);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setMessage(result.message ?? "Guardado.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ProductGalleryEditor
        productId={product.id}
        productName={product.name}
        images={gallery}
        onChange={setGallery}
        r2Configured={r2Configured}
        disabled={isPending}
      />

      <ProductTrailerEditor
        trailers={trailers}
        onChange={setTrailers}
        disabled={isPending}
      />

      <ProductKinguinMetadataCard
        regionName={product.regionName}
        regionId={product.regionId}
        regionalLimitations={product.regionalLimitations}
        developers={product.developers}
        publishers={product.publishers}
        releaseDate={product.releaseDate}
        ageRating={product.ageRating}
        steamAppId={product.steamAppId}
        systemRequirements={systemRequirements}
        onSystemRequirementsChange={setSystemRequirements}
        form={metadataForm}
        onChange={(key, value) =>
          setMetadataForm((prev) => ({ ...prev, [key]: value }))
        }
        disabled={isPending}
        openAiConfigured={openAiConfigured}
        aiProductContext={aiProductContext}
        onAiError={setAiError}
      />

      <Card>
        <CardHeader>
          <CardTitle>Información general</CardTitle>
          <CardDescription>
            Kinguin #{product.kinguinId} · Tipo de cambio EUR→CLP:{" "}
            {exchangeRate.toLocaleString("es-CL")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="name" className="mb-0">
                  Nombre en tienda
                </FieldLabel>
                <AiTextAssistToolbar
                  configured={openAiConfigured}
                  field="name"
                  value={form.name}
                  productContext={aiProductContext}
                  onApply={(text) => updateField("name", text)}
                  onError={setAiError}
                  disabled={isPending}
                />
              </div>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="platform">Plataforma</FieldLabel>
              <Input
                id="platform"
                value={form.platform}
                onChange={(e) => updateField("platform", e.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <FieldLabel htmlFor="description" className="mb-0">
                  Descripción
                </FieldLabel>
                <AiTextAssistToolbar
                  configured={openAiConfigured}
                  field="description"
                  value={htmlToPlainText(form.description ?? "")}
                  productContext={aiProductContext}
                  onApply={(text) =>
                    updateField("description", applyAiTextToDescription(text))
                  }
                  onError={setAiError}
                  disabled={isPending}
                />
              </div>
              <FieldDescription>
                Editor rich text. La asistencia IA genera HTML simple para la
                ficha en Chile.
              </FieldDescription>
              <RichTextEditor
                id="description"
                value={form.description ?? ""}
                onChange={(html) => updateField("description", html)}
                disabled={isPending}
              />
            </Field>
            <Field>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={form.isActive}
                    onCheckedChange={(checked) =>
                      updateField("isActive", checked === true)
                    }
                    disabled={isPending}
                  />
                  <FieldLabel htmlFor="isActive" className="mb-0">
                    Publicado en tienda
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isOffer"
                    checked={form.isOffer}
                    onCheckedChange={(checked) =>
                      updateField("isOffer", checked === true)
                    }
                    disabled={isPending}
                  />
                  <FieldLabel htmlFor="isOffer" className="mb-0">
                    Destacar en ofertas
                  </FieldLabel>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isPreorder"
                    checked={form.isPreorder}
                    onCheckedChange={(checked) =>
                      updateField("isPreorder", checked === true)
                    }
                    disabled={isPending}
                  />
                  <FieldLabel htmlFor="isPreorder" className="mb-0">
                    Preorder
                  </FieldLabel>
                </div>
              </div>
              <FieldDescription>
                Desmarcado = borrador (no visible para clientes). «Destacar en
                ofertas» lo muestra en /offers.
              </FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios</CardTitle>
          <CardDescription>
            Costo original Kinguin:{" "}
            {product.sourceCostPrice
              ? formatSourceMoney(
                  product.sourceCostPrice,
                  product.sourceCurrency,
                )
              : "—"}{" "}
            · Precios de venta en pesos chilenos (CLP)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="costPrice">Costo (CLP)</FieldLabel>
                <Input
                  id="costPrice"
                  type="number"
                  min={0}
                  step={1}
                  value={form.costPrice}
                  onChange={(e) =>
                    updateField("costPrice", Number(e.target.value))
                  }
                  disabled={isPending}
                />
                <FieldDescription>
                  Convertido desde EUR al importar
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="sellPrice">Precio venta (CLP)</FieldLabel>
                <Input
                  id="sellPrice"
                  type="number"
                  min={1}
                  step={1}
                  value={form.sellPrice}
                  onChange={(e) =>
                    updateField("sellPrice", Number(e.target.value))
                  }
                  disabled={isPending}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="qty">Stock (qty)</FieldLabel>
              <Input
                id="qty"
                type="number"
                min={0}
                step={1}
                value={form.qty}
                onChange={(e) => updateField("qty", Number(e.target.value))}
                disabled={isPending}
                className="max-w-xs"
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {product.offers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Ofertas Kinguin</CardTitle>
            <CardDescription>
              Todas las ofertas devueltas por Kinguin al importar (
              {product.offers.length}). La marcada Default alimenta el
              precio/stock del producto.
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oferta</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Costo origen</TableHead>
                  <TableHead className="text-right">Costo CLP</TableHead>
                  <TableHead className="text-right">Venta CLP</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Text keys</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {product.offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{offer.name}</span>
                        {offer.isDefault ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : null}
                        {offer.isPreorder ? (
                          <Badge variant="outline">Preorder</Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {offer.merchantName ?? "—"}
                    </TableCell>
                    <TableCell>
                      {offer.sourceCostPrice
                        ? formatSourceMoney(
                            offer.sourceCostPrice,
                            offer.sourceCurrency,
                          )
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(offer.costPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(offer.sellPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {offer.qty}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {offer.textQty}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {aiError ? (
        <Alert variant="destructive">
          <AlertTitle>Asistencia IA</AlertTitle>
          <AlertDescription>{aiError}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {message ? (
        <Alert>
          <AlertTitle>Guardado</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? <Spinner className="size-4" /> : null}
          Guardar cambios
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/products">Volver al listado</Link>
        </Button>
      </div>
    </form>
  );
}
