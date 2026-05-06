import Link from "next/link";
import { listAuditLog, countAuditLog } from "@/features/sortie/queries/audit-log-queries";

export const metadata = {
  title: "Audit log",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Page de lecture du `sortie.audit_log`. Le gate step-up TOTP est posé
// au layout admin parent — pas de check supplémentaire ici. Page FR-only.

export default async function SortieAdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageStr ?? "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    listAuditLog({ limit: PAGE_SIZE, offset }),
    countAuditLog(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-muted-foreground text-sm">
            {total} entrée{total > 1 ? "s" : ""} · page {page} / {totalPages}
          </p>
        </div>
      </header>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Quand</th>
              <th className="px-3 py-2 text-left font-medium">Qui</th>
              <th className="px-3 py-2 text-left font-medium">Action</th>
              <th className="px-3 py-2 text-left font-medium">Cible</th>
              <th className="px-3 py-2 text-left font-medium">Détails</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td className="text-muted-foreground px-3 py-6 text-center" colSpan={5}>
                  Aucune entrée pour l&apos;instant.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="text-muted-foreground whitespace-nowrap px-3 py-2 align-top font-mono text-xs">
                    {formatDate(e.createdAt)}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {e.actorEmail ? (
                      <span title={e.actorUserId ?? ""}>{e.actorEmail}</span>
                    ) : (
                      <span className="text-muted-foreground italic">système</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{e.action}</code>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {e.outingShortId ? (
                      <Link
                        href={`/${e.outingShortId}`}
                        className="hover:underline"
                        title={e.outingTitle ?? undefined}
                      >
                        {truncate(e.outingTitle ?? e.outingShortId, 40)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {e.payload ? (
                      <details className="text-xs">
                        <summary className="text-muted-foreground hover:text-foreground cursor-pointer">
                          {summarizePayload(e.payload)}
                        </summary>
                        <pre className="bg-muted mt-1 max-w-md overflow-x-auto rounded p-2 text-[11px]">
                          {prettyPayload(e.payload)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-4 flex items-center justify-between text-sm">
        <Link
          href={hasPrev ? `/admin/audit-log?page=${page - 1}` : "#"}
          className={
            hasPrev
              ? "text-foreground hover:underline"
              : "text-muted-foreground pointer-events-none opacity-50"
          }
          aria-disabled={!hasPrev}
        >
          ← Précédent
        </Link>
        <span className="text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Link
          href={hasNext ? `/admin/audit-log?page=${page + 1}` : "#"}
          className={
            hasNext
              ? "text-foreground hover:underline"
              : "text-muted-foreground pointer-events-none opacity-50"
          }
          aria-disabled={!hasNext}
        >
          Suivant →
        </Link>
      </nav>
    </div>
  );
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(d);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function summarizePayload(payload: string): string {
  try {
    const obj = JSON.parse(payload) as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return "(vide)";
    }
    return keys.slice(0, 3).join(", ") + (keys.length > 3 ? "…" : "");
  } catch {
    return truncate(payload, 40);
  }
}

function prettyPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2);
  } catch {
    return payload;
  }
}
