"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlinePlus, HiOutlineTrash, HiOutlineUser } from "react-icons/hi";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addProductAccountsAction,
  revokeProductAccountAction,
} from "@/lib/actions/products";
import { formatDateTime } from "@/lib/format-date";
import { productKeyStatusLabel } from "@/lib/products/status";
import type { ProductAccountsPageResult } from "@/types/products";

type ProductAccountsManagerProps = {
  productId: string;
  accountsPage: ProductAccountsPageResult;
};

export function ProductAccountsManager({
  productId,
  accountsPage,
}: ProductAccountsManagerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  function onAdd() {
    startTransition(async () => {
      const result = await addProductAccountsAction({
        productId,
        accounts: [{ username, email, password, url, label }],
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(`Se agregaron ${result.data.created} cuenta(s)`);
      setUsername("");
      setEmail("");
      setPassword("");
      setUrl("");
      setLabel("");
      router.refresh();
    });
  }

  function onRevoke(accountId: string) {
    startTransition(async () => {
      const result = await revokeProductAccountAction({ productId, accountId });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success("Cuenta revocada");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HiOutlineUser className="size-4" />
          Inventario de cuentas
        </CardTitle>
        <CardDescription>
          Credenciales para asignación automática (MANUAL). Las contraseñas se
          cifran al guardar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="account-label">Etiqueta</Label>
            <Input
              id="account-label"
              value={label}
              onChange={(e) => setLabel(e.currentTarget.value)}
              placeholder="Cuenta Steam"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-username">Usuario</Label>
            <Input
              id="account-username"
              value={username}
              onChange={(e) => setUsername(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-email">Email</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="account-password">Password</Label>
            <Input
              id="account-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="account-url">URL</Label>
            <Input
              id="account-url"
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <Button type="button" disabled={pending} onClick={onAdd}>
          <HiOutlinePlus className="size-4" />
          Agregar cuenta
        </Button>

        <div className="divide-y rounded-xl border">
          {accountsPage.items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Sin cuentas en inventario.
            </p>
          ) : (
            accountsPage.items.map((account) => (
              <div
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-2 p-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {account.label ||
                      account.username ||
                      account.email ||
                      account.url ||
                      account.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(account.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {productKeyStatusLabel(account.status)}
                  </Badge>
                  {account.canRevoke ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => onRevoke(account.id)}
                      aria-label="Revocar cuenta"
                    >
                      <HiOutlineTrash className="size-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
