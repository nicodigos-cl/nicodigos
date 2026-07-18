import Link from "next/link";
import { HiOutlineCube, HiOutlineTag, HiOutlineShoppingCart } from "react-icons/hi";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const links = [
  {
    href: "/admin/products",
    title: "Productos",
    description: "Inventario, precios y códigos de activación.",
    icon: HiOutlineCube,
  },
  {
    href: "/admin/categories",
    title: "Categorías",
    description: "Organiza el catálogo por categorías.",
    icon: HiOutlineTag,
  },
  {
    href: "/admin/orders",
    title: "Órdenes",
    description: "Consulta el estado de las órdenes.",
    icon: HiOutlineShoppingCart,
  },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Panel de administración de Nicodigos.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group">
            <Card className="h-full shadow-none ring-border transition-colors group-hover:bg-muted/40">
              <CardHeader>
                <div className="mb-2 flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <link.icon className="size-4" />
                </div>
                <CardTitle>{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
