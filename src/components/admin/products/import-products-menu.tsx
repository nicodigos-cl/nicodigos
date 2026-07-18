"use client";

import { useRef, useState, useTransition } from "react";
import {
  HiChevronDown,
  HiOutlineDocumentText,
  HiOutlineTemplate,
  HiOutlineUpload,
} from "react-icons/hi";
import { toast } from "sonner";

import { BulkConvertServicesDialog } from "@/components/admin/smm-services/bulk-convert-services-dialog";
import { ImportProductsFileDialog } from "@/components/admin/products/import-products-file-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resolveExportedSmmServicesAction } from "@/lib/actions/product-import";
import { parseServicesJson } from "@/lib/products/parse-import";
import type { CategoryOptionDto } from "@/types/products";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ImportProductsMenuProps = {
  categories: CategoryOptionDto[];
};

type FileImportMode = "json" | "csv";

export function ImportProductsMenu({ categories }: ImportProductsMenuProps) {
  const serviceFileRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fileImportMode, setFileImportMode] = useState<FileImportMode | null>(
    null,
  );
  const [services, setServices] = useState<SmmServiceListItemDto[]>([]);
  const [convertOpen, setConvertOpen] = useState(false);

  function openFileImport(mode: FileImportMode) {
    setFileImportMode(mode);
  }

  function handleServiceFile(file: File | null) {
    if (!file) return;

    void file.text().then((text) => {
      const parsed = parseServicesJson(text);
      if (!parsed.success) {
        toast.error(parsed.message);
        if (serviceFileRef.current) {
          serviceFileRef.current.value = "";
        }
        return;
      }

      for (const warning of parsed.warnings) {
        toast.message(warning);
      }

      startTransition(() => {
        void (async () => {
          const result = await resolveExportedSmmServicesAction({
            services: parsed.items,
          });
          if (!result.success) {
            toast.error(result.message);
            return;
          }

          if (result.data.missing > 0) {
            toast.message(
              `${result.data.missing} servicio(s) no encontrados en el catálogo local`,
            );
          }

          setServices(result.data.items);
          setConvertOpen(true);
          toast.success(
            `${result.data.items.length} servicio(s) listos para convertir`,
          );
        })();
      });
    });
  }

  return (
    <>
      <input
        ref={serviceFileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          handleServiceFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={isPending || undefined}
            />
          }
        >
          <HiOutlineUpload className="size-4" />
          {isPending ? "Resolviendo…" : "Importar"}
          <HiChevronDown className="size-3.5 opacity-70" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuItem onClick={() => openFileImport("json")}>
            <HiOutlineDocumentText className="size-4" />
            Con JSON
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openFileImport("csv")}>
            <HiOutlineDocumentText className="size-4" />
            Con CSV
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => serviceFileRef.current?.click()}
          >
            <HiOutlineTemplate className="size-4" />
            Como servicio JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ImportProductsFileDialog
        open={fileImportMode != null}
        mode={fileImportMode ?? "json"}
        onOpenChange={(open) => {
          if (!open) setFileImportMode(null);
        }}
        categories={categories}
      />

      <BulkConvertServicesDialog
        open={convertOpen}
        onOpenChange={(open) => {
          setConvertOpen(open);
          if (!open) setServices([]);
        }}
        services={services}
        categories={categories}
      />
    </>
  );
}
