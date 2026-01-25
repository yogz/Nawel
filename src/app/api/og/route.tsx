import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Get parameters from URL
  const title = searchParams.get("title") || "Mon événement";
  const date = searchParams.get("date") || "";
  const guests = searchParams.get("guests") || "";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #E6D9F8 0%, #F5E6D3 50%, #FCE7D6 100%)",
        position: "relative",
      }}
    >
      {/* Decorative circles */}
      <div
        style={{
          position: "absolute",
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "rgba(234, 88, 12, 0.1)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "rgba(168, 85, 247, 0.1)",
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
          padding: "60px 80px",
          textAlign: "center",
        }}
      >
        {/* Event emoji */}
        <div
          style={{
            fontSize: 80,
            marginBottom: 20,
          }}
        >
          🎉
        </div>

        {/* Event title */}
        <div
          style={{
            fontSize: title.length > 25 ? 52 : 64,
            fontWeight: 800,
            color: "#1f2937",
            lineHeight: 1.1,
            marginBottom: 24,
            maxWidth: "90%",
            wordWrap: "break-word",
          }}
        >
          {title}
        </div>

        {/* Date and guests info */}
        {(date || guests) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 32,
              marginTop: 8,
            }}
          >
            {date && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 28,
                  color: "#6b7280",
                }}
              >
                <span>📅</span>
                <span>{date}</span>
              </div>
            )}
            {guests && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 28,
                  color: "#6b7280",
                }}
              >
                <span>👥</span>
                <span>{guests}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginTop: 48,
            padding: "16px 32px",
            background: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
            borderRadius: 16,
            color: "white",
            fontSize: 24,
            fontWeight: 700,
          }}
        >
          Voir l&apos;événement →
        </div>
      </div>

      {/* Footer with branding */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 0 32px",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 32,
            fontWeight: 800,
            background: "linear-gradient(135deg, #ea580c 0%, #a855f7 100%)",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          CoList
        </div>
        <div
          style={{
            fontSize: 18,
            color: "#9ca3af",
          }}
        >
          — Organisez vos repas sans stress
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
    }
  );
}
