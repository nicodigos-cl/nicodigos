"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/actions/types";
import { requireSession } from "@/lib/auth/session";
import { recordCommunicationAudit } from "@/lib/communications/audit";
import { hashProviderId } from "@/lib/communications/security";
import prisma from "@/lib/prisma";
import { preferenceSchema, pushSubscriptionStateSchema } from "@/lib/validations/communications";

function parse(input: unknown): unknown { if (!(input instanceof FormData)) return input; const payload = input.get("payload"); try { return typeof payload === "string" ? JSON.parse(payload) as unknown : null; } catch { return null; } }

export async function updateCommunicationPreferencesAction(rawInput: unknown): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession(); if (!session?.user) return { success: false, message: "Debes iniciar sesión." };
  const parsed = preferenceSchema.safeParse(parse(rawInput)); if (!parsed.success) return { success: false, message: "Revisa tus preferencias." };
  const previous = await prisma.communicationPreference.findUnique({ where: { userId: session.user.id }, select: { marketingEmail: true } });
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.communicationPreference.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, ...parsed.data, marketingConsentAt: parsed.data.marketingEmail ? now : null, marketingOptOutAt: parsed.data.marketingEmail ? null : now, consentSource: "customer-dashboard" }, update: { ...parsed.data, marketingConsentAt: parsed.data.marketingEmail && !previous?.marketingEmail ? now : undefined, marketingOptOutAt: !parsed.data.marketingEmail ? now : null, consentSource: "customer-dashboard" } });
    await recordCommunicationAudit({ actor: { userId: session.user.id, email: session.user.email }, action: "PREFERENCES_UPDATE", resourceType: "PREFERENCE", resourceId: session.user.id, safeMetadata: { marketingEmail: parsed.data.marketingEmail, webPushEnabled: parsed.data.webPushEnabled } }, tx);
  });
  revalidatePath("/dashboard/notifications"); revalidatePath("/admin/communications/audience"); return { success: true, data: { ok: true } };
}

export async function syncWebPushSubscriptionAction(rawInput: unknown): Promise<ActionResult<{ ok: true }>> {
  const session = await requireSession(); if (!session?.user) return { success: false, message: "Debes iniciar sesión." };
  const parsed = pushSubscriptionStateSchema.safeParse(parse(rawInput)); if (!parsed.success) return { success: false, message: "Estado de suscripción inválido." };
  const now = new Date(); const providerHash = parsed.data.subscriptionId ? hashProviderId(parsed.data.subscriptionId) : null;
  await prisma.$transaction(async (tx) => {
    if (providerHash) {
      await tx.webPushSubscription.upsert({ where: { providerSubscriptionHash: providerHash }, create: { userId: session.user.id, providerSubscriptionHash: providerHash, permissionStatus: parsed.data.permissionStatus, optedIn: parsed.data.optedIn, browser: parsed.data.browser, platform: parsed.data.platform, lastSeenAt: now, subscribedAt: parsed.data.optedIn ? now : null, unsubscribedAt: parsed.data.optedIn ? null : now }, update: { userId: session.user.id, permissionStatus: parsed.data.permissionStatus, optedIn: parsed.data.optedIn, browser: parsed.data.browser, platform: parsed.data.platform, lastSeenAt: now, subscribedAt: parsed.data.optedIn ? now : undefined, unsubscribedAt: parsed.data.optedIn ? null : now } });
    } else {
      await tx.webPushSubscription.updateMany({ where: { userId: session.user.id, optedIn: true }, data: { optedIn: false, permissionStatus: parsed.data.permissionStatus, unsubscribedAt: now, lastSeenAt: now } });
    }
    await tx.communicationPreference.upsert({ where: { userId: session.user.id }, create: { userId: session.user.id, webPushEnabled: parsed.data.optedIn }, update: { webPushEnabled: parsed.data.optedIn } });
    await recordCommunicationAudit({ actor: { userId: session.user.id, email: session.user.email }, action: parsed.data.optedIn ? "PUSH_SUBSCRIBE" : "PUSH_UNSUBSCRIBE", channel: "WEB_PUSH", resourceType: "SUBSCRIPTION", resourceId: providerHash ?? session.user.id, safeMetadata: { permissionStatus: parsed.data.permissionStatus } }, tx);
  });
  revalidatePath("/dashboard/notifications"); revalidatePath("/admin/communications/audience"); return { success: true, data: { ok: true } };
}
