import type { SettingsInitialData } from "@/lib/settings/types";

type BuildSettingsInput = {
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  role?: string | null;
  memberSince: string;
};

export function buildSettingsInitialState(
  input: BuildSettingsInput,
): SettingsInitialData {
  return {
    profile: {
      fullName: input.name,
      email: input.email,
      phone: "",
      image: input.image ?? null,
      language: "es",
      timezone: "America/Santiago",
    },
    identification: {
      identificationType: "RUT",
      identificationNumber: "",
      country: "CL",
      holderType: "person",
      companyName: "",
      companyTaxId: "",
    },
    addresses: [],
    notifications: {
      email: true,
      push: true,
      smsWhatsApp: false,
      productUpdates: true,
      orderUpdates: true,
      securityAlerts: true,
      marketing: false,
      newsletter: false,
      reminders: true,
    },
    privacy: {
      loginAlerts: true,
      twoFactorEnabled: false,
    },
    preferences: {
      theme: "system",
      language: "es",
      currency: "CLP",
      defaultCountry: "CL",
      contentDensity: "comfortable",
      emailFormat: "html",
      reducedMotion: false,
    },
    emailVerified: input.emailVerified,
    role: input.role,
    memberSince: input.memberSince,
  };
}
