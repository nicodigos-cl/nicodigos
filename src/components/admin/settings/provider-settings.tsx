import Link from "next/link";

import { TestConnectionButton } from "@/components/admin/settings/test-connection-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatDateTime } from "@/lib/format-date";
import { EnvStatusNote } from "@/components/admin/settings/settings-form-shared";

type ProviderRow = {
  id: string;
  name: string;
  status: string;
  isDefault: boolean;
  lastSyncedAt: string | null;
  lastError: string | null;
  productCount: number;
};

export function ProviderSettings({ providers }: { providers: ProviderRow[] }) {
  return (
    <div className="space-y-5">
      <EnvStatusNote>
        Kinguin se configura únicamente mediante variables de entorno del
        servidor. Los proveedores SMM se gestionan en el panel de proveedores.
      </EnvStatusNote>

      {providers.length === 0 ? (
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin proveedores SMM</EmptyTitle>
            <EmptyDescription>
              Agrega un proveedor SMM para sincronizar servicios y ejecutar
              pedidos automáticos.
            </EmptyDescription>
          </EmptyHeader>
          <Button
            size="sm"
            render={<Link href="/admin/providers" />}
            nativeButton={false}
          >
            Ir a proveedores
          </Button>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li
              key={provider.id}
              className="rounded-2xl border border-border bg-card p-4 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium">{provider.name}</h3>
                    <Badge variant="outline">{provider.status}</Badge>
                    {provider.isDefault ? (
                      <Badge variant="secondary">Predeterminado</Badge>
                    ) : null}
                  </div>
                  <dl className="grid gap-1 text-xs text-muted-foreground">
                    <div>
                      Productos vinculados:{" "}
                      <span className="text-foreground">
                        {provider.productCount}
                      </span>
                    </div>
                    {provider.lastSyncedAt ? (
                      <div>
                        Última sync:{" "}
                        {formatDateTime(provider.lastSyncedAt)}
                      </div>
                    ) : null}
                    {provider.lastError ? (
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                        {provider.lastError}
                      </div>
                    ) : null}
                  </dl>
                </div>
                <TestConnectionButton
                  kind="smm"
                  providerId={provider.id}
                  label="Probar conexión"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button
        size="sm"
        variant="outline"
        render={<Link href="/admin/providers" />}
        nativeButton={false}
      >
        Administrar proveedores
      </Button>
    </div>
  );
}
