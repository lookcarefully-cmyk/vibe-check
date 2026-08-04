import { ImageResponse } from "next/og";
import { aggregateWindow } from "@/lib/aggregate";
import { bandFor } from "@/lib/likert";
import { store } from "@/lib/store";
import { getTopic, TOPICS } from "@/lib/topics";

/**
 * The per-board share card: what this board reads RIGHT NOW, as an image.
 *
 * This is what makes the site checkable as an indicator from outside it. A link
 * posted to X shows the current number and which way it moved, rather than a
 * generic logo — the reading travels even for people who never click.
 *
 * Note this deliberately publishes a crowd figure to people who haven't
 * answered, which the site otherwise refuses to do (rule 1 in AGENTS.md). That
 * is the unavoidable cost of a shareable indicator: the moment a number is
 * quotable it is public. The dial itself still withholds it until you answer, so
 * the anchoring protection holds where it affects the data being collected.
 */
export const runtime = "nodejs";
export const alt = "Vibe Check board";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.id }));
}

const NAVY = "#0a1238";
const CREAM = "#f2ebda";
const TEAL = "#5fd3d4";
const RED = "#e51d35";
const MUSTARD = "#f2b138";
const MINT = "#9bd3a6";
const PINK = "#f291ac";

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

  // A card must never fail to render — a broken preview is worse than a plain
  // one, and this runs on every share.
  let mean: number | null = null;
  let people = 0;
  let change: number | null = null;
  let windowLabel = "";
  try {
    const records = await store.all(topic.id);
    const agg = aggregateWindow(records, Date.now());
    if (agg.count > 0) {
      mean = agg.mean;
      people = agg.count;
      change = agg.changePoints;
      windowLabel = agg.windowLabel;
    }
  } catch {
    /* fall through to the un-answered card */
  }

  const band =
    mean === null
      ? null
      : bandFor(mean, topic.scale, {
          left: topic.leftLabel,
          right: topic.rightLabel,
          leftProse: topic.leftProse,
          rightProse: topic.rightProse,
        });

  // The needle angle across the semicircle: 0 = full left, 1 = full right.
  const angle = mean === null ? 0 : mean * 180 - 90;

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
          padding: "48px 64px",
        }}
      >
        <div style={{ fontSize: 22, letterSpacing: 6, color: TEAL, textTransform: "uppercase" }}>
          Vibe Check
        </div>

        <div
          style={{
            fontSize: topic.question.length > 62 ? 44 : 54,
            fontWeight: 800,
            marginTop: 14,
            textAlign: "center",
            lineHeight: 1.15,
            letterSpacing: -1,
          }}
        >
          {topic.question}
        </div>

        {mean === null ? (
          <div style={{ marginTop: 44, fontSize: 34, color: "rgba(242,235,218,0.75)" }}>
            No answers yet — be the first.
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 56, marginTop: 30 }}>
            {/* the dial, drawn with a rotated bar for the needle */}
            <div style={{ position: "relative", display: "flex", width: 300, height: 150 }}>
              <div
                style={{
                  width: 300,
                  height: 150,
                  background: CREAM,
                  borderTopLeftRadius: 150,
                  borderTopRightRadius: 150,
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 146,
                  bottom: 0,
                  width: 8,
                  height: 112,
                  background: RED,
                  borderRadius: 4,
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "bottom center",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 130,
                  bottom: -20,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: RED,
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1 }}>
                {`${Math.round(mean * 100)}%`}
              </div>
              {band && (
                <div style={{ fontSize: 30, color: MUSTARD, marginTop: 6 }}>{band}</div>
              )}
              {change !== null && change !== 0 && (
                <div
                  style={{
                    fontSize: 26,
                    marginTop: 10,
                    color: change > 0 ? MINT : PINK,
                    fontWeight: 700,
                  }}
                >
                  {`${change > 0 ? "+" : "\u2212"}${Math.abs(change)} pts`}
                </div>
              )}
            </div>
          </div>
        )}

        {mean !== null && (
          <div style={{ marginTop: 34, fontSize: 24, color: "rgba(242,235,218,0.55)" }}>
            {`${people} ${people === 1 ? "person" : "people"} · ${windowLabel} · ${topic.leftLabel} → ${topic.rightLabel}`}
          </div>
        )}
      </div>
    ),
    size,
  );
}
