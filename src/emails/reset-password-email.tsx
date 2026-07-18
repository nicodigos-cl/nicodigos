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

type ResetPasswordEmailProps = {
  userName: string;
  url: string;
};

const brand = "#b91c3c";

export function ResetPasswordEmail({ userName, url }: ResetPasswordEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Restablece tu contraseña de Nicodigos</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos</Text>
          <Heading style={heading}>Restablecer contraseña</Heading>
          <Text style={text}>
            Hola {userName || "hola"}, recibimos una solicitud para cambiar la
            contraseña de tu cuenta. El enlace expira pronto por seguridad.
          </Text>
          <Section style={buttonSection}>
            <Button href={url} style={button}>
              Elegir nueva contraseña
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
            Si no pediste este cambio, ignora este correo. Tu contraseña no se
            modificará.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ResetPasswordEmail;

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
