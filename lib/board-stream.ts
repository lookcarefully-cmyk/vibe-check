import type { Topic } from "./topics";

const STREAM_KEY = "vibecheck:board-stream:v1";
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
  next: Topic;
  position: number;
  total: number;
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function makeOrder(currentId: string, topics: Topic[]): string[] {
  const ids = [...new Set(topics.map((topic) => topic.id))];
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

function readStored(): StoredBoardStream | null {
  try {
    const raw = window.sessionStorage.getItem(STREAM_KEY);
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

function writeStored(order: string[]): void {
  try {
    window.sessionStorage.setItem(
      STREAM_KEY,
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
 * Choosing a board from Home or All boards therefore starts a fresh path with
 * that board first and the demographic board next. Reloading a continuation
 * URL keeps the already-created order.
 */
export function boardStreamStep(
  currentId: string,
  topics: Topic[],
  continueStream: boolean,
): BoardStreamStep | null {
  if (topics.length === 0) return null;

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  let order = continueStream ? readStored()?.order ?? [] : [];
  const hasCurrent = order.includes(currentId);
  const hasEveryTopic = topics.every((topic) => order.includes(topic.id));

  if (!hasCurrent || !hasEveryTopic) {
    order = makeOrder(currentId, topics);
    writeStored(order);
  }

  const index = order.indexOf(currentId);
  for (let offset = 1; offset <= order.length; offset += 1) {
    const nextId = order[(index + offset) % order.length];
    const next = topicById.get(nextId);
    if (next && next.id !== currentId) {
      return { next, position: index + 1, total: order.length };
    }
  }

  return null;
}
