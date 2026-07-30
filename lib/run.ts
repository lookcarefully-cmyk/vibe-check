import { CORE_TOPICS, voteStorageKey, type Topic } from "./topics";

/**
 * The guided run.
 *
 * Two things it exists to protect, both of which the per-board anchoring gate
 * does not cover:
 *
 *  1. **Pairing.** H1 is a within-person claim, so separate averages can't test
 *     it — only answers from the same person can. If people answer the trap
 *     without the target, the response count goes up and the argument
 *     disappears.
 *  2. **Independence.** No core result is revealed until every core board is
 *     answered. Someone who has just seen "the crowd says 78% addictive" answers
 *     the trap in a different frame of mind, and that lands directly on the
 *     comparison the hypothesis rests on.
 *
 * State is derived from which boards have a stored answer rather than kept in a
 * separate flag — one source of truth, and nothing to get out of step.
 */

export interface RunState {
  /** Core board ids this browser has answered. */
  answered: Set<string>;
  /** The next unanswered core board, or null when the run is finished. */
  next: Topic | null;
  complete: boolean;
  answeredCount: number;
  total: number;
}

export function readRunState(): RunState {
  const answered = new Set<string>();
  for (const topic of CORE_TOPICS) {
    try {
      if (window.localStorage.getItem(voteStorageKey(topic.id)) !== null) {
        answered.add(topic.id);
      }
    } catch {
      /* private browsing can throw; treat as unanswered */
    }
  }
  const next = CORE_TOPICS.find((t) => !answered.has(t.id)) ?? null;
  return {
    answered,
    next,
    complete: next === null,
    answeredCount: answered.size,
    total: CORE_TOPICS.length,
  };
}

/** Where to send someone after they answer a core board. */
export function nextHref(state: RunState): string {
  return state.next ? `/${state.next.id}` : "/results";
}
