/**
 * Every board in the collection. Adding a question here creates the board, its
 * route and its own vote store.
 *
 * ORIENTATION follows each question's natural reading, and `highMeans` records
 * what a high score means so nothing downstream has to guess. There is no longer
 * a "negative pole is always left" rule: the addictive boards run
 * NOT ADDICTIVE -> ADDICTIVE to match the Likert bands in lib/likert.ts, while
 * the harm boards run HARMFUL -> HEALTHY. Mixing directions is fine because
 * every consumer reads `highMeans`; assuming a uniform direction is what would
 * silently invert a result.
 *
 * If you ever flip an existing board's ends, bump STORE_VERSION in lib/store.ts.
 * Votes are stored as bare positions on the 0..1 scale, so reversing the labels
 * inverts the meaning of every vote already collected.
 */

import type { ScaleFamily } from "./likert";

export interface Topic {
  /** URL slug and storage key. Never change one after votes exist. */
  id: string;
  /** What the board is about, for the nav tile. */
  subject: string;
  /** The axis being measured, for the nav tile. */
  axis: string;
  question: string;
  /** Prompt shown above the dial while choosing. */
  prompt: string;
  /** The 0 end. */
  leftLabel: string;
  /** The 1 end. */
  rightLabel: string;
  /**
   * How the pole reads inside a sentence, when lower-casing the dial label
   * won't do. Dial labels are caps, and the bipolar band text lower-cases them
   * for prose — which mangles proper nouns ("sf-coded") and nouns that need an
   * adjective form ("slightly optimist"). Set these to fix that.
   */
  leftProse?: string;
  rightProse?: string;
  /**
   * Plain-English meaning of a HIGH score. Written for the export and for
   * anyone reading the data later — the single most useful thing to have
   * recorded when a result looks backwards.
   */
  highMeans: string;
  /**
   * Which wording family translates this board's percentage into words.
   *
   *   addictive — one property varying in degree ("moderately addictive")
   *   bipolar   — which of two named poles it sits near ("mostly coffee")
   *   amount    — how much of something there should be ("a good deal")
   *
   * See lib/likert.ts. All three share the same band boundaries, so a
   * percentage means the same distance from neutral on every board.
   */
  scale?: ScaleFamily;
  /**
   * Which section of the browse page this appears under. Free text — adding a
   * new category is just typing a new string here.
   */
  category: string;
  /**
   * Keep the board and its data, but hide it from the browse library and the
   * board-page nav. For items that belong to a formal data-collection set and
   * shouldn't be casually browsable, without deleting the board or orphaning
   * its votes. Filtered out of EXTRA_TOPICS in lib/experiment.ts.
   */
  hiddenFromLibrary?: boolean;
  /**
   * True for items with a defensible correct answer, used to check the
   * respondent is using the continuum rather than treating it as a switch.
   * Never an opinion measure — exclude from every substantive result.
   */
  calibration?: boolean;
}

export const TOPICS: Topic[] = [
  /* ------------------------------------------------ the experiment's items */
  {
    /*
     * The target. Deliberately UNANCHORED: the hypothesis is about the public's
     * own concept of "addictive", and printing referents would replace that
     * concept with ours. The comparator is supplied as a measured item
     * (coffee-addictive) rather than as scale labels — which is also the
     * experimental manipulation. See lib/experiment.ts.
     */
    id: "social-addictive",
    subject: "Shortform social media",
    axis: "Addictive?",
    question: "Is shortform social media addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NOT ADDICTIVE",
    rightLabel: "ADDICTIVE",
    highMeans: "more addictive",
    scale: "addictive",
    category: "Screens & attention",
    hiddenFromLibrary: true,
  },
  {
    /*
     * The comparator, and the point of the whole experiment. Coffee is the
     * socially acceptable dependence: genuinely habit-forming, chemically real,
     * near-universal, and not considered a problem. Asking it before or after
     * the target is the manipulation.
     *
     * "Coffee" rather than "caffeine": the everyday object, not the drug. People
     * have intuitions about coffee.
     */
    id: "coffee-addictive",
    subject: "Coffee",
    axis: "Addictive?",
    question: "Is coffee addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NOT ADDICTIVE",
    rightLabel: "ADDICTIVE",
    highMeans: "more addictive",
    scale: "addictive",
    category: "Everyday habits",
    hiddenFromLibrary: true,
  },
  {
    /*
     * The position control, and a comprehension check in one item.
     *
     * As a control: arm C puts this before the target, so the target is answered
     * second after something unrelated. Comparing that against the target
     * answered second after coffee separates "the coffee comparator did this"
     * from "being asked second did this". Without arm C those two are perfectly
     * confounded.
     *
     * As a check: slime has a defensible right answer — the middle — so an
     * answer slammed at either extreme means the person isn't using the
     * continuum, and their other answers can be dropped. Judge with a wide band;
     * slime is non-Newtonian and reasonable people land anywhere from ~30 to ~70.
     * It catches non-engagement, not physics.
     */
    id: "slime",
    subject: "Warm-up",
    axis: "Liquid or solid?",
    question: "Is slime a liquid or a solid?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "LIQUID",
    rightLabel: "SOLID",
    highMeans: "more solid",
    scale: "bipolar",
    category: "Just for fun",
    calibration: true,
    hiddenFromLibrary: true,
  },

  /* ------------------------------------------ everything else, browsable */
  {
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Mental health?",
    question: "Is shortform social media bad or good for your mental health?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HEALTHY",
    highMeans: "better for mental health",
    scale: "bipolar",
    category: "Screens & attention",
  },
  {
    id: "social-treatment",
    subject: "Shortform social media",
    axis: "Treatment?",
    question:
      "Someone says shortform video has taken over their life. What treatment should they be able to get?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NONE",
    rightLabel: "FULL CLINICAL CARE",
    highMeans: "more access to treatment",
    scale: "amount",
    category: "Screens & attention",
    hiddenFromLibrary: true,
  },
  {
    id: "social-disorder",
    subject: "Shortform social media",
    axis: "Disorder or habit?",
    question: "Is compulsive shortform scrolling a real disorder or just a bad habit?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "REAL DISORDER",
    rightLabel: "JUST A HABIT",
    highMeans: "less clinically serious",
    scale: "bipolar",
    category: "Screens & attention",
    hiddenFromLibrary: true,
  },
  {
    // The word "neurologically" is carried in the question, not repeated on both
    // poles: two ~22-character end labels ("NEUROLOGICALLY HARMFUL" /
    // "NEUROLOGICALLY HARMLESS") collide in the middle of the dial baseline. The
    // question supplies the neurological framing; the poles stay short.
    id: "social-neuro",
    subject: "Long-term shortform use",
    axis: "Neurological harm?",
    question: "Long-term shortform social media use is, neurologically:",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HARMLESS",
    highMeans: "more neurologically harmless",
    scale: "bipolar",
    category: "Screens & attention",
  },
  {
    id: "porn-addictive",
    subject: "Internet porn",
    axis: "Addictive?",
    question: "Is internet porn addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NOT ADDICTIVE",
    rightLabel: "ADDICTIVE",
    highMeans: "more addictive",
    scale: "addictive",
    category: "Sex & relationships",
  },
  {
    id: "porn-healthy",
    subject: "Internet porn",
    axis: "Harmful?",
    question: "Is internet porn harmful or healthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HEALTHY",
    highMeans: "healthier",
    scale: "bipolar",
    category: "Sex & relationships",
  },
  {
    id: "social-polarizing",
    subject: "Shortform social media",
    axis: "Polarizing?",
    question: "Is shortform social media politically polarizing or politically unifying?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "POLARIZING",
    rightLabel: "UNIFYING",
    highMeans: "more unifying",
    scale: "bipolar",
    category: "Screens & attention",
  },
  {
    id: "social-society",
    subject: "Shortform social media",
    axis: "Good for society?",
    question: "Is shortform social media bad or good for society?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "BAD FOR SOCIETY",
    rightLabel: "GOOD FOR SOCIETY",
    highMeans: "better for society",
    scale: "bipolar",
    category: "Screens & attention",
    hiddenFromLibrary: true,
  },
  {
    id: "porn-society",
    subject: "Internet porn",
    axis: "Good for society?",
    question: "Is internet porn bad or good for society?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "BAD FOR SOCIETY",
    rightLabel: "GOOD FOR SOCIETY",
    highMeans: "better for society",
    scale: "bipolar",
    category: "Sex & relationships",
  },

  /* ------------------------------------------------------ hot topics */
  {
    id: "ai-optimist",
    subject: "AI",
    axis: "Optimist or doomer?",
    question: "On AI, are you an optimist or a doomer?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "OPTIMIST",
    rightLabel: "DOOMER",
    leftProse: "optimistic",
    rightProse: "doomer",
    highMeans: "more doomer",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "ai-pace",
    subject: "AI progress",
    axis: "Faster or slower?",
    question: "Should AI progress go faster or slower?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "FASTER",
    rightLabel: "SLOWER",
    highMeans: "should go slower",
    scale: "pace",
    category: "AI",
  },
  {
    id: "agi-here",
    subject: "AGI",
    axis: "Are we there?",
    question: "AGI: are we there yet?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "WE'RE THERE",
    rightLabel: "NOT EVEN CLOSE",
    highMeans: "further away",
    scale: "proximity",
    category: "AI",
  },
  {
    id: "singularity-here",
    subject: "The singularity",
    axis: "Are we there?",
    question: "The singularity: are we there yet?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "WE'RE THERE",
    rightLabel: "NOT EVEN CLOSE",
    highMeans: "further away",
    scale: "proximity",
    category: "AI",
  },
  {
    id: "opensource-gap",
    subject: "Open-source AI",
    axis: "Are we there?",
    question:
      "Open-source AI catching up to closed frontier models: are we there yet?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "WE'RE THERE",
    rightLabel: "NOT EVEN CLOSE",
    highMeans: "further away",
    scale: "proximity",
    category: "AI",
  },
  {
    id: "anthropic-mandate",
    subject: "Anthropic",
    axis: "Mandate of heaven?",
    question: "Does Anthropic still have the mandate of heaven?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "LOST THE MANDATE",
    rightLabel: "HAS THE MANDATE",
    highMeans: "still has the mandate",
    scale: "bipolar",
    category: "AI labs",
  },
  {
    id: "openai-mandate",
    subject: "OpenAI",
    axis: "Mandate of heaven?",
    question: "Does OpenAI still have the mandate of heaven?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "LOST THE MANDATE",
    rightLabel: "HAS THE MANDATE",
    highMeans: "still has the mandate",
    scale: "bipolar",
    category: "AI labs",
  },
  {
    id: "fable-coded",
    subject: "Fable",
    axis: "SF or NYC?",
    question: "Is Fable SF-coded or NYC-coded?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
  },
  {
    id: "opus-coded",
    subject: "Opus",
    axis: "SF or NYC?",
    question: "Is Opus SF-coded or NYC-coded?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
  },
  {
    id: "cursor-coded",
    subject: "Cursor",
    axis: "SF or NYC?",
    question: "Is Cursor SF-coded or NYC-coded?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
  },
  {
    id: "chatgpt-coded",
    subject: "ChatGPT",
    axis: "SF or NYC?",
    question: "Is ChatGPT SF-coded or NYC-coded?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
  },
  {
    id: "grok-coded",
    subject: "Grok",
    axis: "SF or NYC?",
    question: "Is Grok SF-coded or NYC-coded?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
  },
  {
    id: "us-hegemony-end",
    subject: "The end of US hegemony",
    axis: "Are we there?",
    question: "The end of US hegemony: are we there yet?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "WE'RE THERE",
    rightLabel: "NOT EVEN CLOSE",
    highMeans: "further away",
    scale: "proximity",
    category: "Big shifts",
  },
  {
    id: "college-end",
    subject: "The end of college as we know it",
    axis: "Are we there?",
    question:
      "The end of the collegiate model of education: are we there yet?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "WE'RE THERE",
    rightLabel: "NOT EVEN CLOSE",
    highMeans: "further away",
    scale: "proximity",
    category: "Big shifts",
  },
  {
    // A yes/no read on the spectrum: the bipolar family renders NO..YES as
    // "mostly no" .. "fully yes", so a plain two-way question still gets degree
    // words rather than a hard switch.
    id: "college-recommend-2026",
    subject: "College in 2026",
    axis: "Recommend it?",
    question: "Would you recommend your kid goes to college in 2026?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NO",
    rightLabel: "YES",
    highMeans: "more likely to recommend college",
    scale: "bipolar",
    category: "Big shifts",
  },
  {
    id: "kids-social",
    subject: "Social media for under-12s",
    axis: "Harmful?",
    question:
      "Is social media access for children under 12 harmful or beneficial?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "BENEFICIAL",
    highMeans: "more beneficial",
    scale: "bipolar",
    category: "Kids & screens",
  },
  {
    id: "online-gambling",
    subject: "Online gambling",
    axis: "Legal?",
    question: "Should online gambling be illegal or legal?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ILLEGAL",
    rightLabel: "LEGAL",
    highMeans: "should be legal",
    scale: "bipolar",
    category: "Law & policy",
  },
  {
    id: "prediction-markets",
    subject: "Prediction markets",
    axis: "Legal?",
    question: "Should prediction markets be illegal or legal?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ILLEGAL",
    rightLabel: "LEGAL",
    highMeans: "should be legal",
    scale: "bipolar",
    category: "Law & policy",
  },
];

export function getTopic(id: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}

/**
 * The boards the front page leads with, in display order. A hand-picked
 * shortlist rather than a category, because "what's worth putting on the front
 * door" is an editorial call that doesn't map onto any single `category`.
 */
export const FEATURED_TOPIC_IDS = [
  "kids-social",
  "ai-optimist",
  "ai-pace",
  "opensource-gap",
  "college-recommend-2026",
  "social-neuro",
];

export const FEATURED_TOPICS: Topic[] = FEATURED_TOPIC_IDS.map((id) =>
  getTopic(id),
).filter((t): t is Topic => t !== undefined);

/** Where a viewer's own answer to one board is remembered. */
export function voteStorageKey(topicId: string): string {
  return `vibecheck:${topicId}:vote`;
}

/**
 * Set when someone chooses to see a board's results *without* answering it.
 *
 * Deliberately a second key rather than a sentinel value in the vote key: this
 * is the record of a forfeited vote, not an answer, and nothing downstream
 * should ever mistake it for a position on the scale. Once set, the board is
 * closed to that browser — having seen the crowd, their answer would be
 * anchored, which is the whole reason results are withheld in the first place.
 */
export function revealStorageKey(topicId: string): string {
  return `vibecheck:${topicId}:revealed`;
}
