import { ImageResponse } from "next/og";

/**
 * The link-preview card for the perception-gap quiz.
 *
 * This is the surface that actually travels: sharing a score links to /gap, so
 * a recipient sees this card, not the sender's result. It therefore shows the
 * SHAPE of the finding — a guess sitting well right of the real figure — and no
 * question, no number and no answer. Anyone arriving still plays blind.
 *
 * Drawn with plain divs: the renderer here (Satori) supports a subset of CSS
 * and no arbitrary SVG.
 */
export const runtime = "nodejs";
export const alt = "How well do you know America? — real-figure quizzes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A tick on the track. `pos` is a percentage across it. */
function Mark({ pos, color, label }: { pos: number; color: string; label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${pos}%`,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: "translateX(-50%)",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, color, marginBottom: 14 }}>{label}</div>
      <div style={{ width: 8, height: 44, background: color, borderRadius: 4 }} />
    </div>
  );
}

export default function GapOpengraphImage() {
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
          padding: "0 90px",
        }}
      >
        <div
          style={{
            fontSize: 24,
            letterSpacing: 8,
            color: "#5fd3d4",
            textTransform: "uppercase",
          }}
        >
          Vibe Check
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 76,
            fontWeight: 800,
            marginTop: 14,
            letterSpacing: -2,
            textAlign: "center",
            lineHeight: 1.05,
          }}
        >
          How well do you know America?
        </div>

        {/* The gap itself: a guess far from the truth, which is the whole idea. */}
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 820,
            height: 120,
            marginTop: 60,
          }}
        >
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: 0,
              width: 820,
              height: 6,
              borderRadius: 3,
              background: "rgba(242,235,218,0.22)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "30%",
              width: "34%",
              height: 6,
              borderRadius: 3,
              background: "rgba(229,29,53,0.75)",
            }}
          />
          <Mark pos={30} color="#f2ebda" label="REAL" />
          <Mark pos={64} color="#5fd3d4" label="YOUR GUESS" />
        </div>

        <div
          style={{
            marginTop: 30,
            fontSize: 29,
            color: "rgba(242,235,218,0.72)",
            textAlign: "center",
          }}
        >
          8 questions · real answers from Pew, Gallup and the Fed
        </div>
      </div>
    ),
    size,
  );
}
