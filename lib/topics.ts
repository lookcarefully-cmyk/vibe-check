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
import type { Cadence } from "./epoch";

export interface TopicBenchmark {
  /** Published comparison value on the board's same 0..1 geometry. */
  value: number;
  /** Exact display string, preserving meaningful precision and units. */
  display: string;
  /** Percent is a share of people; score100 is a mean on a 0..100 scale. */
  unit: "percent" | "score100";
  sourceName: string;
  sourceUrl: string;
  fielded: string;
  /** Plain-language caveat shown with the result. */
  note: string;
}

export type RevealType = "real-figure" | "other-side" | "crowd";

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
   *   addictive  — one property varying in degree ("moderately addictive")
   *   bipolar    — which of two named poles it sits near ("mostly coffee")
   *   amount     — how much of something there should be ("a good deal")
   *   probability — a subjective chance ("very likely")
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
   * Editorial placement for an active curated board.
   *
   * `main` is the launch slate: every item must earn scarce attention and the
   * resulting responses need enough concentration to become useful data.
   * `more` is the looser shelf beside visitor-made boards. Missing defaults to
   * `more`, so adding a board can never silently expand the Main Set.
   */
  collection?: "main" | "more";
  /**
   * Keep the board and its data, but hide it from the browse library and the
   * board-page nav. For items that belong to a formal data-collection set and
   * shouldn't be casually browsable, without deleting the board or orphaning
   * its votes. Filtered out of EXTRA_TOPICS in lib/experiment.ts.
   */
  hiddenFromLibrary?: boolean;
  /**
   * Fully unavailable on the public site, while remaining in the registry so
   * historical votes retain their question and poles in research exports.
   */
  retiredFromSite?: boolean;
  /**
   * True for items with a defensible correct answer, used to check the
   * respondent is using the continuum rather than treating it as a switch.
   * Never an opinion measure — exclude from every substantive result.
   */
  calibration?: boolean;
  /**
   * How often someone may answer this board again. Defaults to weekly, or
   * `once` for calibration items — a comprehension check measures the person,
   * not the moment, so re-asking it gains nothing.
   *
   * Set `month` for boards whose subject genuinely doesn't move week to week.
   * Weekly re-voting on a stable question just adds noise and gives people a
   * chore. See lib/epoch.ts.
   */
  cadence?: Cadence;
  /**
   * Bumped whenever this board's wording changes in a way that alters what an
   * answer MEANS — poles swapped, question reframed. Recorded on every vote, so
   * a reading of old data stays correct without having to know what the board
   * says today. Typo fixes don't need a bump; meaning changes do.
   */
  version?: number;
  /**
   * A representative external estimate shown only AFTER this visitor answers
   * (or permanently forfeits their vote). Used on perception-gap boards where
   * the guess can be compared with a defensible published figure.
   */
  benchmark?: TopicBenchmark;
  /**
   * A board-specific prediction step. Curated assignments are mostly kept in
   * the sets below; runtime community boards carry the choice on the Topic
   * itself because their ids do not exist at build time.
   *
   * Community boards may use `other-side` or `crowd`, never `real-figure`:
   * published benchmarks require source review by the owner.
   */
  revealType?: RevealType;
}

/** How often this board may be re-answered. See the `cadence` field above. */
export function cadenceOf(topic: Topic): Cadence {
  return topic.cadence ?? (topic.calibration ? "once" : "week");
}

/** This board's current wording version, stamped onto each vote. */
export function versionOf(topic: Topic): number {
  return topic.version ?? 1;
}

/*
 * The research slate uses three different prediction/reveal instruments.
 * Published-benchmark boards are Type 1. The remaining assignments follow the
 * numbered slate in the August 2026 review; keeping them here makes it hard to
 * accidentally turn every board into the weaker "guess our crowd" mechanic.
 */
const OTHER_SIDE_REVEALS = new Set([
  "immigration-status",
  "local-police",
  "gun-laws",
  "history-classes",
  "climate-income",
  "luck-or-effort",
  "beyond-physical",
  "reasons-for-fewer-kids",
  "care-for-parents",
  "division-source",
  "official-numbers-trust",
  "ai-lift-or-leave-behind",
  "relationship-privacy",
  "prison-purpose",
]);

const CROWD_REVEALS = new Set([
  "disagreement-sources",
  "household-basics",
  "home-worth",
  "job-identity",
  "generational-finances",
  "burnout",
  "known-by-others",
  "social-life-comparison",
  "medical-bill",
  "health-control",
  "wallet-return",
  "rootedness",
  "online-self-censorship",
  "life-without-short-video",
  "person-or-chatbot",
]);

export function revealTypeOf(topic: Topic): RevealType | null {
  if (topic.benchmark) return "real-figure";
  if (topic.revealType) return topic.revealType;
  if (OTHER_SIDE_REVEALS.has(topic.id)) return "other-side";
  if (CROWD_REVEALS.has(topic.id)) return "crowd";
  return null;
}

const CORE_PROMPT = "Tap or click to place your answer. Drag to fine-tune, then lock it in.";

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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "LIQUID",
    rightLabel: "SOLID",
    highMeans: "more solid",
    scale: "bipolar",
    category: "Other",
    calibration: true,
    hiddenFromLibrary: true,
  },

  /* ------------------------------------------------ research-led core set */
  /*
   * These six sections broaden the front door beyond AI and internet-culture
   * boards. They are declared before the older browsable collection so the
   * library leads with questions that expose perception gaps, hidden middles,
   * and lived experience. Existing boards remain below, unchanged, because
   * rewriting or deleting them would break the meaning of votes already cast.
   */
  {
    id: "perceived-extremism",
    collection: "main",
    subject: "Political opponents",
    axis: "How many seem extreme?",
    question:
      "Out of 100 people who vote the opposite way from you, how many hold views you'd honestly call extreme?",
    prompt: CORE_PROMPT,
    leftLabel: "NONE OF THEM",
    rightLabel: "ALL 100",
    highMeans: "a larger perceived share of political opponents hold extreme views",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.3,
      display: "about 30%",
      unit: "percent",
      sourceName: "More in Common / YouGov, The Perception Gap",
      sourceUrl:
        "https://perceptiongap.us/media/anvpqwr2/perception-gap-report-1-0-3.pdf",
      fielded: "2019 · representative sample of 2,100 Americans",
      note:
        "Across the policy views tested, opponents were estimated to be extreme about 55% of the time; their measured views were extreme about 30% of the time.",
    },
  },
  {
    id: "climate-support-perception",
    subject: "Climate action",
    axis: "How many want more?",
    question:
      "Out of 100 people in your country, how many want the government doing more about climate change?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share wants more government climate action",
    scale: "amount",
    category: "Perception gaps",
    cadence: "month",
    hiddenFromLibrary: true,
  },
  {
    id: "climate-worry-perception",
    collection: "main",
    subject: "Climate worry",
    axis: "How many are worried?",
    question:
      "Out of 100 U.S. adults, how many are at least somewhat worried about global warming?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share is at least somewhat worried about global warming",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.64,
      display: "64%",
      unit: "percent",
      sourceName: "Yale Program on Climate Change Communication",
      sourceUrl:
        "https://climatecommunication.yale.edu/publications/climate-change-in-the-american-mind-beliefs-attitudes-fall-2025/toc/5/",
      fielded: "November 6–14, 2025 · nationally representative sample of 1,146 U.S. adults",
      note:
        "Yale asked the same threshold: very or somewhat worried about global warming.",
    },
  },
  {
    id: "violence-support-perception",
    subject: "Political violence",
    axis: "How many endorse it?",
    question:
      "Out of 100 people on the political side you like least, how many would endorse violence to get their way?",
    prompt: CORE_PROMPT,
    leftLabel: "NONE OF THEM",
    rightLabel: "ALL 100",
    highMeans: "a larger perceived share endorses political violence",
    scale: "amount",
    category: "Perception gaps",
    hiddenFromLibrary: true,
  },
  {
    id: "violence-support-score-perception",
    collection: "main",
    subject: "Political violence",
    axis: "How much support?",
    question:
      "On a 0–100 scale, how much do people on the political side you like least support using violence to advance political goals?",
    prompt: CORE_PROMPT,
    leftLabel: "NO SUPPORT",
    rightLabel: "FULL SUPPORT",
    highMeans: "greater perceived average support for partisan violence",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.098,
      display: "about 9.8 / 100",
      unit: "score100",
      sourceName: "Mernyk et al., Proceedings of the National Academy of Sciences",
      sourceUrl: "https://doi.org/10.1073/pnas.2116851119",
      fielded: "October 2020 · nationally representative survey of U.S. Democrats and Republicans",
      note:
        "The study found mean support scores of 9.3 among Democrats and 10.3 among Republicans. This is an average support score, not the percentage of people who endorse violence.",
    },
  },
  {
    id: "emergency-expense-perception",
    collection: "main",
    subject: "A $400 emergency",
    axis: "How many would cover it?",
    question:
      "Out of 100 U.S. adults, how many say they would cover a $400 emergency expense using cash, savings, or a credit card paid off at the next statement?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share would cover a $400 emergency expense with cash or its equivalent",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.63,
      display: "63%",
      unit: "percent",
      sourceName: "Federal Reserve, Survey of Household Economics and Decisionmaking",
      sourceUrl:
        "https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm",
      fielded: "October 2025 · nationally representative survey of 12,934 U.S. adults",
      note:
        "The Federal Reserve counts cash, savings, and a credit card paid in full at the next statement as cash or its equivalent.",
    },
  },
  {
    id: "abortion-legal-perception",
    collection: "main",
    subject: "Legal abortion",
    axis: "How many support it?",
    question:
      "Out of 100 U.S. adults, how many say abortion should be legal in all or most cases?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share supports legal abortion in all or most cases",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.6,
      display: "60%",
      unit: "percent",
      sourceName: "Pew Research Center",
      sourceUrl:
        "https://www.pewresearch.org/religion/fact-sheet/public-opinion-on-abortion/",
      fielded: "January 20–26, 2026 · nationally representative sample of 8,512 U.S. adults",
      note:
        "Pew combines respondents who said abortion should be legal in all cases or in most cases.",
    },
  },
  {
    id: "loneliness-perception",
    collection: "main",
    subject: "Persistent loneliness",
    axis: "How many feel it?",
    question:
      "Out of 100 U.S. adults, how many say they feel lonely or isolated all or most of the time?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share feels lonely or isolated all or most of the time",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.16,
      display: "16%",
      unit: "percent",
      sourceName: "Pew Research Center",
      sourceUrl:
        "https://www.pewresearch.org/social-trends/2025/01/16/men-women-and-social-connections/",
      fielded: "September 3–15, 2024 · nationally representative sample of 6,204 U.S. adults",
      note:
        "This is the share who chose all or most of the time, not everyone who ever feels lonely.",
    },
  },
  {
    id: "social-trust-perception",
    collection: "main",
    subject: "Trusting other people",
    axis: "How many generally do?",
    question:
      "Out of 100 U.S. adults, how many say most people can be trusted?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share says most people can be trusted",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.34,
      display: "34%",
      unit: "percent",
      sourceName: "Pew Research Center, Religious Landscape Study",
      sourceUrl:
        "https://www.pewresearch.org/2025/05/08/americans-trust-in-one-another/",
      fielded: "2023–2024 · nationally representative survey of U.S. adults",
      note:
        "The alternative response was that you can't be too careful in dealing with people.",
    },
  },
  {
    id: "free-expression-perception",
    collection: "main",
    subject: "Free expression",
    axis: "How many defend it?",
    question:
      "Out of 100 U.S. adults, how many agree that everyone, regardless of their views, has the right to free, nonviolent expression?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALMOST ALL",
    highMeans: "a larger perceived share supports free, nonviolent expression regardless of viewpoint",
    scale: "amount",
    category: "Perception gaps",
    cadence: "once",
    benchmark: {
      value: 0.8,
      display: "80%",
      unit: "percent",
      sourceName: "Kettering Foundation / Gallup, Democracy for All",
      sourceUrl:
        "https://news.gallup.com/poll/696494/americans-show-consensus-democracy-related-matters.aspx",
      fielded: "July 7–August 25, 2025 · probability-based survey of more than 20,000 U.S. adults",
      note:
        "Gallup combines 39% who strongly agreed and 41% who agreed with the statement.",
    },
  },
  {
    id: "disagreement-sources",
    subject: "People you disagree with",
    axis: "Met or read about?",
    question:
      "What you believe about people who disagree with you: how much comes from meeting them, and how much from reading about them?",
    prompt: CORE_PROMPT,
    leftLabel: "MEETING THEM",
    rightLabel: "READING ABOUT THEM",
    highMeans: "more of the belief comes from reading about people rather than meeting them",
    scale: "bipolar",
    category: "Perception gaps",
    cadence: "month",
  },
  {
    id: "immigration-status",
    collection: "main",
    subject: "People without legal status",
    axis: "Deport or legalize?",
    question:
      "People living in the country without legal status: deport them, or give them legal status?",
    prompt: CORE_PROMPT,
    leftLabel: "DEPORT",
    rightLabel: "LEGAL STATUS",
    leftProse: "deportation",
    rightProse: "legal status",
    highMeans: "more support for providing legal status",
    scale: "bipolar",
    category: "Public life",
  },
  {
    id: "local-police",
    collection: "main",
    subject: "Police where you live",
    axis: "Threat or protection?",
    question: "The police where you live are, on balance...",
    prompt: CORE_PROMPT,
    leftLabel: "A THREAT TO ME",
    rightLabel: "A PROTECTION FOR ME",
    leftProse: "a threat",
    rightProse: "a protection",
    highMeans: "the police feel more protective",
    scale: "bipolar",
    category: "Public life",
    cadence: "month",
  },
  {
    id: "gun-laws",
    collection: "main",
    subject: "Gun laws where you live",
    axis: "Looser or stricter?",
    question: "Gun laws where you live should be...",
    prompt: CORE_PROMPT,
    leftLabel: "MUCH LOOSER",
    rightLabel: "MUCH STRICTER",
    leftProse: "looser",
    rightProse: "stricter",
    highMeans: "more support for stricter gun laws",
    scale: "bipolar",
    category: "Public life",
    cadence: "month",
  },
  {
    id: "prison-purpose",
    collection: "main",
    subject: "The purpose of prison",
    axis: "Punishment or rehabilitation?",
    question:
      "What should prison focus on more: punishing what someone did, or preparing them to return to society?",
    prompt: CORE_PROMPT,
    leftLabel: "PUNISHMENT",
    rightLabel: "REHABILITATION",
    highMeans: "more emphasis on rehabilitation and preparing people to return to society",
    scale: "bipolar",
    category: "Public life",
    cadence: "month",
  },
  {
    id: "history-classes",
    subject: "School history classes",
    axis: "Ashamed or proud?",
    question: "School history classes should leave kids feeling...",
    prompt: CORE_PROMPT,
    leftLabel: "ASHAMED",
    rightLabel: "PROUD",
    highMeans: "more emphasis on pride in country",
    scale: "bipolar",
    category: "Public life",
    cadence: "month",
  },
  {
    id: "climate-income",
    subject: "Paying for climate action",
    axis: "How much would you give?",
    question:
      "How much of your own income would you give every year to fight climate change?",
    prompt: CORE_PROMPT,
    leftLabel: "NOT A CENT",
    rightLabel: "A TENTH OF IT",
    highMeans: "willing to give a larger share of income toward climate action",
    scale: "amount",
    category: "Public life",
    cadence: "month",
  },
  {
    id: "household-basics",
    collection: "main",
    subject: "Covering the basics",
    axis: "Easier or harder?",
    question:
      "Compared with a year ago, is it getting easier or harder for your household to cover the basics?",
    prompt: CORE_PROMPT,
    leftLabel: "MUCH EASIER",
    rightLabel: "MUCH HARDER",
    highMeans: "covering basics has become harder",
    scale: "bipolar",
    category: "Money & work",
  },
  {
    id: "luck-or-effort",
    collection: "main",
    subject: "Where you ended up",
    axis: "Luck or effort?",
    question: "Where you've ended up in life so far is mostly...",
    prompt: CORE_PROMPT,
    leftLabel: "LUCK",
    rightLabel: "EFFORT",
    highMeans: "more attributed to personal effort",
    scale: "bipolar",
    category: "Money & work",
    cadence: "month",
  },
  {
    id: "home-worth",
    collection: "main",
    subject: "Buying a home",
    axis: "Still worth it?",
    question: "Is buying a home still worth what it costs?",
    prompt: CORE_PROMPT,
    leftLabel: "STILL WORTH IT",
    rightLabel: "NOT WORTH IT",
    highMeans: "home ownership feels less worth its cost",
    scale: "bipolar",
    category: "Money & work",
  },
  {
    id: "job-identity",
    collection: "main",
    subject: "Your job",
    axis: "Paycheck or identity?",
    question: "Your job: is it just a paycheck, or part of who you are?",
    prompt: CORE_PROMPT,
    leftLabel: "JUST A PAYCHECK",
    rightLabel: "PART OF WHO I AM",
    leftProse: "paycheck only",
    rightProse: "part of my identity",
    highMeans: "work is more central to personal identity",
    scale: "bipolar",
    category: "Money & work",
    cadence: "month",
  },
  {
    id: "generational-finances",
    collection: "main",
    subject: "Your generation's finances",
    axis: "Worse or better off?",
    question: "Compared with your parents at your age, how well off are you?",
    prompt: CORE_PROMPT,
    leftLabel: "FAR WORSE OFF",
    rightLabel: "FAR BETTER OFF",
    highMeans: "better off than their parents were at the same age",
    scale: "bipolar",
    category: "Money & work",
    cadence: "month",
  },
  {
    id: "burnout",
    collection: "main",
    subject: "Work or school",
    axis: "How close to burnout?",
    question: "Right now, how close are you to burning out at work or school?",
    prompt: CORE_PROMPT,
    leftLabel: "FULLY RESTED",
    rightLabel: "COMPLETELY BURNT OUT",
    leftProse: "rested",
    rightProse: "burnt out",
    highMeans: "closer to complete burnout",
    scale: "bipolar",
    category: "Money & work",
  },
  {
    id: "known-by-others",
    collection: "main",
    subject: "Being known",
    axis: "How well known?",
    question: "How well do the people in your life actually know you?",
    prompt: CORE_PROMPT,
    leftLabel: "NOBODY REALLY KNOWS ME",
    rightLabel: "I'M FULLY KNOWN",
    leftProse: "unknown",
    rightProse: "known",
    highMeans: "feels more fully known by people in their life",
    scale: "bipolar",
    category: "Health & connection",
  },
  {
    id: "social-life-comparison",
    collection: "main",
    subject: "Your social life",
    axis: "Emptier or fuller?",
    question: "Compared with other people your age, your social life is...",
    prompt: CORE_PROMPT,
    leftLabel: "EMPTIER THAN THEIRS",
    rightLabel: "FULLER THAN THEIRS",
    leftProse: "emptier",
    rightProse: "fuller",
    highMeans: "a fuller social life than perceived peers",
    scale: "bipolar",
    category: "Health & connection",
    cadence: "month",
  },
  {
    id: "medical-bill",
    collection: "main",
    subject: "An unexpected medical bill",
    axis: "How disruptive?",
    question: "If an unexpected $500 medical bill landed tomorrow, how much would it wreck you?",
    prompt: CORE_PROMPT,
    leftLabel: "NOT AT ALL",
    rightLabel: "COMPLETELY",
    highMeans: "more financially disrupted by an unexpected medical bill",
    scale: "amount",
    category: "Health & connection",
    cadence: "month",
  },
  {
    id: "relationship-privacy",
    collection: "main",
    subject: "Privacy in relationships",
    axis: "How much should remain?",
    question: "In a committed relationship, how much privacy should each person keep?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "A GREAT DEAL",
    highMeans: "more personal privacy should remain within a committed relationship",
    scale: "amount",
    category: "Health & connection",
    cadence: "month",
  },
  {
    id: "health-control",
    subject: "Your health",
    axis: "How much control?",
    question: "How much control do you feel you have over your own health?",
    prompt: CORE_PROMPT,
    leftLabel: "NONE AT ALL",
    rightLabel: "TOTAL CONTROL",
    highMeans: "more perceived control over personal health",
    scale: "amount",
    category: "Health & connection",
    cadence: "month",
  },
  {
    id: "wallet-return",
    collection: "main",
    subject: "Trusting strangers",
    axis: "Would they return it?",
    question:
      "If you dropped your wallet with cash in it near your home, how likely is a stranger to return it?",
    prompt: CORE_PROMPT,
    leftLabel: "NO CHANCE",
    rightLabel: "CERTAIN",
    highMeans: "a higher perceived chance that a stranger would return the wallet",
    scale: "probability",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    id: "beyond-physical",
    collection: "main",
    subject: "Beyond the physical world",
    axis: "How likely?",
    question: "How likely is it that something exists beyond the physical world?",
    prompt: CORE_PROMPT,
    leftLabel: "CERTAINLY NOT",
    rightLabel: "CERTAINLY YES",
    highMeans: "a higher perceived chance that something exists beyond the physical world",
    scale: "probability",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    id: "reasons-for-fewer-kids",
    subject: "Having children",
    axis: "Cost or preference?",
    question:
      "If you're not having more children: is it that you can't afford it, or that you don't want to?",
    prompt: CORE_PROMPT,
    leftLabel: "CAN'T AFFORD IT",
    rightLabel: "DON'T WANT TO",
    leftProse: "cost",
    rightProse: "preference",
    highMeans: "personal preference matters more than affordability",
    scale: "bipolar",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    id: "care-for-parents",
    collection: "main",
    subject: "Aging parents",
    axis: "Adult children's duty?",
    question:
      "How much should adult children be expected to care for their aging parents themselves?",
    prompt: CORE_PROMPT,
    leftLabel: "NOT THEIR JOB",
    rightLabel: "ENTIRELY THEIR JOB",
    highMeans: "greater expected responsibility for adult children",
    scale: "amount",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    id: "rootedness",
    collection: "main",
    subject: "Where you live",
    axis: "How rooted?",
    question: "How rooted do you feel in the place you live?",
    prompt: CORE_PROMPT,
    leftLabel: "A STRANGER HERE",
    rightLabel: "DEEPLY ROOTED",
    leftProse: "unrooted",
    rightProse: "rooted",
    highMeans: "more deeply rooted in the place they live",
    scale: "bipolar",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    /*
     * Deliberately coarse context, not geographic location. It gives later
     * analysis an urbanicity dimension without collecting a town, ZIP code,
     * coordinates, or anything that materially narrows who the person is.
     */
    id: "rural-urban",
    collection: "main",
    subject: "Where you live",
    axis: "Rural or urban?",
    question: "How rural or urban is the place where you live?",
    prompt: CORE_PROMPT,
    leftLabel: "VERY RURAL",
    rightLabel: "DENSE URBAN CORE",
    leftProse: "rural",
    rightProse: "densely urban",
    highMeans: "lives in a more densely urban setting",
    scale: "bipolar",
    category: "Trust, meaning & place",
    cadence: "month",
  },
  {
    id: "online-self-censorship",
    collection: "main",
    subject: "Speaking online",
    axis: "How much do you say?",
    question: "How much of what you actually think are you willing to say online?",
    prompt: CORE_PROMPT,
    leftLabel: "ALMOST NONE",
    rightLabel: "ALL OF IT",
    highMeans: "a larger share of their real views is expressed online",
    scale: "amount",
    category: "Media & technology",
    version: 2,
  },
  {
    id: "division-source",
    collection: "main",
    subject: "The country's divisions",
    axis: "Real or amplified?",
    question: "The political division you see in the country is mostly...",
    prompt: CORE_PROMPT,
    leftLabel: "REAL DISAGREEMENT",
    rightLabel: "AMPLIFIED ONLINE",
    highMeans: "the perceived division feels more amplified online",
    scale: "bipolar",
    category: "Media & technology",
    version: 2,
  },
  {
    id: "life-without-short-video",
    collection: "main",
    subject: "Life without short-video apps",
    axis: "Worse or better?",
    question:
      "Assuming nobody else had them either, your life without short-video apps would be...",
    prompt: CORE_PROMPT,
    leftLabel: "MUCH WORSE",
    rightLabel: "MUCH BETTER",
    highMeans: "life would be better without short-video apps",
    scale: "bipolar",
    category: "Media & technology",
    cadence: "month",
  },
  {
    id: "official-numbers-trust",
    collection: "main",
    subject: "Official statistics",
    axis: "Trust or doubt?",
    question:
      "When official numbers come out - jobs, inflation, crime - do you take them at face value or assume they're cooked?",
    prompt: CORE_PROMPT,
    leftLabel: "TAKE THEM AT FACE VALUE",
    rightLabel: "ASSUME THEY'RE COOKED",
    leftProse: "trusting",
    rightProse: "sceptical",
    highMeans: "more sceptical of official statistics",
    scale: "bipolar",
    category: "Media & technology",
  },
  {
    id: "person-or-chatbot",
    subject: "When something weighs on you",
    axis: "Person or chatbot?",
    question:
      "When something is really weighing on you, are you more likely to talk to a person or to a chatbot?",
    prompt: CORE_PROMPT,
    leftLabel: "A PERSON",
    rightLabel: "A CHATBOT",
    highMeans: "more likely to talk to a chatbot",
    scale: "bipolar",
    category: "Media & technology",
  },
  {
    id: "ai-lift-or-leave-behind",
    collection: "main",
    subject: "AI in your life",
    axis: "Lift you up or leave you behind?",
    question: "Will AI leave you behind, or lift you up?",
    prompt: CORE_PROMPT,
    leftLabel: "LEAVE ME BEHIND",
    rightLabel: "LIFT ME UP",
    leftProse: "left behind",
    rightProse: "lifted up",
    highMeans: "AI is more likely to lift them up",
    scale: "bipolar",
    category: "Media & technology",
  },

  /* ------------------------------------------ everything else, browsable */
  {
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Mental health?",
    question: "Is shortform social media bad or good for your mental health?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "OPTIMIST",
    rightLabel: "DOOMER",
    leftProse: "optimistic",
    rightProse: "doomer",
    highMeans: "more doomer",
    scale: "bipolar",
    category: "AI",
  },
  {
    // New id: the poles flipped direction (SLOWER used to be the high end;
    // ACCELERATE is now), which would silently invert every old vote. A fresh id
    // starts this board's collection clean instead — see the file-level note and
    // rule 9 in AGENTS.md. The handful of old votes stay orphaned under ai-pace.
    id: "ai-tempo",
    subject: "AI progress",
    axis: "Slow down or speed up?",
    question: "Should AI progress slow down or speed up?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SLOW DOWN",
    rightLabel: "ACCELERATE",
    leftProse: "slow down",
    rightProse: "accelerate",
    highMeans: "should accelerate",
    scale: "pace",
    category: "AI",
  },
  {
    id: "agi-here",
    subject: "AGI",
    axis: "Are we there?",
    question: "AGI: are we there yet?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "LOST THE MANDATE",
    rightLabel: "HAS THE MANDATE",
    highMeans: "still has the mandate",
    scale: "bipolar",
    category: "AI labs",
  },
  {
    // The head-to-head. More interesting than either lab's solo board because it
    // forces a choice rather than two independent thumbs-up/down.
    id: "mandate-openai-anthropic",
    subject: "The mandate of heaven",
    axis: "OpenAI or Anthropic?",
    question: "Who holds the mandate of heaven — OpenAI or Anthropic?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "OPENAI",
    rightLabel: "ANTHROPIC",
    leftProse: "OpenAI",
    rightProse: "Anthropic",
    highMeans: "Anthropic over OpenAI",
    scale: "bipolar",
    category: "AI labs",
  },
  {
    id: "fable-coded",
    retiredFromSite: true,
    subject: "Fable",
    axis: "SF or NYC?",
    question: "Is Fable SF-coded or NYC-coded?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
    cadence: "month",
  },
  {
    id: "opus-coded",
    retiredFromSite: true,
    subject: "Opus",
    axis: "SF or NYC?",
    question: "Is Opus SF-coded or NYC-coded?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
    cadence: "month",
  },
  {
    id: "cursor-coded",
    retiredFromSite: true,
    subject: "Cursor",
    axis: "SF or NYC?",
    question: "Is Cursor SF-coded or NYC-coded?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
    cadence: "month",
  },
  {
    id: "chatgpt-coded",
    retiredFromSite: true,
    subject: "ChatGPT",
    axis: "SF or NYC?",
    question: "Is ChatGPT SF-coded or NYC-coded?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
    cadence: "month",
  },
  {
    id: "grok-coded",
    retiredFromSite: true,
    subject: "Grok",
    axis: "SF or NYC?",
    question: "Is Grok SF-coded or NYC-coded?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SF-CODED",
    rightLabel: "NYC-CODED",
    leftProse: "SF-coded",
    rightProse: "NYC-coded",
    highMeans: "more NYC-coded",
    scale: "bipolar",
    category: "SF or NYC?",
    cadence: "month",
  },
  {
    id: "us-hegemony-end",
    subject: "The end of US hegemony",
    axis: "Are we there?",
    question: "The end of US hegemony: are we there yet?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    // id kept as -2026 even though the wording no longer says so: changing an
    // id after votes exist orphans them (see the file-level note above).
    id: "college-recommend-2026",
    subject: "College today",
    axis: "Recommend it?",
    question: "Would you recommend your kid goes to college today?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "ILLEGAL",
    rightLabel: "LEGAL",
    highMeans: "should be legal",
    scale: "bipolar",
    category: "Law & policy",
  },

  {
    id: "llm-smarter",
    subject: "LLMs",
    axis: "Smarter or dumber?",
    question: "Do LLMs make people smarter or dumber?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "SMARTER",
    rightLabel: "DUMBER",
    highMeans: "people end up dumber",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "ai-art",
    subject: "AI-generated art",
    axis: "Frontier or threat?",
    question:
      "AI-generated art: a new creative frontier, or a threat to human artistry?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CREATIVE FRONTIER",
    rightLabel: "THREAT TO ARTISTRY",
    leftProse: "frontier",
    rightProse: "threat",
    highMeans: "more of a threat to human artistry",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "ai-jobs",
    subject: "AI and work",
    axis: "Create or replace?",
    question: "Will AI create jobs or replace them?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CREATE JOBS",
    rightLabel: "REPLACE JOBS",
    leftProse: "job-creating",
    rightProse: "job-replacing",
    highMeans: "more job replacement",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "ai-regulation",
    subject: "Regulating advanced AI",
    axis: "Innovation or regulation?",
    question: "How should society approach the regulation of advanced AI?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "UNFETTERED INNOVATION",
    rightLabel: "PREEMPTIVE REGULATION",
    leftProse: "hands-off",
    rightProse: "precautionary",
    highMeans: "more regulation",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "ai-money",
    subject: "AI and your money",
    axis: "Lost or made?",
    question: "Has AI lost you money or made you money?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "LOST ME MONEY",
    rightLabel: "MADE ME MONEY",
    // "fully loss-making" read wrong; "in the red / in the green" survives the
    // fully/mostly/slightly template ("mostly in the red", "slightly in the green").
    leftProse: "in the red",
    rightProse: "in the green",
    highMeans: "made them more money",
    scale: "bipolar",
    category: "AI",
  },
  {
    id: "college-worth",
    subject: "A four-year degree",
    axis: "Outdated or essential?",
    question: "A four-year college degree is…",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "OUTDATED MODEL",
    rightLabel: "FOUNDATIONAL NECESSITY",
    leftProse: "outdated",
    rightProse: "essential",
    highMeans: "more of a necessity",
    scale: "bipolar",
    category: "Big shifts",
  },
  {
    id: "opus-chad",
    subject: "Opus",
    axis: "Chud or chad?",
    question: "Is Opus a chud or a chad?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CHUD",
    rightLabel: "CHAD",
    highMeans: "more chad",
    scale: "bipolar",
    category: "Chud or Chad?",
    hiddenFromLibrary: true,
    retiredFromSite: true,
  },
  {
    id: "fable-chad",
    subject: "Fable",
    axis: "Chud or chad?",
    question: "Is Fable a chud or a chad?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CHUD",
    rightLabel: "CHAD",
    highMeans: "more chad",
    scale: "bipolar",
    category: "Chud or Chad?",
    hiddenFromLibrary: true,
    retiredFromSite: true,
  },
  {
    id: "chatgpt-chad",
    subject: "ChatGPT",
    axis: "Chud or chad?",
    question: "Is ChatGPT a chud or a chad?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CHUD",
    rightLabel: "CHAD",
    highMeans: "more chad",
    scale: "bipolar",
    category: "Chud or Chad?",
    hiddenFromLibrary: true,
    retiredFromSite: true,
  },
  {
    id: "gemini-chad",
    subject: "Gemini",
    axis: "Chud or chad?",
    question: "Is Gemini a chud or a chad?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CHUD",
    rightLabel: "CHAD",
    highMeans: "more chad",
    scale: "bipolar",
    category: "Chud or Chad?",
    hiddenFromLibrary: true,
    retiredFromSite: true,
  },
  {
    id: "grok-chad",
    subject: "Grok",
    axis: "Chud or chad?",
    question: "Is Grok a chud or a chad?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "CHUD",
    rightLabel: "CHAD",
    highMeans: "more chad",
    scale: "bipolar",
    category: "Chud or Chad?",
    hiddenFromLibrary: true,
    retiredFromSite: true,
  },
  {
    id: "labubu",
    subject: "Labubu",
    axis: "Toy or asset?",
    question: "Labubu: toy or asset class?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "TOY",
    rightLabel: "ASSET CLASS",
    highMeans: "more of an asset class",
    scale: "bipolar",
    category: "Other",
  },
  {
    id: "pitbulls",
    subject: "Owning pit bulls",
    axis: "Allowed?",
    question: "Should people be allowed to own pit bulls?",
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
    leftLabel: "NEVER",
    rightLabel: "ALWAYS",
    highMeans: "more permissive",
    scale: "permission",
    category: "Law & policy",
  },
];

export function getTopic(id: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.id === id && !t.retiredFromSite);
}

/**
 * The boards the front page leads with, in display order. A hand-picked
 * shortlist rather than a category, because "what's worth putting on the front
 * door" is an editorial call that doesn't map onto any single `category`.
 */
export const FEATURED_TOPIC_IDS = [
  "perceived-extremism",
  "household-basics",
  "known-by-others",
  "rural-urban",
  "division-source",
  "ai-lift-or-leave-behind",
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
