"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HiOutlineArrowLeft,
  HiOutlinePlus,
  HiOutlineTrash,
} from "react-icons/hi";
import { toast } from "sonner";

import { createOrderAction } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/products/format";
import type { OrderProductOptionDto } from "@/types/orders";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";

type LineDraft = {
  key: string;
  productId: string;
  quantity: number;
};

type CreateOrderFormProps = {
  products: OrderProductOptionDto[];
};

export function CreateOrderForm({ products }: CreateOrderFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [createPaymentLink, setCreatePaymentLink] = useState(true);
  const [lines, setLines] = useState<LineDraft[]>([
    { key: crypto.randomUUID(), productId: products[0]?.id ?? "", quantity: 1 },
  ]);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const productMap = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  );

  const subtotal = lines.reduce((sum, line) => {
    const product = productMap.get(line.productId);
    if (!product) return sum;
    return sum + Number.parseFloat(product.price) * line.quantity;
  }, 0);

  const currency = productMap.get(lines[0]?.productId)?.currency ?? "CLP";

  function addLine() {
    setLines((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        productId: products[0]?.id ?? "",
        quantity: 1,
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((line) => line.key !== key),
    );
  }

  function submit() {
    startTransition(async () => {
      const result = await createOrderAction({
        email,
        customerName: customerName || undefined,
        items: lines
          .filter((line) => line.productId)
          .map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        createPaymentLink,
      });

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setCheckoutUrl(result.data.checkoutUrl);
      toast.success("Orden creada");
      if (result.data.checkoutUrl) {
        void navigator.clipboard.writeText(result.data.checkoutUrl);
        toast.message("Link de checkout copiado");
      }
      router.push(`/admin/orders/${result.data.id}`);
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          No hay productos activos. Crea o activa productos antes de generar una
          orden.
        </p>
        <Button
          className="mt-4"
          render={<Link href="/admin/products/new" />}
          nativeButton={false}
        >
          Ir a productos
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          render={<Link href="/admin/orders" />}
          nativeButton={false}
        >
          <HiOutlineArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Crear orden
          </h1>
          <p className="text-sm text-muted-foreground">
            Genera un pedido y un link de pago en Flow vía /checkout.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="email">Email del cliente</FieldLabel>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="cliente@email.com"
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="customerName">Nombre (opcional)</FieldLabel>
            <Input
              id="customerName"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Nombre del cliente"
            />
          </Field>
        </FieldGroup>

        <Separator className="my-6" />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium">Productos</h2>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <HiOutlinePlus className="size-4" />
              Añadir línea
            </Button>
          </div>

          <ul className="space-y-3">
            {lines.map((line) => {
              const product = productMap.get(line.productId);
              return (
                <li
                  key={line.key}
                  className="grid gap-3 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_7rem_auto]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {product?.coverImageUrl ? (
                      <Image
                        src={product.coverImageUrl}
                        alt=""
                        width={48}
                        height={48}
                        unoptimized
                        className="size-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="size-12 rounded-xl bg-muted" />
                    )}
                    <NativeSelect
                      className="w-full min-w-0 flex-1"
                      value={line.productId}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.key === line.key
                              ? { ...item, productId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      {products.map((option) => (
                        <NativeSelectOption key={option.id} value={option.id}>
                          {option.name} ·{" "}
                          {formatMoney(option.price, option.currency)}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </div>
                  <Field>
                    <FieldLabel className="sr-only">Cantidad</FieldLabel>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={line.quantity}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.key === line.key
                              ? {
                                  ...item,
                                  quantity: Math.max(
                                    1,
                                    Number.parseInt(event.target.value, 10) || 1,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Quitar línea"
                    onClick={() => removeLine(line.key)}
                  >
                    <HiOutlineTrash className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={createPaymentLink}
              onCheckedChange={(checked) =>
                setCreatePaymentLink(checked === true)
              }
            />
            <span>
              Crear link de pago Flow
              <FieldDescription className="mt-0.5">
                El cliente paga en <code>/checkout</code> y se redirige a Flow.
              </FieldDescription>
            </span>
          </label>
          <p className="text-right text-sm">
            Total{" "}
            <span className="text-base font-semibold tabular-nums">
              {formatMoney(subtotal, currency)}
            </span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button type="button" disabled={pending || !email} onClick={submit}>
            {pending ? "Creando…" : "Crear orden"}
          </Button>
          {checkoutUrl ? (
            <Button
              type="button"
              variant="outline"
              render={<Link href={checkoutUrl} target="_blank" />}
              nativeButton={false}
            >
              Abrir checkout
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
