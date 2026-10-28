import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth-config";
import { db } from "@/lib/db";
import { participants, purchases } from "@drizzle/sortie-schema";
import { Eyebrow } from "@/features/sortie/components/eyebrow";
import {
  WhoIsComingForm,
  type WhoIsComingRegular,
} from "@/features/sortie/components/who-is-coming-form";
import {
  groupRegulars,
  personKey,
  toRegularView,
} from "@/features/sortie/lib/already-bought/regulars";
import { canonicalPathSegment, extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { listRegularRows } from "@/features/sortie/queries/regulars-queries";

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export const metadata = {
  title: "Qui vient ?",
  robots: { index: false, follow: false },
};

/**
 * « Qui vient ? » — sortie créée « billets déjà pris » : l'organisateur
 * coche ses habitués ou ajoute quelqu'un, puis passe à l'achat. Réservé à
 * l'organisateur connecté ; le navigateur ne reçoit jamais d'adresse
 * e-mail ni d'identifiant de compte (cf. already-bought/regulars.ts).
 */
export default async function WhoIsComingPage({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  const outing = shortId ? await getOutingByShortId(shortId) : null;
  if (!outing || !outing.alreadyBought || outing.status === "cancelled") {
    notFound();
  }
  const canonical = canonicalPathSegment({ slug: outing.slug, shortId: outing.shortId });
  if (canonical !== slugOrId) {
    redirect(`/${canonical}/qui-vient`);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id ?? null;
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!userId || userId !== outing.creatorUserId || !secret) {
    notFound();
  }

  const purchase = await db.query.purchases.findFirst({
    where: eq(purchases.outingId, outing.id),
    columns: { id: true },
  });
  if (purchase) {
    redirect(`/${canonical}/dettes`);
  }

  const [rows, current] = await Promise.all([
    listRegularRows(userId),
    db
      .select({
        userId: participants.userId,
        anonName: participants.anonName,
        anonEmail: participants.anonEmail,
        extraAdults: participants.extraAdults,
        extraChildren: participants.extraChildren,
      })
      .from(participants)
      .where(eq(participants.outingId, outing.id)),
  ]);

  const currentByKey = new Map(
    current.map((r) => [
      personKey({ userId: r.userId, email: r.anonEmail, anonName: r.anonName }),
      r,
    ])
  );
  const self = current.find((r) => r.userId === userId);
  const regulars: WhoIsComingRegular[] = groupRegulars(rows, userId).map((r) => {
    const inOuting = currentByKey.get(r.key);
    return {
      ...toRegularView(r, secret),
      selected: inOuting !== undefined,
      extraAdults: inOuting?.extraAdults ?? 0,
      extraChildren: inOuting?.extraChildren ?? 0,
    };
  });

  return (
    <main className="mx-auto max-w-xl px-6 pt-10">
      <nav className="mb-8">
        <Link
          href={`/${canonical}`}
          className="inline-flex h-11 items-center gap-1.5 rounded-full px-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400 transition-colors hover:bg-surface-100 hover:text-acid-600"
        >
          <ArrowLeft size={14} strokeWidth={2.2} />
          {outing.title}
        </Link>
      </nav>

      <header className="mb-8">
        <Eyebrow tone="hot" glow className="mb-3">
          ─ qui vient ─
        </Eyebrow>
        <h1 className="text-5xl leading-[0.95] font-black tracking-[-0.04em] text-ink-700">
          Qui vient ?
        </h1>
        <p className="mt-3 text-sm text-ink-500">
          Coche ceux qui ont une place. Tu es déjà compté.
        </p>
      </header>

      <WhoIsComingForm
        shortId={outing.shortId}
        regulars={regulars}
        self={{ extraAdults: self?.extraAdults ?? 0, extraChildren: self?.extraChildren ?? 0 }}
      />
    </main>
  );
}
