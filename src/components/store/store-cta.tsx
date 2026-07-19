import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const CTA_TEXTURE = "/images/cta/cta-red-texture.webp";
const CTA_MASCOT = "/images/mascot/mascot-red-2.webp";

export default function StoreCTA() {
  return (
    <section className="relative overflow-hidden bg-primary py-16 sm:py-20 px-6 lg:px-8">
      <Image
        src={CTA_TEXTURE}
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-cover opacity-40 pointer-events-none select-none"
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="text-center lg:text-left">
            <h2 className="text-balance text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
              Explora nuestro catálogo y encuentra lo que necesitas.
            </h2>
            <p className="mx-auto lg:mx-0 mt-6 max-w-xl text-lg text-pretty text-primary-foreground/95">
              Encuentra los mejores productos digitales y servicios SMM al mejor
              precio.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button
                render={<Link href="/categorias" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="px-8 py-4 text-base font-semibold rounded-md shadow-sm bg-transparent text-primary-foreground w-full sm:w-auto"
              >
                Explorar catálogo
              </Button>
              <Button
                render={<Link href="/?filtro=ofertas" />}
                nativeButton={false}
                size="lg"
                variant="outline"
                className="px-8 py-4 text-base font-semibold rounded-md shadow-sm hover:bg-transparent hover:text-primary-foreground w-full sm:w-auto"
              >
                Ver ofertas
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
            <Image
              src={CTA_MASCOT}
              alt="Mascota Nicodigos"
              width={900}
              height={900}
              unoptimized
              className="mx-auto h-auto w-full max-w-[240px] sm:max-w-[300px] lg:max-w-[380px] drop-shadow-xl select-none"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
