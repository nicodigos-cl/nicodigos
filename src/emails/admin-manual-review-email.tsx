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

type AdminManualReviewEmailProps = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  orderItemId: string;
  provider: string;
  externalReference: string | null;
  errorMessage: string;
  attemptCount: number;
  adminDeliveryUrl: string;
};

const brand = "#b91c3c";

export function AdminManualReviewEmail({
  orderId,
  customerName,
  customerEmail,
  productName,
  orderItemId,
  provider,
  externalReference,
  errorMessage,
  attemptCount,
  adminDeliveryUrl,
}: AdminManualReviewEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>
        Revisión manual · pedido {orderId.slice(0, 8)} · {productName}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos Admin</Text>
          <Heading style={heading}>Entrega en revisión manual</Heading>
          <Text style={text}>
            Una entrega automática falló de forma concluyente y requiere
            intervención.
          </Text>
          <Section style={metaBox}>
            <Text style={metaLine}>
              <strong>Pedido:</strong> {orderId}
            </Text>
            <Text style={metaLine}>
              <strong>Cliente:</strong> {customerName} ({customerEmail})
            </Text>
            <Text style={metaLine}>
              <strong>Producto / ítem:</strong> {productName} ({orderItemId})
            </Text>
            <Text style={metaLine}>
              <strong>Proveedor:</strong> {provider}
            </Text>
            <Text style={metaLine}>
              <strong>Referencia externa:</strong>{" "}
              {externalReference ?? "—"}
            </Text>
            <Text style={metaLine}>
              <strong>Intentos:</strong> {attemptCount}
            </Text>
            <Text style={metaLine}>
              <strong>Error:</strong> {errorMessage}
            </Text>
          </Section>
          <Section style={buttonSection}>
            <Button href={adminDeliveryUrl} style={button}>
              Abrir entrega en admin
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Este mensaje no incluye keys ni credenciales.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default AdminManualReviewEmail;

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
  margin: "28px 0 16px",
};

const footer = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: 0,
};
