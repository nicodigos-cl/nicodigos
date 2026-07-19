"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  chileComunaName,
  chileComunaOptions,
  chileRegionName,
  chileRegionOptions,
  resolveChileComunaCode,
  resolveChileRegionNumber,
} from "@/lib/chile/territorial";

type ChileLocationFieldsProps = {
  region: string;
  commune: string;
  onRegionChange: (regionName: string) => void;
  onCommuneChange: (communeName: string) => void;
  communeRequired?: boolean;
  communeError?: string | null;
  disabled?: boolean;
};

/**
 * Cascading Región → Comuna selects (datos oficiales Chile).
 * Persists human-readable names for DB compatibility.
 */
export function ChileLocationFields({
  region,
  commune,
  onRegionChange,
  onCommuneChange,
  communeRequired = false,
  communeError,
  disabled = false,
}: ChileLocationFieldsProps) {
  const regionOptions = chileRegionOptions();
  const regionNumber = resolveChileRegionNumber(region);
  const communeOptions = chileComunaOptions(regionNumber);
  const communeCode = resolveChileComunaCode(regionNumber, commune);

  return (
    <>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="region">Región</FieldLabel>
        <NativeSelect
          id="region"
          name="region"
          autoComplete="address-level1"
          className="w-full"
          disabled={disabled}
          value={regionNumber}
          onChange={(event) => {
            const nextNumber = event.target.value;
            onRegionChange(nextNumber ? chileRegionName(nextNumber) : "");
            onCommuneChange("");
          }}
        >
          <NativeSelectOption value="">Selecciona región…</NativeSelectOption>
          {regionOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </Field>

      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="commune">
          Comuna
          {communeRequired ? (
            <span className="text-destructive ml-1">*</span>
          ) : null}
        </FieldLabel>
        <NativeSelect
          id="commune"
          name="commune"
          className="w-full"
          disabled={disabled || !regionNumber}
          required={communeRequired}
          value={communeCode}
          aria-invalid={Boolean(communeError) || undefined}
          onChange={(event) => {
            const code = event.target.value;
            onCommuneChange(code ? chileComunaName(code) : "");
          }}
        >
          <NativeSelectOption value="">
            {regionNumber ? "Selecciona comuna…" : "Elige una región primero"}
          </NativeSelectOption>
          {communeOptions.map((option) => (
            <NativeSelectOption key={option.value} value={option.value}>
              {option.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {communeError ? (
          <p className="mt-1 text-xs text-destructive">{communeError}</p>
        ) : null}
      </Field>
    </>
  );
}
