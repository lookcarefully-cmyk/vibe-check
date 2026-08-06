/**
 * Vote storage, partitioned by topic, with two interchangeable backends.
 *
 *  - Upstash Redis (serverless-safe) when UPSTASH_REDIS_REST_URL + _TOKEN are set.
 *  - A local JSON file per topic (.data/votes-<version>-<topic>.json) otherwise,
 *    so `npm run dev` works with zero configuration.
 *
 * Both speak the same interface, so the API routes never have to care.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Bump this whenever the record shape changes, or whenever a board's ends are
 * swapped. Votes carry no record of which way their labels ran, so a flipped
 * board would otherwise reinterpret every old vote as its exact opposite;
 * bumping starts that board's collection cleanly instead.
 *
 * v3: negative pole moved to the left on every board.
 * v4: records gained a timestamp and a session id; the 20k cap was removed.
 * v5: the addictive boards flipped to NOT ADDICTIVE -> ADDICTIVE, matching the
 *     Likert bands, and records gained the experiment arm and the position the
 *     board occupied in that arm.
 */
export const STORE_VERSION = "v5";

const NS = "vibecheck";
export const PREDICTION_VERSION = "v1";

const votesKey = (topic: string) => `${NS}:${STORE_VERSION}:votes:${topic}`;
const predictionsKey = (topic: string) =>
  `${NS}:predictions:${PREDICTION_VERSION}:${topic}`;
const rateKey = (bucket: string) => `${NS}:${STORE_VERSION}:rl:${bucket}`;
const latestVotesKey = (topic: string) =>
  `${NS}:${STORE_VERSION}:latest-votes:${topic}`;
const latestVotesReadyKey = (topic: string) =>
  `${NS}:${STORE_VERSION}:latest-votes-ready:${topic}`;
const latestPredictionsKey = (topic: string) =>
  `${NS}:predictions:${PREDICTION_VERSION}:latest:${topic}`;
const latestPredictionsReadyKey = (topic: string) =>
  `${NS}:predictions:${PREDICTION_VERSION}:latest-ready:${topic}`;
const lockKey = (bucket: string) => `${NS}:${STORE_VERSION}:lock:${bucket}`;

/** One recorded answer. */
export interface VoteRecord {
  /** Position on the spectrum, 0..1. */
  v: number;
  /** Unix milliseconds. Lets results be read over time, which a bare count can't. */
  t: number;
  /**
   * Random per-browser id, so one person's answers can be related across
   * boards. Not derived from anything about the person — no name, email or IP
   * feeds into it, and it is never returned by any public endpoint.
   */
  s: string;
  /**
   * Experiment arm this answer was given under ("A" | "B" | "C"), or "" for
   * boards outside the experiment.
   *
   * Recorded on the vote rather than reconstructed later. Deriving it from
   * timestamps would need both answers present, which throws away everyone who
   * answered only the first item — and the first item is the uncontaminated
   * measure, so those are among the most valuable responses there are.
   */
  g: string;
  /**
   * 1-based position within the arm, 0 outside the experiment. Derivable from
   * arm + board today, but stored so the export stays readable if the arm
   * definitions ever change.
   */
  p: number;
  /**
   * Epoch this answer belongs to — "2026-W31", "2026-08", or "all". Derivable
   * from `t`, and stored anyway: it's the unit every longitudinal figure is
   * grouped by, and recomputing it later means re-deriving the cadence rules
   * that were in force at the time. Absent on records written before epochs
   * existed; backfill from `t` when exporting.
   */
  e?: string;
  /**
   * How many times this session has answered THIS board, 1-based. Lets an
   * analysis separate first-ever answers (the clean cross-section) from
   * revisions, without reconstructing every session's history first.
   */
  n?: number;
  /**
   * The board's wording version when this was answered. See `version` in
   * lib/topics.ts — without it, rewording a board silently changes the meaning
   * of every answer already collected.
   */
  bv?: number;
}

/** A prediction is a separate instrument, never a vote with an optional field. */
export interface PredictionRecord {
  /** Predicted position of the comparison group, 0..1. */
  v: number;
  /** The respondent's own answer when this prediction was requested. */
  o: number;
  /** Unix milliseconds when the prediction was recorded. */
  t: number;
  /** Timestamp of the vote this prediction belongs to. */
  vt: number;
  /** Random browser id. Private, like the vote's session id. */
  s: string;
  /** Which comparison was predicted. */
  k: "other-side" | "crowd";
  /** Board wording version. */
  bv: number;
}

export interface RateResult {
  allowed: boolean;
  /** Hits used in the current window, including this one. */
  count: number;
}

export interface VoteStore {
  push(topic: string, record: VoteRecord): Promise<number>;
  all(topic: string): Promise<VoteRecord[]>;
  /** Latest answer for one anonymous browser, without reading the whole board. */
  latestVote(topic: string, session: string): Promise<VoteRecord | null>;
  pushPrediction(topic: string, record: PredictionRecord): Promise<number>;
  allPredictions(topic: string): Promise<PredictionRecord[]>;
  /** One prediction attached to one particular vote. */
  latestPrediction(
    topic: string,
    session: string,
    voteAt: number,
  ): Promise<PredictionRecord | null>;
  /**
   * Generic key/value, used for community-made boards. Curated boards live in
   * lib/topics.ts because they're part of the source; boards anyone can create
   * obviously can't, so they need somewhere to live at runtime.
   */
  kvGet(key: string): Promise<string | null>;
  kvSet(key: string, value: string): Promise<void>;
  kvDel(key: string): Promise<void>;
  /** Unordered set membership — the index of which community boards exist. */
  setAdd(key: string, member: string): Promise<void>;
  setRemove(key: string, member: string): Promise<void>;
  setMembers(key: string): Promise<string[]>;
  setSize(key: string): Promise<number>;
  /** Short distributed lock used to collapse expensive cache rebuilds. */
  acquire(bucket: string, seconds: number): Promise<boolean>;
  /**
   * Fixed-window counter. Returns allowed=false once `limit` is exceeded within
   * `windowSeconds`.
   */
  hit(bucket: string, limit: number, windowSeconds: number): Promise<RateResult>;
  readonly kind: "upstash" | "file";
}

function parseRecords(raw: unknown[]): VoteRecord[] {
  const out: VoteRecord[] = [];
  for (const item of raw) {
    try {
      const r = typeof item === "string" ? JSON.parse(item) : item;
      if (r && Number.isFinite(r.v) && r.v >= 0 && r.v <= 1) {
        out.push({
          v: r.v,
          t: Number(r.t) || 0,
          s: typeof r.s === "string" ? r.s : "",
          g: typeof r.g === "string" ? r.g : "",
          p: Number.isFinite(r.p) ? Number(r.p) : 0,
          // Optional and left undefined when absent rather than defaulted:
          // "written before this field existed" and "genuinely was 1" are
          // different facts, and only the export should decide how to fill them.
          ...(typeof r.e === "string" ? { e: r.e } : {}),
          ...(Number.isFinite(r.n) ? { n: Number(r.n) } : {}),
          ...(Number.isFinite(r.bv) ? { bv: Number(r.bv) } : {}),
        });
      }
    } catch {
      /* skip anything unreadable rather than failing the whole request */
    }
  }
  return out;
}

function parsePredictions(raw: unknown[]): PredictionRecord[] {
  const out: PredictionRecord[] = [];
  for (const item of raw) {
    try {
      const r = typeof item === "string" ? JSON.parse(item) : item;
      if (
        r &&
        Number.isFinite(r.v) && r.v >= 0 && r.v <= 1 &&
        Number.isFinite(r.o) && r.o >= 0 && r.o <= 1 &&
        Number.isFinite(r.t) && Number.isFinite(r.vt) &&
        typeof r.s === "string" &&
        (r.k === "other-side" || r.k === "crowd")
      ) {
        out.push({
          v: Number(r.v),
          o: Number(r.o),
          t: Number(r.t),
          vt: Number(r.vt),
          s: r.s,
          k: r.k,
          bv: Number.isFinite(r.bv) ? Number(r.bv) : 1,
        });
      }
    } catch {
      /* skip malformed prediction rows without losing the rest */
    }
  }
  return out;
}

/* ------------------------------------------------------------------ upstash */

// Accept either naming. Upstash's own console gives UPSTASH_REDIS_REST_*, but
// when the database is provisioned through the Vercel integration the same REST
// URL and token are injected as KV_REST_API_* instead. Reading both means the
// store works no matter which way the database was created.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

async function upstash(command: (string | number)[]): Promise<unknown> {
  const res = await fetch(UPSTASH_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { result?: unknown; error?: string };
  if (json.error) throw new Error(`Upstash: ${json.error}`);
  return json.result;
}

function latestVotes(records: VoteRecord[]): Map<string, VoteRecord> {
  const latest = new Map<string, VoteRecord>();
  const counts = new Map<string, number>();
  for (const record of records) {
    if (!record.s) continue;
    counts.set(record.s, (counts.get(record.s) ?? 0) + 1);
    const current = latest.get(record.s);
    if (!current || record.t >= current.t) latest.set(record.s, record);
  }
  for (const [session, record] of latest) {
    if (!record.n) latest.set(session, { ...record, n: counts.get(session) ?? 1 });
  }
  return latest;
}

async function ensureLatestVoteIndex(topic: string): Promise<void> {
  if (await upstash(["GET", latestVotesReadyKey(topic)])) return;
  const raw = (await upstash(["LRANGE", votesKey(topic), 0, -1])) as string[] | null;
  const fields: (string | number)[] = [];
  for (const [session, record] of latestVotes(parseRecords(raw ?? []))) {
    fields.push(session, JSON.stringify(record));
  }
  // Keep migration requests comfortably below Upstash's request-size ceiling.
  // This normally runs once while the pre-launch lists are tiny, but it should
  // still recover safely if a derived index is ever rebuilt years later.
  for (let i = 0; i < fields.length; i += 2_000) {
    await upstash(["HSET", latestVotesKey(topic), ...fields.slice(i, i + 2_000)]);
  }
  await upstash(["SET", latestVotesReadyKey(topic), "1"]);
}

async function ensureLatestPredictionIndex(topic: string): Promise<void> {
  if (await upstash(["GET", latestPredictionsReadyKey(topic)])) return;
  const raw = (await upstash([
    "LRANGE",
    predictionsKey(topic),
    0,
    -1,
  ])) as string[] | null;
  const fields: (string | number)[] = [];
  for (const record of parsePredictions(raw ?? [])) {
    fields.push(`${record.s}:${record.vt}`, JSON.stringify(record));
  }
  for (let i = 0; i < fields.length; i += 2_000) {
    await upstash([
      "HSET",
      latestPredictionsKey(topic),
      ...fields.slice(i, i + 2_000),
    ]);
  }
  await upstash(["SET", latestPredictionsReadyKey(topic), "1"]);
}

const upstashStore: VoteStore = {
  kind: "upstash",
  async push(topic, record) {
    // Append the irreplaceable raw row and refresh the per-session lookup in a
    // single Redis command. The list remains the analysis source of truth; the
    // hash only keeps cadence checks O(1) when a board becomes popular.
    return (await upstash([
      "EVAL",
      "redis.call('RPUSH', KEYS[1], ARGV[1]); redis.call('HSET', KEYS[2], ARGV[2], ARGV[1]); return redis.call('LLEN', KEYS[1])",
      2,
      votesKey(topic),
      latestVotesKey(topic),
      JSON.stringify(record),
      record.s,
    ])) as number;
  },
  async all(topic) {
    const raw = (await upstash(["LRANGE", votesKey(topic), 0, -1])) as string[] | null;
    return parseRecords(raw ?? []);
  },
  async latestVote(topic, session) {
    await ensureLatestVoteIndex(topic);
    const raw = (await upstash(["HGET", latestVotesKey(topic), session])) as string | null;
    return parseRecords(raw ? [raw] : [])[0] ?? null;
  },
  async pushPrediction(topic, record) {
    return (await upstash([
      "EVAL",
      "redis.call('RPUSH', KEYS[1], ARGV[1]); redis.call('HSET', KEYS[2], ARGV[2], ARGV[1]); return redis.call('LLEN', KEYS[1])",
      2,
      predictionsKey(topic),
      latestPredictionsKey(topic),
      JSON.stringify(record),
      `${record.s}:${record.vt}`,
    ])) as number;
  },
  async allPredictions(topic) {
    const raw = (await upstash([
      "LRANGE",
      predictionsKey(topic),
      0,
      -1,
    ])) as string[] | null;
    return parsePredictions(raw ?? []);
  },
  async latestPrediction(topic, session, voteAt) {
    await ensureLatestPredictionIndex(topic);
    const raw = (await upstash([
      "HGET",
      latestPredictionsKey(topic),
      `${session}:${voteAt}`,
    ])) as string | null;
    return parsePredictions(raw ? [raw] : [])[0] ?? null;
  },
  async hit(bucket, limit, windowSeconds) {
    const k = rateKey(bucket);
    const count = (await upstash(["INCR", k])) as number;
    // Only the first hit needs to arm the expiry.
    if (count === 1) await upstash(["EXPIRE", k, windowSeconds]);
    return { allowed: count <= limit, count };
  },
  async kvGet(key) {
    return ((await upstash(["GET", key])) as string | null) ?? null;
  },
  async kvSet(key, value) {
    await upstash(["SET", key, value]);
  },
  async kvDel(key) {
    await upstash(["DEL", key]);
  },
  async setAdd(key, member) {
    await upstash(["SADD", key, member]);
  },
  async setRemove(key, member) {
    await upstash(["SREM", key, member]);
  },
  async setMembers(key) {
    return ((await upstash(["SMEMBERS", key])) as string[] | null) ?? [];
  },
  async setSize(key) {
    return Number(await upstash(["SCARD", key])) || 0;
  },
  async acquire(bucket, seconds) {
    return (await upstash(["SET", lockKey(bucket), "1", "NX", "EX", seconds])) === "OK";
  },
};

/* --------------------------------------------------------------------- file */

const fileFor = (topic: string) =>
  path.join(process.cwd(), ".data", `votes-${STORE_VERSION}-${topic}.json`);
const predictionsFileFor = (topic: string) =>
  path.join(process.cwd(), ".data", `predictions-${PREDICTION_VERSION}-${topic}.json`);

// One write chain per topic, so concurrent votes can't lose a read-modify-write
// race against each other.
const chains = new Map<string, Promise<unknown>>();

async function readVotes(topic: string): Promise<VoteRecord[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(fileFor(topic), "utf8"));
    return Array.isArray(parsed) ? parseRecords(parsed) : [];
  } catch {
    return [];
  }
}

async function readPredictions(topic: string): Promise<PredictionRecord[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(predictionsFileFor(topic), "utf8"));
    return Array.isArray(parsed) ? parsePredictions(parsed) : [];
  } catch {
    return [];
  }
}

/*
 * Process-local, which is all the file backend can offer. Parked on globalThis
 * because the dev server re-evaluates modules on edit, and a module-level Map
 * would silently reset the counters mid-session — which looks exactly like the
 * rate limiter failing.
 */
const globalCounters = globalThis as typeof globalThis & {
  __vibeCheckCounters?: Map<string, { count: number; expires: number }>;
};
globalCounters.__vibeCheckCounters ??= new Map();
const localCounters = globalCounters.__vibeCheckCounters;

/*
 * One JSON file for all the generic key/value state, serialised through a single
 * chain so concurrent writes can't lose a read-modify-write race — the same
 * hazard the per-topic vote files have, and the same fix.
 */
const kvFile = () => path.join(process.cwd(), ".data", `kv-${STORE_VERSION}.json`);
let kvChain: Promise<unknown> = Promise.resolve();

async function readKv(): Promise<Record<string, string | string[]>> {
  try {
    const parsed = JSON.parse(await fs.readFile(kvFile(), "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function mutateKv<T>(fn: (kv: Record<string, string | string[]>) => T): Promise<T> {
  const next = kvChain.then(async () => {
    const kv = await readKv();
    const result = fn(kv);
    await fs.mkdir(path.dirname(kvFile()), { recursive: true });
    await fs.writeFile(kvFile(), JSON.stringify(kv, null, 2));
    return result;
  });
  kvChain = next.catch(() => {});
  return next;
}

const fileStore: VoteStore = {
  kind: "file",
  async kvGet(key) {
    const value = (await readKv())[key];
    return typeof value === "string" ? value : null;
  },
  kvSet(key, value) {
    return mutateKv((kv) => {
      kv[key] = value;
    });
  },
  kvDel(key) {
    return mutateKv((kv) => {
      delete kv[key];
    });
  },
  setAdd(key, member) {
    return mutateKv((kv) => {
      const set = new Set(Array.isArray(kv[key]) ? (kv[key] as string[]) : []);
      set.add(member);
      kv[key] = [...set];
    });
  },
  setRemove(key, member) {
    return mutateKv((kv) => {
      const set = new Set(Array.isArray(kv[key]) ? (kv[key] as string[]) : []);
      set.delete(member);
      kv[key] = [...set];
    });
  },
  async setMembers(key) {
    const value = (await readKv())[key];
    return Array.isArray(value) ? value : [];
  },
  async setSize(key) {
    const value = (await readKv())[key];
    return Array.isArray(value) ? value.length : 0;
  },
  async acquire(bucket, seconds) {
    const now = Date.now();
    const key = `lock:${bucket}`;
    const existing = localCounters.get(key);
    if (existing && existing.expires >= now) return false;
    localCounters.set(key, { count: 1, expires: now + seconds * 1000 });
    return true;
  },
  push(topic, record) {
    const chainKey = `votes:${topic}`;
    const prior = chains.get(chainKey) ?? Promise.resolve();
    const next = prior.then(async () => {
      const votes = await readVotes(topic);
      votes.push(record);
      const file = fileFor(topic);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(votes));
      return votes.length;
    });
    chains.set(
      chainKey,
      next.catch(() => {}),
    );
    return next;
  },
  all: readVotes,
  async latestVote(topic, session) {
    const mine = (await readVotes(topic)).filter((record) => record.s === session);
    if (!mine.length) return null;
    const latest = mine.reduce((a, b) => (b.t >= a.t ? b : a));
    return latest.n ? latest : { ...latest, n: mine.length };
  },
  pushPrediction(topic, record) {
    const chainKey = `predictions:${topic}`;
    const prior = chains.get(chainKey) ?? Promise.resolve();
    const next = prior.then(async () => {
      const predictions = await readPredictions(topic);
      predictions.push(record);
      const file = predictionsFileFor(topic);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(predictions));
      return predictions.length;
    });
    chains.set(
      chainKey,
      next.catch(() => {}),
    );
    return next;
  },
  allPredictions: readPredictions,
  async latestPrediction(topic, session, voteAt) {
    return (
      (await readPredictions(topic)).find(
        (record) => record.s === session && record.vt === voteAt,
      ) ?? null
    );
  },
  async hit(bucket, limit, windowSeconds) {
    /*
     * In-memory, so this only limits one process. That is fine for local dev and
     * useless in production, where requests are spread across many short-lived
     * instances that share no memory. Real rate limiting requires Upstash — see
     * DEPLOY-CHECKLIST.md.
     */
    const now = Date.now();
    const existing = localCounters.get(bucket);
    if (!existing || existing.expires < now) {
      localCounters.set(bucket, { count: 1, expires: now + windowSeconds * 1000 });
      return { allowed: true, count: 1 };
    }
    existing.count += 1;
    return { allowed: existing.count <= limit, count: existing.count };
  },
};

/* ------------------------------------------------------------------- export */

export const store: VoteStore =
  UPSTASH_URL && UPSTASH_TOKEN ? upstashStore : fileStore;

/** True when rate limiting is actually enforced across instances. */
export const rateLimitingIsShared = store.kind === "upstash";
