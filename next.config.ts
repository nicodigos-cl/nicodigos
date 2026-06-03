import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
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
