import {
  aggregateWindow,
  weeklySeries,
  type SeriesPoint,
  type WindowedAggregate,
} from "./aggregate";
import { store, STORE_VERSION, type VoteRecord } from "./store";

export interface PublicBoardResult extends WindowedAggregate {
  series: SeriesPoint[];
}

interface ComparisonResult extends WindowedAggregate {}

interface LiveSnapshot {
  generatedAt: number;
  result: PublicBoardResult;
  comparisons: {
    crowd: ComparisonResult;
    left: ComparisonResult;
    right: ComparisonResult;
  };
}

const CACHE_VERSION = "v1";
const cacheKey = (topic: string) =>
  `vibecheck:${STORE_VERSION}:live-results:${CACHE_VERSION}:${topic}`;
const cacheLock = (topic: string) => `live-results:${CACHE_VERSION}:${topic}`;
const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

/** Busier boards trade a little freshness for dramatically less Redis traffic. */
function maxAgeMs(count: number): number {
  if (count < 100) return 15_000;
  if (count < 1_000) return 30_000;
  if (count < 5_000) return 60_000;
  return 120_000;
}

function buildSnapshot(records: VoteRecord[], now: number): LiveSnapshot {
  const crowd = aggregateWindow(records, now);
  return {
    generatedAt: now,
    result: {
      ...crowd,
      series: weeklySeries(records, now),
    },
    comparisons: {
      crowd,
      left: aggregateWindow(records, now, (vote) => vote.v < 0.5),
      right: aggregateWindow(records, now, (vote) => vote.v > 0.5),
    },
  };
}

function parseSnapshot(raw: string | null): LiveSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LiveSnapshot;
    if (
      !Number.isFinite(parsed.generatedAt)
      || !parsed.result
      || !Number.isFinite(parsed.result.count)
      || !parsed.comparisons?.crowd
      || !parsed.comparisons?.left
      || !parsed.comparisons?.right
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function readLiveSnapshot(topic: string): Promise<LiveSnapshot | null> {
  return parseSnapshot(await store.kvGet(cacheKey(topic)));
}

/**
 * Exact aggregateWindow results, materialised briefly beside the append-only
 * vote log. A popular board therefore transfers its full history at most every
 * 15–120 seconds, not once per viewer or once per vote.
 */
export async function getLiveSnapshot(
  topic: string,
  now = Date.now(),
  minimumCount = 0,
): Promise<LiveSnapshot> {
  const cached = await readLiveSnapshot(topic);
  const fresh = cached && now - cached.generatedAt < maxAgeMs(cached.result.count);
  if (fresh && cached.result.count >= minimumCount) return cached;

  const acquired = await store.acquire(cacheLock(topic), 10);
  // A stale real result is preferable to making every concurrent request pull
  // the same large list while another function is already rebuilding it.
  if (!acquired && cached && cached.result.count >= minimumCount) return cached;

  if (!acquired) {
    // On the first request after a deploy there may be no snapshot to serve.
    // Give the function holding the lock a brief head start instead of letting
    // a simultaneous launch wave all read the full vote list. These waits are
    // deliberately short: if that function died, this request still recovers.
    for (const delay of [40, 80, 160]) {
      await wait(delay);
      const rebuilt = await readLiveSnapshot(topic);
      if (rebuilt && rebuilt.result.count >= minimumCount) return rebuilt;
    }
  }

  const snapshot = buildSnapshot(await store.all(topic), now);
  await store.kvSet(cacheKey(topic), JSON.stringify(snapshot));
  return snapshot;
}

export function publicResult(snapshot: LiveSnapshot): PublicBoardResult {
  return snapshot.result;
}

export function comparisonResult(
  snapshot: LiveSnapshot,
  side: "crowd" | "left" | "right",
): ComparisonResult {
  return snapshot.comparisons[side];
}
