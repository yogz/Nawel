import { ImageResponse } from "next/og";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { listPublicProfileOutings } from "@/features/sortie/queries/outing-queries";
import { formatRelativeDateForShare, formatTimeOnly } from "@/features/sortie/lib/date-fr";

// Keep compatible with WhatsApp full-width preview (1.91:1) rather than the
// carré 1:1 spec — WhatsApp thumbnails squares at 80×80 against the chat
// margin, losing ~75% of the surface. Full-width renders correctly on
// iMessage/Signal/Telegram too.
export const alt = "Sortie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const runtime = "edge";
export const revalidate = 60;

// "Acid Cabinet" palette — see /[slugOrId]/opengraph-image.tsx for the
// rationale. Token names stay opaque ids; only the hex values flip.
const IVOIRE = "#0A0A0A";
const IVOIRE_DEEP = "#161616";
const ENCRE_700 = "#F5F2EB";
const ENCRE_500 = "#A0A0A0";
const OR = "#FF3D81";
const OR_DEEP = "#E63577";
const BORDEAUX = "#C7FF3C";

type Props = { params: Promise<{ username: string }> };

export default async function Image({ params }: Props) {
  const { username } = await params;
  const lookup = decodeURIComponent(username).toLowerCase();

  const row = await db.query.user.findFirst({
    where: sql`lower(${user.username}) = ${lookup}`,
    columns: { id: true, name: true, username: true },
  });

  if (!row || !row.username) {
    return renderFallback();
  }

  const { upcoming, past } = await listPublicProfileOutings(row.id);
  const next = upcoming.find((o) => o.startsAt !== null) ?? upcoming[0] ?? null;
  const totalOrganised = upcoming.length + past.length;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 20% 10%, ${IVOIRE} 0%, ${IVOIRE_DEEP} 100%)`,
        fontFamily: '"Inter Tight", "Inter", system-ui',
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          border: `1px solid ${OR}`,
          opacity: 0.35,
        }}
      />

      {/* Wax seal — kept identical to the event OG so the profile and event
            cards feel visibly from the same family when both appear in a
            WhatsApp thread. */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 88,
          width: 88,
          height: 88,
          borderRadius: "50%",
          background: BORDEAUX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-6deg)",
          color: OR,
          fontSize: 44,
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        S
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: "0 100px",
          width: "100%",
        }}
      >
        <Avatar name={row.name} />

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: OR_DEEP,
              marginBottom: 16,
            }}
          >
            @{row.username}
          </div>

          <div
            style={{
              fontSize: nameSize(row.name),
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: ENCRE_700,
              lineHeight: 1.02,
              marginBottom: 20,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              maxWidth: 700,
            }}
          >
            {row.name}
          </div>

          <div
            style={{
              width: 60,
              height: 1,
              background: OR,
              opacity: 0.6,
              marginBottom: 20,
            }}
          />

          <ProfileTagline next={next} totalOrganised={totalOrganised} />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 72,
          left: 100,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: BORDEAUX,
          }}
        />
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: BORDEAUX,
            letterSpacing: "0.02em",
          }}
        >
          Sortie
        </div>
      </div>
    </div>,
    { ...size }
  );
}

function renderFallback() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: IVOIRE,
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: ENCRE_700,
          letterSpacing: "-0.02em",
        }}
      >
        Profil Sortie
      </div>
    </div>,
    { ...size }
  );
}

function nameSize(name: string): number {
  if (name.length <= 20) {
    return 76;
  }
  if (name.length <= 32) {
    return 60;
  }
  return 48;
}

function Avatar({ name }: { name: string }) {
  // Initial-disc avatar rather than a remote `<img>` fetch — Google OAuth
  // URLs are the usual `image` source and fetching them from the edge is
  // unreliable (rate limits, 403, latency). Two initials read as identity
  // and stay on-brand; keeps the PNG under 150 KB.
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      style={{
        width: 240,
        height: 240,
        borderRadius: "50%",
        background: BORDEAUX,
        color: OR,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 96,
        fontWeight: 700,
        letterSpacing: "-0.04em",
        boxShadow: `0 0 0 6px ${IVOIRE}, 0 0 0 7px ${OR}`,
        flexShrink: 0,
      }}
    >
      {initials || "?"}
    </div>
  );
}

function ProfileTagline({
  next,
  totalOrganised,
}: {
  next: { title: string; startsAt: Date | null; confirmedCount: number } | null;
  totalOrganised: number;
}) {
  if (next) {
    const dateLine = next.startsAt
      ? `${capitalise(formatRelativeDateForShare(next.startsAt))} · ${formatTimeOnly(
          next.startsAt
        )}`
      : "Bientôt";
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: ENCRE_500,
            marginBottom: 8,
          }}
        >
          Prochaine sortie
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: ENCRE_700,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            maxWidth: 700,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {next.title}
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            color: BORDEAUX,
            marginTop: 6,
          }}
        >
          {dateLine}
          {next.confirmedCount >= 3 ? ` · ${next.confirmedCount} déjà partants` : ""}
        </div>
      </div>
    );
  }
  if (totalOrganised > 0) {
    const label = totalOrganised === 1 ? "sortie organisée" : "sorties organisées";
    return (
      <div
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: ENCRE_500,
          lineHeight: 1.3,
        }}
      >
        {totalOrganised} {label}
      </div>
    );
  }
  return (
    <div
      style={{
        fontSize: 26,
        fontWeight: 500,
        color: ENCRE_500,
        lineHeight: 1.3,
      }}
    >
      Les prochaines sorties arriveront ici.
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
