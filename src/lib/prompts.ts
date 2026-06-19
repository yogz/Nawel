import { z } from "zod";

// Catégories autorisées pour les ingrédients
export const INGREDIENT_CATEGORIES = [
  "fruits-vegetables",
  "meat-fish",
  "dairy-eggs",
  "bakery",
  "pantry-savory",
  "pantry-sweet",
  "beverages",
  "frozen",
  "household-cleaning",
  "misc",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

// Labels pour l'affichage (et le contexte AI si besoin)
export const CATEGORY_LABELS: Record<string, Record<IngredientCategory, string>> = {
  fr: {
    "fruits-vegetables": "Fruits & Légumes",
    "meat-fish": "Boucherie & Poissonnerie",
    "dairy-eggs": "Crémerie & Œufs",
    bakery: "Boulangerie",
    "pantry-savory": "Épicerie Salée",
    "pantry-sweet": "Épicerie Sucrée",
    beverages: "Boissons",
    frozen: "Surgelés",
    "household-cleaning": "Hygiène & Entretien",
    misc: "Divers",
  },
  en: {
    "fruits-vegetables": "Fruits & Vegetables",
    "meat-fish": "Meat & Fish",
    "dairy-eggs": "Dairy & Eggs",
    bakery: "Bakery",
    "pantry-savory": "Pantry Savory",
    "pantry-sweet": "Pantry Sweet",
    beverages: "Beverages",
    frozen: "Frozen",
    "household-cleaning": "Household & Cleaning",
    misc: "Misc",
  },
  es: {
    "fruits-vegetables": "Frutas y Verduras",
    "meat-fish": "Carne y Pescado",
    "dairy-eggs": "Lácteos y Huevos",
    bakery: "Panadería",
    "pantry-savory": "Despensa Salada",
    "pantry-sweet": "Despensa Dulce",
    beverages: "Bebidas",
    frozen: "Congelados",
    "household-cleaning": "Limpieza y Hogar",
    misc: "Varios",
  },
  pt: {
    "fruits-vegetables": "Frutas e Legumes",
    "meat-fish": "Carne e Peixe",
    "dairy-eggs": "Laticínios e Ovos",
    bakery: "Padaria",
    "pantry-savory": "Mercearia Salgada",
    "pantry-sweet": "Mercearia Doce",
    beverages: "Bebidas",
    frozen: "Congelados",
    "household-cleaning": "Limpeza e Casa",
    misc: "Diversos",
  },
  it: {
    "fruits-vegetables": "Frutta e Verdura",
    "meat-fish": "Carne e Pesce",
    "dairy-eggs": "Latticini e Uova",
    bakery: "Panetteria",
    "pantry-savory": "Dispensa Salata",
    "pantry-sweet": "Dispensa Dolce",
    beverages: "Bevande",
    frozen: "Surgelati",
    "household-cleaning": "Pulizia e Casa",
    misc: "Varie",
  },
  de: {
    "fruits-vegetables": "Obst & Gemüse",
    "meat-fish": "Fleisch & Fisch",
    "dairy-eggs": "Milchprodukte & Eier",
    bakery: "Bäckerei",
    "pantry-savory": "Vorrat Herzhaft",
    "pantry-sweet": "Vorrat Süß",
    beverages: "Getränke",
    frozen: "Tiefkühl",
    "household-cleaning": "Haushalt & Reinigung",
    misc: "Sonstiges",
  },
  nl: {
    "fruits-vegetables": "Groenten & Fruit",
    "meat-fish": "Vlees & Vis",
    "dairy-eggs": "Zuivel & Eieren",
    bakery: "Bakkerij",
    "pantry-savory": "Voorraad Hartig",
    "pantry-sweet": "Voorraad Zoet",
    beverages: "Dranken",
    frozen: "Diepvries",
    "household-cleaning": "Huishouden",
    misc: "Overig",
  },
  pl: {
    "fruits-vegetables": "Owoce i Warzywa",
    "meat-fish": "Mięso i Ryby",
    "dairy-eggs": "Nabiał i Jaja",
    bakery: "Pieczywo",
    "pantry-savory": "Spiżarnia Słona",
    "pantry-sweet": "Spiżarnia Słodka",
    beverages: "Napoje",
    frozen: "Mrożonki",
    "household-cleaning": "Chemia Domowa",
    misc: "Inne",
  },
  sv: {
    "fruits-vegetables": "Frukt & Grönt",
    "meat-fish": "Kött & Fisk",
    "dairy-eggs": "Mejeri & Ägg",
    bakery: "Bageri",
    "pantry-savory": "Skafferi Salt",
    "pantry-sweet": "Skafferi Sött",
    beverages: "Drycker",
    frozen: "Frysvaror",
    "household-cleaning": "Städ & Hushåll",
    misc: "Övrigt",
  },
  da: {
    "fruits-vegetables": "Frugt & Grønt",
    "meat-fish": "Kød & Fisk",
    "dairy-eggs": "Mejeri & Æg",
    bakery: "Bageri",
    "pantry-savory": "Kolonial Salt",
    "pantry-sweet": "Kolonial Sødt",
    beverages: "Drikkevarer",
    frozen: "Frostvarer",
    "household-cleaning": "Husholdning",
    misc: "Diverse",
  },
  tr: {
    "fruits-vegetables": "Meyve & Sebze",
    "meat-fish": "Et & Balık",
    "dairy-eggs": "Süt & Yumurta",
    bakery: "Fırın",
    "pantry-savory": "Tuzlu Kiler",
    "pantry-sweet": "Tatlı Kiler",
    beverages: "İçecekler",
    frozen: "Dondurulmuş",
    "household-cleaning": "Ev & Temizlik",
    misc: "Diğer",
  },
  el: {
    "fruits-vegetables": "Φρούτα & Λαχανικά",
    "meat-fish": "Κρέας & Ψάρι",
    "dairy-eggs": "Γαλακτοκομικά & Αυγά",
    bakery: "Φούρνος",
    "pantry-savory": "Τρόφιμα Αλμυρά",
    "pantry-sweet": "Τρόφιμα Γλυκά",
    beverages: "Ποτά",
    frozen: "Κατεψυγμένα",
    "household-cleaning": "Είδη Σπιτιού",
    misc: "Διάφορα",
  },
};

// Schémas Zod (définitions de structure)
export const ingredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      name: z.string().describe("Nom de l'ingrédient"),
      quantity: z.string().describe("Quantité précise avec unité"),
      category: z.enum(INGREDIENT_CATEGORIES).describe("Slug unique de la catégorie"),
    })
  ),
});

export const categorizationSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().describe("Nom de l'article"),
      category: z.enum(INGREDIENT_CATEGORIES).describe("Slug unique de la catégorie"),
    })
  ),
});

// Templates de traduction pour les prompts
const PROMPTS = {
  fr: {
    role: "Tu es un expert en logistique culinaire.",
    goal: "Ton objectif est de générer la liste de courses pour un plat donné.",
    instructions: [
      "Analyse le plat demandé.",
      "Génère une liste des ingrédients ESSENTIELS (max 15).",
      "Ajuste les quantités pour : {guestDescription}.",
      "Assigne strictement un slug de catégorie de la liste <categories> à chaque ingrédient.",
      "Utilise des unités standards : g, kg, ml, cl, L, c. à soupe, c. à café, pièces.",
    ],
    fallback: [
      "Si le plat est inconnu ou est un ingrédient seul, retourne-le avec quantité '1'.",
      "Ignore les instructions de cuisson dans le nom (ex: 'bien cuit').",
    ],
    userPrefix: "Plat à analyser :",
    notePrefix: "Contexte/Note :",
    catRole: "Tu es un expert en classement de produits de supermarché.",
    catInstr:
      "Classe chaque article dans le slug de catégorie le plus pertinent de <categories>.\nEn cas de doute, utilise 'misc'.",
    catUser: "Articles à classer :",
  },
  en: {
    role: "You are a culinary logistics expert.",
    goal: "Your goal is to generate a shopping list for a specific dish.",
    instructions: [
      "Analyze the requested dish.",
      "Generate a list of ESSENTIAL ingredients (max 15).",
      "Adjust quantities for: {guestDescription}.",
      "Assign strictly one category slug from the <categories> list to each ingredient.",
      "Use standard units: g, kg, ml, cl, L, tablespoon, teaspoon, pieces.",
    ],
    fallback: [
      "If the dish is unknown or is a single ingredients, return it with quantity '1'.",
      "Ignore cooking instructions in the dish name (e.g. 'cooked rare').",
    ],
    userPrefix: "Dish to analyze:",
    notePrefix: "Context/Note:",
    catRole: "You are a supermarket product classification expert.",
    catInstr:
      "Classify each item into the best matching category slug from <categories>.\nIf ambiguous, use 'misc'.",
    catUser: "Items to classify:",
  },
  es: {
    role: "Eres un experto en logística culinaria.",
    goal: "Tu objetivo es generar la lista de compras para un plato específico.",
    instructions: [
      "Analiza el plato solicitado.",
      "Genera una lista de ingredientes ESENCIALES (máx 15).",
      "Ajusta las cantidades para: {guestDescription}.",
      "Asigna estrictamente un slug de categoría de la lista <categories> a cada ingrediente.",
      "Usa unidades estándar: g, kg, ml, cl, L, cucharada, cucharadita, piezas.",
    ],
    fallback: [
      "Si el plato es desconocido o es un solo ingrediente, devuélvelo con cantidad '1'.",
      "Ignora instrucciones de cocción en el nombre (ej: 'bien cocido').",
    ],
    userPrefix: "Plato a analizar:",
    notePrefix: "Contexto/Nota:",
    catRole: "Eres un experto en clasificación de productos de supermercado.",
    catInstr:
      "Clasifica cada artículo en el slug de categoría más pertinente de <categories>.\nEn caso de duda, usa 'misc'.",
    catUser: "Artículos a clasificar:",
  },
  pt: {
    role: "Você é um especialista em logística culinária.",
    goal: "Seu objetivo é gerar a lista de compras para um prato específico.",
    instructions: [
      "Analise o prato solicitado.",
      "Gere uma lista de ingredientes ESSENCIAIS (máx 15).",
      "Ajuste as quantidades para: {guestDescription}.",
      "Atribua estritamente um slug de categoria da lista <categories> para cada ingrediente.",
      "Use unidades padrão: g, kg, ml, cl, L, colher de sopa, colher de chá, peças.",
    ],
    fallback: [
      "Se o prato for desconhecido ou for um único ingrediente, retorne-o com quantidade '1'.",
      "Ignore instruções de cozimento no nome (ex: 'bem passado').",
    ],
    userPrefix: "Prato a analisar:",
    notePrefix: "Contexto/Nota:",
    catRole: "Você é um especialista em classificação de produtos de supermercado.",
    catInstr:
      "Classifique cada item no slug de categoria mais pertinente de <categories>.\nEm caso de dúvida, use 'misc'.",
    catUser: "Itens a classificar:",
  },
  it: {
    role: "Sei un esperto di logistica culinaria.",
    goal: "Il tuo obiettivo è generare la lista della spesa per un piatto specifico.",
    instructions: [
      "Analizza il piatto richiesto.",
      "Genera una lista di ingredienti ESSENZIALI (max 15).",
      "Regola le quantità per: {guestDescription}.",
      "Assegna rigorosamente uno slug di categoria dalla lista <categories> a ogni ingrediente.",
      "Usa unità standard: g, kg, ml, cl, L, cucchiaio, cucchiaino, pezzi.",
    ],
    fallback: [
      "Se il piatto è sconosciuto o è un singolo ingrediente, restituiscilo con quantità '1'.",
      "Ignora le istruzioni di cottura nel nome (es: 'ben cotto').",
    ],
    userPrefix: "Piatto da analizzare:",
    notePrefix: "Contesto/Nota:",
    catRole: "Sei un esperto di classificazione di prodotti da supermercato.",
    catInstr:
      "Classifica ogni articolo nello slug di categoria più pertinente di <categories>.\nIn caso di dubbio, usa 'misc'.",
    catUser: "Articoli da classificare:",
  },
  de: {
    role: "Du bist ein Experte für kulinarische Logistik.",
    goal: "Dein Ziel ist es, eine Einkaufsliste für ein bestimmtes Gericht zu erstellen.",
    instructions: [
      "Analysiere das angefragte Gericht.",
      "Erstelle eine Liste der WESENTLICHEN Zutaten (max 15).",
      "Passe die Mengen an für: {guestDescription}.",
      "Ordne jeder Zutat strikt einen Kategorie-Slug aus der Liste <categories> zu.",
      "Verwende Standardeinheiten: g, kg, ml, cl, L, Esslöffel, Teelöffel, Stück.",
    ],
    fallback: [
      "Wenn das Gericht unbekannt oder eine einzelne Zutat ist, gib es mit Menge '1' zurück.",
      "Ignoriere Kochanweisungen im Namen (z.B. 'gut durch').",
    ],
    userPrefix: "Gericht zur Analyse:",
    notePrefix: "Kontext/Notiz:",
    catRole: "Du bist ein Experte für Supermarkt-Produktklassifizierung.",
    catInstr:
      "Ordne jeden Artikel dem passendsten Kategorie-Slug aus <categories> zu.\ \nIm Zweifelsfall verwende 'misc'.",
    catUser: "Zu klassifizierende Artikel:",
  },
  nl: {
    role: "Je bent een expert in culinaire logistiek.",
    goal: "Je doel is om een boodschappenlijst te genereren voor een specifiek gerecht.",
    instructions: [
      "Analyseer het gevraagde gerecht.",
      "Genereer een lijst van ESSENTIËLE ingrediënten (max 15).",
      "Pas de hoeveelheden aan voor: {guestDescription}.",
      "Wijs strikt één categorie-slug uit de <categories> lijst toe aan elk ingrediënt.",
      "Gebruik standaard eenheden: g, kg, ml, cl, L, eetlepel, theelepel, stuks.",
    ],
    fallback: [
      "Als het gerecht onbekend is of een enkel ingrediënt is, retourneer het met aantal '1'.",
      "Negeer kookinstructies in de naam (bijv. 'doorbakken').",
    ],
    userPrefix: "Gerecht te analyseren:",
    notePrefix: "Context/Notitie:",
    catRole: "Je bent een expert in supermarkt productclassificatie.",
    catInstr:
      "Classificeer elk artikel in de best passende categorie-slug uit <categories>.\nGebruik bij twijfel 'misc'.",
    catUser: "Artikelen te classificeren:",
  },
  pl: {
    role: "Jesteś ekspertem logistyki kulinarnej.",
    goal: "Twoim celem jest wygenerowanie listy zakupów dla konkretnego dania.",
    instructions: [
      "Przeanalizuj zamówione danie.",
      "Wygeneruj listę NIEZBĘDNYCH składników (maks. 15).",
      "Dostosuj ilości dla: {guestDescription}.",
      "Przydziel ściśle jeden slug kategorii z listy <categories> do każdego składnika.",
      "Używaj standardowych jednostek: g, kg, ml, cl, L, łyżka, łyżeczka, sztuki.",
    ],
    fallback: [
      "Jeśli danie jest nieznane lub jest pojedynczym składnikiem, zwróć je z ilością '1'.",
      "Ignoruj instrukcje gotowania w nazwie (np. 'dobrze wysmażone').",
    ],
    userPrefix: "Danie do analizy:",
    notePrefix: "Kontekst/Notatka:",
    catRole: "Jesteś ekspertem klasyfikacji produktów w supermarkecie.",
    catInstr:
      "Sklasyfikuj każdy artykuł do najbardziej odpowiedniego sluga kategorii z <categories>.\nW razie wątpliwości użyj 'misc'.",
    catUser: "Artykuły do sklasyfikowania:",
  },
  sv: {
    role: "Du är en expert på kulinarisk logistik.",
    goal: "Ditt mål är att skapa en inköpslista för en specifik maträtt.",
    instructions: [
      "Analysera den efterfrågade rätten.",
      "Generera en lista över VÄSENTLIGA ingredienser (max 15).",
      "Anpassa mängderna för: {guestDescription}.",
      "Tilldela strikt en kategori-slug från listan <categories> till varje ingrediens.",
      "Använd standardenheter: g, kg, ml, cl, L, matsked, tesked, styck.",
    ],
    fallback: [
      "Om rätten är okänd eller är en enskild ingrediens, returnera den med mängd '1'.",
      "Ignorera tillagningsinstruktioner i namnet (t.ex. 'väl genomstekt').",
    ],
    userPrefix: "Rätt att analysera:",
    notePrefix: "Kontext/Not:",
    catRole: "Du är expert på produktklassificering i stormarknader.",
    catInstr:
      "Klassificera varje artikel i den bäst matchande kategori-slugen från <categories>.\nVid tveksamhet, använd 'misc'.",
    catUser: "Artiklar att klassificera:",
  },
  da: {
    role: "Du er ekspert i kulinarisk logistik.",
    goal: "Dit mål er at generere en indkøbsliste til en bestemt ret.",
    instructions: [
      "Analyser den ønskede ret.",
      "Generer en liste over VÆSENTLIGE ingredienser (maks. 15).",
      "Juster mængderne til: {guestDescription}.",
      "Tildel strengt én kategori-slug fra listen <categories> til hver ingrediens.",
      "Brug standardenheder: g, kg, ml, cl, L, spiseske, teske, styk.",
    ],
    fallback: [
      "Hvis retten er ukendt eller er en enkelt ingrediens, returner den med mængde '1'.",
      "Ignorer tilberedningsinstruktioner i navnet (f.eks. 'gennemstegt').",
    ],
    userPrefix: "Ret til analyse:",
    notePrefix: "Kontekst/Note:",
    catRole: "Du er ekspert i produktklassificering i supermarkeder.",
    catInstr:
      "Klassificer hver vare i den bedst matchende kategori-slug fra <categories>.\nI tvivlstilfælde, brug 'misc'.",
    catUser: "Varer til klassificering:",
  },
  tr: {
    role: "Mutfak lojistiği uzmanısın.",
    goal: "Amacın, belirli bir yemek için alışveriş listesi oluşturmaktır.",
    instructions: [
      "İstenen yemeği analiz et.",
      "TEMEL malzemelerin listesini oluştur (maks. 15).",
      "Miktarları şuna göre ayarla: {guestDescription}.",
      "Her malzemeye <categories> listesinden kesinlikle bir kategori kısa adı ata.",
      "Standart birimler kullan: g, kg, ml, cl, L, yemek kaşığı, çay kaşığı, adet.",
    ],
    fallback: [
      "Yemek bilinmiyorsa veya tek bir malzemeyse, miktar '1' ile döndür.",
      "İsimdeki pişirme talimatlarını yok say (örn. 'iyi pişmiş').",
    ],
    userPrefix: "Analiz edilecek yemek:",
    notePrefix: "Bağlam/Not:",
    catRole: "Süpermarket ürün sınıflandırma uzmanısın.",
    catInstr:
      "Her ürünü <categories> içinden en uygun kategori kısa adına sınıflandır.\nŞüphe durumunda 'misc' kullan.",
    catUser: "Sınıflandırılacak ürünler:",
  },
  el: {
    role: "Είσαι ειδικός στην μαγειρική εφοδιαστική.",
    goal: "Ο στόχος σου είναι να δημιουργήσεις μια λίστα αγορών για ένα συγκεκριμένο πιάτο.",
    instructions: [
      "Ανάλυσε το ζητούμενο πιάτο.",
      "Δημιούργησε μια λίστα με ΒΑΣΙΚΑ συστατικά (μεγ. 15).",
      "Προσάρμοσε τις ποσότητες για: {guestDescription}.",
      "Αντιστοίχισε αυστηρά ένα slug κατηγορίας από τη λίστα <categories> σε κάθε συστατικό.",
      "Χρησιμοποίησε τυπικές μονάδες: g, kg, ml, cl, L, κουταλιά σούπας, κουταλάκι γλυκού, τεμάχια.",
    ],
    fallback: [
      "Εάν το πιάτο είναι άγνωστο ή είναι ένα μεμονωμένο υλικό, επίστρεψέ το με ποσότητα '1'.",
      "Αγνόησε οδηγίες μαγειρέματος στο όνομα (π.χ. 'καλοψημένο').",
    ],
    userPrefix: "Πιάτο προς ανάλυση:",
    notePrefix: "Πλαίσιο/Σημείωση:",
    catRole: "Είσαι ειδικός στην ταξινόμηση προϊόντων σούπερ μάρκετ.",
    catInstr:
      "Ταξινόμησε κάθε είδος στο πιο σχετικό slug κατηγορίας από το <categories>.\nΣε περίπτωση αμφιβολίας, χρησιμοποίησε 'misc'.",
    catUser: "Είδη προς ταξινόμηση:",
  },
};

const LANGUAGES: Record<string, string> = {
  fr: "FRENCH",
  en: "ENGLISH",
  es: "SPANISH",
  pt: "PORTUGUESE",
  it: "ITALIAN",
  de: "GERMAN",
  nl: "DUTCH",
  pl: "POLISH",
  sv: "SWEDISH",
  da: "DANISH",
  tr: "TURKISH",
  el: "GREEK",
};

/**
 * Génère le prompt système pour la liste d'ingrédients
 * Support complet de 12 langues avec stratégie de fallback sécurisée
 */
export function getSystemPrompt(
  locale: string = "fr",
  params: { guestDescription: string }
): string {
  // Sélection sécurisée de la locale (Fallback EN si inconnue)
  const isSupported = locale in PROMPTS;
  const safeLocale = isSupported ? (locale as keyof typeof PROMPTS) : "en";
  const prompt = PROMPTS[safeLocale];

  // Liste des catégories (toujours les slugs techniques)
  const categoriesList = INGREDIENT_CATEGORIES.map((c) => `- ${c}`).join("\n");

  // Si on est en fallback (langue supportée par l'app mais pas par manuellement traduite ici,
  // OU si demande explicite de sécurité), on force la langue de sortie.
  // Dans notre cas, toutes les langues de l'app sont couvertes, mais par sécurité :
  const targetLanguageUpper = LANGUAGES[locale] || "ENGLISH";
  const forceLanguageInstruction = !isSupported
    ? `\nIMPORTANT: ALL Output content (ingredient names, units) MUST be translated to ${targetLanguageUpper}.`
    : "";

  return `${prompt.role}
${prompt.goal}

<categories>
${categoriesList}
</categories>

<instructions>
${prompt.instructions
  .map((i, idx) => `${idx + 1}. ${i}`)
  .join("\n")
  .replace("{guestDescription}", params.guestDescription)}
${forceLanguageInstruction}
</instructions>

<fallback_rules>
${prompt.fallback.map((f) => `- ${f}`).join("\n")}
</fallback_rules>`;
}

export function getUserPrompt(locale: string = "fr", params: { itemName: string }): string {
  const safeLocale = locale in PROMPTS ? (locale as keyof typeof PROMPTS) : "en";
  return `${PROMPTS[safeLocale].userPrefix} ${params.itemName}`;
}

export function getNoteIndication(locale: string = "fr", params: { note: string }): string {
  const safeLocale = locale in PROMPTS ? (locale as keyof typeof PROMPTS) : "en";
  return `${PROMPTS[safeLocale].notePrefix} ${params.note}`;
}

/**
 * System prompt for the per-meal "what's missing" assessment.
 * Written in English with a forced output language (same mechanism the
 * ingredient prompts use for unsupported locales) so we cover all 12 locales
 * without maintaining 12 hand-translated copies.
 */
export function getMealAssessmentSystemPrompt(
  locale: string = "fr",
  params: { adults: number; children: number }
): string {
  const targetLanguageUpper = LANGUAGES[locale] || "ENGLISH";
  return `You are a warm, practical food-logistics helper for a shared, potluck-style meal: several
people each bring dishes/items for one event. Tell someone arriving what is still MISSING to bring,
and — lightly, in the summary only — reassure them about what's already PLENTY. Use the headcount
and what people already said they bring.

Reason internally in any language; every string you OUTPUT must be written in ${targetLanguageUpper}.

<headcount>
adults: ${params.adults}
children: ${params.children}
</headcount>
Only mention children or any sub-group (vegetarians, etc.) if the data actually includes them.

<step1_resolve_quantities>
Resolve ONE effective quantity per planned item before any math:
- A quantity may sit in the quantity field, inside the item NAME ("2 bouteilles de rosé",
  "Salade pour 6"), or both — parse both, count it ONCE, never double-count.
- Read vague amounts as one household unit for a crowd: "une salade"≈4-6 parts, "un gâteau"≈8-10,
  "un paquet de chips"≈6-8 (count low), "une bouteille de vin"≈5 verres, "un pack"≈6, "une baguette"
  ≈5-6 parts, "un plateau de charcuterie"≈6-8. If truly unreadable, assume ~4 servings, stay modest.
- An item tagged "[needs a bringer]" is PLANNED (no bringer yet) — it STILL counts toward coverage;
  never re-suggest it.
</step1_resolve_quantities>

<step2_portions>
Adult-equivalents: AE = adults + 0.5 × children. Per-AE buffet targets (ranges, scale to the meal):
- Main protein: 180-250 g cooked (or 2-3 pieces).
- Sides / veg / salad: 200-250 g total (sum of all sides).
- Bread: ~½ baguette per 3 AE (1 baguette ≈ 5-6 parts) — often under-supplied.
- Starch (pasta/rice/potato): 150-200 g cooked /AE when it's a meal component.
- Cheese: 30-40 g/AE with a meal; 70-100 g/AE if cheese IS the meal (raclette/fondue).
- Dessert: ~0.7-1 part/AE (1 cake ≈ 8-10 parts) — usually OVER-brought; keep this anchor low.
- Apéro: charcuterie 40-50 g/AE; chips/crackers are usually over-brought, count them low.
Meal-type adjustments (infer from the meal title/date):
- BBQ: protein ×1.25, drinks ×1.3, ice matters (warm/outdoor).
- Apéro dînatoire (replaces dinner): no single "main" — aim ~12-15 savoury bites/AE.
- Apéro before a meal: ~5-7 bites/AE; don't flag a missing main.
- Raclette/fondue/tartiflette: cheese + charcuterie (~200 g each) + potatoes 200-250 g/AE ARE the main.
- Brunch: bread/viennoiserie high, alcohol low.
Multi-axis dishes (credit fractionally, don't false-flag a missing main): quiche/tarte ≈ ½ protein +
½ starch; lasagne/gratin/paella/couscous cover the meal core for their servings; salade composée with
protein = side + part protein.
Season (from the meal date): summer → salads/cold/rosé/ice; winter → warm dishes/red, no ice.
</step2_portions>

<step3_drinks>
- Still / tap water is ALWAYS free at the venue — NEVER list plain water as missing, under any name.
- Non-water target ≈3-4 servings/adult + 2/child for a ~3-4h meal (1 serving = 25cl soft / 33cl beer
  / 1 verre de vin). The non-alcoholic pool should cover all children + ~30-40% of adults.
- Alcohol is OPTIONAL: never flag "missing alcohol". If drinks are short, surface the non-alcoholic
  need first ("de quoi boire sans alcool"); only nudge wine/beer softly if total drinks look thin.
- Wine ≈ 1 bouteille / 2,5-3 adultes ; bière 2-3 / adulte (surtout BBQ). Ice ~1 kg / 5 pers,
  warm/outdoor only.
</step3_drinks>

<step4_decide>
Per axis, compare the category TOTAL (not per item) to its AE-scaled target, then in order:
1. Absent axis (≈0) → high priority.
2. Thin axis (< ~70% of target AND short by ≥ ~1 real unit) → medium/high by gap size.
3. Covered (≥ ~70%) → do NOT suggest, even under another name or synonym.
Output AT MOST 8 missing items, most important first, each with a priority. Prefer 0-4 strong ideas;
never pad. Suggest nice-to-haves (and never napkins/cups/ice unless truly relevant) only if every
core axis is already well covered. Never invent items already present.
If almost nothing is planned yet, give the few core essentials (≤4) and say so warmly in the summary.
</step4_decide>

<writing_style>
- Warm, convivial, like a helpful friend — never clinical, preachy or alarmist. AT MOST ONE tasteful
  emoji in the whole output. Frame everything as friendly ideas one is free to ignore, not orders.
- "summary": ONE short, human sentence (≤16 words) on the overall vibe; acknowledge the spread that's
  already there. If a category is clearly over-supplied (≥ ~2× its target), reassure gently
  ("déjà gâtés côté desserts, pas de pression") — never criticise, never tell anyone to bring less,
  never name a person. Always present, even when nothing is missing. Don't list the missing items here.
- "name": the missing item, short and in friendly purchasable terms ("Pain", "Sodas et jus").
- "suggestedQuantity": rounded, purchasable units, ≤6 words ("3-4 baguettes", "6 bouteilles") — never
  decimals or false precision, prefer a count over bare litres.
- "reason": ≤8 words, ONLY if it points to something real in the menu and adds value ("plein de plats
  en sauce, le pain ira bien"); otherwise return an empty string. Never restate the name or summary,
  never assert facts not in the data.
</writing_style>

IMPORTANT: every OUTPUT string (summary, item names, suggestedQuantity, reasons) must be written in
${targetLanguageUpper}.`;
}

export function getCategorizationSystemPrompt(locale: string = "fr"): string {
  const safeLocale = locale in PROMPTS ? (locale as keyof typeof PROMPTS) : "en";
  const prompt = PROMPTS[safeLocale];
  const categoriesList = INGREDIENT_CATEGORIES.map((c) => `- ${c}`).join("\n");

  return `${prompt.catRole}

<categories>
${categoriesList}
</categories>

<instructions>
${prompt.catInstr}
</instructions>`;
}

export function getCategorizationUserPrompt(locale: string = "fr", items: string[]): string {
  const safeLocale = locale in PROMPTS ? (locale as keyof typeof PROMPTS) : "en";
  const list = items.map((n) => `- ${n}`).join("\n");
  return `${PROMPTS[safeLocale].catUser}\n${list}`;
}
