import Image from "next/image";
import Link from "next/link";
import type { ElementType } from "react";
import {
  DesktopIcon,
  InstagramLogoIcon,
  LaptopIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { cn } from "@/lib/utils";

type HeroTile = {
  name: string;
  description: string;
  href: string;
  cta: string;
  className: string;
  Icon: ElementType;
  imageSrc: string;
  imageAlt: string;
  badge?: string;
};

const HERO_IMAGES = {
  featured: "/images/categories/videogames.webp",
  software: "/images/categories/software.webp",
  smm: "/images/categories/smm.webp",
  deals: "/images/categories/ofertas.webp",
} as const;

const defaultTiles: HeroTile[] = [
  {
    name: "Keys y juegos",
    description:
      "Licencias digitales y catálogo gamer con entrega inmediata en CLP.",
    href: "/catalog?category=juegos",
    cta: "Ver catálogo",
    className: "col-span-3 lg:col-span-2 lg:row-span-2",
    Icon: LaptopIcon,
    imageSrc: HERO_IMAGES.featured,
    imageAlt: "Setup gamer con teclado y monitor",
    badge: "Destacado",
  },
  {
    name: "Software",
    description: "Sistemas y herramientas listas para activar.",
    href: "/catalog?category=software",
    cta: "Comprar software",
    className: "col-span-3 lg:col-span-1",
    Icon: DesktopIcon,
    imageSrc: HERO_IMAGES.software,
    imageAlt: "Laptop con software en pantalla",
  },
  {
    name: "Servicios SMM",
    description: "Crecimiento en redes con destino configurable al comprar.",
    href: "/catalog?category=smm",
    cta: "Ver servicios",
    className: "col-span-3 lg:col-span-1",
    Icon: InstagramLogoIcon,
    imageSrc: HERO_IMAGES.smm,
    imageAlt: "Persona usando redes sociales en el teléfono",
  },
  {
    name: "Ofertas",
    description: "Precios especiales por tiempo limitado. No te las pierdas.",
    href: "/catalog?filter=offers",
    cta: "Ver ofertas",
    className: "col-span-3",
    Icon: LightningBoltIcon,
    imageSrc: HERO_IMAGES.deals,
    imageAlt: "Teclado y periféricos en oferta",
    badge: "Por tiempo limitado",
  },
];

export type StoreHeroCategory = {
  name: string;
  href: string;
  slug: string;
};

type StoreHeroProps = {
  categories?: StoreHeroCategory[];
  className?: string;
};

function resolveTiles(categories: StoreHeroCategory[]): HeroTile[] {
  if (categories.length === 0) return defaultTiles;

  const bySlug = (fragment: string) =>
    categories.find((category) =>
      category.slug.toLowerCase().includes(fragment),
    );

  const games =
    bySlug("juego") ?? bySlug("game") ?? bySlug("key") ?? categories[0];
  const software =
    bySlug("soft") ?? bySlug("window") ?? bySlug("office") ?? categories[1];
  const smm =
    bySlug("smm") ?? bySlug("social") ?? bySlug("red") ?? categories[2];

  return [
    {
      ...defaultTiles[0],
      name: games?.name ?? defaultTiles[0].name,
      href: games?.href ?? defaultTiles[0].href,
    },
    {
      ...defaultTiles[1],
      name: software?.name ?? defaultTiles[1].name,
      href: software?.href ?? defaultTiles[1].href,
    },
    {
      ...defaultTiles[2],
      name: smm?.name ?? defaultTiles[2].name,
      href: smm?.href ?? defaultTiles[2].href,
    },
    defaultTiles[3],
  ];
}

export default function StoreCategories({
  categories = [],
  className,
}: StoreHeroProps) {
  const tiles = resolveTiles(categories);

  return (
    <section
      aria-label="Destacados de la tienda"
      className={cn("relative py-4 sm:py-24", className)}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado Premium de Sección (Oculto en Móviles) */}
        <div className="mx-auto max-w-2xl text-center mb-12 sm:mb-16 max-sm:hidden">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary">
            Categorías principales
          </h2>
          <p className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Todo lo que necesitas, al instante
          </p>
          <p className="mt-4 text-sm sm:text-base text-muted-foreground leading-relaxed">
            Explora nuestra selección de keys de juegos, licencias de software
            oficiales y servicios premium para potenciar tu presencia digital.
          </p>
        </div>

        {/* Circular Category Buttons for Mobile Grid */}
        <div className="grid grid-cols-4 items-start justify-items-center gap-1.5 sm:hidden mb-6 mt-1 px-1">
          {tiles.map((tile) => {
            const Icon = tile.Icon;
            return (
              <Link
                key={tile.name}
                href={tile.href}
                className="flex flex-col items-center text-center group active:scale-95 transition-all w-full"
              >
                <div className="size-14 rounded-full bg-primary/10 border border-primary/15 text-primary flex items-center justify-center shadow-xs transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-6 shrink-0" />
                </div>
                <span className="mt-1.5 text-[10px] font-extrabold text-foreground/95 tracking-tight leading-tight line-clamp-2 px-1">
                  {tile.name}
                </span>
              </Link>
            );
          })}
        </div>

        <BentoGrid className="hidden sm:grid auto-rows-[18rem] grid-cols-1 gap-4 sm:auto-rows-[20rem] sm:grid-cols-2 lg:auto-rows-[22rem] lg:grid-cols-3">
          {tiles.map((tile) => (
            <BentoCard
              key={tile.name}
              name={tile.name}
              description={tile.description}
              href={tile.href}
              cta={tile.cta}
              Icon={tile.Icon}
              tone="image"
              className={cn(
                "min-h-[18rem] border border-border/40 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-primary/20",
                tile.className,
              )}
              background={
                <>
                  <Image
                    src={tile.imageSrc}
                    alt={tile.imageAlt}
                    fill
                    priority={tile === tiles[0]}
                    unoptimized
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105 opacity-90 group-hover:opacity-100"
                  />

                  {/* Capa de Oscurecimiento Uniforme para Contraste Impecable */}
                  <div className="absolute inset-0 bg-black/45 z-0 transition-opacity duration-300 group-hover:bg-black/50" />

                  {/* Badge Premium */}
                  {tile.badge ? (
                    <span className="absolute top-4 left-4 z-10 rounded-full border border-primary/20 bg-background/95 backdrop-blur-md px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-primary shadow-sm animate-fade-in select-none">
                      {tile.badge}
                    </span>
                  ) : null}
                </>
              }
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
