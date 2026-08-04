"use client";

import type { SeriesPoint } from "@/lib/aggregate";
import type { TimelineEvent } from "@/lib/events";

/**
 * The trend, small. One line per board showing how the crowd's position moved
 * week by week, with event markers where something happened.
 *
 * Two decisions that look cosmetic and aren't:
 *
 * 1. The y-axis is ALWAYS the full 0..100 spectrum, never auto-scaled to the
 *    data's own range. Auto-scaling is the default in every charting library and
 *    it is wrong here: it turns a two-point wobble into a dramatic cliff, and
 *    the whole point of this project is how far the crowd sits along a fixed
 *    scale. A flat line should look flat.
 *
 * 2. Weeks with nobody in them break the line rather than interpolating across
 *    the gap. A drawn segment implies measurement; joining March to June with a
 *    straight line invents ten weeks of opinion that was never collected.
 */

const W = 640;
const H = 120;
const PAD_X = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 16;

interface SparklineProps {
  series: SeriesPoint[];
  events?: TimelineEvent[];
  /** Marks the viewer's own latest answer on the same scale. */
  ownValue?: number | null;
  /** Below this many people, a week is drawn faintly — it's a thin reading. */
  thinBelow?: number;
}

export default function Sparkline({
  series,
  events = [],
  ownValue = null,
  thinBelow = 5,
}: SparklineProps) {
  if (series.length < 2) return null;

  const first = series[0].start;
  const last = series[series.length - 1].start;
  const span = Math.max(1, last - first);

  const x = (t: number) => PAD_X + ((t - first) / span) * (W - PAD_X * 2);
  const y = (v: number) => PAD_TOP + (1 - v) * (H - PAD_TOP - PAD_BOTTOM);

  /*
   * Split into runs of consecutive weeks. A gap of more than ~10 days means at
   * least one week had no answers at all, so the line stops and restarts.
   */
  const GAP_MS = 10 * 86_400_000;
  const runs: SeriesPoint[][] = [];
  let run: SeriesPoint[] = [];
  for (const point of series) {
    if (run.length && point.start - run[run.length - 1].start > GAP_MS) {
      runs.push(run);
      run = [];
    }
    run.push(point);
  }
  if (run.length) runs.push(run);

  const path = (points: SeriesPoint[]) =>
    points.map((p, i) => `${i ? "L" : "M"} ${x(p.start).toFixed(1)} ${y(p.mean).toFixed(1)}`).join(" ");

  const latest = series[series.length - 1];

  return (
    <svg
      className="spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Weekly trend: ${series.length} weeks, from ${Math.round(
        series[0].mean * 100,
      )}% to ${Math.round(latest.mean * 100)}%.`}
    >
      {/* the midpoint of the spectrum, so "which side of neutral" is readable */}
      <line className="spark-mid" x1={PAD_X} y1={y(0.5)} x2={W - PAD_X} y2={y(0.5)} />

      {/* the viewer's own position, for comparison against the crowd's path */}
      {ownValue !== null && (
        <line className="spark-own" x1={PAD_X} y1={y(ownValue)} x2={W - PAD_X} y2={y(ownValue)} />
      )}

      {events.map((e) => {
        const t = Date.parse(`${e.date}T00:00:00Z`);
        if (!Number.isFinite(t) || t < first || t > last) return null;
        return (
          <g key={`${e.date}-${e.label}`} className="spark-event">
            <line x1={x(t)} y1={PAD_TOP} x2={x(t)} y2={H - PAD_BOTTOM} />
            <title>
              {e.date} — {e.label}
            </title>
          </g>
        );
      })}

      {runs.map((points, i) => (
        <path key={i} className="spark-line" d={path(points)} />
      ))}

      {series.map((p) => (
        <circle
          key={p.key}
          className={`spark-dot${p.n < thinBelow ? " is-thin" : ""}`}
          cx={x(p.start)}
          cy={y(p.mean)}
          r={p === latest ? 4 : 2.5}
        >
          <title>
            {p.key}: {Math.round(p.mean * 100)}% · {p.n} {p.n === 1 ? "person" : "people"}
          </title>
        </circle>
      ))}
    </svg>
  );
}
