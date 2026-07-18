"use client";

import {
  SettingsField,
  SettingsFormShell,
  SettingsSectionHeader,
  SettingsSwitchRow,
  settingsInputClass,
  useDraft,
  useSettingsAction,
} from "@/components/admin/settings/settings-form-shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateStoreSettingsAction } from "@/lib/actions/admin-settings";
import type { StoreSettingsDto } from "@/types/settings";
import type { StoreStatus } from "@/generated/prisma/client";

type StoreDraft = Pick<
  StoreSettingsDto,
  | "version"
  | "storeStatus"
  | "showOutOfStock"
  | "allowPurchaseWithoutStock"
  | "pricesIncludeTax"
  | "minOrderAmount"
  | "maxOrderAmount"
  | "maxQuantityPerProduct"
  | "maxProductsPerOrder"
  | "supportVisible"
  | "availabilityMessage"
>;

const STORE_STATUS_LABELS: Record<StoreStatus, string> = {
  OPEN: "Abierta",
  READ_ONLY: "Solo lectura",
  MAINTENANCE: "Mantenimiento",
  CLOSED: "Cerrada",
};

function pickStore(settings: StoreSettingsDto): StoreDraft {
  return {
    version: settings.version,
    storeStatus: settings.storeStatus,
    showOutOfStock: settings.showOutOfStock,
    allowPurchaseWithoutStock: settings.allowPurchaseWithoutStock,
    pricesIncludeTax: settings.pricesIncludeTax,
    minOrderAmount: settings.minOrderAmount,
    maxOrderAmount: settings.maxOrderAmount,
    maxQuantityPerProduct: settings.maxQuantityPerProduct,
    maxProductsPerOrder: settings.maxProductsPerOrder,
    supportVisible: settings.supportVisible,
    availabilityMessage: settings.availabilityMessage,
  };
}

export function StoreSettingsForm({
  settings,
}: {
  settings: StoreSettingsDto;
}) {
  const initial = pickStore(settings);
  const { draft, setDraft, dirty } = useDraft(initial);
  const { pending, run } = useSettingsAction();

  return (
    <SettingsFormShell
      pending={pending}
      dirty={dirty}
      onSubmit={() => {
        run(
          () => updateStoreSettingsAction({ ...draft }),
          "Ajustes de tienda guardados",
        );
      }}
    >
      <SettingsSectionHeader
        title="Tienda"
        description="Visibilidad del catálogo, stock y límites de compra."
      />

      <SettingsField label="Estado de la tienda">
        <select
          className={settingsInputClass}
          value={draft.storeStatus}
          onChange={(event) =>
            setDraft({
              ...draft,
              storeStatus: event.currentTarget.value as StoreStatus,
            })
          }
        >
          {(Object.keys(STORE_STATUS_LABELS) as StoreStatus[]).map((status) => (
            <option key={status} value={status}>
              {STORE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </SettingsField>

      <SettingsSwitchRow
        label="Mostrar productos agotados"
        hint="Si está desactivado, los productos sin stock no aparecen en el catálogo."
        checked={draft.showOutOfStock}
        onCheckedChange={(value) =>
          setDraft({ ...draft, showOutOfStock: value })
        }
      />

      <SettingsSwitchRow
        label="Permitir compra sin stock"
        hint="Requiere mostrar productos agotados."
        checked={draft.allowPurchaseWithoutStock}
        onCheckedChange={(value) =>
          setDraft({ ...draft, allowPurchaseWithoutStock: value })
        }
      />

      <SettingsSwitchRow
        label="Precios incluyen impuestos"
        checked={draft.pricesIncludeTax}
        onCheckedChange={(value) =>
          setDraft({ ...draft, pricesIncludeTax: value })
        }
      />

      <SettingsSwitchRow
        label="Mostrar soporte en la tienda"
        checked={draft.supportVisible}
        onCheckedChange={(value) =>
          setDraft({ ...draft, supportVisible: value })
        }
      />

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <SettingsField label="Monto mínimo de pedido">
          <Input
            type="number"
            min={0}
            step="any"
            className={settingsInputClass}
            value={draft.minOrderAmount ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                minOrderAmount: value === "" ? null : Number(value),
              });
            }}
          />
        </SettingsField>

        <SettingsField label="Monto máximo de pedido">
          <Input
            type="number"
            min={0}
            step="any"
            className={settingsInputClass}
            value={draft.maxOrderAmount ?? ""}
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDraft({
                ...draft,
                maxOrderAmount: value === "" ? null : Number(value),
              });
            }}
          />
        </SettingsField>
      </div>

      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        <SettingsField label="Cantidad máxima por producto">
          <Input
            type="number"
            min={1}
            className={settingsInputClass}
            value={draft.maxQuantityPerProduct}
            onChange={(event) =>
              setDraft({
                ...draft,
                maxQuantityPerProduct: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>

        <SettingsField label="Productos máximos por pedido">
          <Input
            type="number"
            min={1}
            className={settingsInputClass}
            value={draft.maxProductsPerOrder}
            onChange={(event) =>
              setDraft({
                ...draft,
                maxProductsPerOrder: Number(event.currentTarget.value),
              })
            }
          />
        </SettingsField>
      </div>

      <SettingsField label="Mensaje de disponibilidad">
        <Textarea
          className="min-h-20 max-w-xl rounded-xl"
          value={draft.availabilityMessage ?? ""}
          onChange={(event) =>
            setDraft({
              ...draft,
              availabilityMessage: event.currentTarget.value || null,
            })
          }
        />
      </SettingsField>
    </SettingsFormShell>
  );
}
