/**
 * Scoring for the perception-gap battery at /gap.
 *
 * Everything here is pure and runs in the browser from this visitor's own saved
 * answers. Nothing about a score is sent anywhere: the server already holds the
 * individual guesses as ordinary votes, and a score is just arithmetic over
 * them. That keeps the battery scoreable even for someone who has blocked the
 * network, and means no new record shape to version.
 *
 * WHY A SCORE AT ALL. The rest of the site pays off by showing you the crowd,
 * which needs a crowd. These eight boards are scored against published national
 * figures — Pew, the Federal Reserve, Gallup, Yale, PNAS — so they pay off for
 * a single visitor on an empty site. That is the whole reason this set exists
 * separately, and why the score must never quietly depend on other people's
 * answers.
 */

import type { Topic } from "./topics";

export interface GapItem {
  topic: Topic;
  /** This visitor's guess, 0..1, or null if they haven't answered it. */
  guess: number | null;
}

export interface GapMark {
  topic: Topic;
  /** Guess and truth as whole numbers on the board's own 0..100 display scale. */
  guessPct: number;
  truthPct: number;
  /** Signed error in points: positive means they guessed high. */
  error: number;
  /** Unsigned error in points. */
  off: number;
  /**
   * True when this miss was in the bleaker direction, false when it was the
   * sunnier one, null when the item has no gloomy direction (see
   * `TopicBenchmark.pessimism`) or the guess was exact.
   */
  gloomy: boolean | null;
}

export interface GapScore {
  marks: GapMark[];
  answered: number;
  total: number;
  complete: boolean;
  /** Mean unsigned error in points across answered items. */
  meanOff: number;
  /** 0..100, where 100 is a perfect set. See `accuracyOf`. */
  accuracy: number;
  /** Items landing within CLOSE_ENOUGH points of the published figure. */
  close: number;
  /** Of the items that have a gloomy direction, how many missed that way. */
  gloomyMisses: number;
  gloomyEligible: number;
  /** The single worst miss, for the headline. Null before anything is answered. */
  worst: GapMark | null;
  /** The best call, for the "you nailed this one" line. */
  best: GapMark | null;
}

/** Within this many points of the published figure counts as "got it". */
export const CLOSE_ENOUGH = 10;

/**
 * How many finished batteries are needed before a percentile is shown.
 *
 * The same floor the benchmark boards use for their crowd, and for the same
 * reason: "you beat 50% of players" off two other people is not a fact about
 * anyone, and it is worse than silence because it looks like one. Below this,
 * the score page simply says how many have finished so far.
 */
export const MIN_FINISHERS_FOR_PERCENTILE = 10;

/**
 * Share of other finishers this score beat, 0..100.
 *
 * Ties count as half, which is the ordinary convention for a percentile rank
 * and stops a heavily-tied distribution from reading as "better than 0%" for
 * everyone who scored the modal value.
 */
export function percentileOf(accuracy: number, others: number[]): number {
  if (others.length === 0) return 0;
  const below = others.filter((a) => a < accuracy).length;
  const tied = others.filter((a) => a === accuracy).length;
  return Math.round(((below + tied / 2) / others.length) * 100);
}

/**
 * The other finishers' scores, with one instance of this visitor's own removed.
 *
 * Their completed battery is in the published distribution — it has to be, it
 * is computed from the same votes — and "you scored better than yourself" is
 * not a sentence. Matching on the value rather than on identity keeps the
 * endpoint free of anything that could identify a person; with a small number
 * of finishers the worst case is dropping a stranger who scored identically,
 * which changes the percentile by one person.
 */
export function othersThan(accuracy: number, all: number[]): number[] {
  const out = [...all];
  const mine = out.indexOf(accuracy);
  if (mine !== -1) out.splice(mine, 1);
  return out;
}

/**
 * Turn mean error in points into a 0..100 score.
 *
 * Linear from 0 points off (100) to 40 points off (0). Forty is the floor
 * because guesses are bounded 0..100 and these questions have real answers
 * spread across the range: someone answering at random averages roughly 33
 * points off, so a floor much beyond 40 would hand out consolation points for
 * noise. It is stated here rather than tuned later, for the same reason the
 * Likert cut points in lib/likert.ts are fixed before the data arrives.
 */
export function accuracyOf(meanOff: number): number {
  if (!Number.isFinite(meanOff)) return 0;
  return Math.max(0, Math.min(100, Math.round(100 - (meanOff / 40) * 100)));
}

export function scoreGap(items: GapItem[]): GapScore {
  const marks: GapMark[] = [];

  for (const { topic, guess } of items) {
    const benchmark = topic.benchmark;
    if (!benchmark || guess === null) continue;

    const guessPct = Math.round(guess * 100);
    const truthPct = Math.round(benchmark.value * 100);
    const error = guessPct - truthPct;
    const direction = benchmark.pessimism;

    marks.push({
      topic,
      guessPct,
      truthPct,
      error,
      off: Math.abs(error),
      gloomy: !direction || error === 0
        ? null
        : direction === "high"
          ? error > 0
          : error < 0,
    });
  }

  const answered = marks.length;
  const totalOff = marks.reduce((sum, m) => sum + m.off, 0);
  // Guard the divide: an unanswered battery has no mean, and 0/0 would render
  // as a NaN score rather than an empty one.
  const meanOff = answered ? totalOff / answered : 0;
  const gloomyEligible = marks.filter((m) => m.gloomy !== null).length;

  return {
    marks,
    answered,
    total: items.length,
    complete: answered === items.length && items.length > 0,
    meanOff,
    accuracy: answered ? accuracyOf(meanOff) : 0,
    close: marks.filter((m) => m.off <= CLOSE_ENOUGH).length,
    gloomyMisses: marks.filter((m) => m.gloomy === true).length,
    gloomyEligible,
    worst: answered ? marks.reduce((a, b) => (b.off > a.off ? b : a)) : null,
    best: answered ? marks.reduce((a, b) => (b.off < a.off ? b : a)) : null,
  };
}

/**
 * A short badge for the score. Kept blunt and non-flattering.
 *
 * Withheld until the battery is finished: "WAY OFF" earned on a single question
 * is not a verdict, it is one guess, and stamping it on the card invites people
 * to quit with a bad grade they never actually earned.
 */
export function gradeOf(score: GapScore): string {
  if (!score.answered) return "Unscored";
  if (!score.complete) return "So far";
  if (score.accuracy >= 85) return "Sharp";
  if (score.accuracy >= 70) return "Pretty close";
  if (score.accuracy >= 50) return "Roughly typical";
  if (score.accuracy >= 30) return "Some way off";
  return "Way off";
}

/**
 * The headline sentence. This is the thing people came for, so it leads with
 * the direction of the error rather than the score: "you were too cynical" is a
 * finding about them, while "62/100" is only a number.
 *
 * The threshold is two-thirds of eligible items, so a single stray miss can't
 * brand someone a cynic — with six eligible items that means at least four.
 */
export function readingOf(score: GapScore): { headline: string; detail: string } {
  if (!score.answered) {
    return { headline: "Nothing scored yet", detail: "Answer the questions to see how you did." };
  }

  /*
   * A lean is a claim about a pattern, so it needs a pattern. Reporting one
   * from a part-finished battery would state as a finding what is really just
   * the first question or two.
   */
  if (!score.complete) {
    const left = score.total - score.answered;
    return {
      headline: `${score.answered} of ${score.total} answered`,
      detail: `Your score so far is provisional. Which way you lean is the interesting part, and it only means anything once all ${score.total} are in — ${left} to go.`,
    };
  }

  const { gloomyMisses, gloomyEligible } = score;
  const gloomyShare = gloomyEligible ? gloomyMisses / gloomyEligible : 0;
  const sunnyMisses = gloomyEligible - gloomyMisses;

  if (gloomyEligible >= 3 && gloomyShare >= 2 / 3) {
    return {
      headline: "You read the country as bleaker than it is",
      detail: `On ${gloomyMisses} of the ${gloomyEligible} questions that have a gloomy direction, you guessed the gloomier way — more extremism, more loneliness, less trust than the surveys actually find. That is the most common way to be wrong here, and it gets more common the more news you read.`,
    };
  }

  if (gloomyEligible >= 3 && sunnyMisses / gloomyEligible >= 2 / 3) {
    return {
      headline: "You read the country as sunnier than it is",
      detail: `On ${sunnyMisses} of the ${gloomyEligible} questions with a gloomy direction, you guessed the rosier way. That is the rarer error — most people miss in the other direction.`,
    };
  }

  return {
    headline: "You didn't lean either way",
    detail: `Your misses fell on both sides rather than consistently gloomy or consistently rosy. Most people show a clear lean, usually the gloomy one.`,
  };
}
