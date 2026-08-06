/**
 * This browser's own answers, per board, over time.
 *
 * Until now a board stored a single number: what you said, once, forever. With
 * re-voting the interesting thing is the sequence — what you said, when, and
 * whether it moved. That history is what lets the site ask "you said mostly
 * optimistic three weeks ago; has that changed?", which is the whole returning
 * -visitor loop.
 *
 * This is a convenience cache, NOT a source of truth. The server holds the real
 * record and enforces cadence on write (see app/api/votes/[topic]/route.ts).
 * Anything here can be cleared, edited or absent, so it decides what to SHOW,
 * never what is allowed.
 */

import { revealStorageKey, voteStorageKey, type Topic } from "./topics";
import { cadenceOf } from "./topics";
import { checkEligibility, type Eligibility } from "./epoch";

/** One of this browser's answers to one board. */
export interface MyAnswer {
  /** Position on the spectrum, 0..1. */
  v: number;
  /** Unix ms. 0 when the answer predates history being kept. */
  t: number;
}

const historyKey = (topicId: string) => `vibecheck:${topicId}:history`;

/**
 * Every answer this browser has given to a board, oldest first.
 *
 * Migrates the old single-value key on read: an existing voter keeps their
 * result rather than being shown a blank board. Their timestamp is unknown, so
 * it's recorded as 0 — "answered, at some point before history existed" — which
 * reads as long ago and lets them answer again. The server still has the real
 * time and is what actually decides.
 */
export function readHistory(topicId: string): MyAnswer[] {
  try {
    const raw = window.localStorage.getItem(historyKey(topicId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((a) => a && Number.isFinite(a.v) && a.v >= 0 && a.v <= 1)
          .map((a) => ({ v: Number(a.v), t: Number(a.t) || 0 }))
          .sort((a, b) => a.t - b.t);
      }
    }
    const legacy = window.localStorage.getItem(voteStorageKey(topicId));
    if (legacy !== null && Number.isFinite(Number(legacy))) {
      return [{ v: Number(legacy), t: 0 }];
    }
  } catch {
    /* private browsing, or corrupted JSON — treat as no history */
  }
  return [];
}

/** Append an answer. Also writes the legacy key, so older code paths still see it. */
export function recordAnswer(topicId: string, value: number, at: number): void {
  try {
    const next = [...readHistory(topicId), { v: value, t: at }];
    window.localStorage.setItem(historyKey(topicId), JSON.stringify(next));
    window.localStorage.setItem(voteStorageKey(topicId), String(value));
  } catch {
    /* not persisted; the answer is still recorded server-side */
  }
}

export function clearHistory(topicId: string): void {
  try {
    window.localStorage.removeItem(historyKey(topicId));
    window.localStorage.removeItem(voteStorageKey(topicId));
  } catch {
    /* nothing to clear */
  }
}

/** This browser's most recent answer to a board, or null. */
export function lastAnswer(topicId: string): MyAnswer | null {
  const history = readHistory(topicId);
  return history.length ? history[history.length - 1] : null;
}

export interface MyStanding {
  history: MyAnswer[];
  last: MyAnswer | null;
  /** True once this browser has answered at all. */
  hasAnswered: boolean;
  /** Whether another answer is due, per this board's cadence. */
  eligibility: Eligibility;
}

/** Everything the board page needs to know about where this viewer stands. */
export function myStanding(topic: Topic, now: number): MyStanding {
  const history = readHistory(topic.id);
  const last = history.length ? history[history.length - 1] : null;
  return {
    history,
    last,
    hasAnswered: history.length > 0,
    eligibility: checkEligibility(last ? last.t : null, cadenceOf(topic), now),
  };
}

/**
 * Whether this browser can still give an unanchored answer to this board now.
 *
 * This is only a navigation convenience: the server remains authoritative
 * about cadence. A board is omitted from the stream when this browser either
 * traded its vote for the results, or answered and is not yet due again.
 */
export function canAnswerNow(topic: Topic, now: number): boolean {
  try {
    if (window.localStorage.getItem(revealStorageKey(topic.id)) !== null) {
      return false;
    }
  } catch {
    // If local storage is unavailable, keep the board reachable and let the
    // board page/server resolve its actual state.
  }

  const standing = myStanding(topic, now);
  return !standing.hasAnswered || standing.eligibility.allowed;
}
