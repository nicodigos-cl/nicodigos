import {
  IconCreditCard,
  IconDeviceGamepad2,
  IconKey,
  IconSearch,
  IconShoppingCart,
} from "@tabler/icons-react";

import { SectionShell } from "@/components/home/section-shell";

const steps = [
  {
    step: 1,
    icon: IconSearch,
    title: "Selecciona un juego",
    description: "Explora el catálogo por categoría, plataforma o oferta.",
  },
  {
    step: 2,
    icon: IconShoppingCart,
    title: "Agrega al carrito",
    description:
      "Elige la oferta disponible; tu Cart guarda productId y offerId.",
  },
  {
    step: 3,
    icon: IconCreditCard,
    title: "Completa el pago",
    description: "Confirma tu Order y recibe confirmación por correo.",
  },
  {
    step: 4,
    icon: IconKey,
    title: "Recibe tu key",
    description:
      "Las OrderKey se entregan en tu panel cuando el pedido está listo.",
  },
  {
    step: 5,
    icon: IconDeviceGamepad2,
    title: "Activa y juega",
    description:
      "Sigue activationDetails del producto en Steam, Xbox o la plataforma indicada.",
  },
] as const;

export function HowItWorksSection() {
  return (
    <SectionShell
      id="como-funciona"
      variant="primary"
      primaryAccent="warm"
      eyebrow="Proceso"
      title="Cómo funciona"
      description="De la búsqueda a la activación en cinco pasos simples."
      className="py-16 sm:py-20 lg:py-24"
    >
      <div className="relative">
        {/* Connector line — desktop */}
        <div
          className="absolute left-0 right-0 top-10 hidden h-0.5 bg-gradient-to-r from-transparent via-primary-foreground/25 to-transparent lg:block"
          aria-hidden
        />

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.step} className="relative">
                <article className="group flex h-full flex-col items-center text-center rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 backdrop-blur-md transition-all duration-300 hover:border-primary-foreground/30 hover:bg-primary-foreground/15 hover:-translate-y-1 lg:pt-8">
                  <span className="relative z-10 mb-4 flex size-10 items-center justify-center rounded-full bg-primary-foreground text-sm font-black text-primary shadow-md shadow-black/15 ring-4 ring-primary/40">
                    {item.step}
                  </span>
                  <span className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/30 text-primary-foreground ring-1 ring-primary-foreground/20">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="font-heading text-sm font-bold text-primary-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-primary-foreground/75">
                    {item.description}
                  </p>
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </SectionShell>
  );
}
