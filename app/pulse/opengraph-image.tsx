import { ImageResponse } from "next/og";

/**
 * A result-free invitation to the monthly AI Pulse. Like every other share
 * card, it gives someone a reason to answer without showing where the crowd is
 * currently landing and anchoring their response.
 */
export const runtime = "nodejs";
export const alt = "Vibe Check monthly AI Pulse — how are we feeling about AI?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a1238";
const CREAM = "#f2ebda";
const TEAL = "#5fd3d4";
const MUSTARD = "#f2b138";

export default function PulseCard() {
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
          background: NAVY,
          color: CREAM,
          fontFamily: "sans-serif",
          padding: "56px 72px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 23,
            letterSpacing: 8,
            color: TEAL,
            textTransform: "uppercase",
          }}
        >
          Vibe Check · Monthly AI Pulse
        </div>

        <div
          style={{
            display: "flex",
            maxWidth: 980,
            marginTop: 24,
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.06,
            letterSpacing: -2,
            textAlign: "center",
          }}
        >
          How are we feeling about AI?
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            marginTop: 48,
          }}
        >
          {["Alignment", "Humanity’s future", "Move faster or slower"].map((label, index) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 20px",
                border: "2px solid rgba(95,211,212,0.32)",
                borderRadius: 999,
                fontSize: 22,
                color: "rgba(242,235,218,0.88)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  background: "rgba(95,211,212,0.18)",
                  color: TEAL,
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </div>
              {label}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 46,
            padding: "15px 34px",
            borderRadius: 999,
            background: MUSTARD,
            color: NAVY,
            fontSize: 25,
            fontWeight: 800,
          }}
        >
          Three questions · once a month
        </div>
      </div>
    ),
    size,
  );
}
