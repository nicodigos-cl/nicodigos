"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import {
  requiredSmmFieldsForType,
  SUBSCRIPTION_DELAYS,
  type SmmOrderFieldKey,
  type SmmOrderFieldsPayload,
} from "@/lib/validations/smm-order-fields";

type SmmOrderFieldsFormProps = {
  serviceType: string | null;
  smmMin?: number | null;
  smmMax?: number | null;
  initialValues?: Partial<SmmOrderFieldsPayload> | null;
  fieldErrors?: Record<string, string[]>;
  disabled?: boolean;
  idPrefix?: string;
  /** Hide fields managed outside this form (e.g. quantity on PDP). */
  omitFields?: SmmOrderFieldKey[];
  onChange?: (values: SmmOrderFieldsPayload) => void;
};

function emptyPayload(): SmmOrderFieldsPayload {
  return {};
}

export function SmmOrderFieldsForm({
  serviceType,
  smmMin,
  smmMax,
  initialValues,
  fieldErrors = {},
  disabled = false,
  idPrefix = "smm",
  omitFields = [],
  onChange,
}: SmmOrderFieldsFormProps) {
  const omit = new Set(omitFields);
  const fields = requiredSmmFieldsForType(serviceType).filter(
    (field) => !omit.has(field.key),
  );
  const [values, setValues] = useState<SmmOrderFieldsPayload>(() => ({
    ...emptyPayload(),
    ...(initialValues ?? {}),
  }));

  function setField<K extends SmmOrderFieldKey>(
    key: K,
    value: SmmOrderFieldsPayload[K],
  ) {
    const next = { ...values, [key]: value };
    setValues(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const error = fieldErrors[field.key]?.[0];
        const raw = values[field.key];

        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={id}>
              {field.label}
              {field.required ? (
                <span className="text-destructive"> *</span>
              ) : (
                <span className="text-muted-foreground"> (opcional)</span>
              )}
            </Label>

            {field.input === "textarea" ? (
              <Textarea
                id={id}
                value={typeof raw === "string" ? raw : ""}
                placeholder={field.placeholder}
                disabled={disabled}
                rows={4}
                onChange={(event) =>
                  setField(field.key, event.target.value || undefined)
                }
              />
            ) : field.input === "delay" ? (
              <NativeSelect
                id={id}
                value={typeof raw === "number" ? String(raw) : ""}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value;
                  setField(
                    field.key,
                    next === "" ? undefined : Number.parseInt(next, 10),
                  );
                }}
              >
                <NativeSelectOption value="">Selecciona…</NativeSelectOption>
                {SUBSCRIPTION_DELAYS.map((delay) => (
                  <NativeSelectOption key={delay} value={delay}>
                    {delay === 0 ? "Sin retraso" : `${delay} min`}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            ) : field.input === "number" ? (
              <Input
                id={id}
                type="number"
                inputMode="numeric"
                min={field.key === "quantity" ? (smmMin ?? 1) : 0}
                max={field.key === "quantity" ? (smmMax ?? undefined) : undefined}
                value={typeof raw === "number" ? raw : ""}
                placeholder={field.placeholder}
                disabled={disabled}
                onChange={(event) => {
                  const next = event.target.value;
                  setField(
                    field.key,
                    next === "" ? undefined : Number.parseInt(next, 10),
                  );
                }}
              />
            ) : (
              <Input
                id={id}
                type={field.input === "url" ? "url" : "text"}
                value={typeof raw === "string" ? raw : ""}
                placeholder={field.placeholder}
                disabled={disabled}
                onChange={(event) =>
                  setField(field.key, event.target.value || undefined)
                }
              />
            )}

            {field.hint && !error ? (
              <p className="text-xs text-muted-foreground">{field.hint}</p>
            ) : null}
            {field.key === "quantity" && (smmMin != null || smmMax != null) && !error ? (
              <p className="text-xs text-muted-foreground">
                {smmMin != null && smmMax != null
                  ? `Rango permitido: ${smmMin} – ${smmMax}`
                  : smmMin != null
                    ? `Mínimo: ${smmMin}`
                    : `Máximo: ${smmMax}`}
              </p>
            ) : null}
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function smmSummaryLabel(
  smm:
    | Partial<SmmOrderFieldsPayload>
    | {
        link?: string | null;
        username?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!smm) return null;
  if (smm.link) return smm.link;
  if (smm.username) return `@${smm.username}`;
  return null;
}
