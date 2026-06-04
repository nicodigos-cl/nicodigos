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
    title: "Entrega instantánea",
    description:
      "Recibe tu key digital en minutos tras confirmar el pago, directo en tu cuenta.",
  },
  {
    icon: IconRefresh,
    title: "Stock sincronizado",
    description:
      "Inventario actualizado en tiempo real para evitar sobreventa.",
  },
  {
    icon: IconSparkles,
    title: "Productos originales",
    description:
      "Códigos de distribuidores verificados y trazabilidad en cada pedido.",
  },
  {
    icon: IconHeadset,
    title: "Soporte 24/7",
    description:
      "Equipo local en Chile para activación, regiones y estado de tu pedido.",
  },
  {
    icon: IconShieldCheck,
    title: "Compra segura",
    description:
      "Pagos protegidos, pedidos en Order/OrderKey y transacciones auditables.",
  },
] as const;

export function BenefitsSection() {
  return (
    <SectionShell
      id="beneficios"
      variant="primary"
      primaryAccent="cool"
      eyebrow="Por qué Nicodigos"
      title="Beneficios de comprar aquí"
      description="Marketplace pensado para gamers en Chile con catálogo digital escalable."
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
