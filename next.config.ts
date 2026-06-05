import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "nicodigos.cl",
        "www.nicodigos.cl",
        "nicodigos.nicotordev.com",
        "nicodigos.up.railway.app",
        "nicodigos-production.up.railway.app",
        "*.nicodigos.cl",
        "*.railway.app",
      ],
      bodySizeLimit: "8mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/catalogo",
        destination: "/catalog",
        permanent: true,
      },
      {
        source: "/carrito",
        destination: "/cart",
        permanent: true,
      },
      {
        source: "/lista-deseos",
        destination: "/wishlist",
        permanent: true,
      },
      {
        source: "/checkout/retorno",
        destination: "/checkout/return",
        permanent: true,
      },
      {
        source: "/legal/terminos",
        destination: "/legal/terms",
        permanent: true,
      },
      {
        source: "/legal/privacidad",
        destination: "/legal/privacy",
        permanent: true,
      },
      {
        source: "/admin/productos/nuevo",
        destination: "/admin/products/new",
        permanent: true,
      },
      {
        source: "/admin/productos",
        destination: "/admin/products",
        permanent: true,
      },
      {
        source: "/dashboard/configuracion",
        destination: "/dashboard/settings",
        permanent: true,
      },
      {
        source: "/dashboard/pedidos",
        destination: "/dashboard/orders",
        permanent: true,
      },
      {
        source: "/dashboard/claves",
        destination: "/dashboard/keys",
        permanent: true,
      },
    ];
  },
  serverExternalPackages: [
    "better-auth",
    "@better-auth/core",
    "@better-auth/kysely-adapter",
    "@better-auth/prisma-adapter",
    "kysely",
  ],
};

export default nextConfig;
