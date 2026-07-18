"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { createSupportRequestAction } from "@/lib/actions/customer-dashboard";

const SUPPORT_EMAIL = "soporte@nicodigos.com";

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
  const [selectedCategory, setSelectedCategory] = useState(
    category ?? "other",
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Canales</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Escríbenos a{" "}
          <a
            className="text-primary hover:underline"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
            {SUPPORT_EMAIL}
          </a>
          . También puedes enviar el formulario a continuación.
        </p>
      </section>

      <form
        className="space-y-4 rounded-2xl border border-border bg-card p-4 sm:p-6"
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
        <h2 className="font-heading text-lg font-semibold">Enviar solicitud</h2>
        {(orderId || deliveryId) && (
          <p className="text-sm text-muted-foreground">
            {orderId ? `Pedido vinculado. ` : null}
            {deliveryId ? `Entrega vinculada.` : null}
          </p>
        )}
        <div className="space-y-1">
          <Label htmlFor="category">Categoría</Label>
          <NativeSelect
            id="category"
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            disabled={pending}
          >
            <NativeSelectOption value="payment">Pago</NativeSelectOption>
            <NativeSelectOption value="delivery">Entrega</NativeSelectOption>
            <NativeSelectOption value="smm">Servicio SMM</NativeSelectOption>
            <NativeSelectOption value="account">Cuenta</NativeSelectOption>
            <NativeSelectOption value="billing">Facturación</NativeSelectOption>
            <NativeSelectOption value="other">Otro</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="space-y-1">
          <Label htmlFor="subject">Asunto</Label>
          <Input
            id="subject"
            required
            minLength={3}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            required
            minLength={10}
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={pending}
            placeholder="Describe el problema sin incluir keys ni contraseñas."
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar"}
        </Button>
      </form>

      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold">Preguntas frecuentes</h2>
        <ul className="mt-3 space-y-3 text-sm">
          <li>
            <p className="font-medium">¿Dónde está mi key o cuenta?</p>
            <p className="text-muted-foreground">
              Abre Mis entregas y revisa las entregas disponibles. El contenido
              sensible se revela solo al abrirlo.
            </p>
          </li>
          <li>
            <p className="font-medium">¿Mi pago fue aprobado?</p>
            <p className="text-muted-foreground">
              Revisa el pedido o la sección de transacciones. Si aparece
              pendiente, puedes reintentar el pago.
            </p>
          </li>
          <li>
            <p className="font-medium">¿Cómo avanzo un servicio SMM?</p>
            <p className="text-muted-foreground">
              Si pedimos un enlace de destino, complétalo en el detalle de la
              entrega.
            </p>
          </li>
        </ul>
      </section>
    </div>
  );
}
