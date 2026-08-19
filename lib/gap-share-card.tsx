import { ImageResponse } from "next/og";
import type { BatteryDef } from "./experiment";

export const GAP_SHARE_SIZE = { width: 1200, height: 630 };

const CARD: Record<string, { accent: string; eyebrow: string; topics: string[] }> = {
  perception: {
    accent: "#e51d35",
    eyebrow: "A REAL-FIGURE QUIZ ABOUT AMERICA",
    topics: ["EXTREMISM", "TRUST", "LONELINESS"],
  },
  groups: {
    accent: "#9bd3a6",
    eyebrow: "A REAL-FIGURE POPULATION QUIZ",
    topics: ["IMMIGRANTS", "VETERANS", "UNION MEMBERS"],
  },
  budget: {
    accent: "#f2b138",
    eyebrow: "A REAL-FIGURE FEDERAL BUDGET QUIZ",
    topics: ["FOREIGN AID", "DEFENSE", "SOCIAL SECURITY"],
  },
};

/** Spoiler-free quiz identity: a recipient sees a challenge, never an answer. */
export function gapShareCard(battery: BatteryDef | undefined) {
  const spec = CARD[battery?.id ?? "perception"] ?? CARD.perception;
  const title = battery?.title ?? "How well do you know America?";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#0a1238",
          color: "#f2ebda",
          fontFamily: "sans-serif",
          padding: "70px 86px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 24, letterSpacing: 8, color: "#5fd3d4" }}>VIBE CHECK</div>
          <div
            style={{
              display: "flex",
              padding: "11px 22px",
              border: `2px solid ${spec.accent}`,
              borderRadius: 999,
              color: spec.accent,
              fontSize: 21,
              fontWeight: 700,
            }}
          >
            8 QUESTIONS · 2 MINUTES
          </div>
        </div>

        <div style={{ marginTop: 65, color: spec.accent, fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
          {spec.eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            maxWidth: 980,
            marginTop: 16,
            fontSize: title.length > 34 ? 68 : 76,
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: -2,
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 62 }}>
          {spec.topics.map((topic) => (
            <div
              key={topic}
              style={{
                display: "flex",
                padding: "13px 21px",
                border: "1px solid rgba(242,235,218,0.25)",
                borderRadius: 999,
                color: "rgba(242,235,218,0.78)",
                fontSize: 20,
                letterSpacing: 2,
              }}
            >
              {topic}
            </div>
          ))}
        </div>
      </div>
    ),
    GAP_SHARE_SIZE,
  );
}
