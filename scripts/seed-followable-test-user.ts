import * as dotenv from "dotenv";
dotenv.config();

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { user } from "../drizzle/schema";
import { outings } from "../drizzle/sortie-schema";
import { generateUniqueShortId, slugifyAscii } from "../src/features/sortie/lib/short-id";

const TEST_EMAIL = "camille.test@example.com";
const TEST_USERNAME = "camille-test";
const TEST_NAME = "Camille Test";
const TEST_BIO = "Compte de test — agenda culturel de Camille ce mois-ci.";

type OutingSeed = {
  title: string;
  vibe: "theatre" | "opera" | "concert" | "cine" | "expo" | "autre";
  location: string;
  startsAt: Date;
};

const SEEDS: OutingSeed[] = [
  {
    title: "Hamlet — Théâtre de la Ville",
    vibe: "theatre",
    location: "Théâtre de la Ville, Paris",
    startsAt: new Date("2026-05-08T20:00:00+02:00"),
  },
  {
    title: "Concert Chilly Gonzales",
    vibe: "concert",
    location: "Philharmonie de Paris",
    startsAt: new Date("2026-05-15T20:30:00+02:00"),
  },
  {
    title: "Avant-première — Le dernier Anderson",
    vibe: "cine",
    location: "MK2 Bibliothèque",
    startsAt: new Date("2026-05-22T19:45:00+02:00"),
  },
  {
    title: "Expo Niki de Saint Phalle",
    vibe: "expo",
    location: "Grand Palais",
    startsAt: new Date("2026-05-29T18:00:00+02:00"),
  },
];

async function ensureTestUser(): Promise<string> {
  const existing = await db.query.user.findFirst({
    where: sql`lower(${user.email}) = ${TEST_EMAIL.toLowerCase()}`,
    columns: { id: true, username: true },
  });
  if (existing) {
    console.log(`User existant trouvé (id=${existing.id}, username=@${existing.username}).`);
    return existing.id;
  }

  const id = randomUUID();
  await db.insert(user).values({
    id,
    name: TEST_NAME,
    email: TEST_EMAIL,
    username: TEST_USERNAME,
    emailVerified: true,
    role: "user",
    language: "fr",
    bio: TEST_BIO,
  });
  console.log(`User créé : ${TEST_NAME} (id=${id}, @${TEST_USERNAME}).`);
  return id;
}

async function ensureOuting(creatorUserId: string, seed: OutingSeed) {
  // Idempotence : on ne re-crée pas un outing avec exactement le même
  // title + creator. Permet de re-lancer le script sans dupliquer.
  const existing = await db.query.outings.findFirst({
    where: sql`${outings.creatorUserId} = ${creatorUserId} AND ${outings.title} = ${seed.title}`,
    columns: { id: true, shortId: true, slug: true },
  });
  if (existing) {
    console.log(`  ↳ existe déjà : ${seed.title} (${existing.shortId})`);
    return;
  }

  const shortId = await generateUniqueShortId();
  const slug = slugifyAscii(seed.title, 40);
  // Deadline RSVP : 24h avant l'événement.
  const deadlineAt = new Date(seed.startsAt.getTime() - 24 * 60 * 60 * 1000);

  await db.insert(outings).values({
    shortId,
    slug,
    title: seed.title,
    location: seed.location,
    fixedDatetime: seed.startsAt,
    deadlineAt,
    mode: "fixed",
    status: "open",
    showOnProfile: true,
    vibe: seed.vibe,
    creatorUserId,
  });
  console.log(`  ↳ créée : ${seed.title} → /sortie/${slug}-${shortId}`);
}

async function main() {
  console.log(`Seed Camille Test sur DB : ${process.env.DATABASE_URL?.split("@")[1] ?? "?"}`);
  const userId = await ensureTestUser();

  for (const seed of SEEDS) {
    await ensureOuting(userId, seed);
  }

  console.log(`\nProfil public : /sortie/profile/${TEST_USERNAME}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
