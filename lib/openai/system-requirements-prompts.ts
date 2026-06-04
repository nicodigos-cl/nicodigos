import type { AiProductContext, AiTextTask } from "@/lib/admin/ai/types";
import type { SystemRequirementInput } from "@/lib/admin/products/schemas";
import {
  formatProductContext,
  STORE_CONTEXT,
} from "@/lib/openai/prompts-shared";

const JSON_FORMAT = `Responde ÚNICAMENTE con un objeto JSON válido (sin markdown ni texto extra) con esta forma:
{"requirements":[{"system":"Windows","requirement":["OS: Windows 10 64-bit","Processor: Intel Core i5","Memory: 8 GB RAM"]}]}
- "system": nombre de la plataforma (Windows, Mac, Linux, etc.)
- "requirement": array de strings, un requisito por línea, con etiquetas claras (OS, Processor, Memory, Graphics, Storage, DirectX, etc.)
- Incluye solo plataformas que apliquen a la key; máximo 6 bloques.
- Texto en español de Chile.`;

function taskInstruction(task: AiTextTask): string {
  switch (task) {
    case "improve":
      return "Mejora los requisitos del sistema existentes: más claros y consistentes para compradores en Chile. Conserva datos técnicos reales.";
    case "generate":
      return "Genera requisitos del sistema realistas para esta key según su plataforma y contexto. Si hay datos de referencia, úsalos como base.";
    case "translate":
      return "Traduce los requisitos al español de Chile. Si ya están en español, unifica terminología y corrige redacción.";
    case "shorten":
      return "Resume los requisitos manteniendo lo esencial (OS, CPU, RAM, GPU, almacenamiento).";
    case "expand":
      return "Amplía los requisitos con detalle técnico útil, sin inventar hardware incompatible con la key.";
    default:
      return "Edita los requisitos del sistema para la ficha en Chile.";
  }
}

function formatCurrentBlocks(blocks: SystemRequirementInput[]): string {
  if (blocks.length === 0) {
    return "(ninguno)";
  }
  return JSON.stringify({ requirements: blocks }, null, 2);
}

export function buildAiSystemRequirementsMessages(
  task: AiTextTask,
  productContext: AiProductContext,
  currentBlocks: SystemRequirementInput[],
): { system: string; user: string } {
  return {
    system: `${STORE_CONTEXT}\n\n${JSON_FORMAT}`,
    user: [
      taskInstruction(task),
      "",
      "Contexto del producto:",
      formatProductContext(productContext),
      "",
      "Requisitos actuales:",
      formatCurrentBlocks(currentBlocks),
    ].join("\n"),
  };
}

export function buildAiSystemRequirementBlockMessages(
  task: AiTextTask,
  productContext: AiProductContext,
  systemName: string,
  requirementLines: string,
): { system: string; user: string } {
  const systemLabel = systemName.trim() || "la plataforma del bloque";
  const lineInstruction =
    "Devuelve solo las líneas de requisitos (una por línea), sin markdown. Usa etiquetas: OS, Processor, Memory, Graphics, Storage, etc.";

  let taskLine: string;
  switch (task) {
    case "improve":
      taskLine = `Mejora los requisitos de ${systemLabel} para la ficha en Chile. ${lineInstruction}`;
      break;
    case "generate":
      taskLine = `Genera requisitos de ${systemLabel} para esta key. ${lineInstruction}`;
      break;
    case "translate":
      taskLine = `Traduce al español de Chile los requisitos de ${systemLabel}. ${lineInstruction}`;
      break;
    case "shorten":
      taskLine = `Resume los requisitos de ${systemLabel}. ${lineInstruction}`;
      break;
    case "expand":
      taskLine = `Amplía los requisitos de ${systemLabel}. ${lineInstruction}`;
      break;
    default:
      taskLine = `Edita los requisitos de ${systemLabel}. ${lineInstruction}`;
  }

  const userParts = [
    taskLine,
    "",
    "Contexto del producto:",
    formatProductContext(productContext),
  ];

  if (systemName.trim()) {
    userParts.push("", `Sistema del bloque: ${systemName.trim()}`);
  }

  if (requirementLines.trim()) {
    userParts.push(
      "",
      "Requisitos actuales (una línea cada uno):",
      requirementLines.trim(),
    );
  } else {
    userParts.push("", "Requisitos actuales: (vacío)");
  }

  return {
    system: STORE_CONTEXT,
    user: userParts.join("\n"),
  };
}
