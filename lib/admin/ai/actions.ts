"use server";

import { requireAdmin } from "@/lib/admin/auth";
import { parseJsonFromModelContent } from "@/lib/admin/ai/parse-json";
import {
  aiSystemRequirementBlockAssistInputSchema,
  aiSystemRequirementsAssistInputSchema,
  aiSystemRequirementsResponseSchema,
  aiTextAssistInputSchema,
} from "@/lib/admin/ai/schemas";
import type {
  AiSystemRequirementBlockAssistInput,
  AiSystemRequirementsAssistInput,
  AiSystemRequirementsAssistResult,
  AiTextAssistInput,
  AiTextAssistResult,
} from "@/lib/admin/ai/types";
import { getOpenAIClient } from "@/lib/openai/client";
import { getOpenAIModel, isOpenAIConfigured } from "@/lib/openai/env";
import { buildAiTextMessages } from "@/lib/openai/prompts";
import {
  buildAiSystemRequirementBlockMessages,
  buildAiSystemRequirementsMessages,
} from "@/lib/openai/system-requirements-prompts";

const MAX_OUTPUT_TOKENS = 2048;

const OPENAI_NOT_CONFIGURED_MSG =
  "OpenAI no está configurado. Añade OPENAI_API_KEY (y opcionalmente OPENAI_MODEL) en el entorno.";

function openAiNotConfiguredError(): AiTextAssistResult {
  return { success: false, error: OPENAI_NOT_CONFIGURED_MSG };
}

function openAiNotConfiguredRequirementsError(): AiSystemRequirementsAssistResult {
  return { success: false, error: OPENAI_NOT_CONFIGURED_MSG };
}

function taskNeedsSourceText(
  task: AiTextAssistInput["task"],
  currentText: string,
): string | null {
  const trimmed = currentText.trim();
  if (task === "generate") {
    return null;
  }
  if (!trimmed) {
    return "Escribe algo en el campo o usa «Generar» para crear texto desde cero.";
  }
  return null;
}

export async function assistProductTextAction(
  input: AiTextAssistInput,
): Promise<AiTextAssistResult> {
  await requireAdmin();

  if (!isOpenAIConfigured()) {
    return openAiNotConfiguredError();
  }

  const parsed = aiTextAssistInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos de asistencia IA inválidos." };
  }

  const { task, field, currentText, productContext } = parsed.data;

  const sourceError = taskNeedsSourceText(task, currentText);
  if (sourceError) {
    return { success: false, error: sourceError };
  }

  const client = getOpenAIClient();
  if (!client) {
    return openAiNotConfiguredError();
  }

  const { system, user } = buildAiTextMessages(
    task,
    field,
    currentText,
    productContext,
  );

  try {
    const model = getOpenAIModel();
    const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      ...(!isReasoningModel && { temperature: task === "translate" ? 0.3 : 0.6 }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return {
        success: false,
        error: "OpenAI no devolvió texto. Intenta de nuevo.",
      };
    }

    return { success: true, text };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      success: false,
      error: `No se pudo completar la asistencia IA: ${message}`,
    };
  }
}

function hasSystemRequirementsContent(
  blocks: AiSystemRequirementsAssistInput["currentBlocks"],
): boolean {
  return blocks.some(
    (block) =>
      block.system.trim().length > 0 ||
      block.requirement.some((line) => line.trim().length > 0),
  );
}

function systemRequirementsTaskNeedsContent(
  task: AiSystemRequirementsAssistInput["task"],
  blocks: AiSystemRequirementsAssistInput["currentBlocks"],
): string | null {
  if (task === "generate") {
    return null;
  }
  if (!hasSystemRequirementsContent(blocks)) {
    return "Añade al menos un bloque con requisitos o usa «Generar» para crearlos con IA.";
  }
  return null;
}

export async function assistSystemRequirementsAction(
  input: AiSystemRequirementsAssistInput,
): Promise<AiSystemRequirementsAssistResult> {
  await requireAdmin();

  if (!isOpenAIConfigured()) {
    return openAiNotConfiguredRequirementsError();
  }

  const parsed = aiSystemRequirementsAssistInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos de asistencia IA inválidos." };
  }

  const { task, productContext, currentBlocks } = parsed.data;

  const contentError = systemRequirementsTaskNeedsContent(task, currentBlocks);
  if (contentError) {
    return { success: false, error: contentError };
  }

  const client = getOpenAIClient();
  if (!client) {
    return openAiNotConfiguredRequirementsError();
  }

  const { system, user } = buildAiSystemRequirementsMessages(
    task,
    productContext,
    currentBlocks,
  );

  try {
    const model = getOpenAIModel();
    const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      ...(!isReasoningModel && { temperature: task === "translate" ? 0.3 : 0.5 }),
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      return {
        success: false,
        error: "OpenAI no devolvió requisitos. Intenta de nuevo.",
      };
    }

    const json = parseJsonFromModelContent(raw);
    const validated = aiSystemRequirementsResponseSchema.safeParse(json);
    if (!validated.success) {
      return {
        success: false,
        error:
          "La respuesta de IA no tiene el formato esperado. Intenta de nuevo.",
      };
    }

    return { success: true, requirements: validated.data.requirements };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      success: false,
      error: `No se pudo completar la asistencia IA: ${message}`,
    };
  }
}

function blockTaskNeedsLines(
  task: AiSystemRequirementBlockAssistInput["task"],
  systemName: string,
  lines: string,
): string | null {
  if (task === "generate") {
    return null;
  }
  if (!systemName.trim() && !lines.trim()) {
    return "Indica el sistema (Windows, Mac…) o escribe requisitos antes de usar esta acción.";
  }
  if (!lines.trim()) {
    return "Escribe requisitos en el bloque o usa «Generar».";
  }
  return null;
}

export async function assistSystemRequirementBlockAction(
  input: AiSystemRequirementBlockAssistInput,
): Promise<AiTextAssistResult> {
  await requireAdmin();

  if (!isOpenAIConfigured()) {
    return openAiNotConfiguredError();
  }

  const parsed = aiSystemRequirementBlockAssistInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos de asistencia IA inválidos." };
  }

  const { task, productContext, systemName, requirementLines } = parsed.data;

  const contentError = blockTaskNeedsLines(task, systemName, requirementLines);
  if (contentError) {
    return { success: false, error: contentError };
  }

  const client = getOpenAIClient();
  if (!client) {
    return openAiNotConfiguredError();
  }

  const { system, user } = buildAiSystemRequirementBlockMessages(
    task,
    productContext,
    systemName,
    requirementLines,
  );

  try {
    const model = getOpenAIModel();
    const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");

    const completion = await client.chat.completions.create({
      model,
      max_completion_tokens: MAX_OUTPUT_TOKENS,
      ...(!isReasoningModel && { temperature: task === "translate" ? 0.3 : 0.6 }),
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });

    const text = completion.choices[0]?.message?.content?.trim();
    if (!text) {
      return {
        success: false,
        error: "OpenAI no devolvió texto. Intenta de nuevo.",
      };
    }

    return { success: true, text };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return {
      success: false,
      error: `No se pudo completar la asistencia IA: ${message}`,
    };
  }
}
