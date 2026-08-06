import { ImageResponse } from "next/og";
import { getTopic } from "@/lib/topics";

/**
 * The per-board share card — a BLIND INVITATION, not a result.
 *
 * It shows the question and its two ends, but NEVER the crowd's position or
 * participation count: no dial, no needle, no number, no band. That is
 * deliberate. A card that showed "62% doomer" would anchor exactly the people a
 * shared link brings in — first-time voters, whose uncontaminated first answer is
 * the entire thing the anchoring protection (rule 1 in AGENTS.md) exists to
 * preserve. The card's job is to make someone want to place their own answer
 * before they see anyone else's; showing the answer defeats that.
 *
 * Keeping even the participation count out makes the invitation evergreen and
 * prevents social proof from changing how a recipient approaches the board.
 */
export const runtime = "nodejs";
export const alt = "Vibe Check — where do you land?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#0a1238";
const CREAM = "#f2ebda";
const TEAL = "#5fd3d4";

export default async function BoardCard({ params }: { params: Promise<{ topic: string }> }) {
  const topic = getTopic((await params).topic);

  if (!topic) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: NAVY,
            color: CREAM,
            fontSize: 64,
            fontFamily: "sans-serif",
          }}
        >
          Vibe Check
        </div>
      ),
      size,
    );
  }

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
          padding: "64px 72px",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 8, color: TEAL, textTransform: "uppercase" }}>
          Vibe Check
        </div>

        <div
          style={{
            fontSize: topic.question.length > 64 ? 52 : 64,
            fontWeight: 800,
            marginTop: 24,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          {topic.question}
        </div>

        {/* The spectrum's two ends — what the question is about, not where the
            crowd sits. A thin rule stands in for the dial without revealing it. */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            width: 820,
            marginTop: 48,
            color: "rgba(242,235,218,0.75)",
            fontSize: 26,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          <div style={{ display: "flex" }}>{topic.leftLabel}</div>
          <div style={{ display: "flex", flex: 1, height: 2, background: "rgba(242,235,218,0.25)" }} />
          <div style={{ display: "flex" }}>{topic.rightLabel}</div>
        </div>

        <div style={{ marginTop: 52, fontSize: 32, color: CREAM, fontWeight: 700 }}>
          Where do you land?
        </div>
        <div style={{ marginTop: 12, fontSize: 24, color: "rgba(242,235,218,0.6)" }}>
          Add your answer, then see where everyone else lands.
        </div>
      </div>
    ),
    size,
  );
}
