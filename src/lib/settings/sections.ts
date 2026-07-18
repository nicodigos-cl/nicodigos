export const SETTINGS_SECTIONS = [
  "overview",
  "general",
  "store",
  "checkout",
  "payments",
  "deliveries",
  "email",
  "providers",
  "security",
  "integrations",
  "maintenance",
] as const;

export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

export const SETTINGS_SECTION_META: Record<
  SettingsSection,
  { title: string; description: string }
> = {
  overview: {
    title: "Ajustes",
    description: "Configura el funcionamiento operativo de Nicodigos.",
  },
  general: {
    title: "General",
    description: "Identidad, marca, moneda y localización de la tienda.",
  },
  store: {
    title: "Tienda",
    description: "Visibilidad del catálogo, stock y límites de compra.",
  },
  checkout: {
    title: "Checkout",
    description: "Requisitos de compra, términos y expiración de pedidos.",
  },
  payments: {
    title: "Pagos",
    description: "Flow.cl, montos, moneda y validaciones de cobro.",
  },
  deliveries: {
    title: "Entregas",
    description: "Keys, cuentas, SMM y revelación de credenciales.",
  },
  email: {
    title: "Correos",
    description: "Resend, remitente y emails transaccionales.",
  },
  providers: {
    title: "Proveedores",
    description: "Estado de SMM, Kinguin y proveedores vinculados.",
  },
  security: {
    title: "Seguridad",
    description: "Sesiones, administradores y políticas de acceso.",
  },
  integrations: {
    title: "Integraciones",
    description: "Flow, Resend, webhooks, crons y servicios externos.",
  },
  maintenance: {
    title: "Mantenimiento",
    description: "Modo mantenimiento, límites y notificaciones del equipo.",
  },
};

export function parseSettingsSection(
  value: string | string[] | undefined,
): SettingsSection {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    raw &&
    (SETTINGS_SECTIONS as readonly string[]).includes(raw)
  ) {
    return raw as SettingsSection;
  }
  return "overview";
}

export function settingsHref(section: SettingsSection = "overview"): string {
  if (section === "overview") return "/admin/settings";
  return `/admin/settings?section=${section}`;
}
