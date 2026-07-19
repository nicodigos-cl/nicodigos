import Link from "next/link";
import { HiOutlineArrowLeft, HiOutlineExclamationCircle } from "react-icons/hi";

import { UserActionMenu } from "@/components/admin/users/user-action-menu";
import { UserAdminNotes } from "@/components/admin/users/user-admin-notes";
import { UserProfileForms } from "@/components/admin/users/user-profile-forms";
import { UserSessionsTable } from "@/components/admin/users/user-sessions-table";
import {
  UserDeliveriesTable,
  UserOrdersTable,
  UserTransactionsTable,
} from "@/components/admin/users/user-commerce-tables";
import {
  UserRoleBadge,
  UserStatusBadge,
} from "@/components/admin/users/user-status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";
import { formatMoney } from "@/lib/products/format";
import { userDetailHref } from "@/lib/users/url";
import type { UserDetailQuery } from "@/lib/validations/users";
import type { UserDetailDto } from "@/types/users";

function Row({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd
        className={`min-w-0 break-words text-right ${mono ? "font-mono text-xs" : ""}`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}

const sections = [
  ["resumen", "Resumen"],
  ["pedidos", "Pedidos"],
  ["transacciones", "Transacciones"],
  ["entregas", "Entregas"],
  ["perfil", "Perfil"],
  ["facturacion", "Facturación"],
  ["seguridad", "Seguridad"],
  ["actividad", "Actividad"],
  ["notas", "Notas"],
] as const;

export function UserDetail({
  user,
  query,
}: {
  user: UserDetailDto;
  query: UserDetailQuery;
}) {
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const commerceCards = [
    ["Pedidos", user.commerce.orderCount],
    ["Pedidos pagados", user.commerce.paidOrderCount],
    [
      "Total gastado",
      formatMoney(user.commerce.totalSpent, user.commerce.currency),
    ],
    ["Transacciones", user.commerce.transactionCount],
    ["Entregas", user.commerce.deliveryCount],
    ["Reembolsos", user.commerce.refundCount],
    [
      "Primera compra",
      user.commerce.firstPurchaseAt
        ? formatDateTime(user.commerce.firstPurchaseAt)
        : "—",
    ],
    [
      "Última compra",
      user.commerce.lastPurchaseAt
        ? formatDateTime(user.commerce.lastPurchaseAt)
        : "—",
    ],
  ] as const;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>{" "}
        /{" "}
        <Link href="/admin/users" className="hover:text-foreground">
          Usuarios
        </Link>{" "}
        / <span>{user.name}</span>
      </nav>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            render={<Link href="/admin/users" />}
            nativeButton={false}
            aria-label="Volver a usuarios"
          >
            <HiOutlineArrowLeft className="size-4" />
          </Button>
          <Avatar className="size-12">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name} />
            ) : null}
            <AvatarFallback>{initials || "U"}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-tight">
                {user.name}
              </h1>
              <UserRoleBadge role={user.role} />
              <UserStatusBadge
                status={user.derivedStatus}
                accountStatus={user.accountStatus}
              />
              {user.emailVerified ? (
                <Badge variant="secondary">Email verificado</Badge>
              ) : (
                <Badge variant="outline">Email sin verificar</Badge>
              )}
              {user.isEnvAdmin ? (
                <Badge variant="outline">ADMIN_EMAILS</Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <p className="font-mono text-xs text-muted-foreground">{user.id}</p>
            <p className="text-sm text-muted-foreground">
              Creado {formatDateTime(user.createdAt)} · Última actividad{" "}
              {formatDateTime(user.lastActivityAt)}
            </p>
          </div>
        </div>
        <UserActionMenu user={user} />
      </header>

      <div className="flex flex-wrap gap-2">
        {sections.map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={query.section === id ? "default" : "outline"}
            render={
              <Link href={userDetailHref(user.id, { section: id, page: 1 })} />
            }
            nativeButton={false}
          >
            {label}
          </Button>
        ))}
      </div>

      {user.issues.length > 0 ? (
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-2">
            <HiOutlineExclamationCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="space-y-2">
              <p className="font-medium">Atención requerida</p>
              <ul className="space-y-2 text-sm">
                {user.issues.map((issue) => (
                  <li key={issue.type}>
                    <p className="font-medium">{issue.message}</p>
                    <p className="text-xs text-muted-foreground">
                      Severidad {issue.severity} · {issue.evidence}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {query.section === "resumen" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {commerceCards.map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-card px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-lg font-semibold tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="text-sm font-medium">Estado general</h2>
              <dl className="mt-3 text-sm">
                <Row label="Rol" value={<UserRoleBadge role={user.role} />} />
                <Row
                  label="Estado"
                  value={
                    <UserStatusBadge
                      status={user.derivedStatus}
                      accountStatus={user.accountStatus}
                    />
                  }
                />
                <Row
                  label="Verificación"
                  value={user.emailVerified ? "Verificado" : "Pendiente"}
                />
                <Row
                  label="Última actividad"
                  value={formatDateTime(user.lastActivityAt)}
                />
                <Row
                  label="Última compra"
                  value={formatDateTime(user.commerce.lastPurchaseAt)}
                />
                <Row
                  label="Pedidos pendientes"
                  value={user.commerce.pendingOrderCount}
                />
                <Row
                  label="Entregas pendientes"
                  value={user.commerce.pendingDeliveryCount}
                />
                <Row
                  label="Pagos fallidos (30d)"
                  value={user.commerce.recentFailedPaymentCount}
                />
                <Row
                  label="Notas activas"
                  value={user.commerce.activeNoteCount}
                />
                <Row
                  label="Reembolsos"
                  value={formatMoney(
                    user.commerce.refundAmount,
                    user.commerce.currency,
                  )}
                />
              </dl>
            </section>
            <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
              <h2 className="mb-3 text-sm font-medium">Actividad reciente</h2>
              <ul className="space-y-3">
                {user.timeline.slice(0, 8).map((event) => (
                  <li key={event.id} className="text-sm">
                    <p className="font-medium">{event.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                      {event.href ? (
                        <>
                          {" · "}
                          <Link
                            href={event.href}
                            className="text-primary hover:underline"
                          >
                            Ver
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : null}

      {query.section === "pedidos" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium">Pedidos</h2>
          {user.orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos.</p>
          ) : (
            <UserOrdersTable data={user.orders} />
          )}
        </section>
      ) : null}

      {query.section === "transacciones" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium">Transacciones</h2>
          {user.transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin transacciones.</p>
          ) : (
            <UserTransactionsTable data={user.transactions} />
          )}
        </section>
      ) : null}

      {query.section === "entregas" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium">Entregas</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Las keys y credenciales sensibles solo se consultan en el detalle
            autorizado de cada entrega.
          </p>
          {user.deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entregas.</p>
          ) : (
            <UserDeliveriesTable data={user.deliveries} />
          )}
        </section>
      ) : null}

      {query.section === "perfil" || query.section === "facturacion" ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Datos no editables</h2>
            <dl className="mt-3 text-sm">
              <Row label="ID" value={user.id} mono />
              <Row label="Email" value={user.email} />
              <Row
                label="Email verificado"
                value={user.emailVerified ? "Sí" : "No"}
              />
              <Row label="Creado" value={formatDateTime(user.createdAt)} />
              <Row label="Actualizado" value={formatDateTime(user.updatedAt)} />
              <Row
                label="Completitud facturación"
                value={user.billing.completeness}
              />
              <Row
                label="RUT válido"
                value={
                  user.billing.rutValid == null
                    ? "Sin RUT"
                    : user.billing.rutValid
                      ? "Sí"
                      : "No"
                }
              />
            </dl>
          </section>
          <UserProfileForms user={user} />
        </div>
      ) : null}

      {query.section === "seguridad" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="text-sm font-medium">Autenticación</h2>
            <dl className="mt-3 text-sm">
              <Row label="Sesiones activas" value={user.activeSessionCount} />
              <Row
                label="Última sesión"
                value={formatDateTime(user.lastSessionAt)}
              />
              <Row label="Estado de cuenta" value={user.accountStatus} />
              <Row label="Motivo suspensión" value={user.suspensionReason} />
            </dl>
            <ul className="mt-4 space-y-2">
              {user.providers.map((provider) => (
                <li
                  key={provider.id}
                  className="rounded-xl bg-muted/40 px-3 py-2 text-sm"
                >
                  <p className="font-medium">{provider.providerId}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {provider.accountIdMasked}
                    {provider.hasPassword ? " · contraseña local" : ""}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              Tokens, hashes y secretos OAuth nunca se muestran en este panel.
            </p>
          </section>
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <h2 className="mb-3 text-sm font-medium">Sesiones</h2>
            <UserSessionsTable userId={user.id} sessions={user.sessions} />
          </section>
        </div>
      ) : null}

      {query.section === "actividad" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium">Timeline</h2>
          <ul className="space-y-4">
            {user.timeline.map((event) => (
              <li key={event.id} className="border-l-2 border-border pl-3">
                <p className="text-sm font-medium">{event.message}</p>
                <p className="text-xs text-muted-foreground">
                  {event.source} · {event.type} ·{" "}
                  {formatDateTime(event.createdAt)}
                  {event.href ? (
                    <>
                      {" · "}
                      <Link
                        href={event.href}
                        className="text-primary hover:underline"
                      >
                        Abrir
                      </Link>
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {query.section === "notas" ? (
        <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 text-sm font-medium">Notas administrativas</h2>
          <UserAdminNotes notes={user.notes} />
        </section>
      ) : null}
    </div>
  );
}
