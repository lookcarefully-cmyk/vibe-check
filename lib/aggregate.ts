import { deviation, mean, quantile } from "d3-array";
import { DAY_MS, weekKey, weekStart } from "./epoch";

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

/* ------------------------------------------------------ windows and people */

/** The minimal shape the windowing helpers need from a stored vote. */
export interface TimedVote {
  v: number;
  t: number;
  s: string;
}

/**
 * The window ladder, widest-last. The dial shows the narrowest window that has
 * enough answers to mean anything, so a busy board reads as "right now" and a
 * quiet one still reads as something rather than as noise.
 */
export const WINDOW_LADDER = [
  { days: 30, label: "last 30 days" },
  { days: 90, label: "last 90 days" },
  { days: 365, label: "last year" },
  { days: Infinity, label: "all time" },
] as const;

/** Below this, a window's movement is noise and gets reported as a wider one. */
export const MIN_WINDOW_RESPONSES = 30;

/**
 * One vote per person, keeping each person's most recent answer.
 *
 * This is the single most important step in the whole pipeline. Once people can
 * answer again, the raw mean is the average *person-week*, not the average
 * person — someone who answers thirty weeks running counts thirty times. Every
 * headline figure must be deduped first.
 *
 * Votes with no session id (recorded before sessions existed) can't be linked to
 * anyone, so each is treated as its own person rather than being silently
 * collapsed together.
 */
export function dedupeLatestPerPerson<T extends TimedVote>(votes: T[]): T[] {
  const latest = new Map<string, T>();
  votes.forEach((vote, i) => {
    const key = vote.s ? `s:${vote.s}` : `anon:${i}`;
    const prev = latest.get(key);
    if (!prev || vote.t >= prev.t) latest.set(key, vote);
  });
  return [...latest.values()];
}

export interface WindowedAggregate extends Aggregate {
  /** Which rung of the ladder this used. */
  windowDays: number;
  windowLabel: string;
  /** Raw votes considered before deduping — `count` is people, this is answers. */
  answers: number;
  /** Mean of the equivalent window immediately before this one, or null. */
  previousMean: number | null;
  /** Change in percentage points against that previous window, or null. */
  changePoints: number | null;
}

const EMPTY_WINDOW_EXTRAS = {
  answers: 0,
  previousMean: null,
  changePoints: null,
};

/**
 * The number a board actually shows: deduped to people, over the narrowest
 * window that clears MIN_WINDOW_RESPONSES, with the preceding window measured
 * the same way so movement can be quoted.
 */
export function aggregateWindow(votes: TimedVote[], now: number): WindowedAggregate {
  for (let i = 0; i < WINDOW_LADDER.length; i += 1) {
    const { days, label } = WINDOW_LADDER[i];
    const isLast = i === WINDOW_LADDER.length - 1;
    const from = days === Infinity ? -Infinity : now - days * DAY_MS;

    const inWindow = votes.filter((x) => x.t >= from);
    const people = dedupeLatestPerPerson(inWindow);

    if (people.length < MIN_WINDOW_RESPONSES && !isLast) continue;

    const agg = aggregate(people.map((x) => x.v));

    // The window immediately before this one, measured identically, so the
    // comparison is like-for-like rather than "now vs everything that came before".
    let previousMean: number | null = null;
    if (days !== Infinity) {
      const prevFrom = from - days * DAY_MS;
      const prevPeople = dedupeLatestPerPerson(
        votes.filter((x) => x.t >= prevFrom && x.t < from),
      );
      if (prevPeople.length >= MIN_WINDOW_RESPONSES) {
        previousMean = aggregate(prevPeople.map((x) => x.v)).mean;
      }
    }

    return {
      ...agg,
      windowDays: days,
      windowLabel: label,
      answers: inWindow.length,
      previousMean,
      changePoints:
        previousMean === null ? null : Math.round((agg.mean - previousMean) * 1000) / 10,
    };
  }

  // Unreachable — the ladder ends with an infinite window — but typed exhaustively.
  return {
    ...aggregate([]),
    windowDays: Infinity,
    windowLabel: "all time",
    ...EMPTY_WINDOW_EXTRAS,
  };
}

export interface SeriesPoint {
  /** ISO week key, e.g. "2026-W31". */
  key: string;
  /** Monday 00:00 UTC of that week. */
  start: number;
  /** People who answered that week (deduped). */
  n: number;
  mean: number;
}

/**
 * Weekly means, oldest first — the trend line under the dial.
 *
 * Deduped within each week, so a week reflects the people who answered in it.
 * Weeks with nobody in them are omitted rather than plotted as zero, which would
 * draw a cliff to the bottom of the chart and read as "opinion collapsed".
 */
export function weeklySeries(votes: TimedVote[], now: number, weeks = 26): SeriesPoint[] {
  const earliest = weekStart(now) - (weeks - 1) * 7 * DAY_MS;
  const buckets = new Map<string, TimedVote[]>();

  for (const vote of votes) {
    if (vote.t < earliest) continue;
    const key = weekKey(vote.t);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(vote);
    else buckets.set(key, [vote]);
  }

  return [...buckets.entries()]
    .map(([key, bucket]) => {
      const people = dedupeLatestPerPerson(bucket);
      return {
        key,
        start: weekStart(people[0].t),
        n: people.length,
        mean: mean(people.map((x) => x.v))!,
      };
    })
    .sort((a, b) => a.start - b.start);
}

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
