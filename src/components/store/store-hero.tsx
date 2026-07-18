import Image from "next/image";
import type { ElementType } from "react";
import {
  DesktopIcon,
  InstagramLogoIcon,
  LaptopIcon,
  LightningBoltIcon,
} from "@radix-ui/react-icons";

import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
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

/** Curated Pexels photos (compressed CDN). */
const HERO_IMAGES = {
  featured:
    "https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=1600",
  software:
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=1200",
  smm: "https://images.pexels.com/photos/607812/pexels-photo-607812.jpeg?auto=compress&cs=tinysrgb&w=1200",
  deals:
    "https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=1600",
} as const;

const defaultTiles: HeroTile[] = [
  {
    name: "Keys y juegos",
    description:
      "Licencias digitales y catálogo gamer con entrega inmediata en CLP.",
    href: "/categorias/juegos",
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
    href: "/categorias/software",
    cta: "Comprar software",
    className: "col-span-3 lg:col-span-1",
    Icon: DesktopIcon,
    imageSrc: HERO_IMAGES.software,
    imageAlt: "Laptop con software en pantalla",
  },
  {
    name: "Servicios SMM",
    description: "Crecimiento en redes con destino configurable al comprar.",
    href: "/categorias/smm",
    cta: "Ver servicios",
    className: "col-span-3 lg:col-span-1",
    Icon: InstagramLogoIcon,
    imageSrc: HERO_IMAGES.smm,
    imageAlt: "Persona usando redes sociales en el teléfono",
  },
  {
    name: "Ofertas",
    description: "Precios especiales por tiempo limitado. No te las pierdas.",
    href: "/?filtro=ofertas",
    cta: "Ver ofertas",
    className: "col-span-3",
    Icon: LightningBoltIcon,
    imageSrc: HERO_IMAGES.deals,
    imageAlt: "Teclado y periféricos en oferta",
    badge: "Limitado",
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

export function StoreHero({ categories = [], className }: StoreHeroProps) {
  const tiles = resolveTiles(categories);

  return (
    <section
      aria-label="Destacados de la tienda"
      className={cn("relative overflow-hidden bg-background", className)}
    >
      <FlickeringGrid
        className="absolute inset-0 z-0 size-full"
        squareSize={3}
        gridGap={5}
        flickerChance={0.22}
        color="#F93D07"
        maxOpacity={0.14}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <BentoGrid className="auto-rows-[16rem] grid-cols-1 gap-3 sm:auto-rows-[18rem] sm:grid-cols-2 sm:gap-4 lg:auto-rows-[20rem] lg:grid-cols-3">
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
                "min-h-[16rem] border-0 shadow-lg ring-1 ring-black/5 dark:ring-white/10",
                tile.className,
              )}
              background={
                <>
                  <Image
                    src={tile.imageSrc}
                    alt={tile.imageAlt}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  {tile.badge ? (
                    <span className="absolute top-4 left-4 z-10 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground shadow-sm">
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
