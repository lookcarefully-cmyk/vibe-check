import { ImageResponse } from "next/og";

/**
 * The social link-preview card, rendered from the dial motif rather than a
 * screenshot so it stays sharp and on-brand. Next serves this for both OpenGraph
 * and Twitter automatically (see twitter/openGraph in app/layout.tsx).
 *
 * Drawn with plain divs, not the real SVG dial: the renderer here (Satori)
 * supports a subset of CSS and no arbitrary SVG, so the dome is a half-rounded
 * box and the needle a rotated bar.
 */
export const runtime = "nodejs";
export const alt = "Vibe Check — where do you land?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a1238",
          color: "#f2ebda",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 26,
            letterSpacing: 8,
            color: "#5fd3d4",
            textTransform: "uppercase",
          }}
        >
          Vibe Check
        </div>
        <div
          style={{
            fontSize: 92,
            fontWeight: 800,
            marginTop: 12,
            letterSpacing: -2,
          }}
        >
          Where do you land?
        </div>

        {/* the dial motif */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 420,
            height: 210,
            marginTop: 48,
          }}
        >
          <div
            style={{
              width: 420,
              height: 210,
              background: "#f2ebda",
              borderTopLeftRadius: 210,
              borderTopRightRadius: 210,
            }}
          />
          {/* needle */}
          <div
            style={{
              position: "absolute",
              left: 205,
              bottom: 0,
              width: 10,
              height: 150,
              background: "#e51d35",
              borderRadius: 5,
              transform: "rotate(-32deg)",
              transformOrigin: "bottom center",
            }}
          />
          {/* hub */}
          <div
            style={{
              position: "absolute",
              left: 185,
              bottom: -25,
              width: 50,
              height: 50,
              borderRadius: 25,
              background: "#e51d35",
            }}
          />
        </div>

        <div style={{ marginTop: 56, fontSize: 30, color: "rgba(242,235,218,0.7)" }}>
          Answer on the spectrum, then see how everyone else answered.
        </div>
      </div>
    ),
    size,
  );
}
