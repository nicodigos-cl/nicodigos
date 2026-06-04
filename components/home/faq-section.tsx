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
      "Cuando pagas, te mandamos las instrucciones según la plataforma (Steam, Xbox, PlayStation u otra). Entras a tu cuenta, vas a Mis pedidos, copias el código y lo pegas donde corresponda.",
  },
  {
    id: "region",
    question: "¿Hay restricciones regionales?",
    answer:
      "Algunas keys tienen bloqueo por país o región. Revisa la ficha del producto antes de pagar; ahí dice si funciona en Chile o en qué países aplica.",
  },
  {
    id: "refund",
    question: "¿Puedo pedir reembolso?",
    answer:
      "Una vez que revelamos la key, por lo general no hay devolución — así funcionan los códigos digitales. Si hubo un error de región o stock, escríbenos con tu número de pedido y lo vemos contigo.",
  },
  {
    id: "preorder",
    question: "¿Cómo funcionan las preventas?",
    answer:
      "Pagas hoy y reservamos tu copia. Te entregamos la key cerca de la fecha de lanzamiento, según vaya llegando el stock.",
  },
  {
    id: "payment",
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Puedes pagar con tarjeta y otros medios que aparecen en el checkout. Todo queda en pesos chilenos (CLP) y registrado en tu historial de compras.",
  },
] as const;

export function FaqSection() {
  return (
    <SectionShell
      id="faq"
      eyebrow="Ayuda"
      title="Preguntas frecuentes"
      description="Las dudas que más nos tiran antes de partir con la compra."
      className="py-16 sm:py-20"
    >
      <Accordion type="single" collapsible>
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
