"use client";

import {
  BULK_EXPORT_SELECTION_LIMIT,
  BULK_SELECTION_LIMIT_OPTIONS,
  clampBulkSelectionLimit,
} from "@/lib/smm-services/constants";
import { cn } from "@/lib/utils";

type SelectionLimitControlProps = {
  value: number;
  onChange: (limit: number) => void;
  disabled?: boolean;
  className?: string;
};

export function SelectionLimitControl({
  value,
  onChange,
  disabled,
  className,
}: SelectionLimitControlProps) {
  const options = BULK_SELECTION_LIMIT_OPTIONS.filter(
    (option) => option <= BULK_EXPORT_SELECTION_LIMIT,
  );
  const safeValue = clampBulkSelectionLimit(value);
  const hasCustom = !options.includes(
    safeValue as (typeof options)[number],
  );

  return (
    <label
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      <span className="whitespace-nowrap">Límite</span>
      <select
        value={safeValue}
        disabled={disabled}
        onChange={(event) => {
          onChange(clampBulkSelectionLimit(Number(event.target.value)));
        }}
        className="h-8 rounded-lg border border-border bg-background px-2 text-xs text-foreground"
        aria-label="Límite de selección"
      >
        {hasCustom ? (
          <option value={safeValue}>{safeValue}</option>
        ) : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
