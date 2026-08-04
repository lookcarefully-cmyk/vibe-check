/**
 * Boards anyone can make.
 *
 * Curated boards live in lib/topics.ts because they're part of the source.
 * Community boards obviously can't, so they live in the store and are resolved
 * at request time. Everything downstream — the dial, the aggregation, the vote
 * API — works on a `Topic`, so a community board is presented as one rather
 * than being a parallel concept with its own rendering path.
 *
 * The default is UNLISTED. Most people making a board want to send it to their
 * group chat, not publish it to the world, and defaulting to unlisted means the
 * common case needs no moderation at all: an unlisted board has no audience, so
 * there's nothing for spam to gain. Publishing is a deliberate second step.
 */

import { createHash, randomBytes } from "node:crypto";
import { store } from "./store";
import { getTopic, type Topic } from "./topics";
import type { ScaleFamily } from "./likert";
import type { Cadence } from "./epoch";
// Re-exported so server code has one place to import a board's shape from.
export { guessScale, describeHigh } from "./board-shape";

const KEY = {
  board: (slug: string) => `vibecheck:v5:cboard:${slug}`,
  all: "vibecheck:v5:cboards",
  listed: "vibecheck:v5:cboards:listed",
};

/** How a community board is stored. A superset of what Topic needs. */
export interface CommunityBoard {
  slug: string;
  question: string;
  leftLabel: string;
  rightLabel: string;
  category: string;
  scale: ScaleFamily;
  cadence: Cadence;
  highMeans: string;
  createdAt: number;
  /** In the public library. False means share-link only. */
  listed: boolean;
  /**
   * Flagged by moderation as never eligible for the public library, while still
   * working as a private link. Keeps a borderline board from silently vanishing
   * on its author without also putting it in front of strangers.
   */
  reviewOnly: boolean;
  /** sha256 of the creator's token. The raw token never touches the server's storage. */
  creatorHash: string;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newCreatorToken = () => randomBytes(24).toString("hex");

/**
 * URL slug from the question. Suffixed with random characters rather than a
 * counter: a counter would leak how many boards exist and make neighbouring
 * slugs guessable, which matters when "unlisted" is the privacy model.
 */
export function slugify(question: string): string {
  const base = question
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .join("-")
    .slice(0, 48)
    .replace(/^-+|-+$/g, "");
  return `${base || "board"}-${randomBytes(3).toString("hex")}`;
}

/** Community boards are presented to the rest of the app as ordinary Topics. */
export function toTopic(board: CommunityBoard): Topic {
  return {
    id: board.slug,
    subject: board.category || "Community",
    axis: board.question.length > 42 ? `${board.question.slice(0, 40)}…` : board.question,
    question: board.question,
    prompt: "Drag to your answer, then lock it in below.",
    leftLabel: board.leftLabel,
    rightLabel: board.rightLabel,
    highMeans: board.highMeans,
    scale: board.scale,
    category: board.category || "Community",
    cadence: board.cadence,
    version: 1,
  };
}

export async function getCommunityBoard(slug: string): Promise<CommunityBoard | null> {
  const raw = await store.kvGet(KEY.board(slug));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CommunityBoard;
  } catch {
    return null;
  }
}

export async function saveCommunityBoard(board: CommunityBoard): Promise<void> {
  await store.kvSet(KEY.board(board.slug), JSON.stringify(board));
  await store.setAdd(KEY.all, board.slug);
  if (board.listed) await store.setAdd(KEY.listed, board.slug);
  else await store.setRemove(KEY.listed, board.slug);
}

export async function deleteCommunityBoard(slug: string): Promise<void> {
  await store.kvDel(KEY.board(slug));
  await store.setRemove(KEY.all, slug);
  await store.setRemove(KEY.listed, slug);
}

async function loadMany(slugs: string[]): Promise<CommunityBoard[]> {
  const boards = await Promise.all(slugs.map((s) => getCommunityBoard(s)));
  return boards.filter((b): b is CommunityBoard => b !== null);
}

/** Every board in the public library. */
export async function listedBoards(): Promise<CommunityBoard[]> {
  return loadMany(await store.setMembers(KEY.listed));
}

export async function allCommunityBoards(): Promise<CommunityBoard[]> {
  return loadMany(await store.setMembers(KEY.all));
}

/**
 * Resolve any board id — curated first, then community.
 *
 * Curated wins on collision, and creation refuses a slug that already exists,
 * so a community board can never shadow one of the real ones.
 */
export async function resolveBoard(id: string): Promise<Topic | null> {
  const curated = getTopic(id);
  if (curated) return curated;
  const community = await getCommunityBoard(id);
  return community ? toTopic(community) : null;
}

export async function isCommunityBoard(id: string): Promise<boolean> {
  if (getTopic(id)) return false;
  return (await getCommunityBoard(id)) !== null;
}

