import type { Topic } from "./topics";

const STREAM_KEY = (streamId: string) => `vibecheck:board-stream:v2:${streamId}`;
const STREAM_VERSION = 1;

/**
 * The intentionally coarse context board belongs at the start of a visit.
 * It is useful for analysis, but asking it before someone has chosen any
 * question makes the site feel like an intake form. Putting it immediately
 * after their chosen board keeps it early without turning it into a gate.
 */
export const DEMOGRAPHIC_TOPIC_ID = "rural-urban";

interface StoredBoardStream {
  version: number;
  order: string[];
}

export interface BoardStreamStep {
  next: Topic | null;
  position: number;
  total: number;
  complete: boolean;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makeOrder(currentId: string, topics: Topic[], streamId: string): string[] {
  const ids = [...new Set(topics.map((topic) => topic.id))];

  // Pulse and the perception-gap battery are fixed instruments with a stable
  // question order, not discovery feeds. The caller puts the entry question
  // first and the rest after it; preserve that order exactly. Shuffling the gap
  // battery would also break its editorial arc — it is built to open on the
  // sharpest misperception and close on the warmest finding.
  if (streamId === "pulse" || streamId === "gap") return ids;

  const demographic = ids.includes(DEMOGRAPHIC_TOPIC_ID)
    && currentId !== DEMOGRAPHIC_TOPIC_ID
    ? [DEMOGRAPHIC_TOPIC_ID]
    : [];
  const rest = ids.filter(
    (id) => id !== currentId && id !== DEMOGRAPHIC_TOPIC_ID,
  );

  // A community board is not in `topics`, but can still be the front door to
  // this research-board stream. Keep it as the first position so Next behaves
  // exactly the same there as it does on a curated board.
  return [currentId, ...demographic, ...shuffle(rest)];
}

function readStored(streamId: string): StoredBoardStream | null {
  try {
    const raw = window.sessionStorage.getItem(STREAM_KEY(streamId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBoardStream>;
    if (
      parsed.version !== STREAM_VERSION
      || !Array.isArray(parsed.order)
      || parsed.order.some((id) => typeof id !== "string")
    ) {
      return null;
    }
    return parsed as StoredBoardStream;
  } catch {
    return null;
  }
}

function writeStored(streamId: string, order: string[]): void {
  try {
    window.sessionStorage.setItem(
      STREAM_KEY(streamId),
      JSON.stringify({ version: STREAM_VERSION, order }),
    );
  } catch {
    // The stream still works in storage-restricted browsing; only its order
    // may change after a reload.
  }
}

/**
 * Return the next randomized research board for this browsing session.
 *
 * `continueStream` is true only for links produced by the stream navigator.
 * Choosing a board from Home, Browse, or Explore therefore starts a fresh path
 * with that board first and the demographic board next. Reloading a
 * continuation URL keeps the already-created order.
 */
export function boardStreamStep(
  currentId: string,
  topics: Topic[],
  continueStream: boolean,
  streamId = "main",
): BoardStreamStep | null {
  if (topics.length === 0) return null;

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  let order = continueStream ? readStored(streamId)?.order ?? [] : [];
  const hasCurrent = order.includes(currentId);
  const hasEveryTopic = topics.every((topic) => order.includes(topic.id));

  // The Main Set is source-defined, so a changed list invalidates an old
  // session order. Community is live: freeze the list for this pass so a board
  // published mid-scroll cannot rebuild the order and repeat things already
  // seen. Boards hidden during the pass are simply skipped below.
  if (!hasCurrent || ((streamId === "main" || streamId === "pulse") && !hasEveryTopic)) {
    order = makeOrder(currentId, topics, streamId);
    writeStored(streamId, order);
  }

  const index = order.indexOf(currentId);
  let next: Topic | null = null;
  for (let nextIndex = index + 1; nextIndex < order.length; nextIndex += 1) {
    next = topicById.get(order[nextIndex]) ?? null;
    if (next) break;
  }

  // Do not wrap. A shuffled visit is one pass through the collection, not an
  // infinite carousel that quietly starts repeating questions.
  return {
    next,
    position: index + 1,
    total: order.length,
    complete: next === null,
  };
}
