"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineEye, HiOutlineEyeOff, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  completeManualDeliveryAction,
  revealDeliverySecretAction,
  saveManualDeliveryDraftAction,
} from "@/lib/actions/deliveries";
import {
  deliveryContentTypeLabel,
  deliveryContentTypeValues,
  type DeliveryContentType,
} from "@/lib/validations/deliveries";
import type {
  AvailableProductKeyDto,
  DeliveryDetailDto,
} from "@/types/deliveries";

type KeyDraft = {
  contentType: DeliveryContentType;
  label: string;
  serial: string;
  instructions: string;
  isSecret: boolean;
  productKeyId?: string;
};

type CredDraft = {
  contentType: DeliveryContentType;
  label: string;
  username: string;
  email: string;
  password: string;
  token: string;
  url: string;
  notes: string;
  instructions: string;
  isSecret: boolean;
};

const emptyKey = (): KeyDraft => ({
  contentType: "PRODUCT_KEY",
  label: "",
  serial: "",
  instructions: "",
  isSecret: true,
});

const emptyCred = (): CredDraft => ({
  contentType: "USERNAME_PASSWORD",
  label: "",
  username: "",
  email: "",
  password: "",
  token: "",
  url: "",
  notes: "",
  instructions: "",
  isSecret: true,
});

function SecretReveal({
  deliveryId,
  kind,
  itemId,
  field,
  masked,
}: {
  deliveryId: string;
  kind: "key" | "credential";
  itemId: string;
  field?: "serial" | "password" | "token";
  masked: string;
}) {
  const [value, setValue] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reveal() {
    if (value) {
      setValue(null);
      return;
    }
    startTransition(() => {
      void (async () => {
        const result = await revealDeliverySecretAction({
          deliveryId,
          kind,
          itemId,
          field,
        });
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        setValue(result.data.value);
      })();
    });
  }

  function copy() {
    const text = value ?? masked;
    void navigator.clipboard.writeText(text);
    toast.success(value ? "Copiado" : "Valor enmascarado copiado");
  }

  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-1 text-xs">
        {value ?? masked}
      </code>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={value ? "Ocultar" : "Revelar"}
        disabled={pending}
        onClick={reveal}
      >
        {value ? (
          <HiOutlineEyeOff className="size-4" />
        ) : (
          <HiOutlineEye className="size-4" />
        )}
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        Copiar
      </Button>
    </div>
  );
}

export function DeliveryManualForm({
  delivery,
  availableKeys,
}: {
  delivery: DeliveryDetailDto;
  availableKeys: AvailableProductKeyDto[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerMessage, setCustomerMessage] = useState(
    delivery.customerMessage ?? "",
  );
  const [keys, setKeys] = useState<KeyDraft[]>(
    delivery.keys.length === 0 ? [] : [],
  );
  const [credentials, setCredentials] = useState<CredDraft[]>([]);
  const [selectedInventory, setSelectedInventory] = useState<string[]>([]);
  const [autoAssign, setAutoAssign] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [allowUnpaid, setAllowUnpaid] = useState(false);

  function submit(mode: "draft" | "complete") {
    startTransition(() => {
      void (async () => {
        const payload = {
          deliveryId: delivery.id,
          customerMessage: customerMessage || undefined,
          keys: keys.filter((k) => k.serial.trim()),
          credentials: credentials.filter(
            (c) =>
              c.username ||
              c.email ||
              c.password ||
              c.token ||
              c.url ||
              c.notes,
          ),
          productKeyIds: selectedInventory,
          autoAssignKeys: autoAssign,
          replaceExisting,
          allowUnpaidOverride: allowUnpaid,
        };

        if (mode === "draft") {
          const result = await saveManualDeliveryDraftAction(payload);
          if (!result.success) {
            toast.error(result.message);
            return;
          }
          toast.success("Borrador guardado");
          router.refresh();
          return;
        }

        const result = await completeManualDeliveryAction(payload);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        if (result.data.emailError) {
          toast.warning(
            `Entrega guardada, pero el email falló: ${result.data.emailError}`,
          );
        } else {
          toast.success(
            result.data.emailSent
              ? "Entrega completada y email enviado"
              : "Entrega completada",
          );
        }
        router.refresh();
      })();
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Contenido ya entregado</h3>
        {delivery.keys.length === 0 && delivery.credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay contenido.</p>
        ) : (
          <ul className="space-y-3">
            {delivery.keys.map((key) => (
              <li
                key={key.id}
                className="rounded-xl border border-border p-3"
              >
                <p className="text-sm font-medium">
                  {key.label || deliveryContentTypeLabel[key.contentType]}
                </p>
                <div className="mt-2">
                  <SecretReveal
                    deliveryId={delivery.id}
                    kind="key"
                    itemId={key.id}
                    field="serial"
                    masked={key.serialMasked}
                  />
                </div>
                {key.instructions ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {key.instructions}
                  </p>
                ) : null}
              </li>
            ))}
            {delivery.credentials.map((cred) => (
              <li
                key={cred.id}
                className="space-y-2 rounded-xl border border-border p-3"
              >
                <p className="text-sm font-medium">
                  {cred.label || deliveryContentTypeLabel[cred.contentType]}
                </p>
                {cred.username ? (
                  <p className="text-sm">Usuario: {cred.username}</p>
                ) : null}
                {cred.email ? (
                  <p className="text-sm">Email: {cred.email}</p>
                ) : null}
                {cred.hasPassword ? (
                  <SecretReveal
                    deliveryId={delivery.id}
                    kind="credential"
                    itemId={cred.id}
                    field="password"
                    masked={cred.passwordMasked ?? "••••"}
                  />
                ) : null}
                {cred.hasToken ? (
                  <SecretReveal
                    deliveryId={delivery.id}
                    kind="credential"
                    itemId={cred.id}
                    field="token"
                    masked={cred.tokenMasked ?? "••••"}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {delivery.product.hasKeyInventory ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Inventario ProductKey</h3>
          <p className="text-xs text-muted-foreground">
            Cantidad del pedido: {delivery.product.quantity}. Disponibles:{" "}
            {availableKeys.length}.
          </p>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={autoAssign}
              onCheckedChange={(v) => setAutoAssign(v === true)}
            />
            Asignar automáticamente keys disponibles
          </label>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {availableKeys.map((key) => {
              const checked = selectedInventory.includes(key.id);
              return (
                <li key={key.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => {
                        setSelectedInventory((prev) =>
                          v === true
                            ? [...prev, key.id]
                            : prev.filter((id) => id !== key.id),
                        );
                      }}
                    />
                    <span className="font-mono text-xs">{key.codeMasked}</span>
                  </label>
                </li>
              );
            })}
            {availableKeys.length === 0 ? (
              <li className="px-2 py-1 text-sm text-muted-foreground">
                Sin keys disponibles.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Nuevas keys / códigos</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setKeys((prev) => [...prev, emptyKey()])}
          >
            <HiOutlinePlus className="size-4" />
            Agregar
          </Button>
        </div>
        {keys.map((key, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border p-3"
          >
            <div className="flex justify-between gap-2">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Select
                    value={key.contentType}
                    onValueChange={(value) => {
                      if (!value) return;
                      setKeys((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                contentType: value as DeliveryContentType,
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryContentTypeValues.map((type) => (
                        <SelectItem key={type} value={type}>
                          {deliveryContentTypeLabel[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`key-label-${index}`}>Etiqueta</Label>
                  <Input
                    id={`key-label-${index}`}
                    value={key.label}
                    onChange={(e) =>
                      setKeys((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, label: e.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Eliminar key"
                onClick={() =>
                  setKeys((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <HiOutlineTrash className="size-4" />
              </Button>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`key-serial-${index}`}>Valor</Label>
              <Input
                id={`key-serial-${index}`}
                value={key.serial}
                onChange={(e) =>
                  setKeys((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, serial: e.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`key-instructions-${index}`}>
                Instrucciones (opcional)
              </Label>
              <Textarea
                id={`key-instructions-${index}`}
                value={key.instructions}
                onChange={(e) =>
                  setKeys((prev) =>
                    prev.map((item, i) =>
                      i === index
                        ? { ...item, instructions: e.target.value }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={key.isSecret}
                onCheckedChange={(v) =>
                  setKeys((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, isSecret: v === true } : item,
                    ),
                  )
                }
              />
              Mostrar como secreto
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Credenciales / cuentas</h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setCredentials((prev) => [...prev, emptyCred()])}
          >
            <HiOutlinePlus className="size-4" />
            Agregar
          </Button>
        </div>
        {credentials.map((cred, index) => (
          <div
            key={index}
            className="space-y-3 rounded-xl border border-border p-3"
          >
            <div className="flex justify-end">
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label="Eliminar credencial"
                onClick={() =>
                  setCredentials((prev) => prev.filter((_, i) => i !== index))
                }
              >
                <HiOutlineTrash className="size-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`cred-user-${index}`}>Usuario</Label>
                <Input
                  id={`cred-user-${index}`}
                  value={cred.username}
                  onChange={(e) =>
                    setCredentials((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, username: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`cred-email-${index}`}>Email</Label>
                <Input
                  id={`cred-email-${index}`}
                  type="email"
                  value={cred.email}
                  onChange={(e) =>
                    setCredentials((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, email: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`cred-pass-${index}`}>Contraseña</Label>
                <Input
                  id={`cred-pass-${index}`}
                  type="password"
                  value={cred.password}
                  onChange={(e) =>
                    setCredentials((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, password: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`cred-token-${index}`}>Token</Label>
                <Input
                  id={`cred-token-${index}`}
                  value={cred.token}
                  onChange={(e) =>
                    setCredentials((prev) =>
                      prev.map((item, i) =>
                        i === index
                          ? { ...item, token: e.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cred-url-${index}`}>URL</Label>
              <Input
                id={`cred-url-${index}`}
                value={cred.url}
                onChange={(e) =>
                  setCredentials((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, url: e.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`cred-notes-${index}`}>Notas</Label>
              <Textarea
                id={`cred-notes-${index}`}
                value={cred.notes}
                onChange={(e) =>
                  setCredentials((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, notes: e.target.value } : item,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
      </section>

      <div className="space-y-1">
        <Label htmlFor="customer-message">Mensaje para el cliente</Label>
        <Textarea
          id="customer-message"
          value={customerMessage}
          onChange={(e) => setCustomerMessage(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={replaceExisting}
            onCheckedChange={(v) => setReplaceExisting(v === true)}
          />
          Reemplazar contenido ya guardado (requiere confirmación explícita)
        </label>
        {!delivery.order.isPaid ? (
          <label className="flex items-center gap-2 text-sm text-destructive">
            <Checkbox
              checked={allowUnpaid}
              onCheckedChange={(v) => setAllowUnpaid(v === true)}
            />
            Override: completar aunque el pedido no esté pagado (queda auditado)
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => submit("draft")}
        >
          {pending ? "Guardando..." : "Guardar borrador"}
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() => submit("complete")}
        >
          {pending ? "Completando..." : "Completar y enviar al cliente"}
        </Button>
      </div>
    </div>
  );
}
