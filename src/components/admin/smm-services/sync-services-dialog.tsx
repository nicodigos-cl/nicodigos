"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HiOutlineRefresh } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { syncSmmProviderServicesAction } from "@/lib/actions/smm-providers";
import type { SmmProviderOptionDto } from "@/types/smm-provider";

type SyncServicesDialogProps = {
  providers: SmmProviderOptionDto[];
  defaultProviderId?: string;
  triggerVariant?: "default" | "outline";
  triggerClassName?: string;
};

export function SyncServicesDialog({
  providers,
  defaultProviderId,
  triggerVariant = "default",
  triggerClassName,
}: SyncServicesDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [providerId, setProviderId] = useState(
    defaultProviderId ?? providers[0]?.id ?? "",
  );

  const providerItems = providers.map((provider) => ({
    value: provider.id,
    label: provider.name,
  }));

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setProviderId(defaultProviderId ?? providers[0]?.id ?? "");
    }
  }

  function handleSync() {
    if (!providerId) {
      toast.error("Selecciona un provider");
      return;
    }

    startTransition(() => {
      void (async () => {
        const result = await syncSmmProviderServicesAction({ id: providerId });
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(
          `Sincronizados ${result.data.synced} · retirados ${result.data.removed} · archivados ${result.data.archivedProducts} · tasas cambiadas ${result.data.rateChanges}`,
        );
        setOpen(false);
        router.refresh();
      })();
    });
  }

  if (providers.length === 0) {
    return (
      <Button
        variant={triggerVariant}
        className={triggerClassName}
        nativeButton={false}
        render={<Link href="/admin/providers/new" />}
      >
        Crear provider
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant={triggerVariant}
            className={triggerClassName}
          />
        }
      >
        <HiOutlineRefresh className="size-4" />
        Sincronizar servicios
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar servicios</DialogTitle>
          <DialogDescription>
            Elige el provider SMM. Se consultará su API (`services`) y se
            actualizará el catálogo local.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="sync-provider">Provider</Label>
          <Select
            items={providerItems}
            value={providerId}
            onValueChange={(value) => {
              if (value == null) return;
              setProviderId(value);
            }}
          >
            <SelectTrigger id="sync-provider" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providerItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isPending || !providerId}
            onClick={handleSync}
          >
            <HiOutlineRefresh className="size-4" />
            {isPending ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
