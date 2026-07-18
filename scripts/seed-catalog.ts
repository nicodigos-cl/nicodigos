/**
 * Seed demo categories + products for local storefront.
 *
 * Usage: bun scripts/seed-catalog.ts
 * Idempotent by slug — skips existing rows.
 */
import "dotenv/config";

import {
  DeliveryMethod,
  ProductStatus,
} from "../src/generated/prisma/client";
import prisma from "../src/lib/prisma";

function pexels(id: number, w = 800): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
}

function picsum(seed: string, w = 800, h = 600): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  children?: Omit<CategorySeed, "children">[];
};

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  categorySlugs: string[];
  price: number;
  compareAtPrice?: number;
  qty: number;
  coverImageUrl: string;
  deliveryMethod: DeliveryMethod;
  isFeatured?: boolean;
  isOffer?: boolean;
  platform?: string;
  genres?: string[];
  tags?: string[];
  /** Extra SMM-ish fields when deliveryMethod is SMM (demo only). */
  smm?: {
    serviceId: number;
    rate: number;
    markupPct: number;
    min: number;
    max: number;
    category: string;
  };
};

const categories: CategorySeed[] = [
  {
    slug: "videojuegos",
    name: "Videojuegos",
    description: "Keys digitales para PC, consolas y plataformas populares.",
    imageUrl: pexels(3165335),
    children: [
      {
        slug: "steam",
        name: "Steam",
        description: "Juegos y DLC para Steam.",
        imageUrl: pexels(7915257),
      },
      {
        slug: "playstation",
        name: "PlayStation",
        description: "Keys y cuentas PS4 / PS5.",
        imageUrl: pexels(3945683),
      },
      {
        slug: "xbox",
        name: "Xbox",
        description: "Xbox Live, Game Pass y juegos.",
        imageUrl: pexels(3945658),
      },
      {
        slug: "nintendo",
        name: "Nintendo",
        description: "eShop y juegos Switch.",
        imageUrl: pexels(163036),
      },
    ],
  },
  {
    slug: "gift-cards",
    name: "Gift Cards",
    description: "Tarjetas de regalo digitales con entrega inmediata.",
    imageUrl: pexels(4968382),
    children: [
      {
        slug: "google-play",
        name: "Google Play",
        description: "Saldo Google Play Store.",
        imageUrl: pexels(607812),
      },
      {
        slug: "itunes-app-store",
        name: "iTunes / App Store",
        description: "Saldo Apple ID.",
        imageUrl: pexels(788946),
      },
      {
        slug: "spotify",
        name: "Spotify",
        description: "Gift cards Spotify Premium.",
        imageUrl: pexels(3756766),
      },
    ],
  },
  {
    slug: "streaming",
    name: "Streaming",
    description: "Suscripciones y cuentas de streaming.",
    imageUrl: pexels(4009402),
    children: [
      {
        slug: "netflix",
        name: "Netflix",
        description: "Planes y cuentas Netflix.",
        imageUrl: pexels(4009401),
      },
      {
        slug: "disney-plus",
        name: "Disney+",
        description: "Suscripciones Disney+.",
        imageUrl: pexels(799443),
      },
      {
        slug: "youtube-premium",
        name: "YouTube Premium",
        description: "YouTube Premium y Music.",
        imageUrl: pexels(4050315),
      },
    ],
  },
  {
    slug: "redes-sociales",
    name: "Redes Sociales",
    description: "Servicios SMM: likes, seguidores, vistas y engagement.",
    imageUrl: pexels(267350),
    children: [
      {
        slug: "instagram",
        name: "Instagram",
        description: "Seguidores, likes y vistas en Instagram.",
        imageUrl: pexels(607812),
      },
      {
        slug: "tiktok",
        name: "TikTok",
        description: "Seguidores y vistas en TikTok.",
        imageUrl: pexels(5082579),
      },
      {
        slug: "youtube-smm",
        name: "YouTube SMM",
        description: "Suscriptores, likes y vistas.",
        imageUrl: pexels(4050291),
      },
      {
        slug: "facebook",
        name: "Facebook",
        description: "Likes de página y engagement.",
        imageUrl: pexels(267389),
      },
    ],
  },
  {
    slug: "software",
    name: "Software",
    description: "Licencias de ofimática, antivirus y productividad.",
    imageUrl: pexels(546819),
    children: [
      {
        slug: "microsoft-office",
        name: "Microsoft Office",
        description: "Office 365 y licencias perpetuas.",
        imageUrl: pexels(1181244),
      },
      {
        slug: "windows",
        name: "Windows",
        description: "Keys Windows 10 / 11.",
        imageUrl: pexels(1714208),
      },
      {
        slug: "antivirus",
        name: "Antivirus",
        description: "Protección y seguridad digital.",
        imageUrl: pexels(60504),
      },
    ],
  },
  {
    slug: "ofertas",
    name: "Ofertas",
    description: "Productos en promoción destacados.",
    imageUrl: pexels(3944405),
  },
];

const products: ProductSeed[] = [
  // —— Steam / PC ——
  {
    slug: "elden-ring-steam",
    name: "Elden Ring — Steam Key",
    description:
      "Explora las Tierras Intermedias en este action RPG de FromSoftware. Key Steam región LATAM.",
    categorySlugs: ["steam", "videojuegos", "ofertas"],
    price: 34990,
    compareAtPrice: 44990,
    qty: 25,
    coverImageUrl: pexels(7915437),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    isOffer: true,
    platform: "Steam",
    genres: ["RPG", "Acción", "Mundo abierto"],
    tags: ["fromsoftware", "soulslike"],
  },
  {
    slug: "cyberpunk-2077-steam",
    name: "Cyberpunk 2077 — Steam Key",
    description:
      "Night City te espera. Incluye actualización Phantom Liberty (según oferta). Entrega automática de key.",
    categorySlugs: ["steam", "videojuegos"],
    price: 29990,
    compareAtPrice: 39990,
    qty: 40,
    coverImageUrl: pexels(7915257),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    isOffer: true,
    platform: "Steam",
    genres: ["RPG", "Acción", "Sci-Fi"],
  },
  {
    slug: "gta-v-premium-steam",
    name: "GTA V Premium Edition — Steam",
    description: "Grand Theft Auto V Premium Edition con GTA Online. Key Steam.",
    categorySlugs: ["steam", "videojuegos"],
    price: 19990,
    qty: 50,
    coverImageUrl: pexels(3945683),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Steam",
    genres: ["Acción", "Mundo abierto"],
  },
  {
    slug: "red-dead-redemption-2-steam",
    name: "Red Dead Redemption 2 — Steam",
    description: "La epopeya del Lejano Oeste de Rockstar. Key digital Steam.",
    categorySlugs: ["steam", "videojuegos"],
    price: 27990,
    qty: 18,
    coverImageUrl: pexels(163036),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    platform: "Steam",
    genres: ["Acción", "Aventura"],
  },
  {
    slug: "hogwarts-legacy-steam",
    name: "Hogwarts Legacy — Steam",
    description: "Vive tu propia aventura en el mundo mágico. Key Steam.",
    categorySlugs: ["steam", "videojuegos"],
    price: 32990,
    qty: 22,
    coverImageUrl: pexels(3165335),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Steam",
    genres: ["RPG", "Aventura"],
  },
  {
    slug: "baldurs-gate-3-steam",
    name: "Baldur's Gate 3 — Steam",
    description: "El RPG del año. Key Steam con entrega inmediata.",
    categorySlugs: ["steam", "videojuegos", "ofertas"],
    price: 39990,
    compareAtPrice: 49990,
    qty: 15,
    coverImageUrl: pexels(7915255),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    isOffer: true,
    platform: "Steam",
    genres: ["RPG", "Estrategia"],
  },
  {
    slug: "fc-25-steam",
    name: "EA Sports FC 25 — Steam",
    description: "El fútbol simulado de EA. Key Steam región LATAM.",
    categorySlugs: ["steam", "videojuegos"],
    price: 44990,
    qty: 30,
    coverImageUrl: picsum("fc25-steam", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Steam",
    genres: ["Deportes", "Simulación"],
  },
  {
    slug: "minecraft-java-pc",
    name: "Minecraft Java & Bedrock — PC",
    description: "Código oficial Microsoft para Java y Bedrock Edition.",
    categorySlugs: ["steam", "videojuegos"],
    price: 18990,
    qty: 60,
    coverImageUrl: pexels(163036),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    platform: "PC",
    genres: ["Sandbox", "Aventura"],
  },

  // —— PlayStation ——
  {
    slug: "psn-card-20-usd",
    name: "PlayStation Network $20 USD",
    description: "Código PSN $20 USD. Ideal para PS Store y Plus.",
    categorySlugs: ["playstation", "gift-cards"],
    price: 21990,
    qty: 35,
    coverImageUrl: pexels(3945683),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "PlayStation",
    tags: ["psn", "gift-card"],
  },
  {
    slug: "psn-card-50-usd",
    name: "PlayStation Network $50 USD",
    description: "Código PSN $50 USD para cuenta estadounidense.",
    categorySlugs: ["playstation", "gift-cards", "ofertas"],
    price: 49990,
    compareAtPrice: 54990,
    qty: 28,
    coverImageUrl: pexels(3945658),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
    platform: "PlayStation",
  },
  {
    slug: "ps-plus-essential-12m",
    name: "PS Plus Essential 12 meses",
    description: "Suscripción PlayStation Plus Essential por 1 año.",
    categorySlugs: ["playstation", "streaming"],
    price: 54990,
    qty: 20,
    coverImageUrl: picsum("ps-plus-12", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    platform: "PlayStation",
  },
  {
    slug: "god-of-war-ragnarok-ps5",
    name: "God of War Ragnarök — PS5",
    description: "Key digital PS5. Cuenta primaria / secundaria según disponibilidad.",
    categorySlugs: ["playstation", "videojuegos"],
    price: 42990,
    qty: 12,
    coverImageUrl: pexels(7915437),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "PS5",
    genres: ["Acción", "Aventura"],
  },
  {
    slug: "spider-man-2-ps5",
    name: "Marvel's Spider-Man 2 — PS5",
    description: "Key digital PlayStation 5. Entrega manual verificada.",
    categorySlugs: ["playstation", "videojuegos"],
    price: 45990,
    qty: 10,
    coverImageUrl: picsum("spiderman2-ps5", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    platform: "PS5",
    genres: ["Acción", "Aventura"],
  },

  // —— Xbox ——
  {
    slug: "xbox-gift-card-25-usd",
    name: "Xbox Gift Card $25 USD",
    description: "Código Microsoft Store / Xbox Live $25 USD.",
    categorySlugs: ["xbox", "gift-cards"],
    price: 26990,
    qty: 40,
    coverImageUrl: pexels(3945658),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Xbox",
  },
  {
    slug: "game-pass-ultimate-3m",
    name: "Xbox Game Pass Ultimate 3 meses",
    description: "Código Game Pass Ultimate 3 meses. Incluye EA Play y cloud.",
    categorySlugs: ["xbox", "streaming", "ofertas"],
    price: 29990,
    compareAtPrice: 34990,
    qty: 25,
    coverImageUrl: picsum("gamepass-3m", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    isOffer: true,
    platform: "Xbox",
  },
  {
    slug: "game-pass-ultimate-1m",
    name: "Xbox Game Pass Ultimate 1 mes",
    description: "Prueba o renueva Game Pass Ultimate por 1 mes.",
    categorySlugs: ["xbox", "streaming"],
    price: 11990,
    qty: 45,
    coverImageUrl: picsum("gamepass-1m", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Xbox",
  },
  {
    slug: "forza-horizon-5-xbox",
    name: "Forza Horizon 5 — Xbox / PC",
    description: "Código digital Xbox. También juega en PC con Game Pass.",
    categorySlugs: ["xbox", "videojuegos"],
    price: 24990,
    qty: 18,
    coverImageUrl: pexels(163036),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Xbox",
    genres: ["Carreras", "Mundo abierto"],
  },

  // —— Nintendo ——
  {
    slug: "nintendo-eshop-35-usd",
    name: "Nintendo eShop $35 USD",
    description: "Código eShop $35 USD para cuenta estadounidense.",
    categorySlugs: ["nintendo", "gift-cards"],
    price: 37990,
    qty: 22,
    coverImageUrl: pexels(163036),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Nintendo",
  },
  {
    slug: "zelda-tears-of-the-kingdom",
    name: "Zelda: Tears of the Kingdom — Switch",
    description: "Código eShop digital. Entrega manual post-pago.",
    categorySlugs: ["nintendo", "videojuegos"],
    price: 52990,
    qty: 8,
    coverImageUrl: picsum("zelda-totk", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    platform: "Nintendo Switch",
    genres: ["Aventura", "Acción"],
  },
  {
    slug: "mario-kart-8-deluxe",
    name: "Mario Kart 8 Deluxe — Switch",
    description: "El clásico de carreras Nintendo. Código eShop.",
    categorySlugs: ["nintendo", "videojuegos"],
    price: 44990,
    qty: 14,
    coverImageUrl: picsum("mario-kart-8", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    platform: "Nintendo Switch",
    genres: ["Carreras", "Familiar"],
  },

  // —— Gift cards genéricas ——
  {
    slug: "google-play-10-usd",
    name: "Google Play $10 USD",
    description: "Código de saldo Google Play $10 USD.",
    categorySlugs: ["google-play", "gift-cards"],
    price: 10990,
    qty: 80,
    coverImageUrl: pexels(607812),
    deliveryMethod: DeliveryMethod.MANUAL,
    tags: ["android", "google"],
  },
  {
    slug: "google-play-25-usd",
    name: "Google Play $25 USD",
    description: "Código de saldo Google Play $25 USD.",
    categorySlugs: ["google-play", "gift-cards", "ofertas"],
    price: 25990,
    compareAtPrice: 27990,
    qty: 55,
    coverImageUrl: pexels(607812),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
  },
  {
    slug: "google-play-50-usd",
    name: "Google Play $50 USD",
    description: "Código de saldo Google Play $50 USD.",
    categorySlugs: ["google-play", "gift-cards"],
    price: 49990,
    qty: 40,
    coverImageUrl: picsum("gplay-50", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "app-store-15-usd",
    name: "App Store / iTunes $15 USD",
    description: "Código Apple Gift Card $15 USD.",
    categorySlugs: ["itunes-app-store", "gift-cards"],
    price: 16490,
    qty: 45,
    coverImageUrl: pexels(788946),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "app-store-50-usd",
    name: "App Store / iTunes $50 USD",
    description: "Código Apple Gift Card $50 USD.",
    categorySlugs: ["itunes-app-store", "gift-cards"],
    price: 51990,
    qty: 30,
    coverImageUrl: picsum("itunes-50", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
  },
  {
    slug: "spotify-premium-3m",
    name: "Spotify Premium 3 meses",
    description: "Gift card / código Spotify Premium 3 meses.",
    categorySlugs: ["spotify", "streaming", "gift-cards"],
    price: 14990,
    qty: 35,
    coverImageUrl: pexels(3756766),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
    compareAtPrice: 17990,
  },
  {
    slug: "spotify-premium-12m",
    name: "Spotify Premium 12 meses",
    description: "Código Spotify Premium Individual 12 meses.",
    categorySlugs: ["spotify", "streaming"],
    price: 49990,
    qty: 20,
    coverImageUrl: picsum("spotify-12m", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
  },

  // —— Streaming ——
  {
    slug: "netflix-premium-1m",
    name: "Netflix Premium 1 mes",
    description: "Acceso perfil Premium 1 mes. Entrega por chat / email.",
    categorySlugs: ["netflix", "streaming"],
    price: 9990,
    qty: 100,
    coverImageUrl: pexels(4009401),
    deliveryMethod: DeliveryMethod.MANUAL,
    tags: ["streaming", "cuenta"],
  },
  {
    slug: "netflix-premium-3m",
    name: "Netflix Premium 3 meses",
    description: "Pack 3 meses Netflix Premium. Renovación asistida.",
    categorySlugs: ["netflix", "streaming", "ofertas"],
    price: 26990,
    compareAtPrice: 29990,
    qty: 40,
    coverImageUrl: pexels(4009402),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
    isFeatured: true,
  },
  {
    slug: "disney-plus-1m",
    name: "Disney+ 1 mes",
    description: "Suscripción Disney+ 1 mes. Perfil privado.",
    categorySlugs: ["disney-plus", "streaming"],
    price: 7990,
    qty: 60,
    coverImageUrl: pexels(799443),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "disney-plus-12m",
    name: "Disney+ 12 meses",
    description: "Plan anual Disney+. Entrega digital inmediata tras pago.",
    categorySlugs: ["disney-plus", "streaming"],
    price: 69990,
    qty: 15,
    coverImageUrl: picsum("disney-12m", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
  },
  {
    slug: "youtube-premium-3m",
    name: "YouTube Premium 3 meses",
    description: "YouTube Premium + Music sin anuncios por 3 meses.",
    categorySlugs: ["youtube-premium", "streaming"],
    price: 18990,
    qty: 30,
    coverImageUrl: pexels(4050315),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "youtube-premium-12m",
    name: "YouTube Premium 12 meses",
    description: "Plan anual YouTube Premium Individual.",
    categorySlugs: ["youtube-premium", "streaming", "ofertas"],
    price: 59990,
    compareAtPrice: 69990,
    qty: 18,
    coverImageUrl: pexels(4050291),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
  },

  // —— Software ——
  {
    slug: "windows-11-pro",
    name: "Windows 11 Pro — Key",
    description: "Licencia digital Windows 11 Pro. Activación online.",
    categorySlugs: ["windows", "software"],
    price: 24990,
    compareAtPrice: 34990,
    qty: 70,
    coverImageUrl: pexels(1714208),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
    isOffer: true,
    tags: ["microsoft", "os"],
  },
  {
    slug: "windows-10-pro",
    name: "Windows 10 Pro — Key",
    description: "Licencia digital Windows 10 Pro retail.",
    categorySlugs: ["windows", "software"],
    price: 19990,
    qty: 50,
    coverImageUrl: picsum("win10-pro", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "office-2021-pro-plus",
    name: "Office 2021 Professional Plus",
    description: "Licencia perpetua Office 2021 Pro Plus (Word, Excel, Outlook…). ",
    categorySlugs: ["microsoft-office", "software"],
    price: 44990,
    qty: 35,
    coverImageUrl: pexels(1181244),
    deliveryMethod: DeliveryMethod.MANUAL,
    isFeatured: true,
  },
  {
    slug: "microsoft-365-personal-1y",
    name: "Microsoft 365 Personal 1 año",
    description: "Suscripción Microsoft 365 Personal 12 meses + 1 TB OneDrive.",
    categorySlugs: ["microsoft-office", "software", "ofertas"],
    price: 54990,
    compareAtPrice: 64990,
    qty: 25,
    coverImageUrl: picsum("m365-1y", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
    isOffer: true,
  },
  {
    slug: "kaspersky-total-1y",
    name: "Kaspersky Total Security 1 año",
    description: "Antivirus Kaspersky Total Security — 1 dispositivo, 1 año.",
    categorySlugs: ["antivirus", "software"],
    price: 22990,
    qty: 40,
    coverImageUrl: pexels(60504),
    deliveryMethod: DeliveryMethod.MANUAL,
  },
  {
    slug: "norton-360-deluxe-1y",
    name: "Norton 360 Deluxe 1 año",
    description: "Norton 360 Deluxe — hasta 5 dispositivos, 1 año.",
    categorySlugs: ["antivirus", "software"],
    price: 27990,
    qty: 30,
    coverImageUrl: picsum("norton-360", 800, 600),
    deliveryMethod: DeliveryMethod.MANUAL,
  },

  // —— SMM demo products ——
  {
    slug: "ig-seguidores-1000",
    name: "Instagram — 1.000 seguidores",
    description:
      "Servicio SMM demo: ~1.000 seguidores Instagram. Entrega gradual. Solo para pruebas locales.",
    categorySlugs: ["instagram", "redes-sociales"],
    price: 4990,
    qty: 9999,
    coverImageUrl: pexels(267350),
    deliveryMethod: DeliveryMethod.SMM,
    tags: ["smm", "instagram"],
    smm: {
      serviceId: 90001,
      rate: 1.2,
      markupPct: 54,
      min: 100,
      max: 10000,
      category: "Instagram",
    },
  },
  {
    slug: "ig-likes-500",
    name: "Instagram — 500 likes",
    description: "Likes para una publicación de Instagram. Servicio SMM demo.",
    categorySlugs: ["instagram", "redes-sociales", "ofertas"],
    price: 1990,
    compareAtPrice: 2990,
    qty: 9999,
    coverImageUrl: pexels(607812),
    deliveryMethod: DeliveryMethod.SMM,
    isOffer: true,
    smm: {
      serviceId: 90002,
      rate: 0.4,
      markupPct: 54,
      min: 50,
      max: 5000,
      category: "Instagram",
    },
  },
  {
    slug: "ig-vistas-reels-5000",
    name: "Instagram — 5.000 vistas Reels",
    description: "Vistas para Reels de Instagram. Servicio SMM demo.",
    categorySlugs: ["instagram", "redes-sociales"],
    price: 3490,
    qty: 9999,
    coverImageUrl: picsum("ig-reels-5k", 800, 600),
    deliveryMethod: DeliveryMethod.SMM,
    smm: {
      serviceId: 90003,
      rate: 0.8,
      markupPct: 50,
      min: 500,
      max: 50000,
      category: "Instagram",
    },
  },
  {
    slug: "tiktok-seguidores-1000",
    name: "TikTok — 1.000 seguidores",
    description: "Seguidores TikTok. Servicio SMM demo para catálogo local.",
    categorySlugs: ["tiktok", "redes-sociales"],
    price: 5990,
    qty: 9999,
    coverImageUrl: pexels(5082579),
    deliveryMethod: DeliveryMethod.SMM,
    isFeatured: true,
    smm: {
      serviceId: 90011,
      rate: 1.5,
      markupPct: 54,
      min: 100,
      max: 20000,
      category: "TikTok",
    },
  },
  {
    slug: "tiktok-vistas-10000",
    name: "TikTok — 10.000 vistas",
    description: "Vistas para videos de TikTok. Servicio SMM demo.",
    categorySlugs: ["tiktok", "redes-sociales", "ofertas"],
    price: 2990,
    compareAtPrice: 3990,
    qty: 9999,
    coverImageUrl: picsum("tt-views-10k", 800, 600),
    deliveryMethod: DeliveryMethod.SMM,
    isOffer: true,
    smm: {
      serviceId: 90012,
      rate: 0.6,
      markupPct: 50,
      min: 1000,
      max: 100000,
      category: "TikTok",
    },
  },
  {
    slug: "yt-suscriptores-500",
    name: "YouTube — 500 suscriptores",
    description: "Suscriptores YouTube. Servicio SMM demo (no real fulfillment).",
    categorySlugs: ["youtube-smm", "redes-sociales"],
    price: 14990,
    qty: 9999,
    coverImageUrl: pexels(4050291),
    deliveryMethod: DeliveryMethod.SMM,
    smm: {
      serviceId: 90021,
      rate: 4.5,
      markupPct: 60,
      min: 50,
      max: 5000,
      category: "YouTube",
    },
  },
  {
    slug: "yt-vistas-10000",
    name: "YouTube — 10.000 vistas",
    description: "Vistas para videos de YouTube. Servicio SMM demo.",
    categorySlugs: ["youtube-smm", "redes-sociales"],
    price: 7990,
    qty: 9999,
    coverImageUrl: pexels(4050315),
    deliveryMethod: DeliveryMethod.SMM,
    smm: {
      serviceId: 90022,
      rate: 2.0,
      markupPct: 55,
      min: 1000,
      max: 100000,
      category: "YouTube",
    },
  },
  {
    slug: "fb-likes-pagina-1000",
    name: "Facebook — 1.000 likes de página",
    description: "Likes para página de Facebook. Servicio SMM demo.",
    categorySlugs: ["facebook", "redes-sociales"],
    price: 8990,
    qty: 9999,
    coverImageUrl: pexels(267389),
    deliveryMethod: DeliveryMethod.SMM,
    smm: {
      serviceId: 90031,
      rate: 2.2,
      markupPct: 54,
      min: 100,
      max: 10000,
      category: "Facebook",
    },
  },
  {
    slug: "fb-seguidores-500",
    name: "Facebook — 500 seguidores perfil",
    description: "Seguidores para perfil de Facebook. Servicio SMM demo.",
    categorySlugs: ["facebook", "redes-sociales"],
    price: 6990,
    qty: 9999,
    coverImageUrl: picsum("fb-followers-500", 800, 600),
    deliveryMethod: DeliveryMethod.SMM,
    smm: {
      serviceId: 90032,
      rate: 1.8,
      markupPct: 54,
      min: 50,
      max: 5000,
      category: "Facebook",
    },
  },
];

async function upsertCategory(
  seed: Omit<CategorySeed, "children">,
  parentId: string | null,
): Promise<string> {
  const existing = await prisma.category.findUnique({
    where: { slug: seed.slug },
    select: { id: true },
  });

  if (existing) {
    await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: seed.name,
        description: seed.description,
        imageUrl: seed.imageUrl,
        parentId,
      },
    });
    return existing.id;
  }

  const created = await prisma.category.create({
    data: {
      name: seed.name,
      slug: seed.slug,
      description: seed.description,
      imageUrl: seed.imageUrl,
      parentId,
    },
  });
  return created.id;
}

async function seedCategories(): Promise<Map<string, string>> {
  const slugToId = new Map<string, string>();

  for (const root of categories) {
    const rootId = await upsertCategory(root, null);
    slugToId.set(root.slug, rootId);

    for (const child of root.children ?? []) {
      const childId = await upsertCategory(child, rootId);
      slugToId.set(child.slug, childId);
    }
  }

  return slugToId;
}

async function upsertProduct(
  seed: ProductSeed,
  slugToId: Map<string, string>,
): Promise<"created" | "updated"> {
  const categoryIds = seed.categorySlugs
    .map((slug) => slugToId.get(slug))
    .filter((id): id is string => Boolean(id));

  if (categoryIds.length === 0) {
    throw new Error(`Product ${seed.slug} has no valid categories`);
  }

  const existing = await prisma.product.findUnique({
    where: { slug: seed.slug },
    select: { id: true },
  });

  const baseData = {
    name: seed.name,
    description: seed.description,
    coverImageUrl: seed.coverImageUrl,
    status: ProductStatus.ACTIVE,
    deliveryMethod: seed.deliveryMethod,
    price: seed.price,
    compareAtPrice: seed.compareAtPrice ?? null,
    currency: "CLP",
    qty: seed.qty,
    isFeatured: seed.isFeatured ?? false,
    isOffer: seed.isOffer ?? false,
    platform: seed.platform ?? null,
    genres: seed.genres ?? [],
    tags: seed.tags ?? [],
    smmServiceId: seed.smm?.serviceId ?? null,
    smmRate: seed.smm?.rate ?? null,
    smmMarkupPct: seed.smm?.markupPct ?? null,
    smmMin: seed.smm?.min ?? null,
    smmMax: seed.smm?.max ?? null,
    smmCategory: seed.smm?.category ?? null,
    smmServiceName: seed.smm ? seed.name : null,
    smmServiceType: seed.smm ? "Default" : null,
  };

  if (existing) {
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.id },
        data: baseData,
      });
      await tx.productCategory.deleteMany({ where: { productId: existing.id } });
      await tx.productCategory.createMany({
        data: categoryIds.map((categoryId) => ({
          productId: existing.id,
          categoryId,
        })),
      });
    });
    return "updated";
  }

  await prisma.product.create({
    data: {
      slug: seed.slug,
      ...baseData,
      categories: {
        create: categoryIds.map((categoryId) => ({ categoryId })),
      },
      ...(seed.deliveryMethod === DeliveryMethod.MANUAL && seed.qty > 0
        ? {
            keys: {
              create: Array.from({ length: Math.min(seed.qty, 5) }, (_, i) => ({
                code: `DEMO-${seed.slug.toUpperCase().slice(0, 12)}-${String(i + 1).padStart(3, "0")}`,
              })),
            },
          }
        : {}),
    },
  });
  return "created";
}

async function main() {
  console.log("Seeding categories…");
  const slugToId = await seedCategories();
  console.log(`  ${slugToId.size} categories ready`);

  console.log("Seeding products…");
  let created = 0;
  let updated = 0;

  for (const product of products) {
    const result = await upsertProduct(product, slugToId);
    if (result === "created") created += 1;
    else updated += 1;
  }

  const [categoryCount, productCount, featuredCount, offerCount] =
    await Promise.all([
      prisma.category.count(),
      prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      prisma.product.count({ where: { isFeatured: true } }),
      prisma.product.count({ where: { isOffer: true } }),
    ]);

  console.log("Done.");
  console.log(
    JSON.stringify(
      {
        categories: categoryCount,
        productsActive: productCount,
        featured: featuredCount,
        offers: offerCount,
        thisRun: { created, updated },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
