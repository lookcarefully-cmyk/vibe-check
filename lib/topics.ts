/**
 * Every board in the collection. Adding a question here is enough to create a
 * new board, its route, its nav tile, and its own separate vote store.
 */

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
  leftLabel: string;
  rightLabel: string;
  /**
   * Which end reads as the alarming answer. That label turns red in the
   * results view; the other stays neutral. Purely presentational.
   */
  alarmSide: "left" | "right";
}

export const TOPICS: Topic[] = [
  {
    id: "social-addictive",
    subject: "Shortform social media",
    axis: "Addictive?",
    question: "Is shortform social media addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NOT ADDICTIVE",
    rightLabel: "ADDICTIVE",
    alarmSide: "right",
  },
  {
    id: "porn-addictive",
    subject: "Internet porn",
    axis: "Addictive?",
    question: "Is viewing internet porn addictive?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "NOT ADDICTIVE",
    rightLabel: "ADDICTIVE",
    alarmSide: "right",
  },
  {
    id: "social-healthy",
    subject: "Shortform social media",
    axis: "Healthy?",
    question: "Is shortform social media healthy or unhealthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "UNHEALTHY",
    rightLabel: "HEALTHY",
    alarmSide: "left",
  },
  {
    id: "porn-healthy",
    subject: "Internet porn",
    axis: "Healthy?",
    question: "Is viewing internet porn healthy or unhealthy?",
    prompt: "Slide to your answer and click anywhere on the dial to lock it in.",
    leftLabel: "UNHEALTHY",
    rightLabel: "HEALTHY",
    alarmSide: "left",
  },
];

export const DEFAULT_TOPIC = TOPICS[0];

export function getTopic(id: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.id === id);
}
