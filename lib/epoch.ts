/**
 * The time axis.
 *
 * A vote used to be a permanent, once-ever act. Now a board is a series: people
 * come back when their vibe shifts, and the interesting question is how the
 * crowd moved between one period and the next.
 *
 * Everything here is UTC and boundary-aligned on purpose. A rolling "7 days
 * since you last voted" window would give every person their own private
 * schedule, and week-over-week comparison across a smeared population is mush.
 * A fixed global boundary means every week is a real cohort you can name in a
 * sentence: "the week of March 3rd".
 */

export type Cadence = "week" | "month" | "once";

/** How long after their own last vote someone may answer a board again. */
export const MIN_GAP_DAYS = 3;

export const DAY_MS = 86_400_000;

/**
 * ISO-8601 week number. Weeks start Monday; week 1 is the week containing
 * January 4th (equivalently, the week containing the year's first Thursday).
 *
 * Worth using the real ISO rule rather than "day-of-year / 7": the naive version
 * disagrees with every calendar and database on the boundary weeks, which is
 * exactly where a year-over-year comparison would silently misalign.
 */
export function isoWeek(ms: number): { year: number; week: number } {
  const d = new Date(ms);
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  // Shift to the Thursday of this week — the day that decides which year owns it.
  const dayNum = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const isoYear = date.getUTCFullYear();

  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNum + 3);

  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year: isoYear, week };
}

/** `2026-W31`. Sorts lexicographically in chronological order. */
export function weekKey(ms: number): string {
  const { year, week } = isoWeek(ms);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** `2026-03`. Also sorts chronologically. */
export function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Monday 00:00:00 UTC of the week containing `ms`. */
export function weekStart(ms: number): number {
  const d = new Date(ms);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dayNum = (new Date(start).getUTCDay() + 6) % 7; // Monday = 0
  return start - dayNum * DAY_MS;
}

/** First instant of the month containing `ms`, UTC. */
export function monthStart(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

/**
 * The epoch a timestamp belongs to, for a given cadence.
 *
 * `once` returns a constant so the "already voted this epoch" check collapses
 * into "already voted at all" with no special-casing downstream.
 */
export function epochKey(ms: number, cadence: Cadence): string {
  if (cadence === "once") return "all";
  if (cadence === "month") return monthKey(ms);
  return weekKey(ms);
}

export interface Eligibility {
  /** Whether another vote may be recorded right now. */
  allowed: boolean;
  /** Machine-readable reason when it isn't. */
  reason: "ok" | "once-only" | "same-epoch" | "too-soon";
  /** When they may vote again, or null if never / already allowed. */
  nextAllowedAt: number | null;
}

/**
 * May this person answer this board again?
 *
 * Two gates, and both matter:
 *
 *  - A new epoch must have started. This is what keeps cohorts clean.
 *  - At least MIN_GAP_DAYS must have passed since their own last vote. Without
 *    it, someone voting late Sunday could vote again on Monday morning and land
 *    two readings a day apart in adjacent cohorts, which reads as a vibe shift
 *    and isn't one.
 */
export function checkEligibility(
  lastVoteAt: number | null,
  cadence: Cadence,
  now: number,
): Eligibility {
  if (lastVoteAt === null) return { allowed: true, reason: "ok", nextAllowedAt: null };

  if (cadence === "once") {
    return { allowed: false, reason: "once-only", nextAllowedAt: null };
  }

  const nextEpochAt =
    cadence === "month"
      ? Date.UTC(new Date(lastVoteAt).getUTCFullYear(), new Date(lastVoteAt).getUTCMonth() + 1, 1)
      : weekStart(lastVoteAt) + 7 * DAY_MS;

  if (epochKey(lastVoteAt, cadence) === epochKey(now, cadence)) {
    return { allowed: false, reason: "same-epoch", nextAllowedAt: nextEpochAt };
  }

  const gapReadyAt = lastVoteAt + MIN_GAP_DAYS * DAY_MS;
  if (now < gapReadyAt) {
    return { allowed: false, reason: "too-soon", nextAllowedAt: gapReadyAt };
  }

  return { allowed: true, reason: "ok", nextAllowedAt: null };
}

/** "3 weeks ago", "yesterday" — for telling someone when they last answered. */
export function humanAgo(from: number, now: number): string {
  const days = Math.floor((now - from) / DAY_MS);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "last week";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "last month";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return years === 1 ? "last year" : `${years} years ago`;
}

/** "in 4 days", "tomorrow" — for telling someone when they can answer again. */
export function humanUntil(target: number, now: number): string {
  const ms = target - now;
  if (ms <= 0) return "now";
  const days = Math.ceil(ms / DAY_MS);
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  const weeks = Math.ceil(days / 7);
  return weeks === 1 ? "in a week" : `in ${weeks} weeks`;
}
