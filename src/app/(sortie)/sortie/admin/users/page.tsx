import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Ban, ShieldCheck, Search } from "lucide-react";
import { searchAdminUsers, countUsers } from "@/features/sortie/queries/admin-user-queries";
import { Eyebrow } from "@/features/sortie/components/eyebrow";

export const metadata = {
  title: "Utilisateurs — admin",
  robots: { index: false, follow: false },
};

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeZone: "Europe/Paris",
});

const plural = (n: number, sing: string, plur = sing + "s") => (n > 1 ? plur : sing);

type SearchParams = Promise<{ q?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const rows = await searchAdminUsers({ q });
  const total = q ? null : await countUsers();

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

      <header className="mb-6">
        <Eyebrow className="mb-3">─ utilisateurs ─</Eyebrow>
        <h1 className="text-4xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700 sm:text-5xl">
          Utilisateurs
        </h1>
        <p className="mt-3 text-[14px] text-ink-500">
          {total !== null ? `${total} comptes Better Auth.` : `Recherche : ${q}`}
        </p>
      </header>

      <form method="get" action="/admin/users" className="mb-8">
        <label className="relative flex items-center">
          <Search
            size={16}
            strokeWidth={2}
            className="pointer-events-none absolute left-4 text-ink-400"
            aria-hidden
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Email, pseudo, nom…"
            className="h-12 w-full rounded-full border border-surface-300 bg-surface-50 pl-11 pr-4 text-[14px] text-ink-700 placeholder:text-ink-400 focus:border-acid-600 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </form>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-surface-300 p-8 text-center text-[14px] text-ink-400">
          Aucun utilisateur ne matche &laquo;&nbsp;{q}&nbsp;&raquo;.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((u) => (
            <li
              key={u.id}
              className="rounded-2xl border border-surface-300 bg-surface-50 p-4 transition-colors hover:border-acid-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-acid-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-acid-700">
                        <ShieldCheck size={10} strokeWidth={2.2} /> admin
                      </span>
                    ) : null}
                    {u.banned ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-red-900">
                        <Ban size={10} strokeWidth={2.2} /> banni
                        {u.banReason ? ` — ${u.banReason}` : ""}
                      </span>
                    ) : null}
                    {u.username ? (
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-400">
                        @{u.username}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-2 truncate text-[16px] font-bold text-ink-700">{u.name}</h2>
                  <p className="mt-0.5 truncate text-[12px] text-ink-500">{u.email}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-ink-400">
                    <span>inscrit {DATE_FMT.format(u.createdAt)}</span>
                    <span>
                      · {u.outingsCreated} {plural(u.outingsCreated, "sortie")}{" "}
                      {plural(u.outingsCreated, "créée")}
                    </span>
                    <span>· {u.rsvpCount} RSVP</span>
                  </p>
                </div>
                {u.username ? (
                  <Link
                    href={`/@${u.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center gap-1 rounded-full border border-surface-300 px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-500 transition-colors hover:border-acid-600 hover:text-acid-600"
                  >
                    profil
                    <ArrowUpRight size={12} strokeWidth={2.2} />
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
