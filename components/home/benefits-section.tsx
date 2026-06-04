import {
  IconBolt,
  IconHeadset,
  IconRefresh,
  IconShieldCheck,
  IconSparkles,
} from "@tabler/icons-react";

import { SectionShell } from "@/components/home/section-shell";

const benefits = [
  {
    icon: IconBolt,
    title: "Te llega al tiro",
    description:
      "Pagas y en minutos tienes tu key en la cuenta. Sin colas ni correos eternos.",
  },
  {
    icon: IconRefresh,
    title: "Stock al día",
    description:
      "Inventario actualizado al instante, pa' que no te quedes colgado a mitad de compra.",
  },
  {
    icon: IconSparkles,
    title: "100% originales",
    description:
      "Códigos de distribuidores verificados, con respaldo en cada pedido.",
  },
  {
    icon: IconHeadset,
    title: "Soporte de acá",
    description:
      "Gente chilena pa' ayudarte con activación, regiones y el estado de tu pedido.",
  },
  {
    icon: IconShieldCheck,
    title: "Compra segura",
    description:
      "Pagos protegidos, pedidos trazables y una compra en la que puedes confiar.",
  },
] as const;

export function BenefitsSection() {
  return (
    <SectionShell
      id="beneficios"
      variant="primary"
      primaryAccent="cool"
      eyebrow="Pa' qué elegirnos"
      title="Por qué conviene comprar acá"
      description="Hecho en Chile pa' gamers: catálogo digital, precios claros y cero vueltas."
      className="py-16 sm:py-20 lg:py-24"
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {benefits.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title}>
              <article className="group relative h-full overflow-hidden rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-md transition-all duration-300 hover:border-primary-foreground/30 hover:bg-primary-foreground/15 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10">
                <div
                  className="absolute -right-6 -top-6 size-24 rounded-full bg-primary-foreground/5 blur-2xl transition-opacity group-hover:opacity-100 opacity-0"
                  aria-hidden
                />
                <span className="relative mb-4 flex size-12 items-center justify-center rounded-xl bg-primary-foreground/15 text-primary-foreground ring-1 ring-primary-foreground/20">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3 className="relative font-heading text-base font-bold text-primary-foreground">
                  {item.title}
                </h3>
                <p className="relative mt-2 text-sm leading-relaxed text-primary-foreground/75">
                  {item.description}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
