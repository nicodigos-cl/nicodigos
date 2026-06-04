import type { AiProductContext } from "@/lib/admin/ai/types";

export const STORE_CONTEXT = `Eres el asistente de redacción de Nicodigos, una tienda online de keys digitales que vende únicamente en Chile.
- Escribe en español de Chile (tuteo neutro, claro y profesional).
- Precios y moneda: pesos chilenos (CLP). No menciones otros países salvo restricciones regionales del producto.
- No inventes precios, stock, descuentos ni enlaces.
- No uses markdown salvo que el campo lo requiera explícitamente; devuelve solo el texto final listo para publicar.
- Para descripciones de producto, devuelve HTML simple (párrafos <p>, listas <ul><li>, <strong>) listo para un editor rich text.`;

export function formatProductContext(ctx: AiProductContext): string {
  const lines: string[] = [
    `Nombre en tienda: ${ctx.name}`,
    `Plataforma: ${ctx.platform}`,
  ];

  if (ctx.originalName?.trim()) {
    lines.push(`Nombre original (Kinguin): ${ctx.originalName.trim()}`);
  }
  if (ctx.regionalLimitations?.trim()) {
    lines.push(`Región / limitaciones: ${ctx.regionalLimitations.trim()}`);
  }
  if (ctx.developers?.length) {
    lines.push(`Desarrolladores: ${ctx.developers.join(", ")}`);
  }
  if (ctx.publishers?.length) {
    lines.push(`Publishers: ${ctx.publishers.join(", ")}`);
  }
  if (ctx.languages?.length) {
    lines.push(`Idiomas de la key: ${ctx.languages.join(", ")}`);
  }
  if (ctx.isPreorder) {
    lines.push("Estado: preorder");
  }

  return lines.join("\n");
}
