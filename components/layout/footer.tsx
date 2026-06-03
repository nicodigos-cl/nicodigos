import Link from "next/link";
import { FiMail, FiShield } from "react-icons/fi";
import { LuMapPin } from "react-icons/lu";

import Logo from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import {
  footerAccountLinks,
  footerHelpLinks,
  footerLegalLinks,
  footerShopLinks,
  storeRoutes,
} from "@/lib/store/navigation";
import { cn } from "@/lib/utils";

type FooterLinkProps = {
  href: string;
  children: React.ReactNode;
};

function FooterLink({ href, children }: FooterLinkProps) {
  return (
    <Link
      href={href}
      className="text-sm text-muted-foreground transition-all duration-200 hover:text-primary hover:translate-x-1 inline-block focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 rounded-sm"
    >
      {children}
    </Link>
  );
}

export function MarketplaceFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-muted/40 dark:bg-muted/10 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] lg:gap-8 lg:py-14">
          
          {/* Logo & Contact details */}
          <div className="space-y-5 sm:col-span-2 lg:col-span-1 lg:pr-8">
            <Logo href={storeRoutes.home} size="md" format="auto" />
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground/90">
              Marketplace chileno de productos digitales: keys, licencias, gift cards y suscripciones con entrega rápida y segura.
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground/80">
              <li className="flex items-start gap-2.5">
                <LuMapPin
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span>Atención orientada a clientes en Chile.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <FiMail className="size-4 shrink-0 text-primary" aria-hidden />
                <a
                  href="mailto:contacto@nicodigos.cl"
                  className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30 rounded-sm"
                >
                  contacto@nicodigos.cl
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <FiShield
                  className="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden
                />
                <span>Compra segura y entrega digital en tu cuenta.</span>
              </li>
            </ul>
          </div>

          {/* Nav Categories */}
          <nav aria-label="Tienda" className="space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-foreground/80">Tienda</h2>
            <ul className="space-y-2">
              {footerShopLinks.map((link) => (
                <li key={link.name}>
                  <FooterLink href={link.href}>{link.name}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Ayuda" className="space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-foreground/80">Ayuda</h2>
            <ul className="space-y-2">
              {footerHelpLinks.map((link) => (
                <li key={link.name}>
                  <FooterLink href={link.href}>{link.name}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Cuenta" className="space-y-4">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-foreground/80">Cuenta</h2>
            <ul className="space-y-2">
              {footerAccountLinks.map((link) => (
                <li key={link.name}>
                  <FooterLink href={link.href}>{link.name}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Separator className="border-border/60" />

        {/* Bottom row: Copyright, Payment Methods & Legal links */}
        <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2.5">
            <p className="text-xs text-muted-foreground/80">
              © {year} Nicodigos. Todos los derechos reservados.
            </p>
            {/* Local Payment Methods badges */}
            <div className="flex flex-wrap items-center gap-1.5 opacity-75 dark:opacity-60">
              <span className="text-[9px] text-muted-foreground/70 uppercase font-bold tracking-wider mr-1">Pagos con</span>
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50 dark:bg-background/20 text-[9px] font-bold text-foreground/80">Webpay</span>
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50 dark:bg-background/20 text-[9px] font-bold text-foreground/80">Visa</span>
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50 dark:bg-background/20 text-[9px] font-bold text-foreground/80">Mastercard</span>
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50 dark:bg-background/20 text-[9px] font-bold text-foreground/80">Redcompra</span>
              <span className="px-1.5 py-0.5 rounded border border-border/80 bg-background/50 dark:bg-background/20 text-[9px] font-bold text-foreground/80">MACH</span>
            </div>
          </div>

          <nav
            aria-label="Legal"
            className={cn("flex flex-wrap gap-x-4 gap-y-2 sm:justify-end")}
          >
            {footerLegalLinks.map((link) => (
              <FooterLink key={link.name} href={link.href}>
                {link.name}
              </FooterLink>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

export default MarketplaceFooter;

