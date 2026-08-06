/**
 * Browser-side receipt for the separate predict-then-reveal step.
 *
 * This only decides which screen to show. The server keeps the real prediction
 * record and ties it to the vote timestamp, so clearing or editing localStorage
 * cannot create or rewrite research data.
 */

export interface MyPrediction {
  v: number;
  /** Timestamp of the answer this prediction followed. */
  vt: number;
}

const key = (topicId: string) => `vibecheck:${topicId}:prediction`;
const skippedKey = (topicId: string) => `vibecheck:${topicId}:prediction-skipped`;

export function readPrediction(topicId: string): MyPrediction | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(topicId)) ?? "null");
    if (
      parsed &&
      Number.isFinite(parsed.v) && parsed.v >= 0 && parsed.v <= 1 &&
      Number.isFinite(parsed.vt)
    ) {
      return { v: Number(parsed.v), vt: Number(parsed.vt) };
    }
  } catch {
    /* absent, blocked or malformed: ask again; the server write is idempotent */
  }
  return null;
}

export function recordPrediction(topicId: string, value: number, voteAt: number): void {
  try {
    window.localStorage.setItem(key(topicId), JSON.stringify({ v: value, vt: voteAt }));
    window.localStorage.removeItem(skippedKey(topicId));
  } catch {
    /* server data is already safe; this browser may ask again after a reload */
  }
}

/** Vote timestamp when this browser deliberately skipped the second guess. */
export function readPredictionSkip(topicId: string): number | null {
  try {
    const voteAt = Number(window.localStorage.getItem(skippedKey(topicId)));
    return Number.isFinite(voteAt) && voteAt > 0 ? voteAt : null;
  } catch {
    return null;
  }
}

/** Remember the opt-out without manufacturing a prediction record. */
export function recordPredictionSkip(topicId: string, voteAt: number): void {
  try {
    window.localStorage.setItem(skippedKey(topicId), String(voteAt));
    window.localStorage.removeItem(key(topicId));
  } catch {
    /* the vote remains safe; this browser may be asked again after a reload */
  }
}

export function clearPrediction(topicId: string): void {
  try {
    window.localStorage.removeItem(key(topicId));
    window.localStorage.removeItem(skippedKey(topicId));
  } catch {
    /* nothing to clear */
  }
}
