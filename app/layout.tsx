import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Nunito_Sans, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const robotoHeading = Roboto({
  subsets: ["latin"],
  variable: "--font-heading",
});

const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

const appUrl =
  process.env.FLOW_PUBLIC_URL ||
  process.env.BETTER_AUTH_URL ||
  "https://nicodigos.cl";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Nicodigos — Keys, gift cards y licencias digitales",
    template: "%s | Nicodigos",
  },
  description:
    "Tienda chilena de keys de juegos, gift cards y licencias de software oficiales. Entrega instantánea, stock verificado y los mejores precios en pesos.",
  keywords: [
    "keys de juegos",
    "juegos digitales",
    "gift cards chile",
    "tarjetas de regalo",
    "licencias software",
    "keys baratas",
    "steam chile",
    "playstation chile",
    "xbox chile",
    "nintendo switch chile",
    "comprar keys chile",
    "entrega inmediata",
  ],
  authors: [{ name: "Nicodigos" }],
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Nicodigos",
    title: "Nicodigos — Marketplace de productos digitales en Chile",
    description:
      "Compra keys de juegos, gift cards de consolas y licencias de software oficiales. Entrega al tiro 24/7 y pago seguro con Flow.",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Nicodigos Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nicodigos — Marketplace de productos digitales en Chile",
    description:
      "Compra keys de juegos, gift cards de consolas y licencias de software oficiales. Entrega al tiro 24/7 y pago seguro con Flow.",
    images: ["/logo.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      { url: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
        nunitoSans.variable,
        robotoHeading.variable,
      )}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
