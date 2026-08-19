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
 * Boards flagged `hiddenFromLibrary` or `retiredFromSite` are excluded either
 * way. Among the remaining curated boards, `collection` separates the tightly
 * edited launch slate, the monthly Pulse, and the looser shelf on the
 * More/Community page.
 */
const ACTIVE_LIBRARY_TOPICS: Topic[] = (EXPERIMENT_ENABLED
  ? TOPICS.filter((t) => !isExperimentTopic(t.id))
  : TOPICS
).filter((t) => !t.hiddenFromLibrary && !t.retiredFromSite);

/** The launch slate used by Start, /boards, and the randomized Main Set. */
export const MAIN_TOPICS: Topic[] = ACTIVE_LIBRARY_TOPICS.filter(
  (topic) => topic.collection === "main",
);

/** Stable, ordered questions that make up the recurring monthly AI Pulse. */
export const PULSE_TOPICS: Topic[] = ACTIVE_LIBRARY_TOPICS.filter(
  (topic) => topic.collection === "pulse",
);

/** Used for the one reminder prompt after the final Pulse result. */
export const PULSE_FINAL_TOPIC_ID = PULSE_TOPICS[PULSE_TOPICS.length - 1]?.id ?? "";

/**
 * A quiz battery runs in a FIXED order (see board-stream.ts) — the sequence is
 * editorial, opening on the sharpest misperception and closing on the warmest
 * finding. Every board must carry a `benchmark`; one without would appear in the
 * quiz and then be silently dropped from the score.
 *
 * A themed quiz battery: eight benchmark boards checked against published
 * figures, living at /gap/<id> with its own landing and score.
 *
 * `lean` picks which characteristic error the score page reads back. "pessimism"
 * (the original set) reports whether you read the country as bleaker than it is;
 * "overestimate" (the group-size set) reports that you think small groups are
 * far bigger than they are; "accuracy" (the budget set) makes no directional
 * claim, because the error there runs both ways — people inflate the famous
 * small programs and underrate the giant ones — so the reading is score-based.
 * A battery's boards carry `battery: id`; nothing else here needs to know the lean.
 */
export interface BatteryDef {
  id: string;
  /** Shown on the hub card and as the quiz's own H1. */
  title: string;
  /** One line under the title. */
  blurb: string;
  /** The provocation on the hub card — the reason to click. */
  hook: string;
  lean: "pessimism" | "overestimate" | "accuracy";
}

export const GAP_BATTERIES: BatteryDef[] = [
  {
    id: "perception",
    title: "How well do you know America?",
    blurb: "Guess what other people actually think, do and feel — then see the real national figure.",
    hook: "Guess what the country really thinks — then see how close you were.",
    lean: "pessimism",
  },
  {
    id: "groups",
    title: "How big is that group, really?",
    blurb: "Guess what share of the country belongs to each group — then see the real number.",
    hook: "Guess how big each group is — then see how far off you are.",
    lean: "overestimate",
  },
  {
    id: "budget",
    title: "Where does the federal budget go?",
    blurb: "Guess how the federal government splits every $100 it spends — then see the real number.",
    hook: "Build the real federal $100 — from foreign aid to Social Security.",
    lean: "accuracy",
  },
];

export function getBattery(id: string): BatteryDef | undefined {
  return GAP_BATTERIES.find((b) => b.id === id);
}

/** The boards of one battery, in source order (the order the quiz runs). */
export function batteryTopics(batteryId: string): Topic[] {
  return ACTIVE_LIBRARY_TOPICS.filter(
    (topic) =>
      topic.collection === "gap"
      && topic.benchmark
      && (topic.battery ?? "perception") === batteryId,
  );
}

/** Back-compat: the original battery. Prefer batteryTopics(id) in new code. */
export const GAP_TOPICS: Topic[] = batteryTopics("perception");

export const GAP_FINAL_TOPIC_ID = GAP_TOPICS[GAP_TOPICS.length - 1]?.id ?? "";

/** Curated extras kept available beside community-made boards. */
export const MORE_TOPICS: Topic[] = ACTIVE_LIBRARY_TOPICS.filter(
  (topic) => topic.collection !== "main"
    && topic.collection !== "pulse"
    && topic.collection !== "gap",
);

/** Compatibility name used by the existing Main Set UI. */
export const EXTRA_TOPICS = MAIN_TOPICS;

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
