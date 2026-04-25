import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Unbounded, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { displayNameOf } from "@/features/sortie/lib/participant-name";
import { PreviewView } from "./preview-view";

export const metadata: Metadata = {
  title: "Preview · Sortie",
  robots: { index: false, follow: false },
};

const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
  variable: "--font-pilot-display",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-pilot-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-pilot-mono",
  display: "swap",
});

type Props = {
  params: Promise<{ slugOrId: string }>;
};

export default async function PreviewPage({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  if (!shortId) {
    notFound();
  }

  const outing = await getOutingByShortId(shortId);
  if (!outing) {
    notFound();
  }

  const yesList = outing.participants.filter((p) => p.response === "yes");
  const interestedList = outing.participants.filter((p) => p.response === "interested");
  const totalHeads = yesList.reduce((acc, p) => acc + 1 + p.extraAdults + p.extraChildren, 0);

  const confirmed = yesList.map((p) => ({
    id: p.id,
    name: displayNameOf(p) ?? "Quelqu'un",
    image: p.user?.image ?? null,
  }));

  return (
    <div
      className={`${unbounded.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
      style={{ colorScheme: "dark" }}
    >
      <PreviewView
        title={outing.title}
        location={outing.location}
        startsAt={outing.fixedDatetime}
        deadlineAt={outing.deadlineAt}
        heroImageUrl={outing.heroImageUrl}
        ticketUrl={outing.eventLink}
        confirmed={confirmed}
        confirmedCount={yesList.length}
        interestedCount={interestedList.length}
        totalHeads={totalHeads}
      />
    </div>
  );
}
