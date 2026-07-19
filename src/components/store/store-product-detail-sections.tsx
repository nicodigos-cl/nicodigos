import type { IconType } from "react-icons";
import {
  HiOutlineCalendar,
  HiOutlineDesktopComputer,
  HiOutlineExclamation,
  HiOutlineGlobe,
  HiOutlineTag,
  HiOutlineTranslate,
  HiOutlineUserGroup,
} from "react-icons/hi";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { StoreProductDetailDto } from "@/types/products";

type StoreProductDetailSectionsProps = {
  product: StoreProductDetailDto;
};

type RequirementCard = {
  icon: IconType;
  label: string;
  value: string;
};

type FaqItem = {
  q: string;
  a: string;
};

function RequirementInfoCard({ icon: Icon, label, value }: RequirementCard) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border/50">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground wrap-break-word">
          {value}
        </p>
      </div>
    </div>
  );
}

function buildFaqItems(product: StoreProductDetailDto): FaqItem[] {
  const isSmm = product.deliveryMethod === "SMM";
  const isKinguin = product.deliveryMethod === "KINGUIN";

  return [
    {
      q: "¿Los productos son originales?",
      a: "Sí. Trabajamos con distribuidores autorizados y proveedores verificados. Las claves y servicios que entregamos son oficiales.",
    },
    {
      q: "¿Cuánto tarda la entrega?",
      a:
        product.deliveryMethod === "SMM"
          ? `El servicio inicia automáticamente al confirmar el pago. Tiempo estimado: ${product.deliveryEta.toLowerCase()}.`
          : product.deliveryMethod === "MANUAL"
            ? "Las keys manuales se entregan en 12–24 horas. Te avisamos por email cuando esté lista."
            : product.deliveryDelayed
              ? "La entrega suele demorar entre 12 y 24 horas. Te avisamos por email cuando tu clave esté lista."
              : "En la mayoría de los casos es inmediata: ves la clave en pantalla y también la recibes por email después del pago.",
    },
    {
      q: "¿Dónde veo mi pedido?",
      a: "En tu panel de cliente (/dashboard) y en el correo de confirmación. Ahí encontrarás la clave, el estado del servicio y el historial de la compra.",
    },
    {
      q: "¿Es seguro pagar en Nicodigos?",
      a: "Sí. Los pagos se procesan con Flow.cl (Webpay Plus, Redcompra, tarjetas, MACH, Khipu y transferencia). No almacenamos datos de tu tarjeta.",
    },
    {
      q: "¿Puedo pedir reembolso?",
      a: "Por la naturaleza digital del producto, no hay devolución una vez entregada y visualizada la clave. Si el código falla al activar y no podemos reemplazarlo, te reembolsamos el 100%.",
    },
    {
      q: isSmm
        ? "¿Qué pasa si el servicio no se completa?"
        : "¿Qué hago si la clave no activa?",
      a: isSmm
        ? "Abre un ticket desde tu pedido. Revisamos el caso con el proveedor y, si corresponde, reponemos el servicio o reembolsamos."
        : isKinguin
          ? "Contáctanos con el número de pedido. Validamos la clave con el proveedor y, si hay falla de origen, te enviamos un reemplazo o el reembolso."
          : "Escríbenos con tu número de pedido. Si hay un problema de activación de origen, te ayudamos con reemplazo o reembolso.",
    },
    {
      q: "¿Sirve para mi región o plataforma?",
      a: product.regionAvailabilityLabel || product.platform
        ? [
            product.platform ? `Plataforma: ${product.platform}.` : null,
            product.regionAvailabilityLabel
              ? `Disponibilidad: ${product.regionAvailabilityLabel}.`
              : null,
            product.regionalLimitations || null,
          ]
            .filter(Boolean)
            .join(" ")
        : "Revisa la sección de compatibilidad en esta página. Si tienes dudas antes de comprar, escríbenos por soporte.",
    },
  ];
}

export function StoreProductDetailSections({
  product,
}: StoreProductDetailSectionsProps) {
  const isSmm = product.deliveryMethod === "SMM";
  const isKinguin = product.deliveryMethod === "KINGUIN";
  const faqItems = buildFaqItems(product);

  const requirementCards: RequirementCard[] = [
    product.platform
      ? {
          icon: HiOutlineDesktopComputer,
          label: "Plataforma",
          value: product.platform,
        }
      : null,
    product.regionAvailabilityLabel
      ? {
          icon: HiOutlineGlobe,
          label: "Región",
          value: product.regionAvailabilityLabel,
        }
      : null,
    product.ageRating
      ? {
          icon: HiOutlineUserGroup,
          label: "Clasificación",
          value: product.ageRating,
        }
      : null,
    product.releaseDate
      ? {
          icon: HiOutlineCalendar,
          label: "Lanzamiento",
          value: new Date(product.releaseDate).toLocaleDateString("es-CL", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        }
      : null,
    product.genres.length > 0
      ? {
          icon: HiOutlineTag,
          label: "Géneros",
          value: product.genres.join(", "),
        }
      : null,
    product.languages.length > 0
      ? {
          icon: HiOutlineTranslate,
          label: "Idiomas",
          value: product.languages.join(", "),
        }
      : null,
  ].filter((card): card is RequirementCard => card != null);

  const hasRequirements =
    requirementCards.length > 0 || Boolean(product.regionalLimitations);

  const inclusionItems = isSmm
    ? [
        "Servicio SMM automatizado en la plataforma indicada",
        "Inicio del fulfillment tras confirmar el pago",
        "Seguimiento del pedido en tu panel de cliente",
        "Soporte en español si hay algún inconveniente",
      ]
    : isKinguin
      ? [
          "Clave digital (CD Key) para activar en la plataforma oficial",
          "Entrega por email y en tu panel de cliente",
          "Instrucciones de activación cuando estén disponibles",
          "Garantía de activación ante falla de origen",
        ]
      : [
          "Licencia o clave digital original",
          "Entrega inmediata tras el pago (cuando hay stock)",
          "Acceso al pedido desde tu cuenta",
          "Soporte para instalación o activación",
        ];

  return (
    <section aria-labelledby="product-details-heading">
      <h2 id="product-details-heading" className="sr-only">
        Detalles del producto
      </h2>

      <Accordion
        multiple
        className="w-full border-border/60 bg-transparent shadow-none"
        defaultValue={product.description ? ["description"] : ["includes"]}
      >
        {product.description ? (
          <AccordionItem value="description" className="border-border/50">
            <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
              Descripción
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {product.description}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="includes" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
            ¿Qué incluye?
          </AccordionTrigger>
          <AccordionContent>
            <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
              {inclusionItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {hasRequirements ? (
          <AccordionItem value="requirements" className="border-border/50">
            <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
              Compatibilidad
            </AccordionTrigger>
            <AccordionContent className="space-y-3">
              {requirementCards.length > 0 ? (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {requirementCards.map((card) => (
                    <RequirementInfoCard key={card.label} {...card} />
                  ))}
                </div>
              ) : null}
              {product.regionalLimitations ? (
                <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground ring-1 ring-border/50">
                    <HiOutlineExclamation className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                      Limitaciones
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {product.regionalLimitations}
                    </p>
                  </div>
                </div>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        {product.activationDetails ? (
          <AccordionItem value="activation" className="border-border/50">
            <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
              Cómo activar
            </AccordionTrigger>
            <AccordionContent className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {product.activationDetails}
            </AccordionContent>
          </AccordionItem>
        ) : null}

        <AccordionItem value="delivery" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
            Cómo funciona la entrega
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <ol className="list-decimal space-y-2.5 pl-4">
              <li>
                <span className="font-medium text-foreground">Pagas seguro:</span>{" "}
                eliges cantidad, completas los datos si aplica y pagas con Flow
                (Webpay, MACH y más).
              </li>
              <li>
                <span className="font-medium text-foreground">Procesamos:</span>{" "}
                {isSmm
                  ? "el servicio se envía al proveedor y suele comenzar en minutos a unas horas."
                  : product.deliveryMethod === "MANUAL" || product.deliveryDelayed
                    ? "validamos el pago y preparamos la entrega en un plazo de 12–24 horas."
                    : "validamos el pago y despachamos la clave de inmediato en la mayoría de los casos."}
              </li>
              <li>
                <span className="font-medium text-foreground">Recibes:</span>{" "}
                ves el resultado en pantalla, por email y en tu panel de cliente.
                Tiempo estimado: {product.deliveryEta.toLowerCase()}.
              </li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="guarantee" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
            Garantía y reembolsos
          </AccordionTrigger>
          <AccordionContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Los productos digitales no admiten devolución por desistimiento
              una vez entregados y visualizados.
            </p>
            <p>
              <span className="font-medium text-foreground">
                Garantía de activación:
              </span>{" "}
              si el código o servicio falla por causa de origen y no podemos
              darte una solución o reemplazo en un plazo razonable, reembolsamos
              el 100% del monto pagado.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="faq" className="border-border/50">
          <AccordionTrigger className="text-sm font-medium hover:no-underline hover:text-foreground">
            Preguntas frecuentes
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            {faqItems.map((item) => (
              <div key={item.q} className="space-y-1">
                <h3 className="text-sm font-medium text-foreground">{item.q}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}
