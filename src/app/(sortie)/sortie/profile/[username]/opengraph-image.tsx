import { ImageResponse } from "next/og";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@drizzle/schema";
import { listPublicProfileOutings } from "@/features/sortie/queries/outing-queries";

// Format mini-agenda : carte profil = menu des prochaines sorties (4 lignes
// datées + compteur "+ N autres"). Cible le cas d'usage natif "voilà ce que
// je vais voir, dites-moi si vous voulez venir" partagé en WhatsApp/DM aux
// amis. Plus de focus sur "la prochaine" — c'est la *série* qui crée la
// valeur du partage de profil.
export const alt = "Sortie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pas de `runtime = "edge"` : la route importe `db` (postgres-js) — voir
// /[slugOrId]/opengraph-image.tsx pour le détail. Fluid Compute = OK.
export const revalidate = 60;

// "Acid Cabinet" palette — see /[slugOrId]/opengraph-image.tsx for the
// rationale. Token names stay opaque ids; only the hex values flip.
const SURFACE = "#0A0A0A";
const SURFACE_DEEP = "#161616";
const INK_700 = "#F5F2EB";
const INK_500 = "#A0A0A0";
const INK_400 = "#7A7A7A";
const HOT = "#FF3D81";
const HOT_DEEP = "#E63577";
const ACID = "#C7FF3C";

const TZ = "Europe/Paris";
const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: TZ });
const monthShortFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: TZ });

const MENU_LIMIT = 4;

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

  const { upcoming } = await listPublicProfileOutings(row.id);

  // Re-trie par startsAt asc (la query renvoie en `desc(createdAt)` par
  // défaut). Pour le menu il faut la chronologie "ce qui arrive en premier".
  const dated = upcoming
    .filter((o): o is typeof o & { startsAt: Date } => o.startsAt !== null)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  if (upcoming.length === 0) {
    return renderEmpty(row.name, row.username);
  }

  const featured = dated.slice(0, MENU_LIMIT);
  const overflow = upcoming.length - featured.length;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 20% 10%, ${SURFACE} 0%, ${SURFACE_DEEP} 100%)`,
        fontFamily: '"Inter Tight", "Inter", system-ui',
        position: "relative",
        padding: "76px 100px",
      }}
    >
      <Passepartout />
      <Seal />

      {/* Header — handle + nom + filet or + label agenda */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: HOT_DEEP,
            marginBottom: 12,
          }}
        >
          {`@${row.username}`}
        </div>
        <div
          style={{
            fontSize: nameSize(row.name),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: INK_700,
            lineHeight: 1.0,
            maxWidth: 800,
          }}
        >
          {row.name}
        </div>
        <div
          style={{
            width: 60,
            height: 1,
            background: HOT,
            opacity: 0.6,
            marginTop: 18,
            marginBottom: 22,
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: INK_500,
          }}
        >
          {buildAgendaLabel(upcoming.length)}
        </div>
      </div>

      {/* Menu rows */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          marginTop: 32,
          gap: 14,
        }}
      >
        {featured.map((o) => (
          <MenuRow key={o.id} title={o.title} date={o.startsAt} />
        ))}
        {overflow > 0 && (
          <div
            style={{
              fontSize: 20,
              fontWeight: 500,
              color: INK_400,
              letterSpacing: "0.04em",
              marginTop: 6,
            }}
          >
            {`+ ${overflow} autre${overflow > 1 ? "s" : ""}`}
          </div>
        )}
        {/* Edge case: que des sorties non datées (mode vote sans créneau
                choisi). On ne montre pas les titres pour rester sobre — le
                compteur "Agenda · N sorties" en haut suffit. */}
        {featured.length === 0 && (
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              color: INK_500,
              lineHeight: 1.4,
              maxWidth: 760,
            }}
          >
            {"Dates en cours de coordination — RDV bientôt."}
          </div>
        )}
      </div>

      <BrandBottomLeft />
    </div>,
    { ...size }
  );
}

function MenuRow({ title, date }: { title: string; date: Date }) {
  const day = dayFmt.format(date);
  const month = monthShortFmt.format(date).replace(/\./g, "").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 28,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          width: 130,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: ACID,
            letterSpacing: "-0.01em",
          }}
        >
          {day}
        </span>
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.14em",
            color: ACID,
          }}
        >
          {month}
        </span>
      </div>
      <div
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: INK_700,
          lineHeight: 1.2,
          flex: 1,
          display: "-webkit-box",
          WebkitLineClamp: 1,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </div>
    </div>
  );
}

function buildAgendaLabel(count: number): string {
  if (count === 1) {
    return "Agenda · 1 sortie à venir";
  }
  return `Agenda · ${count} sorties à venir`;
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

function renderEmpty(name: string, username: string) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 20% 10%, ${SURFACE} 0%, ${SURFACE_DEEP} 100%)`,
        fontFamily: '"Inter Tight", "Inter", system-ui',
        position: "relative",
        padding: "76px 100px",
      }}
    >
      <Passepartout />
      <Seal />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: HOT_DEEP,
            marginBottom: 12,
          }}
        >
          {`@${username}`}
        </div>
        <div
          style={{
            fontSize: nameSize(name),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: INK_700,
            lineHeight: 1.0,
          }}
        >
          {name}
        </div>
        <div
          style={{
            width: 60,
            height: 1,
            background: HOT,
            opacity: 0.6,
            marginTop: 18,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: INK_500,
            lineHeight: 1.3,
            maxWidth: 760,
          }}
        >
          {"Les prochaines sorties arriveront ici."}
        </div>
      </div>
      <BrandBottomLeft />
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
        background: SURFACE,
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: INK_700,
          letterSpacing: "-0.02em",
        }}
      >
        {"Profil Sortie"}
      </div>
    </div>,
    { ...size }
  );
}

function Passepartout() {
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        right: 40,
        bottom: 40,
        border: `1px solid ${HOT}`,
        opacity: 0.35,
      }}
    />
  );
}

function Seal() {
  return (
    <div
      style={{
        position: "absolute",
        top: 80,
        right: 88,
        width: 88,
        height: 88,
        borderRadius: "50%",
        background: ACID,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-6deg)",
        color: HOT,
        fontSize: 44,
        fontWeight: 800,
        letterSpacing: "-0.04em",
      }}
    >
      {"S"}
    </div>
  );
}

function BrandBottomLeft() {
  return (
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
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACID }} />
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: ACID,
          letterSpacing: "0.02em",
        }}
      >
        {"Sortie"}
      </div>
    </div>
  );
}
