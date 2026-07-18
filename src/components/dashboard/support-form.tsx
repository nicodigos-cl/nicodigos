"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  HiOutlineMail,
  HiOutlinePaperAirplane,
  HiOutlineQuestionMarkCircle,
} from "react-icons/hi";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSupportRequestAction } from "@/lib/actions/customer-dashboard";
import { formatCustomerOrderNumber } from "@/lib/customer-dashboard/format";

const SUPPORT_EMAIL = "soporte@nicodigos.cl";

export function SupportForm({
  orderId,
  deliveryId,
  category,
}: {
  orderId?: string;
  deliveryId?: string;
  category?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category ?? "other");

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6 sm:flex-row sm:items-center sm:gap-6">
        <div className="rounded-xl bg-primary/10 p-3 text-primary shrink-0 self-start sm:self-center">
          <HiOutlineMail className="size-6" />
        </div>
        <div className="space-y-1">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Canales de contacto
          </h2>
          <p className="text-sm text-muted-foreground">
            Escríbenos directamente a{" "}
            <a
              className="font-semibold text-primary hover:underline"
              href={`mailto:${SUPPORT_EMAIL}`}
            >
              {SUPPORT_EMAIL}
            </a>{" "}
            o completa el formulario a continuación para abrir un ticket.
          </p>
        </div>
      </section>

      <form
        className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(() => {
            void (async () => {
              const result = await createSupportRequestAction({
                subject,
                message,
                orderId,
                deliveryId,
                category: selectedCategory,
              });
              if (!result.success) {
                toast.error(result.message);
                return;
              }
              toast.success("Solicitud enviada");
              setSubject("");
              setMessage("");
              router.refresh();
            })();
          });
        }}
      >
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Enviar una solicitud
          </h2>
        </div>
        {(orderId || deliveryId) && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex flex-wrap gap-2">
            {orderId && (
              <span>
                Pedido vinculado:{" "}
                <span className="font-mono font-semibold text-foreground">
                  #{formatCustomerOrderNumber(orderId)}
                </span>
              </span>
            )}
            {orderId && deliveryId && <span>•</span>}
            {deliveryId && (
              <span>
                Entrega vinculada:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {deliveryId}
                </span>
              </span>
            )}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-1">
            <Label
              htmlFor="category"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Categoría
            </Label>
            <NativeSelect
              id="category"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
              disabled={pending}
              className="h-10"
            >
              <NativeSelectOption value="payment">
                Problema con el pago
              </NativeSelectOption>
              <NativeSelectOption value="delivery">
                No recibí mi entrega
              </NativeSelectOption>
              <NativeSelectOption value="key">
                Problema con una key
              </NativeSelectOption>
              <NativeSelectOption value="smm">
                Problema con un servicio SMM
              </NativeSelectOption>
              <NativeSelectOption value="refund">
                Solicitud de reembolso
              </NativeSelectOption>
              <NativeSelectOption value="account">Cuenta</NativeSelectOption>
              <NativeSelectOption value="billing">
                Facturación
              </NativeSelectOption>
              <NativeSelectOption value="other">Otro</NativeSelectOption>
            </NativeSelect>
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label
              htmlFor="subject"
              className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
            >
              Asunto
            </Label>
            <Input
              id="subject"
              required
              minLength={3}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={pending}
              placeholder="Ej: Problema con activación de clave"
              className="h-10"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label
            htmlFor="message"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Mensaje
          </Label>
          <Textarea
            id="message"
            required
            minLength={10}
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={pending}
            placeholder="Describe el problema en detalle. Por favor, no incluyas claves, tokens ni contraseñas en este texto por motivos de seguridad."
            className="resize-none"
          />
        </div>
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto gap-2 font-medium"
          >
            <HiOutlinePaperAirplane className="size-4 rotate-90" />
            <span>{pending ? "Enviando…" : "Enviar ticket"}</span>
          </Button>
        </div>
      </form>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <HiOutlineQuestionMarkCircle className="size-5 text-muted-foreground" />
          <h2 className="font-heading text-lg font-bold text-foreground">
            Preguntas frecuentes
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 pt-1">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm text-foreground">
              ¿Dónde está mi key o cuenta?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Abre la pestaña{" "}
              <span className="font-medium text-foreground">Mis entregas</span>.
              El contenido sensible como claves y usuarios se mantiene cifrado y
              oculto hasta que decidas revelarlo y copiarlo de forma segura.
            </p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm text-foreground">
              ¿Mi pago fue aprobado?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Revisa el estado de la transacción en la pestaña de{" "}
              <span className="font-medium text-foreground">Transacciones</span>
              . Si tu pago falló o está pendiente, verás una alerta para poder
              reintentar la compra de inmediato.
            </p>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <h3 className="font-semibold text-sm text-foreground">
              ¿Cómo avanzo un servicio SMM?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Para los servicios de redes sociales (SMM), es necesario que
              configures la URL de destino. Puedes ingresar este enlace
              ingresando a los detalles de la entrega en tu panel de control.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
