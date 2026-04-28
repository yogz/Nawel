import { ImageResponse } from "next/og";

// Brand-statement OG used by the home and any route that doesn't override
// (`/sortie/nouvelle`, `/sortie/moi`). Pages of an outing or a public
// profile ship their own image alongside their own page.tsx.
//
// Same Acid Cabinet palette as the in-app theme. Static (no DB fetch),
// long revalidate — this asset only moves when the brand moves.
export const alt = "Sortie — entre amis, ça s'organise";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Pas de `runtime = "edge"` ici : Next.js désactive la static
// generation en edge runtime, ce qui forcerait un re-render à chaque
// scrape WhatsApp/iMessage alors que cet asset est purement brand
// (zéro donnée dynamique, `revalidate=86400`). En runtime Node par
// défaut, le PNG est généré une fois au build, poussé sur le CDN
// Vercel, servi à coût ~zéro pendant 24h. Quotidien, ISR régénère
// en background.
export const revalidate = 86400;

const INK = "#0A0A0A";
const INK_DEEP = "#161616";
const OFF_WHITE = "#F5F2EB";
const OFF_WHITE_MUTED = "rgba(245,242,235,0.6)";
const ACID = "#C7FF3C";
const HOT = "#FF3D81";

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: `radial-gradient(ellipse at 20% 0%, rgba(199,255,60,0.08), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(255,61,129,0.10), transparent 55%), ${INK}`,
        position: "relative",
        fontFamily: '"Inter Tight", "Inter", system-ui',
      }}
    >
      {/* Hairline acid frame — same passepartout signature as outing OGs. */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 40,
          right: 40,
          bottom: 40,
          border: `1px solid ${ACID}`,
          opacity: 0.22,
          pointerEvents: "none",
        }}
      />

      {/* Wax seal, hot-pink disc with acid monogram — flips the on-light
            variant of the outing OG so the home reads as the same brand
            family but bolder. */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 88,
          width: 92,
          height: 92,
          borderRadius: "50%",
          background: HOT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transform: "rotate(-6deg)",
          boxShadow: `0 0 0 2px ${INK_DEEP}, 0 0 0 3px rgba(255,61,129,0.4)`,
          color: ACID,
          fontSize: 46,
          fontWeight: 800,
          letterSpacing: "-0.04em",
        }}
      >
        S
      </div>

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
            fontWeight: 700,
            letterSpacing: "0.18em",
            color: HOT,
            textTransform: "uppercase",
            marginBottom: 28,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span
            style={{
              display: "flex",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: HOT,
            }}
          />
          Sortie
        </div>

        <div
          style={{
            fontSize: 168,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            color: OFF_WHITE,
            lineHeight: 0.95,
            marginBottom: 24,
          }}
        >
          sortie<span style={{ color: ACID }}>.</span>
        </div>

        <div
          style={{
            width: 80,
            height: 1,
            background: ACID,
            opacity: 0.45,
            marginBottom: 28,
          }}
        />

        <div
          style={{
            fontSize: 36,
            fontWeight: 500,
            color: OFF_WHITE_MUTED,
            maxWidth: 880,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          Entre amis, ça s&rsquo;organise.
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 88,
            right: 88,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: ACID,
          }}
        >
          sortie.colist.fr
        </div>
      </div>
    </div>,
    { ...size }
  );
}
