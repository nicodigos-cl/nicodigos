"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { HiOutlinePlus } from "react-icons/hi";
import { toast } from "sonner";

import { createQuickCategoryAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CategoryOptionDto } from "@/types/products";

type CategoryComboboxBase = {
  categories: CategoryOptionDto[];
  /** Called when the local options list grows (e.g. quick-create). */
  onCategoriesChange?: (categories: CategoryOptionDto[]) => void;
  allowCreate?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
};

type CategoryComboboxSingleProps = CategoryComboboxBase & {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
};

type CategoryComboboxMultipleProps = CategoryComboboxBase & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

export type CategoryComboboxProps =
  | CategoryComboboxSingleProps
  | CategoryComboboxMultipleProps;

function sortCategories(items: CategoryOptionDto[]): CategoryOptionDto[] {
  return [...items].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
  );
}

export function CategoryCombobox(props: CategoryComboboxProps) {
  const {
    categories: initialCategories,
    onCategoriesChange,
    allowCreate = true,
    disabled,
    placeholder = "Buscar categoría…",
    className,
    id: idProp,
  } = props;
  const multiple = props.multiple === true;
  const generatedId = useId();
  const inputId = idProp ?? generatedId;
  const anchor = useComboboxAnchor();

  const [options, setOptions] = useState(() =>
    sortCategories(initialCategories),
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [isCreating, startCreate] = useTransition();

  useEffect(() => {
    setOptions(sortCategories(initialCategories));
  }, [initialCategories]);

  const selectedSingle = useMemo(() => {
    if (multiple) return null;
    return options.find((item) => item.id === props.value) ?? null;
  }, [multiple, options, props]);

  const selectedMultiple = useMemo(() => {
    if (!multiple) return [];
    const ids = new Set(props.value);
    return options.filter((item) => ids.has(item.id));
  }, [multiple, options, props]);

  function commitOptions(next: CategoryOptionDto[]) {
    const sorted = sortCategories(next);
    setOptions(sorted);
    onCategoriesChange?.(sorted);
  }

  function handleCreate() {
    const name = createName.trim();
    if (!name || isCreating) return;

    startCreate(() => {
      void (async () => {
        const result = await createQuickCategoryAction({ name });
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        const created = result.data;
        commitOptions([...options, created]);

        if (multiple) {
          props.onChange([...props.value, created.id]);
        } else {
          props.onChange(created.id);
        }

        toast.success("Categoría creada");
        setCreateName("");
        setCreateOpen(false);
      })();
    });
  }

  const createFooter = allowCreate ? (
    <div className="border-t border-border/60 p-1.5">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full justify-start"
        disabled={disabled || undefined}
        onClick={() => {
          setCreateName("");
          setCreateOpen(true);
        }}
      >
        <HiOutlinePlus className="size-4" />
        Nueva categoría
      </Button>
    </div>
  ) : null;

  return (
    <div className={cn("space-y-2", className)}>
      {multiple ? (
        <Combobox
          multiple
          items={options}
          value={selectedMultiple}
          onValueChange={(next) => {
            props.onChange(next.map((item) => item.id));
          }}
          itemToStringLabel={(item) => item.name}
          isItemEqualToValue={(a, b) => a.id === b.id}
          disabled={disabled}
        >
          <ComboboxChips ref={anchor} className="w-full">
            <ComboboxValue>
              {(value: CategoryOptionDto[]) => (
                <>
                  {value.map((item) => (
                    <ComboboxChip key={item.id} aria-label={item.name}>
                      {item.name}
                    </ComboboxChip>
                  ))}
                  <ComboboxChipsInput
                    id={inputId}
                    placeholder={value.length > 0 ? "" : placeholder}
                    disabled={disabled}
                  />
                </>
              )}
            </ComboboxValue>
          </ComboboxChips>
          <ComboboxContent anchor={anchor} className="w-(--anchor-width)">
            <ComboboxEmpty>Sin categorías</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOptionDto) => (
                <ComboboxItem key={item.id} value={item}>
                  <span className="truncate">{item.name}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
            {createFooter}
          </ComboboxContent>
        </Combobox>
      ) : (
        <Combobox
          items={options}
          value={selectedSingle}
          onValueChange={(next) => {
            props.onChange(next?.id ?? "");
          }}
          itemToStringLabel={(item) => item.name}
          isItemEqualToValue={(a, b) => a.id === b.id}
          disabled={disabled}
        >
          <ComboboxInput
            id={inputId}
            placeholder={placeholder}
            disabled={disabled}
            showClear
            className="w-full"
          />
          <ComboboxContent className="w-(--anchor-width)">
            <ComboboxEmpty>Sin categorías</ComboboxEmpty>
            <ComboboxList>
              {(item: CategoryOptionDto) => (
                <ComboboxItem key={item.id} value={item}>
                  <span className="truncate">{item.name}</span>
                </ComboboxItem>
              )}
            </ComboboxList>
            {createFooter}
          </ComboboxContent>
        </Combobox>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>
              Crea una categoría rápida con solo el nombre. Puedes completar
              imagen y jerarquía después en Categorías.
            </DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor={`${inputId}-quick-name`}>Nombre</Label>
              <Input
                id={`${inputId}-quick-name`}
                value={createName}
                autoFocus
                disabled={isCreating || undefined}
                placeholder="Ej. Steam · Tarjetas"
                onChange={(event) => setCreateName(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isCreating || undefined}
                onClick={() => setCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !createName.trim() || undefined}
              >
                {isCreating ? "Creando…" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
