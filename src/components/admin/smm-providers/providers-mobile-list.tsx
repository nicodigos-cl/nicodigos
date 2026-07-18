"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineDotsHorizontal,
  HiOutlinePencil,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteSmmProviderAction } from "@/lib/actions/smm-providers";
import type { SmmProviderListItemDto } from "@/types/smm-provider";

function statusLabel(status: SmmProviderListItemDto["status"]): string {
  switch (status) {
    case "ACTIVE":
      return "Activo";
    case "INACTIVE":
      return "Inactivo";
    case "ERROR":
      return "Error";
  }
}

export function ProvidersMobileList({
  data,
}: {
  data: SmmProviderListItemDto[];
}) {
  const router = useRouter();

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
        No hay providers para mostrar.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {data.map((provider) => (
        <li
          key={provider.id}
          className="rounded-2xl border border-border bg-card p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/admin/providers/${provider.id}`}
                className="block truncate font-medium hover:underline"
              >
                {provider.name}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {provider.apiUrl}
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
                  render={<Link href={`/admin/providers/${provider.id}`} />}
                >
                  <HiOutlinePencil className="size-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    void (async () => {
                      const confirmed = window.confirm(
                        `¿Eliminar "${provider.name}"?`,
                      );
                      if (!confirmed) return;
                      const result = await deleteSmmProviderAction({
                        id: provider.id,
                      });
                      if (!result.success) {
                        toast.error(result.message);
                        return;
                      }
                      toast.success("Provider eliminado");
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
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="outline">{statusLabel(provider.status)}</Badge>
            <span className="text-muted-foreground">
              {provider.servicesCount} servicios
            </span>
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
              {provider.apiKeyMasked}
            </code>
          </div>
        </li>
      ))}
    </ul>
  );
}
