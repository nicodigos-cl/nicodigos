import Link from "next/link";
import { IconArrowRight, IconBolt } from "@tabler/icons-react";

import { PrimarySectionBand } from "@/components/home/primary-section-band";
import { Button } from "@/components/ui/button";
import { storeRoutes } from "@/lib/store/navigation";

export function CtaSection() {
  return (
    <PrimarySectionBand accent="cool" className="pb-20 pt-4 sm:pt-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-primary-foreground/20 bg-primary-foreground/10 p-8 sm:p-14 backdrop-blur-md shadow-2xl shadow-black/20">
          {/* Inner glow */}
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.12),transparent_55%)] pointer-events-none"
            aria-hidden
          />
          <div
            className="absolute -right-10 top-1/2 size-40 -translate-y-1/2 rounded-full bg-primary-foreground/10 blur-2xl pointer-events-none"
            aria-hidden
          />

          <div className="relative z-10 mx-auto max-w-2xl text-center space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-semibold text-primary-foreground border border-primary-foreground/25">
              <IconBolt className="size-3.5" aria-hidden />
              Miles de keys · Al tiro a tu mail
            </div>
            <h2 className="font-heading text-3xl font-extrabold tracking-tight text-primary-foreground sm:text-4xl">
              Los precios más bacanes en keys digitales
            </h2>
            <p className="text-sm sm:text-base text-primary-foreground/80 leading-relaxed">
              Miles de títulos digitales, precios en pesos chilenos y soporte
              local. Parte nomás y recibe tu código en minutos.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-xl gap-1.5 group bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-lg"
              >
                <Link href={storeRoutes.catalog}>
                  Ver catálogo
                  <IconArrowRight className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-xl border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link href={storeRoutes.offers}>Ver las ofertas</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PrimarySectionBand>
  );
}
