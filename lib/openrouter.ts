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
  const result = await client.chat.send({
    model: "mistralai/mistral-small-3.1-24b-instruct:free",
    messages: [
      {
        role: "system",
        content: `Tu es un assistant culinaire expert. Quand on te donne le nom d'un plat ou d'une recette, tu dois lister les ingrédients nécessaires pour le préparer pour ${peopleCount} personne${peopleCount > 1 ? "s" : ""}.

Réponds UNIQUEMENT avec un tableau JSON d'objets ayant cette structure:
[{"name": "nom de l'ingrédient", "quantity": "quantité suggérée"}]

Règles:
- Garde les quantités simples (ex: "500g", "2", "1 bouquet", "3 c. à soupe")
- Liste entre 5 et 15 ingrédients maximum
- Sois concis et pratique
- N'ajoute aucun texte avant ou après le JSON`,
      },
      {
        role: "user",
        content: `Liste les ingrédients pour: ${itemName}`,
      },
    ],
    temperature: 0.3,
  });

  const rawContent = result.choices?.[0]?.message?.content;
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
