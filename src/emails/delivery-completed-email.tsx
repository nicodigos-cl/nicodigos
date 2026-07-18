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

type DeliveryCompletedEmailProps = {
  customerName: string;
  orderId: string;
  productName: string;
  quantity: number;
  deliveredAt: string;
  orderUrl: string;
  customerMessage?: string | null;
  contentLabels: string[];
  hasSecrets: boolean;
};

const brand = "#b91c3c";

export function DeliveryCompletedEmail({
  customerName,
  orderId,
  productName,
  quantity,
  deliveredAt,
  orderUrl,
  customerMessage,
  contentLabels,
  hasSecrets,
}: DeliveryCompletedEmailProps) {
  const dateLabel = new Date(deliveredAt).toLocaleString("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <Html lang="es">
      <Head />
      <Preview>
        Tu entrega de {productName} está lista. Ábrela en tu cuenta Nicodigos.
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos</Text>
          <Heading style={heading}>Tu entrega está lista</Heading>
          <Text style={text}>
            Hola {customerName}, ya puedes revisar el contenido de tu compra de
            forma segura en tu cuenta.
          </Text>

          <Section style={metaBox}>
            <Text style={metaLine}>
              <strong>Pedido:</strong> {orderId}
            </Text>
            <Text style={metaLine}>
              <strong>Producto:</strong> {productName}
            </Text>
            <Text style={metaLine}>
              <strong>Cantidad:</strong> {quantity}
            </Text>
            <Text style={metaLine}>
              <strong>Fecha:</strong> {dateLabel}
            </Text>
            <Text style={metaLine}>
              <strong>Estado:</strong> Entregada
            </Text>
          </Section>

          {contentLabels.length > 0 ? (
            <Section>
              <Text style={text}>
                Contenido disponible ({contentLabels.length}):
              </Text>
              {contentLabels.slice(0, 8).map((label) => (
                <Text key={label} style={listItem}>
                  • {label}
                </Text>
              ))}
            </Section>
          ) : null}

          {customerMessage ? (
            <Section style={noteBox}>
              <Text style={textMuted}>Mensaje del equipo</Text>
              <Text style={text}>{customerMessage}</Text>
            </Section>
          ) : null}

          {hasSecrets ? (
            <Text style={warning}>
              Por seguridad, las claves y contraseñas no se incluyen en este
              correo. Ábrelas solo desde tu cuenta y cámbialas si el producto lo
              permite.
            </Text>
          ) : null}

          <Section style={buttonSection}>
            <Button href={orderUrl} style={button}>
              Ver mi pedido
            </Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            ¿Necesitas ayuda? Responde a este correo o escribe a
            soporte@nicodigos.cl.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DeliveryCompletedEmail;

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
  maxWidth: "520px",
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
  margin: "0 0 12px",
};

const textMuted = {
  ...text,
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 600,
  marginBottom: "4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};

const metaBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "12px",
  padding: "16px",
  margin: "20px 0",
};

const metaLine = {
  ...text,
  margin: "0 0 6px",
  fontSize: "14px",
};

const listItem = {
  ...text,
  margin: "0 0 4px",
  fontSize: "14px",
};

const noteBox = {
  borderLeft: `3px solid ${brand}`,
  paddingLeft: "12px",
  margin: "16px 0",
};

const warning = {
  ...text,
  backgroundColor: "#fef2f2",
  borderRadius: "10px",
  color: "#991b1b",
  fontSize: "13px",
  padding: "12px",
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
  lineHeight: "1.5",
  margin: 0,
};
