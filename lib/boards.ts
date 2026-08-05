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
  // Admin-approved for the front page. A separate, higher bar than `listed`:
  // publishing (creator's choice) puts a board in the /b library; approval
  // (yours) is what lets it onto the home page, where the stakes are higher.
  featured: "vibecheck:v5:cboards:featured",
};

/**
 * Reports that auto-unlist a board pending review.
 *
 * A safety valve, not a verdict: enough reports hides a board from the public
 * library and the front page (it stays reachable by its link and is never
 * deleted) so a human can look. Set low enough to catch real problems fast,
 * high enough that one or two people can't brigade a board they merely dislike.
 */
export const REPORTS_TO_UNLIST = 4;

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
  /**
   * Approved by an admin for the front page. Distinct from `listed`: a creator
   * can publish to the library themselves, but only a human decision puts a
   * board where every first-time visitor sees it.
   */
  approved?: boolean;
  /** How many people have reported this board. At REPORTS_TO_UNLIST it auto-hides. */
  reports?: number;
  /** Set once a report has hidden it, so a human knows to look. */
  underReview?: boolean;
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
    prompt: "Tap or click to place your answer. Drag to fine-tune, then lock it in.",
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
  // A board is in the public library only if it's listed AND not hidden for
  // review; on the front page only if it's also admin-approved. Kept in index
  // sets so the common reads (library, home page) don't have to load every board.
  const publiclyListed = board.listed && !board.underReview;
  if (publiclyListed) await store.setAdd(KEY.listed, board.slug);
  else await store.setRemove(KEY.listed, board.slug);
  if (publiclyListed && board.approved) await store.setAdd(KEY.featured, board.slug);
  else await store.setRemove(KEY.featured, board.slug);
}

/** Boards approved for the front page. A subset of the library. */
export async function featuredBoards(): Promise<CommunityBoard[]> {
  return loadMany(await store.setMembers(KEY.featured));
}

/**
 * Record a report against a board. When reports reach the threshold the board is
 * auto-hidden from the library and front page pending review — never deleted,
 * and still reachable by its link. Returns whether it was hidden.
 */
export async function reportBoard(slug: string): Promise<{ hidden: boolean } | null> {
  const board = await getCommunityBoard(slug);
  if (!board) return null;
  board.reports = (board.reports ?? 0) + 1;
  const hidden = board.reports >= REPORTS_TO_UNLIST;
  if (hidden) board.underReview = true;
  await saveCommunityBoard(board);
  return { hidden };
}

export async function deleteCommunityBoard(slug: string): Promise<void> {
  await store.kvDel(KEY.board(slug));
  await store.setRemove(KEY.all, slug);
  await store.setRemove(KEY.listed, slug);
  await store.setRemove(KEY.featured, slug);
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

