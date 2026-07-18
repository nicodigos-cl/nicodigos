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

type DeliveryProcessingEmailProps = {
  customerName: string;
  orderId: string;
  productName: string;
  orderUrl: string;
};

const brand = "#b91c3c";

export function DeliveryProcessingEmail({
  customerName,
  orderId,
  productName,
  orderUrl,
}: DeliveryProcessingEmailProps) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Estamos preparando tu entrega de {productName}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos</Text>
          <Heading style={heading}>Procesando tu entrega</Heading>
          <Text style={text}>
            Hola {customerName}, estamos preparando{" "}
            <strong>{productName}</strong> para el pedido {orderId.slice(0, 8)}
            …. Te avisaremos cuando esté lista.
          </Text>
          <Section style={buttonSection}>
            <Button href={orderUrl} style={button}>
              Ver estado del pedido
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Nicodigos · soporte@nicodigos.cl</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default DeliveryProcessingEmail;

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
  margin: "0 0 24px",
};

const heading = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0 0 12px",
};

const text = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 12px",
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
