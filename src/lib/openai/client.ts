import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-5-nano";
}

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  if (!client) {
    // Retries cover 429 / 5xx with exponential backoff (helps under p-limit concurrency).
    client = new OpenAI({ apiKey, maxRetries: 4 });
  }

  return client;
}

type StructuredSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

/**
 * Calls Responses API with strict JSON schema.
 * GPT-5 family: do not pass temperature.
 */
export async function createStructuredResponse<T>(options: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: StructuredSchema;
}): Promise<T> {
  const openai = getOpenAIClient();
  const model = getOpenAIModel();

  const response = await openai.responses.create({
    model,
    instructions: options.instructions,
    input: options.input,
    text: {
      format: {
        type: "json_schema",
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
  });

  const text = response.output_text?.trim();
  if (!text) {
    throw new Error("La IA no devolvió contenido");
  }

  return JSON.parse(text) as T;
}
