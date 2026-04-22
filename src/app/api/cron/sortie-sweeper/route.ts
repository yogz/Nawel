import { NextResponse, type NextRequest } from "next/server";
import { runSortieSweeper } from "@/features/sortie/lib/sweeper";

// Vercel Cron hits us with `Authorization: Bearer ${CRON_SECRET}` when the
// secret is set in project env. Missing-secret → 500 (hard misconfig), not
// 401, so the failure is loud instead of silently "pretending to work".
export const dynamic = "force-dynamic";
// Node runtime needed — the sweeper uses pg + email fan-out which aren't
// edge-compatible.
export const runtime = "nodejs";
// Give the sweeper a little room. Vercel Hobby caps at 10s, Pro at 300s.
export const maxDuration = 60;

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
  try {
    const report = await runSortieSweeper();
    const durationMs = Date.now() - startedAt;
    return NextResponse.json({ ok: true, durationMs, ...report });
  } catch (err) {
    console.error("[sortie-sweeper] failed", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
