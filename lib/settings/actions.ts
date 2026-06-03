"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  isPersistableImageUrl,
  mapAddressTypeToPrisma,
  mapContentDensityToPrisma,
  mapEmailFormatToPrisma,
  mapHolderTypeToPrisma,
  mapIdentificationTypeToPrisma,
  mapThemeToPrisma,
} from "@/lib/settings/mappers";
import { getUserSettings } from "@/lib/settings/queries";
import {
  appPreferencesSchema,
  identificationSettingsSchema,
  notificationPreferencesSchema,
  privacySecuritySettingsSchema,
  profileSettingsSchema,
  userAddressSchema,
} from "@/lib/settings/schemas";
import type {
  AppPreferences,
  IdentificationSettings,
  NotificationPreferences,
  PrivacySecuritySettings,
  ProfileSettings,
  UserAddress,
} from "@/lib/settings/types";
import { requireSessionUserId } from "@/lib/settings/actions-shared";
import {
  parseZodErrors,
  settingsValidationError,
  type SettingsActionResult,
} from "@/lib/settings/result";

export type { SettingsActionResult } from "@/lib/settings/result";

function getAuthBaseUrl(): string {
  return process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
}

async function finishSection(
  userId: string,
  message?: string,
): Promise<SettingsActionResult> {
  const data = await getUserSettings(userId);
  return { success: true, data, message };
}

export async function saveProfileSettingsAction(
  input: ProfileSettings,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = profileSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;
  const currentUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, image: true },
  });

  const emailChanged =
    data.email.toLowerCase() !== currentUser.email.toLowerCase();
  let emailMessage: string | undefined;

  const imageToSave = isPersistableImageUrl(data.image)
    ? data.image
    : currentUser.image;

  try {
    await auth.api.updateUser({
      headers: await headers(),
      body: {
        name: data.fullName,
        image: imageToSave,
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudo actualizar el perfil de autenticación.",
    };
  }

  if (emailChanged) {
    try {
      await auth.api.changeEmail({
        headers: await headers(),
        body: {
          newEmail: data.email,
          callbackURL: `${getAuthBaseUrl()}/dashboard/settings?emailChanged=1`,
        },
      });
      emailMessage =
        "Te enviamos correos de verificación al nuevo email y a tu correo actual para confirmar el cambio.";
    } catch {
      return {
        success: false,
        error: "No se pudo iniciar el cambio de correo. Inténtalo más tarde.",
        fieldErrors: {
          email: ["No se pudo procesar el cambio de correo."],
        },
      };
    }
  }

  try {
    await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        phone: data.phone ?? "",
        language: data.language,
        timezone: data.timezone,
      },
      update: {
        phone: data.phone ?? "",
        language: data.language,
        timezone: data.timezone,
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar los datos de perfil.",
    };
  }

  return finishSection(userId, emailMessage);
}

export async function saveIdentificationSettingsAction(
  input: IdentificationSettings,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = identificationSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;

  try {
    await prisma.userIdentification.upsert({
      where: { userId },
      create: {
        userId,
        identificationType: mapIdentificationTypeToPrisma(
          data.identificationType,
        ),
        identificationNumber: data.identificationNumber ?? "",
        country: data.country,
        holderType: mapHolderTypeToPrisma(data.holderType),
        companyName: data.companyName ?? "",
        companyTaxId: data.companyTaxId ?? "",
      },
      update: {
        identificationType: mapIdentificationTypeToPrisma(
          data.identificationType,
        ),
        identificationNumber: data.identificationNumber ?? "",
        country: data.country,
        holderType: mapHolderTypeToPrisma(data.holderType),
        companyName: data.companyName ?? "",
        companyTaxId: data.companyTaxId ?? "",
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar los datos de identificación.",
    };
  }

  return finishSection(userId);
}

export async function saveAddressesSettingsAction(
  addresses: UserAddress[],
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = userAddressSchema.array().safeParse(addresses);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;
  const defaultAddressId =
    data.find((a) => a.isDefault)?.id ?? data[0]?.id ?? null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.userAddress.deleteMany({ where: { userId } });

      if (data.length > 0) {
        await tx.userAddress.createMany({
          data: data.map((address) => ({
            id: address.id,
            userId,
            type: mapAddressTypeToPrisma(address.type),
            label: address.label,
            country: address.country,
            region: address.region ?? "",
            city: address.city ?? "",
            commune: address.commune ?? "",
            street: address.street ?? "",
            unit: address.unit ?? "",
            postalCode: address.postalCode ?? "",
            isDefault: address.id === defaultAddressId,
          })),
        });
      }
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar las direcciones.",
    };
  }

  return finishSection(userId);
}

export async function saveNotificationPreferencesAction(
  input: NotificationPreferences,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = notificationPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;

  try {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        notifyEmail: data.email,
        notifyPush: data.push,
        notifySmsWhatsApp: data.smsWhatsApp,
        notifyProductUpdates: data.productUpdates,
        notifyOrderUpdates: data.orderUpdates,
        notifySecurityAlerts: data.securityAlerts,
        notifyMarketing: data.marketing,
        notifyNewsletter: data.newsletter,
        notifyReminders: data.reminders,
      },
      update: {
        notifyEmail: data.email,
        notifyPush: data.push,
        notifySmsWhatsApp: data.smsWhatsApp,
        notifyProductUpdates: data.productUpdates,
        notifyOrderUpdates: data.orderUpdates,
        notifySecurityAlerts: data.securityAlerts,
        notifyMarketing: data.marketing,
        notifyNewsletter: data.newsletter,
        notifyReminders: data.reminders,
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar las preferencias de notificación.",
    };
  }

  return finishSection(userId);
}

export async function savePrivacySecuritySettingsAction(
  input: PrivacySecuritySettings,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = privacySecuritySettingsSchema.safeParse(input);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;

  try {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        loginAlerts: data.loginAlerts,
        twoFactorEnabled: data.twoFactorEnabled,
      },
      update: {
        loginAlerts: data.loginAlerts,
        twoFactorEnabled: data.twoFactorEnabled,
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar los ajustes de privacidad.",
    };
  }

  return finishSection(userId);
}

export async function saveAppPreferencesAction(
  input: AppPreferences,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();
  const parsed = appPreferencesSchema.safeParse(input);

  if (!parsed.success) {
    return settingsValidationError(parseZodErrors(parsed.error.issues));
  }

  const data = parsed.data;

  try {
    await prisma.userPreferences.upsert({
      where: { userId },
      create: {
        userId,
        theme: mapThemeToPrisma(data.theme),
        language: data.language,
        currency: data.currency,
        defaultCountry: data.defaultCountry,
        contentDensity: mapContentDensityToPrisma(data.contentDensity),
        emailFormat: mapEmailFormatToPrisma(data.emailFormat),
        reducedMotion: data.reducedMotion,
      },
      update: {
        theme: mapThemeToPrisma(data.theme),
        language: data.language,
        currency: data.currency,
        defaultCountry: data.defaultCountry,
        contentDensity: mapContentDensityToPrisma(data.contentDensity),
        emailFormat: mapEmailFormatToPrisma(data.emailFormat),
        reducedMotion: data.reducedMotion,
      },
    });
  } catch {
    return {
      success: false,
      error: "No se pudieron guardar las preferencias.",
    };
  }

  return finishSection(userId);
}

export async function deleteUserAccountAction(
  confirmEmail: string,
): Promise<SettingsActionResult> {
  const userId = await requireSessionUserId();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true },
  });

  if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase()) {
    return {
      success: false,
      error: "El correo de confirmación no coincide con tu cuenta.",
      fieldErrors: {
        confirmEmail: ["Debe coincidir exactamente con tu correo registrado."],
      },
    };
  }

  try {
    await auth.api.deleteUser({
      headers: await headers(),
      body: {},
    });
  } catch {
    return {
      success: false,
      error: "No se pudo eliminar la cuenta. Inténtalo más tarde.",
    };
  }

  redirect("/");
}
