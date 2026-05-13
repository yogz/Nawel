import { NextResponse } from "next/server";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { buildOutingEventIcs } from "@/features/sortie/lib/build-event-ics";

// Runtime explicite : Edge déprécié sur Vercel + on utilise pg via
// Drizzle (pas compatible Edge). Cohérent avec api/sortie/**.
export const runtime = "nodejs";

const PUBLIC_BASE = process.env.SORTIE_BASE_URL ?? "https://sortie.colist.fr";

/**
 * Returns the outing as an iCalendar (.ics) file so iOS, Android,
 * Gmail, Outlook etc. can import it into their native calendar.
 * URL: `/<slugOrId>/agenda`. The browser treats the `text/calendar`
 * Content-Type plus the `.ics` Content-Disposition filename as an
 * "Add to Calendar" trigger on mobile.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slugOrId: string }> }) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    return new NextResponse("Not found", { status: 404 });
  }
  const outing = await getOutingByShortId(shortId);
  if (!outing || outing.status === "cancelled" || !outing.fixedDatetime) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { content, filename } = buildOutingEventIcs({
    outing: {
      shortId: outing.shortId,
      slug: outing.slug,
      title: outing.title,
      location: outing.location,
      fixedDatetime: outing.fixedDatetime,
      sequence: outing.sequence,
      createdAt: outing.createdAt,
      updatedAt: outing.updatedAt,
    },
    method: "PUBLISH",
    publicBase: PUBLIC_BASE,
  });

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // The calendar file is safe to cache briefly — event updates
      // should invalidate via the generateMetadata revalidate path on
      // the parent page. 5 minutes keeps WhatsApp / iOS previews from
      // re-downloading on every tap.
      "Cache-Control": "public, max-age=300",
    },
  });
}
