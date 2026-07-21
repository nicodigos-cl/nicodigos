"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineCollection,
  HiOutlineDotsHorizontal,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { deleteSmmServiceAction } from "@/lib/actions/smm-services";
import type { SmmServiceListItemDto } from "@/types/smm-provider";

type ServicesMobileListProps = {
  data: SmmServiceListItemDto[];
  selectionLimit: number;
  selectedIds: Set<string>;
  onToggle: (service: SmmServiceListItemDto, selected: boolean) => void;
};

export function ServicesMobileList({
  data,
  selectionLimit,
  selectedIds,
  onToggle,
}: ServicesMobileListProps) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <Empty className="border border-border bg-card">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HiOutlineCollection className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Sin servicios</EmptyTitle>
          <EmptyDescription>
            No hay servicios para mostrar con los filtros actuales.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((service) => {
        const isSelected = selectedIds.has(service.id);
        const atLimit =
          !isSelected && selectedIds.size >= selectionLimit;

        return (
          <li
            key={service.id}
            className="rounded-2xl border border-border bg-card p-3"
          >
            <div className="flex items-start gap-3">
              <Checkbox
                className="mt-1"
                checked={isSelected}
                disabled={atLimit}
                onCheckedChange={(value) => onToggle(service, !!value)}
                aria-label={`Seleccionar ${service.name}`}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{service.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  #{service.remoteServiceId} · {service.type}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge variant="outline">{service.providerName}</Badge>
                  <Badge variant="secondary">{service.category}</Badge>
                  {service.isActive ? (
                    <Badge>Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>
                <p className="pt-1 text-xs text-muted-foreground tabular-nums">
                  Rate {service.rate} · {service.min}–{service.max}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Acciones"
                    />
                  }
                >
                  <HiOutlineDotsHorizontal className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    render={
                      <Link href={`/admin/providers/${service.providerId}`} />
                    }
                  >
                    Ver provider
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      void (async () => {
                        const confirmed = window.confirm(
                          `¿Eliminar "${service.name}"?`,
                        );
                        if (!confirmed) return;
                        const result = await deleteSmmServiceAction({
                          id: service.id,
                        });
                        if (!result.success) {
                          toast.error(result.message);
                          return;
                        }
                        toast.success("Servicio eliminado");
                        router.refresh();
                      })();
                    }}
                  >
                    <HiOutlineTrash className="size-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
