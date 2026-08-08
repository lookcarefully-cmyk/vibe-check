import { ImageResponse } from "next/og";

export const SHARE_CARD_SIZE = { width: 1200, height: 630 };

interface ShareCardTopic {
  question: string;
  leftLabel: string;
  rightLabel: string;
}

const NAVY = "#0a1238";
const CREAM = "#f2ebda";
const TEAL = "#5fd3d4";

/** A blind board invitation: question and poles, never a result or count. */
export function boardShareCard(topic: ShareCardTopic | null) {
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
      SHARE_CARD_SIZE,
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
            marginTop: 28,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          {topic.question}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            width: 820,
            marginTop: 58,
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
      </div>
    ),
    SHARE_CARD_SIZE,
  );
}
