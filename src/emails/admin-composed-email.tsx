import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

export function AdminComposedEmail({ subject, content, appUrl }: { subject: string; content: string; appUrl: string }) {
  return (
    <Html lang="es">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: "#f6f6f6", color: "#1f1f1f", fontFamily: "Arial, sans-serif", margin: 0, padding: "28px 12px" }}>
        <Container style={{ backgroundColor: "#ffffff", border: "1px solid #e7e7e7", borderRadius: "12px", margin: "0 auto", maxWidth: "620px", padding: "28px" }}>
          <Heading as="h1" style={{ fontSize: "20px", margin: "0 0 20px" }}>Nicodigos</Heading>
          <Section>
            {content.split(/\n{2,}/).map((paragraph, index) => (
              <Text key={index} style={{ fontSize: "15px", lineHeight: "24px", whiteSpace: "pre-line" }}>{paragraph}</Text>
            ))}
          </Section>
          <Text style={{ borderTop: "1px solid #ececec", color: "#6b7280", fontSize: "12px", marginTop: "28px", paddingTop: "18px" }}>
            Mensaje enviado por el equipo de Nicodigos. <Link href={appUrl} style={{ color: "#e15707" }}>Ir a Nicodigos</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
