/**
 * Things that happened, pinned to the timeline.
 *
 * This is the file that turns a wiggly line into a sentence. "The AI doom board
 * moved 10 points" is a curiosity; "it moved 10 points the week GPT-6 shipped"
 * is the piece of writing. Nothing else in the project generates as much
 * material per unit of effort, and it costs one object per entry.
 *
 * Deliberately hand-curated rather than scraped. An automatic news feed would
 * annotate every chart with noise; the judgement about which event is worth
 * naming is the editorial work, and it can't be automated without becoming
 * worthless.
 *
 * Rules for adding one:
 *  - Date it the day the thing HAPPENED, not the day you noticed the movement.
 *  - `boards: []` means it shows on every board. Use sparingly — a global event
 *    marker on an unrelated board reads as a claim that it mattered there.
 *  - Say what happened, not what it caused. "GPT-6 launched" is a fact; "GPT-6
 *    launch spooked people" is the conclusion the chart is supposed to support,
 *    and printing it on the chart is arguing with your own evidence.
 */

export interface TimelineEvent {
  /** ISO date, YYYY-MM-DD, UTC. */
  date: string;
  /** Short label drawn on the chart. Keep under ~40 characters. */
  label: string;
  /** Board ids this applies to. Empty means all boards. */
  boards: string[];
  /** Optional source, shown as a link in the list below the chart. */
  url?: string;
}

export const EVENTS: TimelineEvent[] = [
  // No entries yet. The first real one goes here — something like:
  //
  // {
  //   date: "2026-09-14",
  //   label: "GPT-6 launched",
  //   boards: ["ai-optimist", "ai-pace", "agi-here"],
  //   url: "https://openai.com/index/gpt-6",
  // },
];

/** Events that apply to a board, oldest first. */
export function eventsFor(boardId: string): TimelineEvent[] {
  return EVENTS.filter((e) => e.boards.length === 0 || e.boards.includes(boardId)).sort((a, b) =>
    a.date.localeCompare(b.date),
  );
}

/** Events falling inside a time range, for annotating a chart. */
export function eventsBetween(boardId: string, fromMs: number, toMs: number): TimelineEvent[] {
  return eventsFor(boardId).filter((e) => {
    const t = Date.parse(`${e.date}T00:00:00Z`);
    return Number.isFinite(t) && t >= fromMs && t <= toMs;
  });
}
