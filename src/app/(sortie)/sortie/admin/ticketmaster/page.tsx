import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { TicketmasterAdminSearchPanel } from "./search-panel";

export const metadata = {
  title: "Ticketmaster — admin",
  robots: { index: false, follow: false },
};

export default function AdminTicketmasterPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <nav className="mb-8">
        <Link
          href="/admin"
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          admin
        </Link>
      </nav>

      <header className="mb-10">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ ticketmaster
        </Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Inspecteur
        </h1>
        <p className="mt-4 text-[15px] text-ink-500">
          Recherche un event sur la Discovery API et inspecte le payload — toutes les images,
          venues, classifications, sales / presales, attractions.
        </p>
      </header>

      <TicketmasterAdminSearchPanel />
    </main>
  );
}
