/**
 * Benchmark réel du parse de lien Sortie sur les sorties existantes
 * (cf. docs/superpowers/specs/2026-10-27-sortie-parse-quality-design.md §7).
 *
 *   npx tsx scripts/sortie/parse-benchmark.ts [--out <rapport.md>]
 *
 * Fait les vrais fetchs de pages et les vrais appels Ticketmaster, mais
 * n'écrit JAMAIS en base : la recherche Ticketmaster enregistre un
 * compteur via `trackServiceCall`, donc on pointe DATABASE_URL vers une
 * adresse injoignable AVANT de charger le code applicatif — toute écriture
 * échoue d'elle-même (et est avalée par `runAfterResponse`). Les liens sont
 * figés dans `parse-benchmark.cases.json` (export lecture seule).
 */
import { readFileSync, writeFileSync } from "node:fs";

process.env.DATABASE_URL = "postgres://benchmark-no-db@127.0.0.1:1/none";

type Case = {
  shortId: string;
  title: string;
  url: string;
  manualImage: boolean;
  publishedImage: string | null;
  knownGenericImage?: string;
  expect: { venue: string | null; time: string | null };
};

type Normalized = { image: string | null; venue: string | null; time: string | null };

const parisTime = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Ce que le wizard afficherait, quelle que soit la forme de réponse (avant/après Task 5). */
function normalize(event: Record<string, unknown>): Normalized {
  let time: string | null = null;
  if (typeof event.time === "string" || event.time === null) {
    time = (event.time as string | null) ?? null;
  } else if (typeof event.startsAt === "string") {
    // Ancien comportement du wizard : new Date(startsAt) lu en heure locale (Paris).
    const d = new Date(event.startsAt);
    time = Number.isNaN(d.getTime()) ? null : parisTime.format(d);
  }
  return {
    image: typeof event.image === "string" ? event.image : null,
    venue: typeof event.venue === "string" ? event.venue : null,
    time,
  };
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function venueOk(got: string | null, expected: string | null): boolean {
  if (!expected) {
    return true;
  }
  if (!got) {
    return false;
  }
  const g = fold(got);
  return expected.split("|").some((alt) => {
    const e = fold(alt);
    return g.includes(e) || e.includes(g);
  });
}

function imageStatus(c: Case, got: string | null): string {
  if (got && got === c.knownGenericImage) {
    return "générique";
  }
  if (c.manualImage || c.knownGenericImage) {
    if (!got) {
      return c.knownGenericImage ? "aucune (générique rejetée)" : "aucune";
    }
    return "trouvée (à vérifier)";
  }
  if (!got) {
    return "PERDUE";
  }
  return got === c.publishedImage ? "identique" : "changée (à vérifier)";
}

function timeStatus(expected: string | null, got: string | null): string {
  if (!got) {
    return "vide";
  }
  if (!expected) {
    return `? ${got}`;
  }
  return got === expected ? "OK" : `FAUSSE ${got}`;
}

async function main() {
  const dotenv = await import("dotenv");
  dotenv.config();
  const { parseEventUrl } =
    await import("../../src/features/sortie/lib/event-parse/parse-event-url");

  const outIdx = process.argv.indexOf("--out");
  const outFile = outIdx >= 0 ? process.argv[outIdx + 1] : null;
  const cases: Case[] = JSON.parse(
    readFileSync(new URL("./parse-benchmark.cases.json", import.meta.url), "utf8")
  );

  const lines = ["| Sortie | Image | Salle | Heure | Image obtenue |", "|---|---|---|---|---|"];
  let manualFound = 0;
  let autoLost = 0;
  let autoChanged = 0;
  let venueGood = 0;
  let timeWrong = 0;
  let timeGood = 0;

  for (const c of cases) {
    const { event } = await parseEventUrl(new URL(c.url));
    const got = normalize(event as unknown as Record<string, unknown>);
    const img = imageStatus(c, got.image);
    const vOk = venueOk(got.venue, c.expect.venue);
    const t = timeStatus(c.expect.time, got.time);
    if ((c.manualImage || c.knownGenericImage) && img.startsWith("trouvée")) {
      manualFound++;
    }
    if (img === "PERDUE") {
      autoLost++;
    }
    if (img.startsWith("changée")) {
      autoChanged++;
    }
    if (vOk) {
      venueGood++;
    }
    if (t.startsWith("FAUSSE")) {
      timeWrong++;
    }
    if (t === "OK") {
      timeGood++;
    }
    lines.push(
      `| ${c.title.slice(0, 32)} | ${img} | ${vOk ? "OK" : `KO (${got.venue ?? "∅"})`} | ${t} | ${got.image ?? "∅"} |`
    );
    console.error(`${c.shortId} done`);
  }

  // « À récupérer » = image ajoutée à la main OU image auto qui était un générique.
  const manualTotal = cases.filter((c) => c.manualImage || c.knownGenericImage).length;
  const autoTotal = cases.length - manualTotal;
  const summary = [
    `# Benchmark parse — ${new Date().toISOString().slice(0, 16)}`,
    "",
    `- Images à récupérer trouvées (à vérifier visuellement) : **${manualFound}/${manualTotal}**`,
    `- Images auto perdues : **${autoLost}/${autoTotal}** · changées (à vérifier) : ${autoChanged}`,
    `- Salle juste : **${venueGood}/${cases.length}**`,
    `- Heure juste : **${timeGood}/${cases.length}** · heure FAUSSE : **${timeWrong}**`,
    "",
    ...lines,
    "",
  ].join("\n");

  if (outFile) {
    writeFileSync(outFile, summary);
  }
  console.log(summary);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
