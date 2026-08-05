import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  allCommunityBoards,
  deleteCommunityBoard,
  getCommunityBoard,
  saveCommunityBoard,
} from "@/lib/boards";
import { store } from "@/lib/store";
import { aggregateWindow } from "@/lib/aggregate";
import { DAY_MS } from "@/lib/epoch";

/**
 * Moderation controls, for the owner only.
 *
 * This is the answer to "a creator published something hateful and won't take it
 * down" — without it, nobody but the creator could remove a board. Gated by
 * ADMIN_TOKEN (an env var), so it isn't reachable by anyone who happens to find
 * the URL.
 *
 * Approve/unapprove govern the FRONT PAGE only; a board can be published (in the
 * /b library, the creator's choice) without being approved. Takedown removes a
 * board entirely.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/** Constant-time compare so the token can't be guessed a character at a time. */
function adminOk(supplied: unknown): boolean {
  const secret = process.env.ADMIN_TOKEN;
  if (!secret || typeof supplied !== "string") return false;
  const a = Buffer.from(supplied);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "Body must be JSON." }, 400);
  }

  if (!adminOk(body.adminToken)) {
    // Same reply whether the token is wrong or unset, so this leaks nothing.
    return noStore({ error: "Not authorised." }, 403);
  }

  const action = body.action;
  const slug = typeof body.slug === "string" ? body.slug : "";

  // The moderation queue: every community board with the stats needed to judge it.
  if (action === "list") {
    const boards = await allCommunityBoards();
    const now = Date.now();
    const rows = await Promise.all(
      boards.map(async (b) => {
        const records = await store.all(b.slug);
        const agg = aggregateWindow(records, now);
        return {
          slug: b.slug,
          question: b.question,
          leftLabel: b.leftLabel,
          rightLabel: b.rightLabel,
          category: b.category,
          createdAt: b.createdAt,
          listed: b.listed,
          approved: b.approved === true,
          reviewOnly: b.reviewOnly,
          underReview: b.underReview === true,
          reports: b.reports ?? 0,
          people: agg.count,
          recentAnswers: records.filter((r) => r.t >= now - 7 * DAY_MS).length,
        };
      }),
    );
    rows.sort(
      (a, b) =>
        Number(b.underReview) - Number(a.underReview) ||
        b.reports - a.reports ||
        b.createdAt - a.createdAt,
    );
    return noStore({ boards: rows });
  }

  const board = await getCommunityBoard(slug);
  if (!board) return noStore({ error: "No such board." }, 404);

  if (action === "approve") {
    // Approving also clears a review hold and ensures it's listed.
    board.approved = true;
    board.underReview = false;
    board.listed = true;
  } else if (action === "unapprove") {
    board.approved = false;
  } else if (action === "hide") {
    // Pull from library and front page, keep the board and its data.
    board.listed = false;
    board.approved = false;
    board.underReview = true;
  } else if (action === "restore") {
    board.underReview = false;
  } else if (action === "takedown") {
    await deleteCommunityBoard(slug);
    return noStore({ deleted: slug });
  } else {
    return noStore({ error: "Unknown action." }, 400);
  }

  await saveCommunityBoard(board);
  return noStore({
    slug: board.slug,
    listed: board.listed,
    approved: board.approved === true,
    underReview: board.underReview === true,
  });
}
