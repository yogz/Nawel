import { auth } from "@/lib/auth-config";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/components/admin/admin-header";
import { setRequestLocale, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function AdminPromptsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface p-4">
        <div className="rounded-2xl border border-white/20 bg-white/80 p-8 text-center shadow-lg backdrop-blur-sm">
          <h1 className="mb-2 text-xl font-bold text-red-600">Accès refusé</h1>
          <p className="text-muted-foreground">Vous n&apos;avez pas les droits administrateur.</p>
        </div>
      </div>
    );
  }

  // Get the AI prompts from translations
  const tAi = await getTranslations({ locale, namespace: "EventDashboard.AI" });

  const systemPrompt = tAi("systemPrompt", { guestDescription: "{guestDescription}" });
  const userPrompt = tAi("userPrompt", { itemName: "{itemName}" });
  const noteIndication = tAi("noteIndication", { note: "{note}" });

  // Categorization prompt (hardcoded in openrouter.ts)
  const categorizationSystemPrompt = `Tu es un expert en classement de produits de supermarché.
TA MISSION : Associer chaque article à la meilleure catégorie possible parmi cette liste stricte :
- fruits-vegetables (Fruits & Légumes)
- meat-fish (Boucherie & Poissonnerie)
- dairy-eggs (Crémerie & Œufs)
- bakery (Boulangerie)
- pantry-savory (Épicerie Salée)
- pantry-sweet (Épicerie Sucrée)
- beverages (Boissons)
- frozen (Surgelés)
- household-cleaning (Hygiène & Entretien)
- misc (Tout le reste)

Si un article est ambigu, choisis "misc".`;

  const categorizationUserPrompt = `Classe ces articles :
- {item1}
- {item2}
- ...`;

  return (
    <div className="min-h-screen bg-surface">
      <AdminHeader user={session.user} />
      <main className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text">Prompts IA</h1>
          <p className="text-muted-foreground">
            Prompts utilisés pour la génération et la catégorisation des ingrédients
          </p>
        </div>

        <div className="space-y-6">
          {/* Ingredient Generation */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-purple-600">
              Génération d&apos;ingrédients
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  System Prompt
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 text-sm text-green-400 font-mono overflow-x-auto">
                  {systemPrompt}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  User Prompt
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 text-sm text-blue-400 font-mono">
                  {userPrompt}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Note Indication (optionnel)
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 text-sm text-yellow-400 font-mono">
                  {noteIndication}
                </pre>
              </div>

              <div className="rounded-xl bg-purple-50 p-4 dark:bg-purple-950/30">
                <h3 className="mb-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                  Variables dynamiques
                </h3>
                <ul className="space-y-1 text-sm text-purple-600 dark:text-purple-400">
                  <li>
                    <code className="rounded bg-purple-100 px-1 dark:bg-purple-900">
                      {"{guestDescription}"}
                    </code>
                    {" → "}Ex: &quot;4 portions&quot;
                  </li>
                  <li>
                    <code className="rounded bg-purple-100 px-1 dark:bg-purple-900">
                      {"{itemName}"}
                    </code>
                    {" → "}Ex: &quot;Lasagnes&quot;
                  </li>
                  <li>
                    <code className="rounded bg-purple-100 px-1 dark:bg-purple-900">
                      {"{note}"}
                    </code>
                    {" → "}Ex: &quot;Sans gluten, marque Barilla&quot;
                  </li>
                </ul>
                <p className="mt-3 text-xs text-purple-500 dark:text-purple-400">
                  <strong>Calcul des portions :</strong> adultes + (enfants × 0.5)
                </p>
              </div>
            </div>
          </section>

          {/* Categorization */}
          <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-amber-600">
              Catégorisation simple (sans génération)
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  System Prompt
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 text-sm text-green-400 font-mono overflow-x-auto">
                  {categorizationSystemPrompt}
                </pre>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  User Prompt
                </h3>
                <pre className="whitespace-pre-wrap rounded-xl bg-zinc-900 p-4 text-sm text-blue-400 font-mono">
                  {categorizationUserPrompt}
                </pre>
              </div>

              <div className="rounded-xl bg-amber-50 p-4 dark:bg-amber-950/30">
                <h3 className="mb-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
                  Utilisation
                </h3>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Utilisé quand l&apos;utilisateur décoche un item dans le dialog de génération.
                  L&apos;item est classé dans la bonne catégorie sans générer d&apos;ingrédients
                  détaillés.
                </p>
              </div>
            </div>
          </section>

          {/* Source files */}
          <section className="rounded-xl bg-muted/50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Fichiers source</h3>
            <ul className="space-y-1 text-xs text-muted-foreground font-mono">
              <li>• messages/{locale}.json → EventDashboard.AI</li>
              <li>• src/lib/openrouter.ts → categorizeItems()</li>
              <li>• src/app/actions/ingredient-actions.ts</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
