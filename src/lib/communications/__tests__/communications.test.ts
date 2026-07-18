import { describe, expect, test } from "bun:test";
import { sanitizeEmailHtml, safeAdminHtmlFromText } from "@/lib/communications/security";
import { canTransitionWebPush, shouldApplyEmailStatus } from "@/lib/communications/status";
import { findTemplateVariables, previewCommunicationTemplate, renderCommunicationTemplate } from "@/lib/communications/templates";
import { audienceDefinitionSchema, preferenceSchema, sendEmailSchema, webPushDraftSchema } from "@/lib/validations/communications";

describe("communications security", () => {
  test("sanitizes active email HTML and blocks remote images", () => {
    const result = sanitizeEmailHtml('<p onclick="steal()">Hola<script>alert(1)</script><img src="https://tracker.test/pixel"></p><iframe src="https://evil.test"></iframe>');
    expect(result.hadRemoteImages).toBe(true);
    expect(result.html).toContain("<p>Hola</p>");
    expect(result.html).not.toContain("script");
    expect(result.html).not.toContain("onclick");
    expect(result.html).not.toContain("img");
    expect(result.html).not.toContain("iframe");
  });

  test("escapes administrator text instead of accepting arbitrary HTML", () => {
    const html = safeAdminHtmlFromText("Hola <script>alert(1)</script>\n\nSegundo párrafo");
    expect(html).not.toContain("<script>");
    expect(html).toContain("Segundo párrafo");
  });
});

describe("web push state machine", () => {
  test("allows draft scheduling and scheduled cancellation", () => {
    expect(canTransitionWebPush("DRAFT", "SCHEDULED")).toBe(true);
    expect(canTransitionWebPush("SCHEDULED", "CANCELLED")).toBe(true);
  });

  test("keeps sent notifications immutable", () => {
    expect(canTransitionWebPush("SENT", "DRAFT")).toBe(false);
    expect(canTransitionWebPush("SENT", "ARCHIVED")).toBe(true);
  });
});

describe("email event ordering", () => {
  test("does not regress delivered email after a late sent event", () => {
    expect(shouldApplyEmailStatus("DELIVERED", "SENT")).toBe(false);
  });

  test("applies bounce and complaint terminal events", () => {
    expect(shouldApplyEmailStatus("DELIVERED", "BOUNCED")).toBe(true);
    expect(shouldApplyEmailStatus("BOUNCED", "SENT")).toBe(false);
  });
});

describe("typed inputs and consent", () => {
  test("requires explicit confirmation for more than ten email recipients", () => {
    const base = { idempotencyKey: crypto.randomUUID(), to: Array.from({ length: 11 }, (_, index) => `user${index}@example.com`), cc: [], bcc: [], subject: "Prueba", content: "Contenido", kind: "OPERATIONAL" };
    expect(sendEmailSchema.safeParse(base).success).toBe(false);
    expect(sendEmailSchema.safeParse({ ...base, confirmMassSend: "ENVIAR" }).success).toBe(true);
  });

  test("rejects arbitrary push data and javascript URLs", () => {
    const base = { idempotencyKey: crypto.randomUUID(), name: "Campaña", title: "Título", body: "Mensaje", kind: "OPERATIONAL", buttons: [], data: { type: "GENERAL", secret: "no" }, audience: { type: "ALL_ELIGIBLE" }, language: "es", priority: 5 };
    expect(webPushDraftSchema.safeParse(base).success).toBe(false);
    expect(webPushDraftSchema.safeParse({ ...base, data: { type: "GENERAL" }, targetUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  test("only accepts typed audience definitions", () => {
    expect(audienceDefinitionSchema.safeParse({ type: "SQL", query: "select *" }).success).toBe(false);
    expect(audienceDefinitionSchema.safeParse({ type: "ALL_ELIGIBLE" }).success).toBe(true);
  });

  test("keeps operational security preference explicit", () => {
    const result = preferenceSchema.parse({ marketingEmail: false, webPushEnabled: false, orders: true, payments: true, deliveries: true, smm: true, security: true, newProducts: false, promotions: false });
    expect(result.security).toBe(true);
    expect(result.marketingEmail).toBe(false);
  });
});

describe("template renderer", () => {
  test("renders only catalogued variables and escapes values", () => {
    expect(findTemplateVariables("Hola {{user.firstName}}")).toEqual(["user.firstName"]);
    expect(renderCommunicationTemplate("Hola {{user.firstName}}", { "user.firstName": "<b>Camila</b>" })).toBe("Hola Camila");
    expect(previewCommunicationTemplate("Pedido {{order.number}}")).toContain("NC-2026");
  });

  test("rejects unknown and sensitive variables", () => {
    expect(() => renderCommunicationTemplate("{{process.env.SECRET}}", { "process.env.SECRET": "x" })).toThrow();
    expect(() => renderCommunicationTemplate("{{user.password}}", { "user.password": "x" })).toThrow();
  });
});
