import "server-only";

import { getAdminEmailsFromEnv } from "@/lib/auth/admin-allowlist";
import { getAppBaseUrl, isFlowConfigured } from "@/lib/flow/client";
import prisma from "@/lib/prisma";
import { settingsHref } from "@/lib/settings/sections";
import { getStoreSettings } from "@/lib/settings/queries";
import type {
  AdminSettingsOverview,
  CronJobStatus,
  IntegrationStatusCard,
  SettingsHistoryItem,
  WebhookStatusCard,
} from "@/types/settings";

function maskSecret(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length < 8) return "••••";
  return `••••${trimmed.slice(-4).toUpperCase()}`;
}

function envConfigured(...keys: string[]): boolean {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

export async function getIntegrationStatuses(): Promise<
  IntegrationStatusCard[]
> {
  const settings = await getStoreSettings();
  const now = null;
  const baseUrl = getAppBaseUrl();
  const flowOk = isFlowConfigured();
  const resendOk = Boolean(process.env.RESEND_API_KEY?.trim());
  const kinguinOk = Boolean(process.env.KINGUIN_API_KEY?.trim());
  const r2Ok = envConfigured(
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
  );
  const redisOk = Boolean(process.env.REDIS_URL?.trim());
  const deliverySecretsOk = Boolean(process.env.DELIVERY_SECRETS_KEY?.trim());

  const smmDefault = await prisma.smmProvider.findFirst({
    where: { isDefault: true },
    select: {
      id: true,
      name: true,
      status: true,
      lastSyncedAt: true,
      lastError: true,
    },
  });

  const cards: IntegrationStatusCard[] = [
    {
      id: "flow",
      name: "Flow.cl",
      description: "Pagos con tarjeta y transferencia en Chile.",
      status: !settings.flowEnabled
        ? "disabled"
        : flowOk
          ? "configured"
          : "missing",
      environment:
        process.env.FLOW_ENVIRONMENT === "production"
          ? "production"
          : "sandbox",
      lastCheckedAt: now,
      error: flowOk
        ? null
        : "Faltan FLOW_API_KEY o FLOW_SECRET_KEY en el entorno.",
      detail: flowOk
        ? `API key ${maskSecret(process.env.FLOW_API_KEY)}`
        : null,
      configureHref: settingsHref("payments"),
      secretHint: flowOk ? maskSecret(process.env.FLOW_API_KEY) : null,
      editable: false,
    },
    {
      id: "resend",
      name: "Resend",
      description: "Envío de emails transaccionales y de autenticación.",
      status: !settings.resendEnabled
        ? "disabled"
        : resendOk
          ? "configured"
          : "missing",
      environment: null,
      lastCheckedAt: now,
      error: resendOk ? null : "Falta RESEND_API_KEY en el entorno.",
      detail: process.env.RESEND_FROM
        ? `Remitente: ${process.env.RESEND_FROM}`
        : "Remitente por defecto de Resend",
      configureHref: settingsHref("email"),
      secretHint: resendOk ? maskSecret(process.env.RESEND_API_KEY) : null,
      editable: false,
    },
    {
      id: "smm",
      name: smmDefault ? `SMM · ${smmDefault.name}` : "Proveedor SMM",
      description: "Panel SMM predeterminado para servicios sociales.",
      status: smmDefault
        ? smmDefault.status === "ERROR"
          ? "error"
          : smmDefault.status === "ACTIVE"
            ? "connected"
            : "configured"
        : "missing",
      environment: null,
      lastCheckedAt: smmDefault?.lastSyncedAt?.toISOString() ?? null,
      error: smmDefault?.lastError
        ? smmDefault.lastError.slice(0, 160)
        : smmDefault
          ? null
          : "No hay proveedor SMM predeterminado.",
      detail: smmDefault ? `Estado: ${smmDefault.status}` : null,
      configureHref: settingsHref("providers"),
      secretHint: null,
      editable: true,
    },
    {
      id: "kinguin",
      name: "Kinguin",
      description: "Catálogo y fulfillment de keys digitales.",
      status: kinguinOk ? "configured" : "missing",
      environment:
        process.env.KINGUIN_ENVIRONMENT === "production"
          ? "production"
          : "sandbox",
      lastCheckedAt: now,
      error: kinguinOk ? null : "Falta KINGUIN_API_KEY en el entorno.",
      detail: kinguinOk
        ? `API key ${maskSecret(process.env.KINGUIN_API_KEY)}`
        : null,
      configureHref: settingsHref("providers"),
      secretHint: kinguinOk ? maskSecret(process.env.KINGUIN_API_KEY) : null,
      editable: false,
    },
    {
      id: "base-url",
      name: "Base URL",
      description: "URL pública usada en callbacks y emails.",
      status: "configured",
      environment: null,
      lastCheckedAt: now,
      error: null,
      detail: baseUrl,
      configureHref: settingsHref("integrations"),
      secretHint: null,
      editable: false,
    },
    {
      id: "r2",
      name: "Almacenamiento R2",
      description: "Subida de imágenes de productos y categorías.",
      status: r2Ok ? "configured" : "missing",
      environment: null,
      lastCheckedAt: now,
      error: r2Ok ? null : "Faltan variables R2_* en el entorno.",
      detail: process.env.R2_PUBLIC_URL?.replace(/\/$/, "") ?? null,
      configureHref: settingsHref("integrations"),
      secretHint: null,
      editable: false,
    },
    {
      id: "redis",
      name: "Redis",
      description: "Caché de tipos de cambio USD/EUR → CLP.",
      status: redisOk ? "configured" : "missing",
      environment: null,
      lastCheckedAt: now,
      error: redisOk ? null : "Falta REDIS_URL (opcional en desarrollo).",
      detail: null,
      configureHref: settingsHref("integrations"),
      secretHint: null,
      editable: false,
    },
    {
      id: "delivery-secrets",
      name: "Cifrado de credenciales",
      description: "Protege contraseñas de entregas MANUAL.",
      status: deliverySecretsOk ? "configured" : "missing",
      environment: null,
      lastCheckedAt: now,
      error: deliverySecretsOk
        ? null
        : "Define DELIVERY_SECRETS_KEY para guardar credenciales.",
      detail: null,
      configureHref: settingsHref("security"),
      secretHint: null,
      editable: false,
    },
    {
      id: "deliveries-auto",
      name: "Entregas automáticas",
      description: "Creación de entregas al confirmar un pago.",
      status: settings.automaticDeliveryEnabled ? "connected" : "disabled",
      environment: null,
      lastCheckedAt: now,
      error: null,
      detail: settings.automaticDeliveryEnabled
        ? "Activas tras pago aprobado"
        : "Desactivadas",
      configureHref: settingsHref("deliveries"),
      secretHint: null,
      editable: true,
    },
    {
      id: "maintenance",
      name: "Modo mantenimiento",
      description: "Estado público de la tienda.",
      status:
        settings.storeStatus === "MAINTENANCE" ||
        settings.storeStatus === "CLOSED"
          ? "error"
          : settings.storeStatus === "READ_ONLY"
            ? "configured"
            : "connected",
      environment: null,
      lastCheckedAt: settings.updatedAt,
      error: null,
      detail: `Estado: ${settings.storeStatus}`,
      configureHref: settingsHref("maintenance"),
      secretHint: null,
      editable: true,
    },
  ];

  return cards;
}

export function getWebhookStatuses(): WebhookStatusCard[] {
  const base = getAppBaseUrl();
  return [
    {
      id: "flow-confirmation",
      name: "Flow · Confirmación de pago",
      publicUrl: `${base}/api/payments/flow/confirmation`,
      events: ["payment.confirmation"],
      signatureVerified: true,
      idempotent: true,
      notes: "Ruta fija en código. No editable desde el panel.",
    },
    {
      id: "flow-refund",
      name: "Flow · Callback de reembolso",
      publicUrl: `${base}/api/payments/flow/refund`,
      events: ["refund.status"],
      signatureVerified: true,
      idempotent: true,
      notes: "Ruta fija en código. No editable desde el panel.",
    },
  ];
}

export function getCronJobStatuses(): CronJobStatus[] {
  return [
    {
      id: "sync-smm",
      name: "Sincronización SMM",
      route: "/api/cron/sync-smm-services",
      configuredVia: "infrastructure",
      description: "Actualiza catálogo de servicios SMM.",
    },
    {
      id: "sync-kinguin",
      name: "Sincronización Kinguin",
      route: "/api/cron/sync-kinguin-products",
      configuredVia: "infrastructure",
      description: "Actualiza productos vinculados a Kinguin.",
    },
    {
      id: "cleanup-price-events",
      name: "Limpieza de eventos de precio",
      route: "/api/cron/cleanup-price-change-events",
      configuredVia: "infrastructure",
      description: "Elimina eventos antiguos de cambio de precio.",
    },
  ];
}

export async function getSettingsHistory(limit = 40): Promise<
  SettingsHistoryItem[]
> {
  const rows = await prisma.adminSettingsEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  return rows.map((row) => ({
    id: row.id,
    section: row.section,
    action: row.action,
    actorEmail: row.actorEmail,
    message: row.message,
    result: row.result,
    changes: Array.isArray(row.changes)
      ? (row.changes as SettingsHistoryItem["changes"])
      : null,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getAdminSettingsOverview(): Promise<AdminSettingsOverview> {
  const [settings, integrations, adminCount] = await Promise.all([
    getStoreSettings(),
    getIntegrationStatuses(),
    prisma.user.count({ where: { role: "ADMIN" } }),
  ]);

  const envAdmins = getAdminEmailsFromEnv();
  const pendingConfig = integrations
    .filter((item) => item.status === "missing")
    .map((item) => item.name);

  const warnings: string[] = [];
  if (!settings.checkoutEnabled) {
    warnings.push("El checkout está desactivado.");
  }
  if (!settings.flowEnabled) {
    warnings.push("Flow.cl está desactivado en ajustes.");
  }
  if (settings.storeStatus === "MAINTENANCE") {
    warnings.push("La tienda está en modo mantenimiento.");
  }
  if (!settings.emailPasswordReset || !settings.emailEmailVerification) {
    warnings.push("Hay emails críticos de autenticación desactivados.");
  }
  if (pendingConfig.length > 0) {
    warnings.push(
      `Configuración pendiente: ${pendingConfig.slice(0, 4).join(", ")}.`,
    );
  }

  return {
    settings,
    integrations,
    webhooks: getWebhookStatuses(),
    crons: getCronJobStatuses(),
    warnings,
    adminCount,
    envAdminCount: envAdmins.length,
    pendingConfig,
  };
}
