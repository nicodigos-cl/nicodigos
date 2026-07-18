import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { AuthOtpType } from "@/lib/auth/otp";
import { authOtpCopy } from "@/lib/auth/otp";

type AuthOtpEmailProps = {
  userName?: string;
  email: string;
  otp: string;
  url: string;
  type: AuthOtpType;
};

const brand = "#b91c3c";

export function AuthOtpEmail({
  userName,
  email,
  otp,
  url,
  type,
}: AuthOtpEmailProps) {
  const copy = authOtpCopy(type);
  const greeting = userName?.trim() || "hola";

  const intro =
    type === "forget-password"
      ? `Hola ${greeting}, recibimos una solicitud para cambiar la contraseña de ${email}. Puedes usar el código o el botón; el acceso expira pronto por seguridad.`
      : type === "sign-in"
        ? `Hola ${greeting}, usa el código o el enlace para iniciar sesión en Nicodigos.`
        : `Hola ${greeting}, confirma ${email} para activar tu cuenta. Puedes usar el código o el botón.`;

  return (
    <Html lang="es">
      <Head />
      <Preview>{copy.emailPreview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos</Text>
          <Heading style={heading}>{copy.emailHeading}</Heading>
          <Text style={text}>{intro}</Text>

          <Section style={otpSection}>
            <Text style={otpLabel}>Tu código</Text>
            <Text style={otpCode}>{otp}</Text>
          </Section>

          <Section style={buttonSection}>
            <Button href={url} style={button}>
              {copy.emailCta}
            </Button>
          </Section>

          <Text style={textMuted}>
            Si el botón no funciona, copia y pega este enlace en tu navegador:
          </Text>
          <Link href={url} style={link}>
            {url}
          </Link>
          <Hr style={hr} />
          <Text style={footer}>
            {type === "forget-password"
              ? "Si no pediste este cambio, ignora este correo. Tu contraseña no se modificará."
              : "Si no solicitaste este correo, puedes ignorarlo."}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AuthOtpEmail;

const main = {
  backgroundColor: "#f7f8fa",
  fontFamily:
    'Public Sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "32px 28px",
  borderRadius: "16px",
  maxWidth: "480px",
};

const brandMark = {
  color: brand,
  fontSize: "20px",
  fontWeight: 700,
  letterSpacing: "-0.02em",
  margin: "0 0 24px",
};

const heading = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: 700,
  lineHeight: "1.3",
  margin: "0 0 12px",
};

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

const textMuted = {
  ...text,
  color: "#6b7280",
  fontSize: "13px",
};

const otpSection = {
  backgroundColor: "#f3f4f6",
  borderRadius: "12px",
  margin: "24px 0",
  padding: "20px 16px",
  textAlign: "center" as const,
};

const otpLabel = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  margin: "0 0 8px",
  textTransform: "uppercase" as const,
};

const otpCode = {
  color: "#111827",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: "32px",
  fontWeight: 700,
  letterSpacing: "0.35em",
  margin: 0,
};

const buttonSection = {
  margin: "28px 0",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: brand,
  borderRadius: "999px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 600,
  padding: "12px 24px",
  textDecoration: "none",
};

const link = {
  color: brand,
  fontSize: "12px",
  lineHeight: "1.5",
  wordBreak: "break-all" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "28px 0 16px",
};

const footer = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: 0,
};
