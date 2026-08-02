import { TOPICS, getTopic, type Topic } from "./topics";

/**
 * The order experiment.
 *
 * Everyone answers shortform social media's addictiveness. What varies is what
 * they answered immediately before it:
 *
 *   Arm A  coffee   -> social    social is judged after a socially acceptable,
 *                                chemically real, near-universal dependence.
 *   Arm B  social   -> coffee    social is judged cold, with no comparator.
 *   Arm C  slime    -> social    social is judged second, after something
 *                                unrelated.
 *
 * Arm C is the reason this is an experiment rather than an anecdote. Without it,
 * "answered second" and "answered after coffee" are perfectly confounded, so any
 * A-vs-B difference could just be a position effect — people being less extreme
 * on a second judgement, or tiring. Comparing A against C separates the
 * comparator's effect from the position's.
 *
 * Assignment is random per browser and recorded on every vote, so a partial run
 * is still usable: someone who answers only the first item still gives a clean
 * uncontaminated rating with a known arm.
 */

export const ARMS = ["A", "B", "C"] as const;
export type Arm = (typeof ARMS)[number];

const ARM_ORDER: Record<Arm, string[]> = {
  A: ["coffee-addictive", "social-addictive"],
  B: ["social-addictive", "coffee-addictive"],
  C: ["slime", "social-addictive"],
};

const ARM_KEY = "vibecheck:arm";

/** Board ids used by the experiment, in any arm. */
export const EXPERIMENT_TOPIC_IDS = Array.from(
  new Set(Object.values(ARM_ORDER).flat()),
);

export const isExperimentTopic = (topicId: string): boolean =>
  EXPERIMENT_TOPIC_IDS.includes(topicId);

/** Everything outside the experiment, browsable in any order. */
export const EXTRA_TOPICS: Topic[] = TOPICS.filter((t) => !isExperimentTopic(t.id));

/**
 * The browse page grouped by what each board is about.
 *
 * Grouped by `subject` rather than by construct (health / addiction / policy)
 * because that's how someone browsing actually decides what to answer next —
 * they pick a topic they have opinions about, not a measurement category.
 * Switching to construct grouping means changing the key here and nothing else.
 */
export function groupedExtraTopics(): { title: string; topics: Topic[] }[] {
  const groups: { title: string; topics: Topic[] }[] = [];
  for (const topic of EXTRA_TOPICS) {
    const existing = groups.find((g) => g.title === topic.subject);
    if (existing) existing.topics.push(topic);
    else groups.push({ title: topic.subject, topics: [topic] });
  }
  return groups;
}

export function armTopics(arm: Arm): Topic[] {
  return ARM_ORDER[arm]
    .map((id) => getTopic(id))
    .filter((t): t is Topic => t !== undefined);
}

/** 1-based position of a board within an arm, or 0 if it isn't in that arm. */
export function positionInArm(arm: Arm, topicId: string): number {
  return ARM_ORDER[arm].indexOf(topicId) + 1;
}

/**
 * This browser's arm, assigned on first use and then stable.
 *
 * Random rather than round-robin: a counter would need shared server state, and
 * alternating assignment can line up with systematic patterns in who arrives
 * when. With any real sample size the split evens out.
 */
export function getArm(): Arm {
  try {
    const stored = window.localStorage.getItem(ARM_KEY);
    if (stored && (ARMS as readonly string[]).includes(stored)) return stored as Arm;
  } catch {
    /* private browsing can throw; fall through and assign a fresh one */
  }
  const picked = ARMS[Math.floor(Math.random() * ARMS.length)];
  try {
    window.localStorage.setItem(ARM_KEY, picked);
  } catch {
    /* not persisted; the vote still records the arm it was answered under */
  }
  return picked;
}
