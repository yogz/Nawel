import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import { EMAIL_CATALOG } from "@/features/sortie/lib/emails/catalog";

export const metadata = {
  title: "Emails — admin",
  robots: { index: false, follow: false },
};

const REPO_BLOB_BASE = "https://github.com/yogz/Nawel/blob/main";

export default function AdminEmailsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 pb-24 pt-10">
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
        <Eyebrow className="mb-3">─ emails ─</Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Emails envoyés
        </h1>
        <p className="mt-3 max-w-prose text-[14px] text-ink-500">
          {EMAIL_CATALOG.length} templates au catalogue. Preview rendu avec des données mock, isolé
          dans un iframe sandbox — aucun envoi réel ne part d&rsquo;ici.
        </p>
      </header>

      <ul className="flex flex-col gap-10">
        {EMAIL_CATALOG.map((entry) => {
          const { subject, html } = entry.render();
          const sourceUrl = `${REPO_BLOB_BASE}/${entry.sourcePath.replace(":", "#L")}`;
          return (
            <li
              key={entry.id}
              className="overflow-hidden rounded-2xl border border-surface-300 bg-surface-50"
            >
              <div className="flex flex-col gap-2 border-b border-surface-300 bg-surface-100 p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[18px] font-black leading-tight tracking-[-0.02em] text-ink-700">
                    {entry.name}
                  </h2>
                  <code className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
                    {entry.id}
                  </code>
                </div>
                <p className="text-[13px] leading-[1.5] text-ink-500">{entry.trigger}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-ink-400">
                  <span>
                    <span className="uppercase tracking-[0.12em] text-ink-300">subject</span>{" "}
                    <span className="text-ink-600">{subject}</span>
                  </span>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="uppercase tracking-[0.12em] text-acid-700 underline-offset-4 hover:underline"
                  >
                    voir le code →
                  </a>
                </div>
              </div>
              <iframe
                title={`Preview ${entry.name}`}
                srcDoc={html}
                sandbox=""
                loading="lazy"
                className="h-[640px] w-full border-0 bg-white"
              />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
