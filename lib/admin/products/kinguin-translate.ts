import { getOpenAIClient } from "@/lib/openai/client";
import { getOpenAIModel } from "@/lib/openai/env";
import { parseJsonFromModelContent } from "@/lib/admin/ai/parse-json";
import { STORE_CONTEXT } from "@/lib/openai/prompts-shared";

export type TranslatedProductData = {
  name: string;
  description: string | null;
  activationDetails: string | null;
};

export async function translateAndImproveKinguinProduct(
  name: string,
  platform: string,
  description: string | null,
  activationDetails: string | null
): Promise<TranslatedProductData> {
  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OpenAI no está configurado.");
  }

  const prompt = `Traduce al español de Chile, mejora y formatea el contenido del siguiente producto de Kinguin para nuestra tienda.
  
Información del producto:
- Nombre original: "${name}"
- Plataforma: "${platform}"
- Descripción original: ${description ? `"${description}"` : "(no disponible)"}
- Instrucciones de activación originales: ${activationDetails ? `"${activationDetails}"` : "(no disponible)"}

Instrucciones de formato y contenido:
1. "name": Genera un nombre limpio y profesional en español de Chile para la tienda. Elimina sufijos repetitivos de Kinguin (como 'CD Key', 'Steam Key', 'PC', 'Global', 'Gift', 'Steam Gift', 'Altergift', etc.). Deja solo el título limpio del juego o software (por ejemplo, "Elden Ring" o "Grand Theft Auto V"). No incluyas la plataforma en el nombre si ya es redundante.
2. "description": Traduce y mejora la descripción para que sea atractiva y orientada al público chileno. Debe estar en formato HTML simple (usa exclusivamente etiquetas <p>, <ul>, <li>, <strong>, etc.). Si no había descripción original, redacta una descripción atractiva y breve (1 o 2 párrafos) sobre el juego/producto basado en su nombre.
3. "activationDetails": Traduce y formatea las instrucciones de activación paso a paso en español de Chile, haciéndolas claras y fáciles de seguir para el comprador. Si no había instrucciones originales, redacta instrucciones genéricas de activación para la plataforma indicada ("${platform}").

Devuelve la respuesta estrictamente como un objeto JSON válido con las claves "name", "description" y "activationDetails". No agregues texto fuera del JSON, bloque de código markdown u otra explicación.`;

  const model = getOpenAIModel();
  const isReasoningModel = model.startsWith("o1") || model.startsWith("o3");

  const completion = await client.chat.completions.create({
    model,
    max_completion_tokens: 2048,
    ...(!isReasoningModel && { temperature: 0.3 }),
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: STORE_CONTEXT },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("No se recibió respuesta de OpenAI.");
  }

  try {
    const json = parseJsonFromModelContent(content) as TranslatedProductData;
    return {
      name: json.name?.trim() || name,
      description: json.description?.trim() || description,
      activationDetails: json.activationDetails?.trim() || activationDetails,
    };
  } catch (error) {
    console.error("Error al parsear el JSON de OpenAI:", error, content);
    throw new Error("La respuesta de OpenAI no pudo ser parseada.");
  }
}
