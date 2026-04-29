import { NextResponse, type NextRequest } from "next/server";
import { runSortieSweeper } from "@/features/sortie/lib/sweeper";

// Vercel Cron hits us with `Authorization: Bearer ${CRON_SECRET}` when the
// secret is set in project env. Missing-secret → 500 (hard misconfig), not
// 401, so the failure is loud instead of silently "pretending to work".
export const dynamic = "force-dynamic";
// Node runtime needed — the sweeper uses pg + email fan-out which aren't
// edge-compatible.
export const runtime = "nodejs";
// Pro plan dispo, on profite des 300s pour absorber un pic d'outings à
// basculer (50k+ d'un coup en cas de migration ou de window manqué) et
// la fan-out d'emails Resend qui peut être longue.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[sortie-sweeper] CRON_SECRET is not configured");
    return NextResponse.json({ error: "not-configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  // Le logger applicatif silence info en prod, mais on veut les bornes
  // start/end visibles dans les logs Vercel pour confirmer que le cron
  // tourne. console.info est délibéré ici, pas un oubli.
  // eslint-disable-next-line no-console
  console.info("[sortie-sweeper] start", { startedAt });
  try {
    const report = await runSortieSweeper();
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.info("[sortie-sweeper] end", {
      durationMs,
      closedRsvps: report.closedRsvps,
      j1Reminders: report.j1Reminders,
      markedPast: report.markedPast,
      errors: report.errors.length,
    });
    return NextResponse.json({ ok: true, durationMs, ...report });
  } catch (err) {
    console.error("[sortie-sweeper] failed", { err, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
