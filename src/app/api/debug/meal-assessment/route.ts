import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { events, meals } from "@drizzle/schema";
import { eq } from "drizzle-orm";
import { isWriteKeyValid } from "@/lib/auth";
import { generateMealAssessment, type MealAssessmentInput } from "@/lib/meal-assessment";

// TEMPORARY diagnostic endpoint for the per-meal assessment. Admin-key guarded.
// Remove once the banner is confirmed working in prod.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 45;

function safeParse(raw: string | null): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return { unparseable: raw };
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");
  const key = url.searchParams.get("key") ?? undefined;
  const run = url.searchParams.get("run") === "1";

  if (!slug) {
    return NextResponse.json({ error: "missing ?slug=" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      meals: {
        with: { services: { with: { items: { with: { person: true } } } } },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "event not found" }, { status: 404 });
  }
  if (!isWriteKeyValid(key, event.adminKey)) {
    return NextResponse.json({ error: "unauthorized (bad ?key=)" }, { status: 401 });
  }

  const env = {
    GOOGLE_GENERATIVE_AI_API_KEY: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
    AI_GATEWAY_API_KEY: Boolean(process.env.AI_GATEWAY_API_KEY),
  };

  const mealsOut = [];
  for (const meal of event.meals) {
    let adults = meal.adults;
    let children = meal.children;
    if (adults + children === 0) {
      adults = event.adults;
      children = event.children;
    }
    const totalItems = meal.services.reduce((sum, s) => sum + s.items.length, 0);

    let run_: unknown = undefined;
    if (run) {
      if (totalItems === 0 || adults + children === 0) {
        run_ = { skipped: "no items or zero headcount" };
      } else {
        const input: MealAssessmentInput = {
          title: meal.title,
          adults,
          children,
          services: meal.services.map((s) => ({
            title: s.title,
            items: s.items.map((i) => ({
              name: i.name,
              quantity: i.quantity,
              broughtBy: i.person?.name ?? null,
            })),
          })),
        };
        try {
          const assessment = await generateMealAssessment(input, event.locale, { rethrow: true });
          await db
            .update(meals)
            .set({ assessment: JSON.stringify(assessment), assessmentComputedAt: new Date() })
            .where(eq(meals.id, meal.id));
          run_ = { ok: true, assessment };
        } catch (e) {
          run_ = { ok: false, error: (e as Error).message };
        }
      }
    }

    mealsOut.push({
      id: meal.id,
      title: meal.title,
      date: meal.date,
      adultsRaw: meal.adults,
      childrenRaw: meal.children,
      adultsResolved: adults,
      childrenResolved: children,
      totalItems,
      itemsChangedAt: meal.itemsChangedAt,
      assessmentComputedAt: meal.assessmentComputedAt,
      hasStoredAssessment: meal.assessment !== null,
      storedAssessment: safeParse(meal.assessment),
      run: run_,
    });
  }

  return NextResponse.json({
    slug,
    locale: event.locale,
    eventAdults: event.adults,
    eventChildren: event.children,
    env,
    meals: mealsOut,
  });
}
