import Link from "next/link";
import { HiOutlineBell, HiOutlineEnvelope, HiOutlineExclamationTriangle } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCommunicationsOverview } from "@/lib/communications/overview-queries";

export default async function CommunicationsPage() {
  const overview = await getCommunicationsOverview(30);
  const metrics = [
    ["Conversaciones sin leer", overview.metrics.unread], ["Pendientes de respuesta", overview.metrics.awaitingReply],
    ["Emails enviados", overview.metrics.sentEmails], ["Emails fallidos", overview.metrics.failedEmails],
    ["Suscriptores web push", overview.metrics.subscribers], ["Notificaciones programadas", overview.metrics.scheduledPush],
    ["Notificaciones enviadas", overview.metrics.sentPush], ["Notificaciones fallidas", overview.metrics.failedPush],
  ] as const;
  return <div className="space-y-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div><h1 className="font-heading text-2xl font-semibold">Comunicaciones</h1><p className="mt-1 text-sm text-muted-foreground">Revisa conversaciones y gestiona emails y notificaciones web de Nicodigos.</p></div>
      <div className="flex flex-wrap gap-2"><Button nativeButton={false} render={<Link href="/admin/communications/email/compose" />}><HiOutlineEnvelope />Redactar email</Button><Button variant="outline" nativeButton={false} render={<Link href="/admin/communications/web-push/new" />}><HiOutlineBell />Nueva notificación web</Button></div>
    </header>
    <section aria-labelledby="metrics-title"><div className="mb-3"><h2 id="metrics-title" className="font-heading text-lg font-semibold">Actividad</h2><p className="text-xs text-muted-foreground">Emails y notificaciones: últimos {overview.periodDays} días. Pendientes, programadas y suscriptores: estado actual.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-heading text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div></section>
    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><HiOutlineExclamationTriangle className="size-5 text-amber-600" />Atención requerida</CardTitle></CardHeader><CardContent>{overview.attention.length ? <ul className="divide-y divide-border">{overview.attention.map((item) => <li key={item.key}><Link href={item.href} className="flex items-center justify-between gap-4 py-3 text-sm hover:text-primary"><span>{item.label}</span><span className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">{item.count}</span></Link></li>)}</ul> : <p className="py-6 text-center text-sm text-muted-foreground">No hay incidencias operativas pendientes.</p>}</CardContent></Card>
  </div>;
}
