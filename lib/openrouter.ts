import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface GeneratedIngredient {
  name: string;
  quantity?: string;
}

export async function generateIngredients(
  itemName: string,
  peopleCount: number = 4
): Promise<GeneratedIngredient[]> {
  const model = "mistralai/mistral-small-3.1-24b-instruct:free";
  const systemPrompt = `Tu es un chef cuisinier français expert. Pour un plat donné, liste les ingrédients nécessaires pour ${peopleCount} personne${peopleCount > 1 ? "s" : ""}.

Format de réponse: JSON uniquement, sans texte autour.
[{"name": "ingrédient", "quantity": "quantité"}]

Règles:
- Ingrédients principaux en premier, puis secondaires
- Quantités précises: "200g", "2 pièces", "1 c. à soupe", "1/2 litre"
- Liste uniquement les ingrédients nécessaires (pas de remplissage)
- 12 ingrédients maximum
- Si ce n'est pas un plat cuisiné (ex: boisson, fromage), réponds []`;
  const userPrompt = `Ingrédients pour: ${itemName}`;

  console.log(`[OpenRouter] Requesting ingredients for "${itemName}" (${peopleCount} pers.)`);
  console.log(`[OpenRouter] Model: ${model}`);
  console.log(`[OpenRouter] System: ${systemPrompt.split('\n')[0]}...`);

  const result = await client.chat.send({
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
    temperature: 0.3,
  });

  const rawContent = result.choices?.[0]?.message?.content;
  console.log(`[OpenRouter] Raw Response:`, rawContent);
  const content = typeof rawContent === "string" ? rawContent : "[]";

  try {
    // Extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("No JSON array found in response:", content);
      return [];
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("Failed to parse OpenRouter response:", content, error);
    return [];
  }
}
