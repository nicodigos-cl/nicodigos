import sanitizeHtml from "sanitize-html";
import { communicationTemplateVariableSchema } from "@/lib/validations/communications";

const variablePattern = /{{\s*([a-zA-Z0-9.]+)\s*}}/g;

export const templatePreviewValues: Record<string, string> = {
  "user.firstName": "Camila",
  "order.number": "NC-2026-000123",
  "order.total": "$19.990",
  "delivery.url": "https://nicodigos.cl/dashboard/deliveries/demo",
  "product.name": "Producto digital",
  "support.email": "soporte@nicodigos.cl",
};

export function findTemplateVariables(content: string): string[] {
  return [...content.matchAll(variablePattern)].map((match) => match[1]);
}

export function renderCommunicationTemplate(
  content: string,
  values: Record<string, string>,
): string {
  const found = findTemplateVariables(content);
  for (const variable of found) {
    if (
      !communicationTemplateVariableSchema.safeParse(variable).success ||
      !(variable in values)
    ) {
      throw new Error(`UNKNOWN_TEMPLATE_VARIABLE:${variable}`);
    }
  }
  return content.replace(variablePattern, (_, variable: string) =>
    sanitizeHtml(values[variable] ?? "", {
      allowedTags: [],
      allowedAttributes: {},
    }),
  );
}

export function previewCommunicationTemplate(content: string): string {
  return renderCommunicationTemplate(content, templatePreviewValues);
}
