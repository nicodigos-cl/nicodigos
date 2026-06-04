import type { Metadata } from "next";
import { IconBuilding, IconMail, IconUser, IconFileText } from "@tabler/icons-react";
import Link from "next/link";
import { storeRoutes } from "@/lib/store/navigation";

export const metadata: Metadata = {
  title: "Información de la Empresa — Nicodigos",
  description: "Datos legales, tributarios y de contacto de la empresa operadora de Nicodigos en Chile.",
  alternates: {
    canonical: "/legal/company",
  },
};

export default function CompanyInfoPage() {
  return (
    <main className="flex-1 relative overflow-hidden bg-background py-16 sm:py-24">
      {/* Background orbs and grid */}
      <div className="absolute inset-0 admin-dashboard-grid opacity-15 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] -z-10 h-[400px] w-[400px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 relative z-10 space-y-12">
        <div className="space-y-4 border-b border-border/40 pb-8 text-center sm:text-left">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Información de la Empresa
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
            De acuerdo con las normativas de comercio electrónico de Chile, presentamos la información de registro legal y tributario de la plataforma.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Card: Razón Social */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconBuilding className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Razón Social</h3>
              <p className="text-base font-extrabold text-foreground leading-snug">
                TREVORSTORECL SPA
              </p>
            </div>
          </div>

          {/* Card: RUT */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconFileText className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">RUT de la Empresa</h3>
              <p className="text-base font-extrabold text-foreground leading-snug font-mono">
                77.649.515-8
              </p>
            </div>
          </div>

          {/* Card: Domicilio */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex items-start gap-4 sm:col-span-2">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconBuilding className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Domicilio Legal</h3>
              <p className="text-base font-extrabold text-foreground leading-relaxed">
                SAN MARTIN 553 OF 901, COMUNA CONCEPCION, CHILE
              </p>
            </div>
          </div>

          {/* Card: Dueño */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconUser className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Representante Legal</h3>
              <p className="text-base font-extrabold text-foreground leading-snug">
                Nicolás Torres Henríquez
              </p>
            </div>
          </div>

          {/* Card: Contacto */}
          <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-sm flex items-start gap-4">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <IconMail className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Correo de Contacto</h3>
              <a
                href="mailto:contacto@nicodigos.cl"
                className="text-base font-extrabold text-primary hover:underline leading-snug transition-colors"
              >
                contacto@nicodigos.cl
              </a>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-3.5 text-sm text-muted-foreground/90 leading-relaxed">
          <h4 className="font-bold text-foreground flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary" />
            Atención al Cliente y Soporte
          </h4>
          <p>
            Si tienes dudas sobre el estado de tu pedido, necesitas soporte técnico para la activación de un código, o deseas ejercer tus derechos como consumidor en Chile, puedes escribirnos directamente a nuestro correo de soporte o revisar la sección de ayuda.
          </p>
          <div className="pt-2">
            <Link
              href={storeRoutes.home}
              className="text-xs font-bold text-primary hover:underline"
            >
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
