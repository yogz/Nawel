import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Get parameters from URL
  const title = searchParams.get("title") || "Mon événement";
  const date = searchParams.get("date") || "";
  const locale = searchParams.get("locale") || "fr";

  // Simple translation map for basic UI elements
  const translations: Record<string, { viewEvent: string; tagline: string }> = {
    fr: {
      viewEvent: "Voir l'événement",
      tagline: "Rejoindre le plan repas",
    },
    en: {
      viewEvent: "View event",
      tagline: "Join the meal plan",
    },
    es: {
      viewEvent: "Ver evento",
      tagline: "Únete al plan de comidas",
    },
    pt: {
      viewEvent: "Ver evento",
      tagline: "Junte-se ao plano de refeições",
    },
    de: {
      viewEvent: "Event ansehen",
      tagline: "Dem Essensplan beitreten",
    },
    el: {
      viewEvent: "Προβολή εκδήλωσης",
      tagline: "Μπείτε στο πλάνο γευμάτων",
    },
    it: {
      viewEvent: "Vedi evento",
      tagline: "Unisciti al piano pasti",
    },
    nl: {
      viewEvent: "Evenement bekijken",
      tagline: "Doe mee met het maaltijdplan",
    },
    pl: {
      viewEvent: "Zobacz wydarzenie",
      tagline: "Dołącz do planu posiłków",
    },
    sv: {
      viewEvent: "Visa evenemang",
      tagline: "Gå med i måltidsplanen",
    },
    da: {
      viewEvent: "Se begivenhed",
      tagline: "Deltag i madplanen",
    },
    tr: {
      viewEvent: "Etkinliği görüntüle",
      tagline: "Yemek planına katıl",
    },
  };

  const t = translations[locale] || translations.fr;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "white",
        position: "relative",
      }}
    >
      {/* Premium Background Gradient - Simplified for file size */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)",
          display: "flex",
        }}
      />

      {/* Subtle Background Shapes */}
      <div
        style={{
          position: "absolute",
          top: -150,
          right: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(168, 85, 247, 0.05)",
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -200,
          left: -200,
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "rgba(234, 88, 12, 0.05)",
          filter: "blur(40px)",
        }}
      />

      {/* Main content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          padding: "40px 80px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* CoList Logo Icon */}
        <div
          style={{
            display: "flex",
            marginBottom: 32,
            background: "white",
            padding: "16px",
            borderRadius: "24px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.colist.fr/LogoIcon.png" alt="Logo" width="80" height="80" />
        </div>

        {/* Event title */}
        <div
          style={{
            fontSize: title.length > 20 ? 60 : 72,
            fontWeight: 900,
            color: "#111827",
            lineHeight: 1.2,
            marginBottom: 20,
            maxWidth: "90%",
            wordWrap: "break-word",
            letterSpacing: "-0.04em",
          }}
        >
          {title}
        </div>

        {/* Date info */}
        {date && (
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              color: "#4b5563",
              marginBottom: 48,
              opacity: 0.8,
            }}
          >
            {date}
          </div>
        )}

        {/* Action Button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 48px",
            background: "#1f2937", // Gray-800 - Softer than pure black
            borderRadius: "9999px",
            color: "white",
            fontSize: 28,
            fontWeight: 600,
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          }}
        >
          {t.viewEvent}
        </div>
      </div>

      {/* Footer Branded Bottom Bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 0 48px",
          gap: 4,
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#111827",
          }}
        >
          CoList
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 500,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {t.tagline}
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
