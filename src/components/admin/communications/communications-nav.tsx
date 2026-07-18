"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineBell, HiOutlineCog6Tooth, HiOutlineEnvelope, HiOutlineRectangleStack, HiOutlineUserGroup } from "react-icons/hi2";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin/communications/email", label: "Correo", icon: HiOutlineEnvelope },
  { href: "/admin/communications/web-push", label: "Notificaciones web", icon: HiOutlineBell },
  { href: "/admin/communications/templates", label: "Plantillas", icon: HiOutlineRectangleStack },
  { href: "/admin/communications/audience", label: "Audiencia", icon: HiOutlineUserGroup },
  { href: "/admin/communications/settings", label: "Configuración", icon: HiOutlineCog6Tooth },
];

export function CommunicationsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones de Comunicaciones" className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      {links.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return <Link key={item.href} href={item.href} className={cn("flex shrink-0 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground", active && "border-primary font-medium text-foreground")}><Icon className="size-4" />{item.label}</Link>;
      })}
    </nav>
  );
}
