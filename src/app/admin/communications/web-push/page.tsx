import Link from "next/link";
import { redirect } from "next/navigation";
import { HiOutlineBell } from "react-icons/hi2";

import { WebPushTable } from "@/components/admin/communications/web-push-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  getWebPushMetrics,
  getWebPushNotifications,
} from "@/lib/communications/web-push-queries";
import { webPushStatusLabels } from "@/lib/communications/status";
import { pushListQuerySchema } from "@/lib/validations/communications";
import { parseSearchParamsRecord } from "@/lib/validations/products";

export default async function WebPushPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsed = pushListQuerySchema.safeParse(
    parseSearchParamsRecord(await searchParams),
  );
  if (!parsed.success) redirect("/admin/communications/web-push");

  const [result, metrics] = await Promise.all([
    getWebPushNotifications(parsed.data),
    getWebPushMetrics(30),
  ]);
  const cards = [
    ["Suscriptores activos", metrics.activeSubscribers],
    ["Nuevos suscriptores", metrics.newSubscribers],
    ["Permiso bloqueado", metrics.denied],
    ["Enviadas", metrics.sent],
    ["Entregadas", metrics.delivered],
    ["Clics", metrics.clicked],
    ["Fallidas", metrics.failedNotifications],
    ["Programadas", metrics.scheduled],
  ] as const;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">
            Notificaciones web
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Borradores, programaciones, envíos y resultados reales de OneSignal.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href="/admin/communications/web-push/new" />}
        >
          Nueva notificación web
        </Button>
      </header>

      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-2xl font-semibold tabular-nums">
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Actividad de los últimos {metrics.periodDays} días; suscriptores y
          permisos reflejan el estado local más reciente.
        </p>
      </section>

      <form
        method="get"
        action="/admin/communications/web-push"
        className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3 sm:flex-row"
      >
        <Input
          name="q"
          defaultValue={parsed.data.q}
          placeholder="Título, mensaje, ID interno o OneSignal…"
          aria-label="Buscar notificaciones"
          className="sm:flex-1"
        />
        <NativeSelect
          name="status"
          defaultValue={parsed.data.status ?? ""}
          aria-label="Estado"
        >
          <NativeSelectOption value="">Todos los estados</NativeSelectOption>
          {Object.entries(webPushStatusLabels).map(([value, label]) => (
            <NativeSelectOption key={value} value={value}>
              {label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <NativeSelect
          name="kind"
          defaultValue={parsed.data.kind ?? ""}
          aria-label="Tipo"
        >
          <NativeSelectOption value="">Todos los tipos</NativeSelectOption>
          <NativeSelectOption value="OPERATIONAL">
            Operacional
          </NativeSelectOption>
          <NativeSelectOption value="MARKETING">Marketing</NativeSelectOption>
          <NativeSelectOption value="SECURITY">Seguridad</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      {result.total ? (
        <WebPushTable items={result.items} />
      ) : (
        <Empty className="border border-border bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HiOutlineBell />
            </EmptyMedia>
            <EmptyTitle>Sin notificaciones</EmptyTitle>
            <EmptyDescription>
              Crea un borrador para comenzar. No se mostrarán datos simulados.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              nativeButton={false}
              render={<Link href="/admin/communications/web-push/new" />}
            >
              Crear notificación
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </div>
  );
}
