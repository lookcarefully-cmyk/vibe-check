/**
 * Every board in the collection. Adding a question here is enough to create a
 * new board, its route, its nav tile, and its own separate vote store.
 *
 * Orientation is uniform across every board: the negative pole is on the LEFT
 * (0) and the positive pole on the RIGHT (1). Keep it that way — a board that
 * ran the other direction would make the nav tiles lie to anyone reading them
 * side by side.
 *
 * If you ever flip an existing board's ends, bump STORE_VERSION in lib/store.ts.
 * Votes are stored as bare positions on the 0..1 scale, so reversing the labels
 * silently inverts the meaning of every vote already collected.
 */

export interface Topic {
  /** URL slug and storage key. Never change one after votes exist. */
  id: string;
  /** What the board is about, for the nav tile. */
  subject: string;
  /** The axis being measured, for the nav tile. Names the left-hand pole. */
  axis: string;
  question: string;
  /** Prompt shown above the dial while choosing. */
  prompt: string;
  /** The negative pole. Always the left/0 end. */
  leftLabel: string;
  /** The positive pole. Always the right/1 end. */
  rightLabel: string;
  /**
   * Optional reference points printed on the dial face, to give the scale an
   * external referent — "78% addictive" means nothing without one.
   *
   * NEVER anchor an addictive scale with cigarettes, nicotine or opioids.
   * CIGARETTES is a pole of the interaction item, and naming it here one screen
   * earlier welds the two scales together, suppressing the very dissociation
   * being measured. A null result would then be uninterpretable: no
   * dissociation, or primed away?
   *
   * The cigarettes-poled boards get no anchors at all. Their vagueness is the
   * mechanism.
   */
  anchors?: { left: string; right: string };
  /**
   * Position in the guided run, 1-based. Boards without this are optional and
   * browsable in any order.
   *
   * Order is deliberate: the two component constructs (addictiveness, health
   * impact) are measured first, then the item that combines them. A composite
   * asked first would prime the parts it is made of.
   */
  core?: number;
}

export const TOPICS: Topic[] = [
  {
    // Addictiveness. First in the run.
    id: "social-addictive",
    subject: "Shortform social media",
    axis: "Addictive?",
    question: "Is shortform social media addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ADDICTIVE",
    rightLabel: "NOT ADDICTIVE",
    anchors: { left: "like gambling", right: "like watching paint dry" },
    core: 1,
  },
  {
    id: "porn-addictive",
    subject: "Internet porn",
    axis: "Addictive?",
    question: "Is internet porn addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ADDICTIVE",
    rightLabel: "NOT ADDICTIVE",
  },
  {
    /*
     * Health impact. Second in the run.
     *
     * Its relationship with social-addictive IS the finding: if lay "addictive"
     * carried the clinical meaning, calling something addictive would imply
     * calling it harmful, and the two would move together. Weak coupling is the
     * evidence that "addictive" is being used as an intensifier.
     *
     * Sitting next to social-addictive invites people to answer the two
     * consistently, which would inflate that correlation — i.e. bias AGAINST
     * the hypothesis. That is the right direction to be wrong in: finding the
     * dissociation despite a layout that nudges toward consistency makes it
     * harder to dismiss.
     */
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Harmful?",
    question: "Is shortform social media harmful or healthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HEALTHY",
    core: 2,
  },
  {
    id: "porn-healthy",
    subject: "Internet porn",
    axis: "Harmful?",
    question: "Is internet porn harmful or healthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HEALTHY",
  },
  {
    /*
     * THE VAGUENESS IS THE POINT. Do not add explanatory copy to this board.
     *
     * It's a trap item. The hypothesis is that people will rate shortform
     * social media as highly addictive AND place it nearer comic books — the
     * moral panic that turned out to be nothing — than cigarettes. Holding both
     * positions at once is evidence that the public's "addictive" is a
     * colloquial intensifier, not the clinical construct.
     *
     * Any prompt that spells out what cigarettes and comic books stand for
     * tells respondents which answer is consistent, and a respondent who spots
     * the inconsistency will resolve it. That destroys the measurement. Leave
     * the framing to the reader.
     */
    id: "social-cigarettes",
    subject: "Shortform social media",
    axis: "Cigarettes or comics?",
    question: "Is shortform social media more akin to cigarettes or comic books?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "CIGARETTES",
    rightLabel: "COMIC BOOKS",
  },
  {
    /*
     * The clinical frame, stated in plain words. Someone who calls shortform
     * video addictive and then calls compulsive use "just a habit" has stated
     * the dissociation outright, with no inference needed.
     *
     * Orientation follows the rule: the clinically serious pole is on the left,
     * matching ADDICTIVE and CIGARETTES on the boards either side of it. So the
     * H1 pattern is a LOW score on board 1 with HIGH scores on boards 2 and 3 —
     * all three relationships point the same way, which makes the analysis
     * simpler to state and harder to fool yourself with.
     */
    id: "social-disorder",
    subject: "Shortform social media",
    axis: "Disorder or habit?",
    question: "Is compulsive shortform scrolling a real disorder or just a bad habit?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "REAL DISORDER",
    rightLabel: "JUST A HABIT",
  },
  {
    /*
     * The interaction item. THE VAGUENESS IS THE POINT — no explanatory copy,
     * for the same reason as social-cigarettes.
     *
     * Not a third construct. Both poles are compelling habits, so this holds
     * "hard to stop" roughly constant and varies only the health valence:
     * cigarettes are addictive-and-harmful, exercise is addictive-and-healthy.
     * Someone placing shortform video near exercise has said compelling but
     * fine — which is the whole question, since clinical addiction requires
     * impairment and colloquial "addictive" only means hard to stop.
     *
     * It runs LAST, after both components have been measured separately. A
     * composite item asked first would prime the parts it is made of.
     *
     * Residual caveat: cigarettes and exercise differ on more than health —
     * substance vs behaviour, stigmatised vs virtuous, physiologically
     * dependence-forming vs not. An answer here can pick up any of those. The
     * pairing controls for compellingness, not for everything.
     */
    id: "social-destructive",
    subject: "Shortform social media",
    axis: "Destructive?",
    question: "Is compulsive shortform scrolling more like a cigarette habit or an exercise habit?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "CIGARETTES",
    rightLabel: "EXERCISE",
    core: 3,
  },
  {
    // The same trap on a second subject. See social-cigarettes above — the
    // vagueness is deliberate, and the same warning applies: no explanatory
    // copy. If the dissociation shows up for one subject and not the other,
    // that contrast is more interesting than either result alone.
    id: "porn-cigarettes",
    subject: "Internet porn",
    axis: "Cigarettes or comics?",
    question: "Is internet porn more akin to cigarettes or comic books?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "CIGARETTES",
    rightLabel: "COMIC BOOKS",
  },
  {
    id: "social-polarizing",
    subject: "Shortform social media",
    axis: "Polarizing?",
    question: "Is shortform social media politically polarizing or politically unifying?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "POLARIZING",
    rightLabel: "UNIFYING",
  },
  {
    id: "social-society",
    subject: "Shortform social media",
    axis: "Good for society?",
    question: "Is shortform social media bad or good for society?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "BAD FOR SOCIETY",
    rightLabel: "GOOD FOR SOCIETY",
  },
  {
    id: "porn-society",
    subject: "Internet porn",
    axis: "Good for society?",
    question: "Is internet porn bad or good for society?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "BAD FOR SOCIETY",
    rightLabel: "GOOD FOR SOCIETY",
  },
];

export const DEFAULT_TOPIC = TOPICS[0];

export function getTopic(id: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/**
 * Where a viewer's own answer to one board is remembered. Also gates whether
 * that board's average is revealed to them — see components/TopicNav.tsx.
 */
export function voteStorageKey(topicId: string): string {
  return `vibecheck:${topicId}:vote`;
}

/** Boards in the guided run, in order. */
export const CORE_TOPICS: Topic[] = TOPICS.filter((t) => t.core !== undefined).sort(
  (a, b) => (a.core ?? 0) - (b.core ?? 0),
);

export const isCore = (topic: Topic): boolean => topic.core !== undefined;

/**
 * Everything outside the guided run. The browse grid shows only these — the
 * core boards are the run, and listing them again presents the same questions
 * twice.
 */
export const OPTIONAL_TOPICS: Topic[] = TOPICS.filter((t) => t.core === undefined);
