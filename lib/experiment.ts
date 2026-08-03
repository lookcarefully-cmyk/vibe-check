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

/**
 * The order experiment is PARKED. The shortform-social-media questionnaire is
 * being reworked, so the site's front door is the browsable topics rather than
 * the guided run.
 *
 * Nothing has been deleted. Flip this to true and the run comes back exactly as
 * it was: `/` sends visitors into an arm, arm and position are recorded on every
 * vote, and results are held until the arm finishes. The record shape already
 * carries `g` and `p`, so re-enabling costs nothing and loses nothing.
 *
 * While parked, the experiment's boards behave as ordinary browsable boards.
 */
export const EXPERIMENT_ENABLED = false;

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

/**
 * Boards shown on the browse page (and the board-page nav). With the experiment
 * parked that's most of them; with it running, its items are withheld so they
 * can't be taken out of order or previewed.
 *
 * Boards flagged `hiddenFromLibrary` are excluded either way: they stay in
 * TOPICS (and keep their votes) but don't appear in the browsable set. That's
 * how a formal data-collection item is kept off the casual browse page without
 * being deleted. See lib/topics.ts.
 */
export const EXTRA_TOPICS: Topic[] = (EXPERIMENT_ENABLED
  ? TOPICS.filter((t) => !isExperimentTopic(t.id))
  : TOPICS
).filter((t) => !t.hiddenFromLibrary);

/**
 * The browse page grouped by what each board is about.
 *
 * Grouped by `category`, which is free text on each board. Adding a new section
 * to the browse page is just typing a new category string in lib/topics.ts.
 */
/** Category name treated as a catch-all and always sorted last. */
export const CATCH_ALL = "Other";

export function groupTopics(topics: Topic[]): { title: string; topics: Topic[] }[] {
  const groups: { title: string; topics: Topic[] }[] = [];
  for (const topic of topics) {
    const existing = groups.find((g) => g.title === topic.category);
    if (existing) existing.topics.push(topic);
    else groups.push({ title: topic.category, topics: [topic] });
  }
  // Sections otherwise follow the order boards are declared in. "Other" is a
  // catch-all, so it goes last however its boards happen to be ordered —
  // a bucket labelled "Other" sitting above real categories reads as a mistake.
  return groups.sort((a, b) => Number(a.title === CATCH_ALL) - Number(b.title === CATCH_ALL));
}

export const groupedExtraTopics = () => groupTopics(EXTRA_TOPICS);

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
