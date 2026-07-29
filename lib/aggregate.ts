import { deviation, mean, quantile } from "d3-array";

export const BIN_COUNT = 40;

export interface Aggregate {
  /** Number of votes in the sample. */
  count: number;
  /** Mean of all votes, 0..1. The "consensus". */
  mean: number;
  /** Population standard deviation, 0..1. */
  sd: number;
  /** 10th and 90th percentile — the bounds of the 80% margin. */
  p10: number;
  p90: number;
  /** Normalised histogram: BIN_COUNT buckets across 0..1, each 0..1 of the max. */
  hist: number[];
  /** Raw bucket counts, same length as `hist`. */
  counts: number[];
  updatedAt: number;
}

/** The band we quote as the "margin". 0.8 => 10th–90th percentile. */
export const MARGIN_COVERAGE = 0.8;

export function aggregate(votes: number[]): Aggregate {
  const clean = votes.filter((v) => Number.isFinite(v) && v >= 0 && v <= 1);
  const count = clean.length;

  if (count === 0) {
    return {
      count: 0,
      mean: 0.5,
      sd: 0,
      p10: 0.5,
      p90: 0.5,
      hist: new Array(BIN_COUNT).fill(0),
      counts: new Array(BIN_COUNT).fill(0),
      updatedAt: Date.now(),
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const lo = (1 - MARGIN_COVERAGE) / 2;

  const counts = new Array(BIN_COUNT).fill(0);
  for (const v of clean) {
    const i = Math.min(BIN_COUNT - 1, Math.floor(v * BIN_COUNT));
    counts[i] += 1;
  }
  const peak = Math.max(...counts, 1);

  return {
    count,
    mean: mean(clean)!,
    // d3's deviation is the *sample* sd and is undefined for n === 1.
    sd: count > 1 ? deviation(clean)! : 0,
    p10: quantile(sorted, lo)!,
    p90: quantile(sorted, 1 - lo)!,
    hist: counts.map((c) => c / peak),
    counts,
    updatedAt: Date.now(),
  };
}
