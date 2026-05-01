import { asc, desc, ne } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { outings } from "@drizzle/sortie-schema";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { AssignForm } from "./assign-form";

export const metadata = {
  title: "Assignation manuelle — admin",
  robots: { index: false, follow: false },
};

const OUTINGS_DROPDOWN_LIMIT = 200;
const USERS_DROPDOWN_LIMIT = 500;

export default async function AdminAssignPage() {
  // Sorties non-annulées les plus récentes en tête. Cap à 200 pour
  // garder un native <select> performant sur mobile — au-delà, on
  // basculera sur un combobox cherchable.
  const outingsList = await db
    .select({
      shortId: outings.shortId,
      title: outings.title,
      fixedDatetime: outings.fixedDatetime,
      createdAt: outings.createdAt,
    })
    .from(outings)
    .where(ne(outings.status, "cancelled"))
    .orderBy(desc(outings.createdAt))
    .limit(OUTINGS_DROPDOWN_LIMIT);

  // Users triés par nom alphabétique pour rendre la recherche
  // type-to-jump du native picker utile.
  const usersList = await db
    .select({
      email: user.email,
      name: user.name,
    })
    .from(user)
    .orderBy(asc(user.name))
    .limit(USERS_DROPDOWN_LIMIT);

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          admin
        </Link>
      </nav>

      <header className="mb-8">
        <Eyebrow className="mb-3">─ assignation manuelle ─</Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Ajouter un user
          <br />à une sortie.
        </h1>
        <p className="mt-4 text-[14px] leading-relaxed text-ink-500">
          Crée ou met à jour la row participant pour un compte existant. Pour les cas où on doit
          forcer une présence sans passer par le flow RSVP normal — l'user ne pourra pas la modifier
          depuis son device tant qu'il n'a pas RSVP lui-même (le cookie hash placeholder sera
          réécrit à ce moment-là).
        </p>
      </header>

      <AssignForm outings={outingsList} users={usersList} />
    </main>
  );
}
