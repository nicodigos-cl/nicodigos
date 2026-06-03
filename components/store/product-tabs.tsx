"use client";

import { IconBolt, IconHelp, IconLock, IconSettings, IconVideo } from "@tabler/icons-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface SystemRequirement {
  system: string;
  requirement: string[];
}

interface Video {
  id: string;
  title: string | null;
  youtubeVideoId: string;
}

interface ProductTabsProps {
  description: string | null;
  activationDetails: string | null;
  regionalLimitations: string | null;
  countryLimitations: string[];
  systemRequirements: SystemRequirement[];
  videos: Video[];
}

export function ProductDetailsTabs({
  description,
  activationDetails,
  regionalLimitations,
  countryLimitations,
  systemRequirements,
  videos,
}: ProductTabsProps) {
  // Determine the default active tab based on presence of items
  // Video is first if present, then Description, then Additional Info, then System Specs, then FAQ
  const hasVideos = videos.length > 0;
  const hasDescription = !!description;
  const hasInfo = !!activationDetails || !!regionalLimitations || countryLimitations.length > 0;
  const hasRequirements = systemRequirements.length > 0;

  const defaultTab = hasVideos
    ? "video"
    : hasDescription
    ? "description"
    : hasInfo
    ? "info"
    : hasRequirements
    ? "requirements"
    : "faq";

  return (
    <Tabs defaultValue={defaultTab} className="w-full space-y-6">
      {/* Scrollable Tabs Trigger List on Mobile */}
      <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
        <TabsList className="flex w-max sm:w-full items-center justify-start sm:justify-start bg-muted/40 p-1 border border-border/50 rounded-2xl backdrop-blur-md">
          {hasVideos && (
            <TabsTrigger value="video" className="px-4 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
              <IconVideo className="size-4" />
              Multimedia
            </TabsTrigger>
          )}
          {hasDescription && (
            <TabsTrigger value="description" className="px-4 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
              <IconBolt className="size-4" />
              Descripción
            </TabsTrigger>
          )}
          {hasInfo && (
            <TabsTrigger value="info" className="px-4 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
              <IconLock className="size-4" />
              Información Adicional
            </TabsTrigger>
          )}
          {hasRequirements && (
            <TabsTrigger value="requirements" className="px-4 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
              <IconSettings className="size-4" />
              Requisitos Mínimos
            </TabsTrigger>
          )}
          <TabsTrigger value="faq" className="px-4 py-2 font-bold text-xs sm:text-sm flex items-center gap-1.5 rounded-xl">
            <IconHelp className="size-4" />
            Preguntas Frecuentes
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Tab Contents */}
      {hasVideos && (
        <TabsContent value="video" className="space-y-6 outline-none focus:outline-none">
          <div className="grid gap-6 md:grid-cols-2">
            {videos.map((video) => (
              <div key={video.id} className="space-y-3 group">
                {video.title ? (
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {video.title}
                  </p>
                ) : null}
                <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-muted shadow-md group-hover:shadow-lg transition-shadow duration-300">
                  <iframe
                    title={video.title ?? "Tráiler del producto"}
                    src={`https://www.youtube.com/embed/${video.youtubeVideoId}`}
                    className="h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      )}

      {hasDescription && (
        <TabsContent value="description" className="outline-none focus:outline-none">
          <div
            className="product-description max-w-none text-sm leading-relaxed text-muted-foreground/90 bg-card/40 border border-border/50 rounded-2xl p-6 sm:p-8 [&_h2]:mb-2.5 [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_li]:mb-1.5 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 shadow-sm"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        </TabsContent>
      )}

      {hasInfo && (
        <TabsContent value="info" className="space-y-6 outline-none focus:outline-none">
          {activationDetails && (
            <div className="space-y-3">
              <h3 className="font-heading text-lg font-bold text-foreground">Instrucciones de Activación</h3>
              <div className="text-sm leading-relaxed text-muted-foreground/90 whitespace-pre-line bg-card/40 border border-border/50 rounded-2xl p-6 sm:p-8 shadow-sm">
                {activationDetails}
              </div>
            </div>
          )}

          {(regionalLimitations || countryLimitations.length > 0) && (
            <div className="space-y-3">
              <h3 className="font-heading text-lg font-bold text-rose-500">Restricciones Regionales</h3>
              <div className="text-sm leading-relaxed text-rose-500/90 bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 sm:p-8 space-y-3 shadow-sm">
                {regionalLimitations && <p>{regionalLimitations}</p>}
                {countryLimitations.length > 0 && (
                  <p className="font-medium text-foreground">
                    Países permitidos: <span className="font-bold">{countryLimitations.join(", ")}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      )}

      {hasRequirements && (
        <TabsContent value="requirements" className="outline-none focus:outline-none">
          <div className="grid gap-6 md:grid-cols-2">
            {systemRequirements.map((block) => (
              <Card key={block.system} className="glass-card border-border/80 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-extrabold text-foreground">
                    {block.system}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc space-y-2 pl-5 text-xs sm:text-sm text-muted-foreground">
                    {block.requirement.map((line) => (
                      <li key={line} className="leading-relaxed">{line}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      )}

      <TabsContent value="faq" className="outline-none focus:outline-none">
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="font-heading text-lg font-bold text-foreground mb-4">Preguntas Frecuentes sobre Activación</h3>
          <Accordion type="single" collapsible className="w-full bg-card/40 border border-border/60 rounded-2xl shadow-sm">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm font-bold text-foreground">¿Cómo recibiré mi código de producto?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Recibirás tu clave oficial o instrucciones detalladas de activación de forma digital e instantánea tanto en tu correo electrónico de compra como en la sección &quot;Mis Pedidos&quot; en tu cuenta de usuario, inmediatamente después de que el pago sea procesado.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm font-bold text-foreground">¿El pago mediante Flow es seguro?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Sí. Procesamos todas nuestras transacciones de manera 100% segura mediante Flow, que es la pasarela de pagos líder en Chile. Puedes pagar usando Webpay Plus (Crédito/Débito), MACH, Khipu, OnePay, Servipac o transferencias bancarias directas.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-sm font-bold text-foreground">¿Qué hago si tengo un problema con mi código?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Contamos con un equipo de soporte técnico disponible. Si tienes problemas al activar tu código, puedes escribirnos de inmediato mediante nuestro formulario de soporte y un ejecutivo te guiará o reemplazará el código si corresponde.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger className="text-sm font-bold text-foreground">¿Puedo solicitar la devolución de mi dinero?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Debido a la naturaleza de los productos digitales que se entregan de forma inmediata y automática, no es posible efectuar cambios ni reembolsos una vez que el código de activación ha sido revelado o visualizado en tu perfil, excepto si el código presenta fallas de origen comprobadas.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </TabsContent>
    </Tabs>
  );
}
