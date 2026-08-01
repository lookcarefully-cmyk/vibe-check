import { armTopics, getArm, type Arm } from "./experiment";
import { voteStorageKey, type Topic } from "./topics";

/**
 * Progress through this browser's assigned arm.
 *
 * Derived from which boards have a stored answer rather than kept in a separate
 * flag — one source of truth, nothing to fall out of step.
 *
 * No result is revealed until the arm is finished. The whole design rests on the
 * second answer being uncontaminated by the crowd's view of the first: someone
 * who has just seen "everyone says 78%" is answering the next item in a
 * different frame, and that lands directly on the comparison being measured.
 */
export interface RunState {
  arm: Arm;
  /** The boards in this arm, in order. */
  topics: Topic[];
  answered: Set<string>;
  /** Next unanswered board, or null when the arm is finished. */
  next: Topic | null;
  complete: boolean;
  total: number;
}

export function readRunState(): RunState {
  const arm = getArm();
  const topics = armTopics(arm);
  const answered = new Set<string>();
  for (const topic of topics) {
    try {
      if (window.localStorage.getItem(voteStorageKey(topic.id)) !== null) {
        answered.add(topic.id);
      }
    } catch {
      /* private browsing can throw; treat as unanswered */
    }
  }
  const next = topics.find((t) => !answered.has(t.id)) ?? null;
  return {
    arm,
    topics,
    answered,
    next,
    complete: next === null,
    total: topics.length,
  };
}

/** Where to send someone after they answer a board in the run. */
export function nextHref(state: RunState): string {
  return state.next ? `/${state.next.id}` : "/results";
}
