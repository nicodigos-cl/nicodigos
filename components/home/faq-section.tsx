"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SectionShell } from "@/components/home/section-shell";

const faqItems = [
  {
    id: "activation",
    question: "¿Cómo activo mi key después de comprar?",
    answer:
      "Cada producto incluye activationDetails con instrucciones para Steam, Xbox, PlayStation u otra plataforma. Tras completar tu pedido, revisa OrderKey en tu cuenta y copia el código en el launcher indicado.",
  },
  {
    id: "region",
    question: "¿Hay restricciones regionales?",
    answer:
      "Sí. Consulta regionName, regionalLimitations y countryLimitations del producto antes de pagar. Algunas keys solo funcionan en ciertos países o cuentas.",
  },
  {
    id: "refund",
    question: "¿Puedo pedir reembolso?",
    answer:
      "Las keys digitales entregadas no suelen ser reembolsables una vez reveladas. Si hay un error de región o stock, contáctanos con tu número de pedido para revisar el caso.",
  },
  {
    id: "preorder",
    question: "¿Cómo funcionan las preventas?",
    answer:
      "Los productos en preventa se reservan con pago anticipado. La key o acceso se entrega cerca de la fecha de lanzamiento según disponibilidad.",
  },
  {
    id: "payment",
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos medios de pago configurados en checkout (tarjetas y alternativas locales). Todas las transacciones quedan registradas en Transaction con moneda CLP.",
  },
] as const;

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      eyebrow="Ayuda"
      title="Preguntas frecuentes"
      description="Todo lo que necesitas saber antes de comprar tu próximo juego."
      className="py-16 sm:py-20"
    >
      <Accordion type="single" collapsible className="max-w-3xl">
        {faqItems.map((item) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-left text-sm font-semibold">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </SectionShell>
  );
}
