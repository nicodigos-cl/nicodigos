import Link from "next/link";
import type { IconType } from "react-icons";
import {
  FaDiscord,
  FaFacebook,
  FaGithub,
  FaInstagram,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
};

type SocialItem = {
  name: string;
  href: string;
  icon: IconType;
};

const navigation = {
  store: [
    { name: "Catálogo", href: "/catalog" },
    { name: "Ofertas", href: "/catalog?filter=offers" },
    { name: "Keys y juegos", href: "/catalog?category=juegos" },
    { name: "Software", href: "/catalog?category=software" },
    { name: "Servicios SMM", href: "/catalog?category=smm" },
    { name: "Carrito", href: "/cart" },
  ] satisfies NavItem[],
  support: [
    { name: "Centro de ayuda", href: "/dashboard/support" },
    { name: "Mis pedidos", href: "/dashboard/pedidos" },
    { name: "Mis entregas", href: "/dashboard/deliveries" },
    { name: "Transacciones", href: "/dashboard/transactions" },
  ] satisfies NavItem[],
  company: [
    { name: "Inicio", href: "/" },
    { name: "Crear cuenta", href: "/auth/register" },
    { name: "Iniciar sesión", href: "/auth/login" },
    { name: "Mi cuenta", href: "/dashboard" },
    { name: "Lista de deseos", href: "/dashboard/wishlist" },
    { name: "Perfil", href: "/dashboard/profile" },
  ] satisfies NavItem[],
  legal: [
    { name: "Términos de servicio", href: "/terminos" },
    { name: "Política de privacidad", href: "/privacidad" },
    { name: "Licencias", href: "/licencias" },
  ] satisfies NavItem[],
  social: [
    { name: "Facebook", href: "https://facebook.com", icon: FaFacebook },
    { name: "Instagram", href: "https://instagram.com", icon: FaInstagram },
    { name: "X", href: "https://x.com", icon: FaTwitter },
    { name: "Discord", href: "https://discord.com", icon: FaDiscord },
    { name: "YouTube", href: "https://youtube.com", icon: FaYoutube },
    { name: "GitHub", href: "https://github.com", icon: FaGithub },
  ] satisfies SocialItem[],
};

function FooterColumn({
  title,
  items,
}: {
  title: string;
  items: readonly NavItem[];
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul role="list" className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.name}>
            <Link
              href={item.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

type StoreFooterProps = {
  className?: string;
};

export default function StoreFooter({ className }: StoreFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer
      className={cn("border-t border-border/60 bg-background", className)}
    >
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8 sm:pt-24 lg:px-8 lg:pt-32">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
            <Logo size="lg" href="/" />
            <p className="max-w-xs text-sm text-balance text-muted-foreground">
              Keys digitales, software y servicios SMM con entrega inmediata en
              Chile. Precios en CLP y soporte local.
            </p>
            <div className="flex gap-x-5">
              {navigation.social.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="sr-only">{item.name}</span>
                    <Icon aria-hidden className="size-5" />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <FooterColumn title="Tienda" items={navigation.store} />
              <div className="mt-10 md:mt-0">
                <FooterColumn title="Soporte" items={navigation.support} />
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <FooterColumn title="Cuenta" items={navigation.company} />
              <div className="mt-10 md:mt-0">
                <FooterColumn title="Legal" items={navigation.legal} />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 border-t border-border/60 pt-8 sm:mt-20 lg:mt-24">
          <p className="text-sm text-muted-foreground">
            &copy; {year} Nicodigos. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
