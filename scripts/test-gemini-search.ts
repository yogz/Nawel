/**
 * Smoke test pour la lib gemini-search.
 *
 * Lance avec : npx tsx --env-file=.env scripts/test-gemini-search.ts
 *
 * Teste 4 cas réalistes de fallback : 2 noms d'événements probablement
 * trouvables (concert connu, expo en cours), 1 nom approximatif, 1 fake.
 * Imprime ce que Gemini ramène pour évaluer la qualité de grounding.
 */
import { findEventDetails } from "../src/lib/gemini-search";

const CASES = [
  "Phoenix concert Paris",
  "Expo Picasso Centre Pompidou",
  "festival des vieilles charrues 2026",
  "concert licorne mauve banane sur la lune",
];

async function main() {
  for (const query of CASES) {
    console.log("\n" + "=".repeat(60));
    console.log("QUERY:", query);
    console.log("=".repeat(60));
    const t0 = performance.now();
    const result = await findEventDetails(query);
    const ms = Math.round(performance.now() - t0);
    console.log(`(${ms}ms)`);
    if (result.found) {
      console.log("FOUND ✓");
      console.log(JSON.stringify(result.data, null, 2));
      console.log("Sources consultées:", result.sources.length);
      result.sources.slice(0, 5).forEach((s) => console.log("  -", s));
    } else {
      console.log("NOT FOUND:", result.reason);
    }
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
