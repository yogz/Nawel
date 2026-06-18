import { NextResponse, type NextRequest } from "next/server";
import { runMealAssessmentSweeper } from "@/features/meals/lib/assessment-sweeper";

// Vercel Cron hits us with `Authorization: Bearer ${CRON_SECRET}`. Missing
// secret → 500 (hard misconfig), not 401, so the failure is loud.
export const dynamic = "force-dynamic";
// Node runtime — the sweeper uses pg + the AI SDK, not edge-compatible.
export const runtime = "nodejs";
// Pro plan: allow up to 300s to absorb a backlog of meals to (re)assess.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[meal-assessment] CRON_SECRET is not configured");
    return NextResponse.json({ error: "not-configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  // eslint-disable-next-line no-console
  console.info("[meal-assessment] start", { startedAt });
  try {
    const report = await runMealAssessmentSweeper();
    const durationMs = Date.now() - startedAt;
    // eslint-disable-next-line no-console
    console.info("[meal-assessment] end", { durationMs, ...report });
    return NextResponse.json({ ok: true, durationMs, ...report });
  } catch (err) {
    console.error("[meal-assessment] failed", { err, durationMs: Date.now() - startedAt });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
