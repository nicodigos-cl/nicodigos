import type {
  AccountHolderType as PrismaAccountHolderType,
  AddressType as PrismaAddressType,
  ContentDensity as PrismaContentDensity,
  EmailFormat as PrismaEmailFormat,
  IdentificationType as PrismaIdentificationType,
  ThemePreference as PrismaThemePreference,
  UserAddress as PrismaUserAddress,
  UserIdentification,
  UserPreferences,
  UserProfile,
} from "@/lib/generated/prisma/client";
import type {
  AccountHolderType,
  AddressType,
  AppPreferences,
  IdentificationSettings,
  IdentificationType,
  NotificationPreferences,
  PrivacySecuritySettings,
  ProfileSettings,
  UserAddress,
} from "@/lib/settings/types";

export function mapIdentificationTypeToPrisma(
  value: IdentificationType,
): PrismaIdentificationType {
  return value;
}

export function mapIdentificationTypeFromPrisma(
  value: PrismaIdentificationType,
): IdentificationType {
  return value;
}

export function mapHolderTypeToPrisma(
  value: AccountHolderType,
): PrismaAccountHolderType {
  return value === "company" ? "COMPANY" : "PERSON";
}

export function mapHolderTypeFromPrisma(
  value: PrismaAccountHolderType,
): AccountHolderType {
  return value === "COMPANY" ? "company" : "person";
}

export function mapAddressTypeToPrisma(value: AddressType): PrismaAddressType {
  return value === "shipping" ? "SHIPPING" : "BILLING";
}

export function mapAddressTypeFromPrisma(
  value: PrismaAddressType,
): AddressType {
  return value === "SHIPPING" ? "shipping" : "billing";
}

export function mapThemeToPrisma(
  value: AppPreferences["theme"],
): PrismaThemePreference {
  const map = { system: "SYSTEM", light: "LIGHT", dark: "DARK" } as const;
  return map[value];
}

export function mapThemeFromPrisma(
  value: PrismaThemePreference,
): AppPreferences["theme"] {
  const map = { SYSTEM: "system", LIGHT: "light", DARK: "dark" } as const;
  return map[value];
}

export function mapContentDensityToPrisma(
  value: AppPreferences["contentDensity"],
): PrismaContentDensity {
  return value === "compact" ? "COMPACT" : "COMFORTABLE";
}

export function mapContentDensityFromPrisma(
  value: PrismaContentDensity,
): AppPreferences["contentDensity"] {
  return value === "COMPACT" ? "compact" : "comfortable";
}

export function mapEmailFormatToPrisma(
  value: AppPreferences["emailFormat"],
): PrismaEmailFormat {
  return value === "plain" ? "PLAIN" : "HTML";
}

export function mapEmailFormatFromPrisma(
  value: PrismaEmailFormat,
): AppPreferences["emailFormat"] {
  return value === "PLAIN" ? "plain" : "html";
}

export function mapProfileFromUser(
  user: { name: string; email: string; image: string | null },
  profile: UserProfile | null,
): ProfileSettings {
  return {
    fullName: user.name,
    email: user.email,
    phone: profile?.phone ?? "",
    image: user.image,
    language: profile?.language ?? "es",
    timezone: profile?.timezone ?? "America/Santiago",
  };
}

export function mapIdentificationFromDb(
  row: UserIdentification | null,
): IdentificationSettings {
  return {
    identificationType: row?.identificationType ?? "RUT",
    identificationNumber: row?.identificationNumber ?? "",
    country: row?.country ?? "CL",
    holderType: mapHolderTypeFromPrisma(row?.holderType ?? "PERSON"),
    companyName: row?.companyName ?? "",
    companyTaxId: row?.companyTaxId ?? "",
  };
}

export function mapAddressFromDb(row: PrismaUserAddress): UserAddress {
  return {
    id: row.id,
    type: mapAddressTypeFromPrisma(row.type),
    label: row.label,
    country: row.country,
    region: row.region,
    city: row.city,
    commune: row.commune,
    street: row.street,
    unit: row.unit,
    postalCode: row.postalCode,
    isDefault: row.isDefault,
  };
}

export function mapNotificationsFromDb(
  row: UserPreferences | null,
): NotificationPreferences {
  return {
    email: row?.notifyEmail ?? true,
    push: row?.notifyPush ?? true,
    smsWhatsApp: row?.notifySmsWhatsApp ?? false,
    productUpdates: row?.notifyProductUpdates ?? true,
    orderUpdates: row?.notifyOrderUpdates ?? true,
    securityAlerts: row?.notifySecurityAlerts ?? true,
    marketing: row?.notifyMarketing ?? false,
    newsletter: row?.notifyNewsletter ?? false,
    reminders: row?.notifyReminders ?? true,
  };
}

export function mapPrivacyFromDb(
  row: UserPreferences | null,
): PrivacySecuritySettings {
  return {
    loginAlerts: row?.loginAlerts ?? true,
    twoFactorEnabled: row?.twoFactorEnabled ?? false,
  };
}

export function mapPreferencesFromDb(
  row: UserPreferences | null,
): AppPreferences {
  return {
    theme: mapThemeFromPrisma(row?.theme ?? "SYSTEM"),
    language: row?.language ?? "es",
    currency: row?.currency ?? "CLP",
    defaultCountry: row?.defaultCountry ?? "CL",
    contentDensity: mapContentDensityFromPrisma(
      row?.contentDensity ?? "COMFORTABLE",
    ),
    emailFormat: mapEmailFormatFromPrisma(row?.emailFormat ?? "HTML"),
    reducedMotion: row?.reducedMotion ?? false,
  };
}

export function isPersistableImageUrl(image: string | null): image is string {
  if (!image) return false;
  return image.startsWith("http://") || image.startsWith("https://");
}
