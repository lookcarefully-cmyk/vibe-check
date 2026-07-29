import { scaleLinear } from "d3-scale";
import { max, range } from "d3-array";
import { BIN_COUNT, type Aggregate } from "./aggregate";
import { R_RAY_MAX, R_RAY_MIN } from "./geometry";

export const RAY_COLORS = [
  "#F2B138", // mustard
  "#E9633C", // burnt orange
  "#9BD3A6", // mint
  "#F291AC", // pink
  "#F2B138",
  "#E9633C",
  "#9BD3A6",
];

/** How many rays fan out of the hub. Odd, so one sits exactly on the mean. */
export const RAY_COUNT = 31;

/** Below this many votes a raw histogram looks like noise, so widen the kernel. */
const MIN_BANDWIDTH = 0.055;

export interface Ray {
  /** Position along the spectrum, 0..1. */
  value: number;
  /** Outer radius in user units. */
  radius: number;
  /** Normalised density, 0..1. */
  density: number;
  color: string;
  /** Distance in ray-steps from the mean, for staggering the animation. */
  distanceFromCentre: number;
}

/**
 * Kernel density estimate over the server's histogram.
 *
 * Using a KDE rather than plotting the normal curve directly means the picture
 * stays honest: if opinion is genuinely bimodal, two humps show up instead of
 * one smooth bell that was never in the data. With a normal-ish sample it
 * renders as the bell curve you'd expect.
 */
export function buildRays(agg: Aggregate): Ray[] {
  const bandwidth = Math.max(agg.sd * 0.7, MIN_BANDWIDTH);
  const total = agg.counts.reduce((a, b) => a + b, 0);

  const density = (v: number): number => {
    if (total === 0) return 0;
    let sum = 0;
    for (let i = 0; i < BIN_COUNT; i += 1) {
      const c = agg.counts[i];
      if (!c) continue;
      const centre = (i + 0.5) / BIN_COUNT;
      const z = (v - centre) / bandwidth;
      sum += c * Math.exp(-0.5 * z * z);
    }
    return sum / total;
  };

  // Sample on a ray grid centred on the mean so the tallest ray is the mean.
  const step = 1 / (RAY_COUNT - 1);
  const offsets = range(RAY_COUNT).map((i) => (i - (RAY_COUNT - 1) / 2) * step);

  const samples = offsets.map((offset) => {
    const value = agg.mean + offset;
    return {
      value,
      offset,
      raw: value < 0 || value > 1 ? 0 : density(value),
    };
  });

  const peak = max(samples, (s) => s.raw) ?? 0;
  const toRadius = scaleLinear().domain([0, 1]).range([R_RAY_MIN, R_RAY_MAX]).clamp(true);

  return samples
    // Drop rays out of bounds or in the far tail — they read as visual litter.
    .filter((s) => s.value >= 0 && s.value <= 1 && peak > 0 && s.raw / peak > 0.04)
    .map((s, i) => {
      const norm = s.raw / peak;
      return {
        value: s.value,
        density: norm,
        radius: toRadius(norm),
        color: RAY_COLORS[i % RAY_COLORS.length],
        distanceFromCentre: Math.abs(s.offset) / step,
      };
    });
}
