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
   * Optional reference points printed on the dial face.
   *
   * CURRENTLY UNUSED, deliberately. Anchors were on the addictive board and came
   * off: the hypothesis is about the public's own concept of "addictive", and
   * printing referents replaces that concept with ours — the answer becomes
   * "where does this sit relative to gambling" instead of "how addictive is
   * this". The game's convention is that the guesser forms their own extremes.
   *
   * Kept because a future board might want them. If you ever use them on a
   * board measuring a lay concept, be clear you have changed what it measures.
   * And never anchor with cigarettes, nicotine or opioids: CIGARETTES is a pole
   * of social-coffee, and naming it a screen earlier welds the two scales
   * together.
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
  /**
   * Marks an item with a defensible correct answer, used to check the
   * respondent is using the continuum rather than treating it as a two-way
   * switch. Not an opinion measure — exclude it from every substantive result.
   */
  calibration?: boolean;
}

export const TOPICS: Topic[] = [
  {
    /*
     * Addictiveness. First in the run, and deliberately UNANCHORED.
     *
     * The hypothesis is about the public's concept of "addictive" — whether it
     * carries the clinical meaning or is just an intensifier. Printing referents
     * on the scale would replace that concept with ours: the answer would become
     * "where does this sit relative to gambling", not "how addictive is this".
     * The measure has to let the respondent supply their own extremes.
     *
     * The cost is interpretability — 78% of a self-defined scale is harder to
     * quote. social-slime is the partial answer: it checks people are using the
     * continuum sensibly at all.
     */
    id: "social-addictive",
    subject: "Shortform social media",
    axis: "Addictive?",
    question: "Is shortform social media addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ADDICTIVE",
    rightLabel: "NOT ADDICTIVE",
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
     *
     * "Mental health", not "health": bare "health" reads as physical, and a lot
     * of people would answer "well, it isn't smoking" while privately agreeing
     * it wrecks their attention. "Cognitive health" is the more precise term and
     * the wrong one — it's jargon most respondents don't use. "Mental health"
     * has wide lay currency and covers the domain.
     */
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Mental health?",
    question: "Is shortform social media bad or good for your mental health?",
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
     * Not a third construct. Both poles are compelling daily habits, so this
     * holds "hard to stop" roughly constant and varies mainly the health
     * valence: cigarettes wreck you, coffee doesn't. Someone placing shortform
     * video near coffee has said compelling but fine — which is the whole
     * question, since clinical addiction requires impairment and colloquial
     * "addictive" only means hard to stop.
     *
     * Coffee rather than exercise, deliberately. Exercise carries a virtue
     * halo, so choosing it can express "it's actively good for you" rather than
     * "the compulsion is harmless" — an over-strong positive that drags the
     * item back toward board 2's construct. Coffee is health-neutral, and it is
     * the most common non-clinical use of the word addicted there is.
     *
     * It is also a far better matched pair. Cigarettes vs exercise differed on
     * substance vs behaviour, stigma, and physiological dependence all at once.
     * Cigarettes vs coffee holds those roughly constant — both substances, both
     * daily rituals, both legal, both genuinely dependence-forming (caffeine
     * withdrawal is in the DSM). What mainly differs is the harm.
     *
     * Named for its poles, like social-cigarettes, rather than for the construct:
     * a URL reading "/social-destructive" telegraphs the answer being looked for.
     *
     * It runs LAST, after both components have been measured separately. A
     * composite item asked first would prime the parts it is made of.
     */
    id: "social-coffee",
    subject: "Shortform social media",
    axis: "Cigarettes or coffee?",
    question: "Is compulsive shortform scrolling more like a cigarette habit or a coffee habit?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "CIGARETTES",
    rightLabel: "COFFEE",
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
    /*
     * Consequence: does perceived addiction translate into thinking sufferers
     * deserve care? Asked after the harm and addiction items so the judgement is
     * informed by them rather than made cold.
     *
     * Framed around a third person rather than the respondent — "someone says",
     * not "if you" — so nobody has to self-identify as impaired to answer.
     */
    id: "social-treatment",
    subject: "Shortform social media",
    axis: "Treatment?",
    question:
      "Someone says shortform video has taken over their life. What treatment should they be able to get?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NONE",
    rightLabel: "FULL CLINICAL CARE",
    core: 4,
  },
  {
    /*
     * Calibration, not opinion. Slime has a defensible right answer — the middle
     * — so an answer slammed at either extreme means the person is not using the
     * continuum, and their other answers can be filtered out.
     *
     * It runs LAST on purpose. An item with a correct answer, asked first, tells
     * people the game has right answers and nudges them from "what do I think"
     * toward "what is the expected answer" on every item that follows. Placing
     * it at the end costs nothing analytically: the analysis only uses complete
     * runs anyway, so the check covers exactly the people being analysed.
     *
     * Judge it with a wide band. Slime is a non-Newtonian fluid and reasonable
     * people land anywhere from ~30 to ~70. This is meant to catch non-engagement,
     * not to grade physics.
     */
    id: "social-slime",
    subject: "Warm-up",
    axis: "Liquid or solid?",
    question: "Is slime a liquid or a solid?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "LIQUID",
    rightLabel: "SOLID",
    core: 5,
    calibration: true,
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
