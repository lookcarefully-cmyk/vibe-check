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
  pushPrediction(topic: string, record: PredictionRecord): Promise<number>;
  allPredictions(topic: string): Promise<PredictionRecord[]>;
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

const upstashStore: VoteStore = {
  kind: "upstash",
  async push(topic, record) {
    // No cap: trimming would silently redefine the average as "the most recent
    // N people" with nothing on the page saying so.
    return (await upstash(["RPUSH", votesKey(topic), JSON.stringify(record)])) as number;
  },
  async all(topic) {
    const raw = (await upstash(["LRANGE", votesKey(topic), 0, -1])) as string[] | null;
    return parseRecords(raw ?? []);
  },
  async pushPrediction(topic, record) {
    return (await upstash([
      "RPUSH",
      predictionsKey(topic),
      JSON.stringify(record),
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
