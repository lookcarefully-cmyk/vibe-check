/**
 * Vote storage, partitioned by topic, with two interchangeable backends.
 *
 *  - Upstash Redis (serverless-safe) when UPSTASH_REDIS_REST_URL + _TOKEN are set.
 *  - A local JSON file per topic (.data/votes-<topic>.json) otherwise, so
 *    `npm run dev` works with zero configuration.
 *
 * Both speak the same tiny interface, so the API routes never have to care.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export const MAX_VOTES = 20_000;

const key = (topic: string) => `wavelength:v2:${topic}`;

export interface VoteStore {
  /** Append a vote in [0, 1] to one topic. Returns that topic's new total. */
  push(topic: string, value: number): Promise<number>;
  /** All stored vote values for one topic, oldest first. */
  all(topic: string): Promise<number[]>;
  readonly kind: "upstash" | "file";
}

/* ------------------------------------------------------------------ upstash */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

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
  async push(topic, value) {
    const len = (await upstash(["RPUSH", key(topic), String(value)])) as number;
    // Keep the list bounded so LRANGE stays cheap forever.
    if (len > MAX_VOTES) await upstash(["LTRIM", key(topic), -MAX_VOTES, -1]);
    return Math.min(len, MAX_VOTES);
  },
  async all(topic) {
    const raw = (await upstash(["LRANGE", key(topic), 0, -1])) as string[] | null;
    return (raw ?? []).map(Number).filter(Number.isFinite);
  },
};

/* --------------------------------------------------------------------- file */

const fileFor = (topic: string) =>
  path.join(process.cwd(), ".data", `votes-${topic}.json`);

// One write chain per topic, so concurrent votes can't lose a read-modify-write
// race against each other.
const chains = new Map<string, Promise<unknown>>();

async function readVotes(topic: string): Promise<number[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(fileFor(topic), "utf8"));
    return Array.isArray(parsed) ? parsed.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

const fileStore: VoteStore = {
  kind: "file",
  push(topic, value) {
    const prior = chains.get(topic) ?? Promise.resolve();
    const next = prior.then(async () => {
      const votes = await readVotes(topic);
      votes.push(value);
      const trimmed = votes.slice(-MAX_VOTES);
      const file = fileFor(topic);
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(trimmed));
      return trimmed.length;
    });
    chains.set(
      topic,
      next.catch(() => {}),
    );
    return next;
  },
  all: readVotes,
};

/* ------------------------------------------------------------------- export */

export const store: VoteStore =
  UPSTASH_URL && UPSTASH_TOKEN ? upstashStore : fileStore;
