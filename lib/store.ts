/**
 * Vote storage with two interchangeable backends.
 *
 *  - Upstash Redis (serverless-safe) when UPSTASH_REDIS_REST_URL + _TOKEN are set.
 *  - A local JSON file (.data/votes.json) otherwise, so `npm run dev` works
 *    with zero configuration.
 *
 * Both speak the same tiny interface, so the API route never has to care.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export const MAX_VOTES = 20_000;
const KEY = "wavelength:shortform:votes";

export interface VoteStore {
  /** Append a vote in [0, 1]. Returns the new total count. */
  push(value: number): Promise<number>;
  /** All stored vote values, oldest first. */
  all(): Promise<number[]>;
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
  async push(value) {
    const len = (await upstash(["RPUSH", KEY, String(value)])) as number;
    // Keep the list bounded so LRANGE stays cheap forever.
    if (len > MAX_VOTES) await upstash(["LTRIM", KEY, -MAX_VOTES, -1]);
    return Math.min(len, MAX_VOTES);
  },
  async all() {
    const raw = (await upstash(["LRANGE", KEY, 0, -1])) as string[] | null;
    return (raw ?? []).map(Number).filter(Number.isFinite);
  },
};

/* --------------------------------------------------------------------- file */

const FILE = path.join(process.cwd(), ".data", "votes.json");

// Serialises concurrent writes within this process so we never lose a vote to
// a read-modify-write race.
let writeChain: Promise<unknown> = Promise.resolve();

async function readFile(): Promise<number[]> {
  try {
    const txt = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed.filter(Number.isFinite) : [];
  } catch {
    return [];
  }
}

const fileStore: VoteStore = {
  kind: "file",
  push(value) {
    const next = writeChain.then(async () => {
      const votes = await readFile();
      votes.push(value);
      const trimmed = votes.slice(-MAX_VOTES);
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.writeFile(FILE, JSON.stringify(trimmed));
      return trimmed.length;
    });
    writeChain = next.catch(() => {});
    return next;
  },
  all: readFile,
};

/* ------------------------------------------------------------------- export */

export const store: VoteStore =
  UPSTASH_URL && UPSTASH_TOKEN ? upstashStore : fileStore;
