import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type AdminOpsAlertEmailProps = {
  title: string;
  body: string;
  lines: string[];
  actionUrl: string;
  actionLabel: string;
};

const brand = "#b91c3c";

export function AdminOpsAlertEmail({
  title,
  body,
  lines,
  actionUrl,
  actionLabel,
}: AdminOpsAlertEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos Admin</Text>
          <Heading style={heading}>{title}</Heading>
          <Text style={text}>{body}</Text>
          <Section style={metaBox}>
            {lines.map((line) => (
              <Text key={line} style={metaLine}>
                {line}
              </Text>
            ))}
          </Section>
          <Section style={buttonSection}>
            <Button href={actionUrl} style={button}>
              {actionLabel}
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Alerta operativa · no incluye secretos.</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AdminOpsAlertEmail;

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
  maxWidth: "560px",
};

const brandMark = {
  color: brand,
  fontSize: "18px",
  fontWeight: 700,
  margin: "0 0 24px",
};

const heading = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: 700,
  margin: "0 0 12px",
};

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px",
};

const metaBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "12px",
  padding: "16px 18px",
  margin: "16px 0",
};

const metaLine = {
  color: "#374151",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0 0 8px",
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

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: 0,
};
