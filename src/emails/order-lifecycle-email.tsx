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

const brand = "#E15707";

type OrderEmailProps = {
  customerName: string;
  orderNumber: string;
  orderUrl: string;
  totalLabel?: string;
  message?: string;
};

function OrderEmailShell({
  preview,
  title,
  customerName,
  orderNumber,
  orderUrl,
  totalLabel,
  message,
  cta,
}: OrderEmailProps & { preview: string; title: string; cta: string }) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos</Text>
          <Heading style={heading}>{title}</Heading>
          <Text style={text}>Hola {customerName},</Text>
          {message ? <Text style={text}>{message}</Text> : null}
          <Section style={metaBox}>
            <Text style={metaLine}>
              <strong>Pedido:</strong> {orderNumber}
            </Text>
            {totalLabel ? (
              <Text style={metaLine}>
                <strong>Total:</strong> {totalLabel}
              </Text>
            ) : null}
          </Section>
          <Section style={{ textAlign: "center", marginTop: "28px" }}>
            <Button href={orderUrl} style={button}>
              {cta}
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>Nicodigos · soporte@nicodigos.com</Text>
        </Container>
      </Body>
    </Html>
  );
}

export function OrderCreatedEmail(props: OrderEmailProps) {
  return (
    <OrderEmailShell
      {...props}
      preview={`Pedido ${props.orderNumber} creado`}
      title="Recibimos tu pedido"
      message="Tu pedido quedó registrado. Completa el pago para comenzar la entrega."
      cta="Ver pedido"
    />
  );
}

export function OrderPaidEmail(props: OrderEmailProps) {
  return (
    <OrderEmailShell
      {...props}
      preview={`Pago confirmado · ${props.orderNumber}`}
      title="Pago confirmado"
      message="Confirmamos tu pago y ya estamos preparando tu entrega."
      cta="Ver pedido"
    />
  );
}

export function OrderPaymentRejectedEmail(props: OrderEmailProps) {
  return (
    <OrderEmailShell
      {...props}
      preview={`Pago no completado · ${props.orderNumber}`}
      title="No pudimos confirmar tu pago"
      message="Hubo un problema con el pago. Puedes reintentarlo desde tu cuenta."
      cta="Revisar pedido"
    />
  );
}

export function OrderRefundedEmail(props: OrderEmailProps) {
  return (
    <OrderEmailShell
      {...props}
      preview={`Reembolso procesado · ${props.orderNumber}`}
      title="Reembolso procesado"
      message="El reembolso de tu pedido fue procesado."
      cta="Ver pedido"
    />
  );
}

export function SupportRequestEmail({
  customerName,
  customerEmail,
  subject,
  message,
  category,
  orderId,
  deliveryId,
}: {
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  category: string;
  orderId?: string;
  deliveryId?: string;
}) {
  return (
    <Html lang="es">
      <Head />
      <Preview>Soporte: {subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brandMark}>Nicodigos · Soporte</Text>
          <Heading style={heading}>{subject}</Heading>
          <Section style={metaBox}>
            <Text style={metaLine}>
              <strong>Cliente:</strong> {customerName}
            </Text>
            <Text style={metaLine}>
              <strong>Email:</strong> {customerEmail}
            </Text>
            <Text style={metaLine}>
              <strong>Categoría:</strong> {category}
            </Text>
            {orderId ? (
              <Text style={metaLine}>
                <strong>Pedido:</strong> {orderId}
              </Text>
            ) : null}
            {deliveryId ? (
              <Text style={metaLine}>
                <strong>Entrega:</strong> {deliveryId}
              </Text>
            ) : null}
          </Section>
          <Text style={text}>{message}</Text>
          <Hr style={hr} />
          <Text style={footer}>Mensaje enviado desde el dashboard de cliente.</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f6f6",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "32px 28px",
  borderRadius: "16px",
  border: "1px solid #e5e5e5",
  maxWidth: "520px",
};

const brandMark = {
  color: brand,
  fontSize: "14px",
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase" as const,
  margin: "0 0 16px",
};

const heading = {
  fontSize: "22px",
  lineHeight: "28px",
  fontWeight: 700,
  color: "#111",
  margin: "0 0 16px",
};

const text = {
  fontSize: "15px",
  lineHeight: "24px",
  color: "#333",
  margin: "0 0 12px",
};

const metaBox = {
  backgroundColor: "#fafafa",
  borderRadius: "12px",
  padding: "12px 16px",
  border: "1px solid #eee",
};

const metaLine = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#333",
  margin: "4px 0",
};

const button = {
  backgroundColor: brand,
  borderRadius: "999px",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  padding: "12px 22px",
  display: "inline-block",
};

const hr = {
  borderColor: "#eee",
  margin: "28px 0 16px",
};

const footer = {
  color: "#888",
  fontSize: "12px",
  lineHeight: "18px",
  margin: 0,
};
