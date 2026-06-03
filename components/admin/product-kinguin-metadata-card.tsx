"use client";

import type { KinguinSystemRequirement } from "@/types/kinguin";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type ProductMetadataFormSlice = {
  regionalLimitations: string;
  activationDetails: string;
  countryLimitations: string;
  languages: string;
};

type ProductKinguinMetadataCardProps = {
  regionName: string | null;
  regionId: number | null;
  regionalLimitations: string | null;
  developers: string[];
  publishers: string[];
  releaseDate: string | null;
  ageRating: string | null;
  steamAppId: string | null;
  systemRequirements: KinguinSystemRequirement[];
  form: ProductMetadataFormSlice;
  onChange: <K extends keyof ProductMetadataFormSlice>(
    key: K,
    value: ProductMetadataFormSlice[K],
  ) => void;
  disabled?: boolean;
};

function formatListInput(values: string[]): string {
  return values.join(", ");
}

function MetadataRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

export function buildMetadataFormState(product: {
  regionalLimitations: string | null;
  activationDetails: string | null;
  countryLimitations: string[];
  languages: string[];
}): ProductMetadataFormSlice {
  return {
    regionalLimitations: product.regionalLimitations ?? "",
    activationDetails: product.activationDetails ?? "",
    countryLimitations: formatListInput(product.countryLimitations),
    languages: formatListInput(product.languages),
  };
}

export function parseMetadataFormSlice(form: ProductMetadataFormSlice): {
  regionalLimitations?: string;
  activationDetails?: string;
  countryLimitations: string[];
  languages: string[];
} {
  const splitList = (raw: string) =>
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    regionalLimitations: form.regionalLimitations.trim() || undefined,
    activationDetails: form.activationDetails.trim() || undefined,
    countryLimitations: splitList(form.countryLimitations),
    languages: splitList(form.languages),
  };
}

export function ProductKinguinMetadataCard({
  regionName,
  regionId,
  regionalLimitations,
  developers,
  publishers,
  releaseDate,
  ageRating,
  steamAppId,
  systemRequirements,
  form,
  onChange,
  disabled = false,
}: ProductKinguinMetadataCardProps) {
  const displayRegion =
    regionName ??
    regionalLimitations ??
    (regionId != null ? `ID ${regionId}` : "—");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Región, activación y ficha técnica</CardTitle>
        <CardDescription>
          Datos de Kinguin sobre dónde funciona la key y cómo activarla. Los
          campos editables se publican en la tienda al guardar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetadataRow label="Región (Kinguin)">
            <span className="font-medium">{displayRegion}</span>
            {regionId != null ? (
              <span className="ml-1 text-muted-foreground">
                · ID {regionId}
              </span>
            ) : null}
          </MetadataRow>
          <MetadataRow label="Plataforma de activación">
            {steamAppId ? (
              <a
                href={`https://store.steampowered.com/app/${steamAppId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Steam App {steamAppId}
              </a>
            ) : (
              "—"
            )}
          </MetadataRow>
          <MetadataRow label="Fecha de lanzamiento">
            {releaseDate ?? "—"}
          </MetadataRow>
          <MetadataRow label="Desarrolladores">
            {developers.length > 0 ? developers.join(", ") : "—"}
          </MetadataRow>
          <MetadataRow label="Publishers">
            {publishers.length > 0 ? publishers.join(", ") : "—"}
          </MetadataRow>
          <MetadataRow label="Clasificación">{ageRating ?? "—"}</MetadataRow>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="regionalLimitations">
              Etiqueta de región (editable)
            </FieldLabel>
            <Input
              id="regionalLimitations"
              value={form.regionalLimitations}
              onChange={(e) => onChange("regionalLimitations", e.target.value)}
              disabled={disabled}
              placeholder="Ej. Europa, Global, Other"
            />
            <FieldDescription>
              Texto corto de Kinguin (`regionalLimitations`). La región oficial
              resuelta es: {displayRegion}.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="countryLimitations">
              Países excluidos (códigos ISO, separados por coma)
            </FieldLabel>
            <Input
              id="countryLimitations"
              value={form.countryLimitations}
              onChange={(e) => onChange("countryLimitations", e.target.value)}
              disabled={disabled}
              placeholder="US, CA, RU"
            />
            <FieldDescription>
              Lista de países donde la key no puede activarse.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="languages">
              Idiomas (separados por coma)
            </FieldLabel>
            <Input
              id="languages"
              value={form.languages}
              onChange={(e) => onChange("languages", e.target.value)}
              disabled={disabled}
              placeholder="English, Spanish"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="activationDetails">
              Instrucciones de activación
            </FieldLabel>
            <Textarea
              id="activationDetails"
              value={form.activationDetails}
              onChange={(e) => onChange("activationDetails", e.target.value)}
              disabled={disabled}
              rows={8}
              className="font-mono text-xs leading-relaxed"
              placeholder="Pasos para canjear la key en Steam, Origin, etc."
            />
          </Field>
        </FieldGroup>

        {systemRequirements.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Requisitos del sistema</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {systemRequirements.map((req) => (
                <div
                  key={req.system}
                  className="rounded-xl border border-border p-3 text-sm"
                >
                  <p className="mb-2 font-medium">{req.system}</p>
                  <ul className="list-inside list-disc space-y-1 text-muted-foreground">
                    {req.requirement.map((line, index) => (
                      <li key={`${req.system}-${index}`}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
