import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineLightningBolt,
  HiOutlineCurrencyDollar,
  HiOutlineSupport,
  HiArrowRight,
} from "react-icons/hi";
import {
  FaCcAmex,
  FaCcApplePay,
  FaCcDinersClub,
  FaCcDiscover,
  FaCcJcb,
  FaCcMastercard,
  FaCcVisa,
} from "react-icons/fa";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { IconType } from "react-icons";

const offers = [
  {
    name: "Entrega digital",
    description: "Keys y servicios al instante",
    href: "/catalog",
    icon: HiOutlineLightningBolt,
  },
  {
    name: "Precios en CLP",
    description: "Sin sorpresas de tipo de cambio",
    href: "/catalog?filter=offers",
    icon: HiOutlineCurrencyDollar,
  },
  {
    name: "Soporte local",
    description: "Te ayudamos cuando lo necesites",
    href: "/dashboard/support",
    icon: HiOutlineSupport,
  },
] as const;

const paymentMethods: Array<{ name: string; Icon: IconType }> = [
  { name: "Visa", Icon: FaCcVisa },
  { name: "Mastercard", Icon: FaCcMastercard },
  { name: "American Express", Icon: FaCcAmex },
  { name: "Diners Club", Icon: FaCcDinersClub },
  { name: "Discover", Icon: FaCcDiscover },
  { name: "JCB", Icon: FaCcJcb },
  { name: "Apple Pay", Icon: FaCcApplePay },
];

const TEXTURE_IMAGE = "/images/hero/texture.webp";
const CHILE_FLAG_IMAGE = "/images/hero/chile.webp";
const MASCOT_IMAGE = "/images/mascot/hero-nicodigos-robot.webp";

type StoreHeroProps = {
  className?: string;
};

export default function StoreHero({ className }: StoreHeroProps) {
  return (
    <section
      aria-label="Inicio"
      className={cn("flex flex-col w-full bg-background", className)}
    >
      <div className="relative overflow-hidden border-b border-primary/15 bg-primary/10 py-4 pb-8 sm:py-24 lg:py-28 xl:py-32 w-full">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-1 bg-linear-to-br from-primary/20 via-primary/5 to-transparent"
        />
        <Image
          src={TEXTURE_IMAGE}
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover absolute inset-0 z-2 opacity-15 pointer-events-none select-none dark:mix-blend-soft-light"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12 xl:gap-16">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold text-primary/90 transition-all duration-300 hover:border-primary/40 hover:bg-primary/10 select-none">
                <span className="flex h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Entrega inmediata en todo Chile
              </div>

              <h1 className="mt-5 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl max-w-4xl leading-tight sm:leading-none">
                Productos digitales,{" "}
                <span className="text-primary font-black relative">
                  entrega inmediata
                </span>{" "}
                <Image
                  src={CHILE_FLAG_IMAGE}
                  alt="Chile"
                  width={48}
                  height={48}
                  unoptimized
                  className="ml-1 inline-block size-6 align-middle sm:size-10 lg:size-12 hover:scale-110 transition-transform duration-300"
                  priority
                />
              </h1>

              <p className="mt-4 sm:mt-6 max-w-2xl text-sm text-foreground/80 sm:text-lg sm:leading-relaxed">
                Consigue keys de juegos, licencias de software y servicios SMM
                al mejor precio. Compra de forma segura en Chile con CLP y
                recibe al instante.
              </p>

              <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start w-full sm:w-auto px-2 sm:px-0">
                <Button
                  size="lg"
                  className="group rounded-xl px-8 font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 w-full sm:w-auto flex items-center justify-center gap-1 cursor-pointer"
                  render={<Link href="/catalog" />}
                  nativeButton={false}
                >
                  Explorar catálogo
                  <HiArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-xl px-8 font-semibold hover:bg-muted hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 w-full sm:w-auto cursor-pointer"
                  render={<Link href="/catalog?filter=offers" />}
                  nativeButton={false}
                >
                  Ver ofertas
                </Button>
              </div>

              <div className="mt-6 sm:mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-y-1.5 gap-x-4 sm:gap-x-6 text-[10px] sm:text-xs text-muted-foreground font-medium select-none">
                <span className="flex items-center gap-1.5">
                  <span className="text-primary font-bold">✓</span> Compra 100%
                  Segura
                </span>
                <span className="hidden sm:inline h-3 w-px bg-border/60" />
                <span className="flex items-center gap-1.5">
                  <span className="text-primary font-bold">✓</span> Soporte en
                  Chile
                </span>
                <span className="hidden sm:inline h-3 w-px bg-border/60" />
                <span className="flex items-center gap-1.5">
                  <span className="text-primary font-bold">✓</span>{" "}
                  Transacciones en CLP
                </span>
              </div>

              <div className="mt-8 w-full max-w-xl hidden sm:block">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Pago seguro vía Flow · Webpay · Transferencia y más
                </p>
                <ul
                  aria-label="Métodos de pago aceptados"
                  className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 lg:justify-start"
                >
                  {paymentMethods.map(({ name, Icon }) => (
                    <li key={name}>
                      <span
                        title={name}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-border/60 bg-background/80 px-2.5 text-foreground/80 shadow-sm transition-colors hover:border-border hover:text-foreground"
                      >
                        <Icon className="size-7" aria-hidden />
                        <span className="sr-only">{name}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="hidden lg:block relative mx-auto w-full max-w-sm sm:max-w-md lg:max-w-none">
              <div className="absolute inset-8 sm:inset-12 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
              <Image
                src={MASCOT_IMAGE}
                alt="Mascota Nicodigos"
                width={900}
                height={900}
                priority
                unoptimized
                className="relative z-10 mx-auto h-auto w-full max-w-[280px] sm:max-w-[360px] lg:max-w-[420px] drop-shadow-xl select-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20 w-full mb-16">
        <div className="rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-xl shadow-black/5 overflow-hidden">
          <ul
            role="list"
            className="grid grid-cols-1 divide-y divide-border/40 md:grid-cols-3 md:divide-x md:divide-y-0"
          >
            {offers.map((offer) => {
              const Icon = offer.icon;
              return (
                <li key={offer.name} className="flex">
                  <Link
                    href={offer.href}
                    className="group flex flex-1 items-center gap-5 p-6 transition-all duration-300 hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary border border-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-transparent">
                      <Icon className="size-6 transition-transform duration-300" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60 transition-colors group-hover:text-primary/70">
                        {offer.name}
                      </p>
                      <p className="mt-0.5 text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                        {offer.description}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
