/** Where authenticated users land after login / email verification. */
export const AUTH_HOME_PATH = "/dashboard";

export const AUTH_OTP_TYPES = [
  "email-verification",
  "forget-password",
  "sign-in",
] as const;

export type AuthOtpType = (typeof AUTH_OTP_TYPES)[number];

export const AUTH_OTP_LENGTH = 6;

export function isAuthOtpType(value: string | undefined | null): value is AuthOtpType {
  return AUTH_OTP_TYPES.includes(value as AuthOtpType);
}

export function getAppBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function buildAuthOtpPath({
  email,
  otp,
  type,
  from,
}: {
  email: string;
  otp?: string;
  type: AuthOtpType;
  from?: "login" | "register";
}) {
  const params = new URLSearchParams({
    email,
    type,
  });
  if (otp) params.set("otp", otp);
  if (from) params.set("from", from);
  return `/auth/otp?${params.toString()}`;
}

export function buildAuthOtpUrl(args: {
  email: string;
  otp: string;
  type: AuthOtpType;
  from?: "login" | "register";
}) {
  return `${getAppBaseUrl()}${buildAuthOtpPath(args)}`;
}

export function authOtpCopy(type: AuthOtpType) {
  switch (type) {
    case "forget-password":
      return {
        title: "Restablecer contraseña",
        description: "Ingresa el código que enviamos a tu correo.",
        confirmLabel: "Continuar",
        emailSubject: "Restablece tu contraseña — Nicodigos",
        emailHeading: "Restablecer contraseña",
        emailPreview: "Usa el código o el enlace para restablecer tu contraseña",
        emailCta: "Abrir restablecimiento",
        backHref: "/auth/login",
        backLabel: "Volver a iniciar sesión",
      };
    case "sign-in":
      return {
        title: "Iniciar sesión",
        description: "Ingresa el código que enviamos a tu correo.",
        confirmLabel: "Iniciar sesión",
        emailSubject: "Tu código de acceso — Nicodigos",
        emailHeading: "Inicia sesión",
        emailPreview: "Usa el código o el enlace para iniciar sesión",
        emailCta: "Iniciar sesión",
        backHref: "/auth/login",
        backLabel: "Volver a iniciar sesión",
      };
    case "email-verification":
    default:
      return {
        title: "Verifica tu correo",
        description: "Ingresa el código que enviamos a tu correo.",
        confirmLabel: "Verificar",
        emailSubject: "Verifica tu correo — Nicodigos",
        emailHeading: "Verifica tu correo",
        emailPreview: "Usa el código o el enlace para verificar tu cuenta",
        emailCta: "Verificar correo",
        backHref: "/auth/register",
        backLabel: "Volver a registrarse",
      };
  }
}
