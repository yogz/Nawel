import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { AssignForm } from "./assign-form";

export const metadata = {
  title: "Assignation manuelle — admin",
  robots: { index: false, follow: false },
};

export default function AdminAssignPage() {
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

      <AssignForm />
    </main>
  );
}
