import { NextResponse } from "next/server";
import {
  allCommunityBoards,
  describeHigh,
  deleteCommunityBoard,
  featuredBoards,
  getCommunityBoard,
  guessScale,
  hashToken,
  listedBoards,
  newCreatorToken,
  reportBoard,
  saveCommunityBoard,
  slugify,
  type CommunityBoard,
} from "@/lib/boards";
import { moderateBoard } from "@/lib/moderation";
import { callerToken, originIsAllowed } from "@/lib/request";
import { store } from "@/lib/store";
import { getTopic } from "@/lib/topics";
import { aggregateWindow } from "@/lib/aggregate";
import { DAY_MS } from "@/lib/epoch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Creation is rate limited far more tightly than voting. Voting shares an IP
 * with a whole household or carrier, so its caps must be generous; making
 * boards is rare enough that a low ceiling never inconveniences a real person
 * and does stop a script filling the library overnight.
 */
const BOARDS_PER_DAY = 10;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

/**
 * The public library, ranked.
 *
 * "Trending" is answers in the last 7 days, not all-time totals: a board that
 * was busy in March and is dead now is not trending, and ranking by lifetime
 * count would freeze the front of the library permanently in favour of whatever
 * was posted first.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const sort = params.get("sort") ?? "trending";
  // `featured=1` returns only admin-approved boards — this is what the home page
  // asks for, so an unvetted board can never reach the front door.
  const onlyFeatured = params.get("featured") === "1";

  try {
    const boards = onlyFeatured ? await featuredBoards() : await listedBoards();
    const now = Date.now();

    const withStats = await Promise.all(
      boards.map(async (board) => {
        const records = await store.all(board.slug);
        const recent = records.filter((r) => r.t >= now - 7 * DAY_MS).length;
        const agg = aggregateWindow(records, now);
        return {
          slug: board.slug,
          question: board.question,
          leftLabel: board.leftLabel,
          rightLabel: board.rightLabel,
          category: board.category,
          createdAt: board.createdAt,
          people: agg.count,
          recentAnswers: recent,
        };
      }),
    );

    withStats.sort((a, b) =>
      sort === "new"
        ? b.createdAt - a.createdAt
        : b.recentAnswers - a.recentAnswers ||
          b.people - a.people ||
          b.createdAt - a.createdAt,
    );

    return noStore({ boards: withStats, sort });
  } catch (err) {
    console.error("[boards] GET failed", err);
    return noStore({ error: "Could not load boards." }, 500);
  }
}

export async function POST(req: Request) {
  if (!originIsAllowed(req)) {
    return noStore({ error: "Requests from this origin aren't accepted." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "Body must be JSON." }, 400);
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const draft = {
    question: str(body.question),
    leftLabel: str(body.leftLabel),
    rightLabel: str(body.rightLabel),
    category: str(body.category) || "Community",
  };

  const verdict = await moderateBoard(draft);
  if (!verdict.ok) return noStore({ error: verdict.message ?? "That board can't be created." }, 422);

  try {
    const caller = callerToken(req);
    const limit = await store.hit(`${caller}:mkboard`, BOARDS_PER_DAY, 24 * 60 * 60);
    if (!limit.allowed) {
      return noStore(
        { error: "That's a lot of boards from this connection today. Try again tomorrow." },
        429,
      );
    }

    // Retry on the astronomically unlikely slug collision rather than
    // overwriting somebody else's board.
    let slug = "";
    for (let i = 0; i < 5; i += 1) {
      const candidate = slugify(draft.question);
      if (!getTopic(candidate) && !(await getCommunityBoard(candidate))) {
        slug = candidate;
        break;
      }
    }
    if (!slug) return noStore({ error: "Could not allocate a link. Try again." }, 500);

    const token = newCreatorToken();
    const board: CommunityBoard = {
      slug,
      question: draft.question,
      leftLabel: draft.leftLabel.toUpperCase(),
      rightLabel: draft.rightLabel.toUpperCase(),
      category: draft.category,
      scale: guessScale(draft.leftLabel, draft.rightLabel),
      cadence: "week",
      highMeans: describeHigh(draft.rightLabel),
      createdAt: Date.now(),
      // Unlisted until the creator publishes it. See lib/boards.ts.
      listed: false,
      reviewOnly: verdict.reviewOnly === true,
      creatorHash: hashToken(token),
    };
    await saveCommunityBoard(board);

    // The raw token is returned exactly once and only ever stored in the
    // creator's own browser — there is no account to recover it from.
    return noStore({ slug, token, reviewOnly: board.reviewOnly, notice: verdict.message ?? null });
  } catch (err) {
    console.error("[boards] POST failed", err);
    return noStore({ error: "Could not create the board." }, 500);
  }
}

/** Publish, unpublish, or delete — creator only, proven by the token. */
export async function PATCH(req: Request) {
  if (!originIsAllowed(req)) {
    return noStore({ error: "Requests from this origin aren't accepted." }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return noStore({ error: "Body must be JSON." }, 400);
  }

  const slug = typeof body.slug === "string" ? body.slug : "";
  const token = typeof body.token === "string" ? body.token : "";
  const action = body.action;

  const board = await getCommunityBoard(slug);
  if (!board) return noStore({ error: "No such board." }, 404);

  // Reporting needs no ownership — anyone can flag a board — but is rate limited
  // per connection so a single person can't drive one to the auto-hide threshold
  // alone. Reported boards are hidden pending review, never deleted.
  if (action === "report") {
    const caller = callerToken(req);
    const limit = await store.hit(`${caller}:report:${slug}`, 1, 24 * 60 * 60);
    if (!limit.allowed) {
      return noStore({ ok: true, alreadyReported: true });
    }
    await reportBoard(slug);
    return noStore({ ok: true });
  }

  // Everything else is the creator acting on their own board.
  // Constant-ish comparison on the hash, never on the raw token.
  if (!token || hashToken(token) !== board.creatorHash) {
    return noStore({ error: "That isn't your board." }, 403);
  }

  if (action === "publish") {
    if (board.reviewOnly) {
      return noStore(
        { error: "This board can't go in the public library, but your link still works." },
        422,
      );
    }
    board.listed = true;
  } else if (action === "unpublish") {
    board.listed = false;
  } else if (action === "delete") {
    const { deleteCommunityBoard } = await import("@/lib/boards");
    await deleteCommunityBoard(slug);
    return noStore({ deleted: true });
  } else {
    return noStore({ error: "Unknown action." }, 400);
  }

  await saveCommunityBoard(board);
  return noStore({ slug: board.slug, listed: board.listed });
}

/** Everything, for the admin-ish view. Not linked from anywhere public. */
export async function OPTIONS() {
  const boards = await allCommunityBoards();
  return noStore({ count: boards.length });
}
