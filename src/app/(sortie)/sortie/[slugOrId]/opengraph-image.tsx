import { ImageResponse } from "next/og";
import { extractShortId } from "@/features/sortie/lib/parse-outing-path";
import { getOutingByShortId } from "@/features/sortie/queries/outing-queries";
import { buildOutingShareMeta } from "@/features/sortie/lib/outing-share-meta";
import { formatRelativeDateForShare, formatTimeOnly } from "@/features/sortie/lib/date-fr";

// WhatsApp spec targets 1200×630 @ <300 KB. Satori renders to PNG; we avoid
// blur filters, remote `<img>` fetches, and multi-stop gradients — those are
// the three things that push PNG past the 300 KB cliff where WhatsApp
// silently drops the preview.
export const alt = "Sortie";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pas de `runtime = "edge"` : la route importe `db` (postgres-js) qui
// s'appuie sur les sockets TCP Node — incompatibles avec l'edge runtime
// et faisaient hang la fonction jusqu'au timeout 25 s (FUNCTION_INVOCATION_
// _TIMEOUT). Fluid Compute = mêmes régions, mêmes coûts, postgres natif.
export const revalidate = 60;

// "Acid Cabinet" palette — share preview alignée sur le thème dark in-app.
// Constantes nommées par rôle (cf. tailwind.config) :
//   SURFACE / SURFACE_DEEP = fonds dark (cartes, panneaux)
//   INK_700 / INK_500      = texte foreground / muted
//   HOT / HOT_DEEP         = accent secondaire (rose électrique)
//   ACID / ACID_DEEP       = accent primaire (vert acide)
const SURFACE = "#0A0A0A";
const SURFACE_DEEP = "#161616";
const INK_700 = "#F5F2EB";
const INK_500 = "#A0A0A0";
const HOT = "#FF3D81";
const HOT_DEEP = "#E63577";
const ACID = "#C7FF3C";
const ACID_DEEP = "#A8E62E";
// Scrim derrière les photos hero. Même teinte que SURFACE — split pour
// expliciter l'intention quand on sur-densifie l'overlay sur photo claire.
const SCRIM = "#0A0A0A";

type Props = { params: Promise<{ slugOrId: string }> };

export default async function Image({ params }: Props) {
  const { slugOrId } = await params;
  const shortId = extractShortId(slugOrId);
  const outing = shortId ? await getOutingByShortId(shortId) : null;

  if (!outing) {
    return renderFallback();
  }

  const meta = buildOutingShareMeta(outing);
  if (meta.isCancelled) {
    return renderCancelled({ title: outing.title });
  }

  const startsAt = outing.fixedDatetime;
  const eyebrow = startsAt ? buildEyebrow(startsAt) : "Sortie à venir";
  const location = outing.location?.trim() ?? null;

  // Hero-image variant: when the organiser pasted a ticket page, we have a
  // real photo at `heroImageUrl`. Compose it as cover with a noir overlay
  // so the text stays legible — experts converge on noir over acid green
  // (any chromatic overlay on photo browns into mud).
  //
  // Prefer the pre-resized 1200×630 JPEG companion (`heroImageOgUrl`):
  // running Satori over a 5 MB upload pushes the final PNG past the
  // ~300 KB cliff at which WhatsApp silently drops the preview. Fall
  // back on the raw original for outings created before the companion
  // column existed.
  const heroForOg = outing.heroImageOgUrl ?? outing.heroImageUrl;
  if (heroForOg) {
    return renderWithHero({
      heroImageUrl: heroForOg,
      title: outing.title,
      eyebrow,
      location,
      firstName: meta.firstName,
      confirmedCount: meta.confirmedCount,
    });
  }

  return renderStandard({
    title: outing.title,
    eyebrow,
    location,
    firstName: meta.firstName,
    confirmedCount: meta.confirmedCount,
  });
}

function buildEyebrow(startsAt: Date): string {
  const rel = formatRelativeDateForShare(startsAt);
  const time = formatTimeOnly(startsAt);
  return `${rel} · ${time}`.toUpperCase();
}

function titleSize(title: string): number {
  // Auto-fit typographic staircase from the design brief:
  //   ≤ 30 chars → 76px, 30-50 → 60px, > 50 → 48px (drops another step for > 70)
  if (title.length <= 30) {
    return 76;
  }
  if (title.length <= 50) {
    return 60;
  }
  if (title.length <= 70) {
    return 48;
  }
  return 42;
}

function renderStandard(args: {
  title: string;
  eyebrow: string;
  location: string | null;
  firstName: string | null;
  confirmedCount: number;
}) {
  const { title, eyebrow, location, firstName, confirmedCount } = args;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: `radial-gradient(circle at 20% 10%, ${SURFACE} 0%, ${SURFACE_DEEP} 100%)`,
        position: "relative",
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      <InnerPassepartout />
      <Seal />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "100px 88px",
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: HOT_DEEP,
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            fontSize: titleSize(title),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: INK_700,
            lineHeight: 1.05,
            marginBottom: 20,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 880,
          }}
        >
          {title}
        </div>

        {/* Hair-thin gold rule — ancrage typographique, replaces a heavier
              divider without adding weight. */}
        <div
          style={{
            width: 60,
            height: 1,
            background: HOT,
            opacity: 0.6,
            marginTop: 10,
            marginBottom: 24,
          }}
        />

        {location && (
          <div
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: INK_500,
              maxWidth: 880,
              lineHeight: 1.3,
            }}
          >
            {location}
          </div>
        )}

        <BottomStrip firstName={firstName} confirmedCount={confirmedCount} />
      </div>
    </div>,
    { ...size }
  );
}

function renderWithHero(args: {
  heroImageUrl: string;
  title: string;
  eyebrow: string;
  location: string | null;
  firstName: string | null;
  confirmedCount: number;
}) {
  const { heroImageUrl, title, eyebrow, location, firstName, confirmedCount } = args;
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        fontFamily: '"Inter Tight", "Inter", system-ui',
        background: SCRIM,
      }}
    >
      {}
      <img
        src={heroImageUrl}
        alt=""
        width={1200}
        height={630}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {/* Noir cover gradient — 0% at top for breathing room, 85% at
            bottom to stamp the text. Two-stop linear, no blur, keeps PNG
            weight down. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(28,25,23,0.0) 0%, rgba(28,25,23,0.55) 55%, rgba(28,25,23,0.9) 100%)",
        }}
      />

      <Seal variant="onDark" />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "88px 88px 72px",
          width: "100%",
          position: "relative",
        }}
      >
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: HOT,
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            fontSize: titleSize(title),
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: INK_700,
            lineHeight: 1.05,
            marginBottom: 18,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 900,
            textShadow: "0 2px 24px rgba(0,0,0,0.35)",
          }}
        >
          {title}
        </div>

        {location && (
          <div
            style={{
              fontSize: 26,
              fontWeight: 500,
              color: "rgba(250,247,242,0.85)",
              maxWidth: 900,
              marginBottom: 16,
              lineHeight: 1.3,
            }}
          >
            {location}
          </div>
        )}

        <BottomStrip firstName={firstName} confirmedCount={confirmedCount} variant="onDark" />
      </div>
    </div>,
    { ...size }
  );
}

function renderCancelled(args: { title: string }) {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background: SURFACE,
        fontFamily: '"Inter Tight", "Inter", system-ui',
        padding: 88,
        textAlign: "center",
      }}
    >
      <InnerPassepartout muted />
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "0.14em",
          color: ACID,
          textTransform: "uppercase",
          marginBottom: 32,
        }}
      >
        Sortie annulée
      </div>
      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          color: INK_700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
          maxWidth: 880,
          marginBottom: 20,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {args.title}
      </div>
      <div style={{ fontSize: 26, fontWeight: 500, color: INK_500 }}>
        Cet événement n&rsquo;aura pas lieu. À la prochaine !
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
        background: SURFACE,
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Seal />
        <div
          style={{
            marginTop: 24,
            fontSize: 72,
            fontWeight: 700,
            color: INK_700,
            letterSpacing: "-0.02em",
          }}
        >
          Sortie
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 22,
            fontWeight: 500,
            color: INK_500,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
          }}
        >
          Entre amis, ça s&rsquo;organise
        </div>
      </div>
    </div>,
    { ...size }
  );
}

function InnerPassepartout({ muted = false }: { muted?: boolean }) {
  // Hair-thin gold inner frame — the "passepartout" of a physical
  // invitation. Single 1px border, 40px margin, 30% opacity. Costs almost
  // nothing on the PNG weight budget and gives the card its editorial feel.
  return (
    <div
      style={{
        position: "absolute",
        top: 40,
        left: 40,
        right: 40,
        bottom: 40,
        border: `1px solid ${HOT}`,
        opacity: muted ? 0.2 : 0.35,
        pointerEvents: "none",
      }}
    />
  );
}

function Seal({ variant = "onLight" }: { variant?: "onLight" | "onDark" }) {
  // Wax seal — the signature motif. Acid disc, hot-pink monogram S,
  // rotated -6° so it feels stamped rather than placed. Stays the same
  // on both palettes because acid reads on surface and on dark photo.
  const onDark = variant === "onDark";
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
        boxShadow: onDark ? "0 0 0 2px rgba(250,247,242,0.12)" : `0 0 0 2px ${ACID_DEEP}`,
        color: HOT,
        fontSize: 44,
        fontWeight: 800,
        letterSpacing: "-0.04em",
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      S
    </div>
  );
}

function BottomStrip({
  firstName,
  confirmedCount,
  variant = "onLight",
}: {
  firstName: string | null;
  confirmedCount: number;
  variant?: "onLight" | "onDark";
}) {
  const onDark = variant === "onDark";
  const showByCredit = Boolean(firstName);
  // Social proof surfaces only when the threshold is crossed — single
  // confirmed guest reads as an empty event and inverts the effect.
  const showProof = confirmedCount >= 3;

  if (!showByCredit && !showProof) {
    return <BrandBottomRight variant={variant} />;
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 44,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {showByCredit && firstName && (
          <>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: onDark ? "rgba(245,242,235,0.12)" : ACID,
                color: onDark ? INK_700 : SURFACE,
                fontSize: 26,
                fontWeight: 700,
              }}
            >
              {firstName.charAt(0).toUpperCase()}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: onDark ? "rgba(250,247,242,0.6)" : INK_500,
                }}
              >
                Par
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: onDark ? SURFACE : INK_700,
                  letterSpacing: "-0.01em",
                }}
              >
                {firstName}
              </div>
            </div>
          </>
        )}
      </div>

      {showProof && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <AvatarStack count={Math.min(confirmedCount, 3)} onDark={onDark} />
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: onDark ? SURFACE : ACID,
              letterSpacing: "-0.005em",
            }}
          >
            {confirmedCount} déjà partants
          </div>
        </div>
      )}

      <BrandInline variant={variant} />
    </div>
  );
}

function AvatarStack({ count, onDark }: { count: number; onDark: boolean }) {
  // We render initials discs rather than remote user avatars: fetching
  // Google OAuth photos from edge inflates weight and latency, and risks
  // 403s. An acid-on-surface disc stack is recognisable social-proof
  // shorthand and stays under budget.
  const discs = Array.from({ length: count });
  return (
    <div style={{ display: "flex" }}>
      {discs.map((_, i) => (
        <div
          key={i}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: onDark ? "rgba(250,247,242,0.2)" : HOT,
            border: `2px solid ${onDark ? "rgba(28,25,23,0.7)" : SURFACE}`,
            marginLeft: i === 0 ? 0 : -12,
          }}
        />
      ))}
    </div>
  );
}

function BrandInline({ variant = "onLight" }: { variant?: "onLight" | "onDark" }) {
  const onDark = variant === "onDark";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginLeft: "auto",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: onDark ? HOT : ACID,
        }}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: onDark ? SURFACE : ACID,
          letterSpacing: "0.02em",
        }}
      >
        Sortie
      </div>
    </div>
  );
}

function BrandBottomRight({ variant = "onLight" }: { variant?: "onLight" | "onDark" }) {
  const onDark = variant === "onDark";
  return (
    <div
      style={{
        position: "absolute",
        bottom: 88,
        right: 88,
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
          background: onDark ? HOT : ACID,
        }}
      />
      <div
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: onDark ? SURFACE : ACID,
          letterSpacing: "0.02em",
        }}
      >
        Sortie
      </div>
    </div>
  );
}
