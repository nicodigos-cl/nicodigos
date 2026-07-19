"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ActionResult } from "@/lib/actions/types";

export const settingsInputClass =
  "h-9 w-full max-w-xl rounded-sm border border-border/80 bg-muted/10 px-3 font-mono text-xs outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary shadow-inner";

export function SettingsSectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-2xl space-y-1 pb-2 border-b border-border/40 mb-4">
      <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
        {title}
      </h2>
      <p className="font-mono text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}

export function SettingsField({
  label,
  hint,
  children,
  required,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="grid max-w-xl gap-1.5 font-mono text-xs">
      <span className="font-bold text-foreground">
        {label.toUpperCase()}
        {required ? <span className="text-destructive"> *</span> : null}
      </span>
      {children}
      {hint ? (
        <span className="text-[10px] text-muted-foreground/80">{hint}</span>
      ) : null}
    </label>
  );
}

export function SettingsSwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex max-w-2xl items-center justify-between gap-4 rounded-sm border border-border/80 bg-muted/5 px-4 py-3 font-mono text-xs">
      <div className="min-w-0">
        <p className="font-bold text-foreground">{label.toUpperCase()}</p>
        {hint ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground/80">{hint}</p>
        ) : null}
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-label={label}
        className="rounded-sm"
      />
    </div>
  );
}

export function SettingsFormShell({
  children,
  onSubmit,
  pending,
  dirty,
  className,
}: {
  children: ReactNode;
  onSubmit: () => void;
  pending: boolean;
  dirty: boolean;
  className?: string;
}) {
  return (
    <form
      className={cn("flex flex-col gap-5", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {children}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-border/80 py-3">
        <Button
          type="submit"
          disabled={pending || !dirty}
          className="rounded-sm font-mono text-xs"
        >
          {pending ? "GUARDANDO…" : "GUARDAR_CAMBIOS"}
        </Button>
        {dirty ? (
          <span className="font-mono text-[10px] text-amber-600 font-bold" aria-live="polite">
            [STATUS: DRAFT_CHANGES]
          </span>
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground" aria-live="polite">
            [STATUS: ACTIVE_SYNC]
          </span>
        )}
      </div>
    </form>
  );
}

export function useSettingsAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<ActionResult<unknown>>,
    successMessage: string,
  ) {
    startTransition(() => {
      void (async () => {
        const result = await action();
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(successMessage);
        router.refresh();
      })();
    });
  }

  return { pending, run };
}

export function ConfirmationField({
  value,
  onChange,
  expected,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  expected: string;
  label: string;
}) {
  return (
    <div className="max-w-xl rounded-sm border border-destructive/40 bg-destructive/5 p-4 font-mono text-xs">
      <Label className="font-bold text-destructive uppercase">{label}</Label>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Escribe <code className="bg-destructive/10 px-1 py-0.5 rounded-sm">{expected}</code> para confirmar.
      </p>
      <Input
        className="mt-3 rounded-sm font-mono text-xs border-border/80 focus-visible:ring-1 focus-visible:ring-destructive"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        autoComplete="off"
        aria-required
      />
    </div>
  );
}

export function EnvStatusNote({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-2xl rounded-sm border border-border/80 bg-muted/20 px-4 py-3 font-mono text-[10px] text-muted-foreground">
      {children}
    </div>
  );
}

export function useDraft<T extends object>(initial: T) {
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  return { draft, setDraft, dirty };
}
