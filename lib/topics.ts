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
}

export const TOPICS: Topic[] = [
  {
    id: "social-addictive",
    subject: "Shortform social media",
    axis: "Addictive?",
    question: "Is shortform social media addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "ADDICTIVE",
    rightLabel: "NOT ADDICTIVE",
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
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Harmful?",
    question: "Is shortform social media harmful or healthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "HARMFUL",
    rightLabel: "HEALTHY",
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
