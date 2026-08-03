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

const votesKey = (topic: string) => `${NS}:${STORE_VERSION}:votes:${topic}`;
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
}

export interface RateResult {
  allowed: boolean;
  /** Hits used in the current window, including this one. */
  count: number;
}

export interface VoteStore {
  push(topic: string, record: VoteRecord): Promise<number>;
  all(topic: string): Promise<VoteRecord[]>;
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
        });
      }
    } catch {
      /* skip anything unreadable rather than failing the whole request */
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
  async hit(bucket, limit, windowSeconds) {
    const k = rateKey(bucket);
    const count = (await upstash(["INCR", k])) as number;
    // Only the first hit needs to arm the expiry.
    if (count === 1) await upstash(["EXPIRE", k, windowSeconds]);
    return { allowed: count <= limit, count };
  },
};

/* --------------------------------------------------------------------- file */

const fileFor = (topic: string) =>
  path.join(process.cwd(), ".data", `votes-${STORE_VERSION}-${topic}.json`);

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

const fileStore: VoteStore = {
  kind: "file",
  push(topic, record) {
    const prior = chains.get(topic) ?? Promise.resolve();
    const next = prior.then(async () => {
      const votes = await readVotes(topic);
      votes.push(record);
      const file = fileFor(topic);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(votes));
      return votes.length;
    });
    chains.set(
      topic,
      next.catch(() => {}),
    );
    return next;
  },
  all: readVotes,
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
