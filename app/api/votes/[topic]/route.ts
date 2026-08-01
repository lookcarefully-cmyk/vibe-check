import { NextResponse } from "next/server";
import { aggregate } from "@/lib/aggregate";
import { callerToken, isValidSessionId, originIsAllowed } from "@/lib/request";
import { store, type VoteRecord } from "@/lib/store";
import { getTopic } from "@/lib/topics";

// Votes are mutable state; never let a CDN or the build step freeze this.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ topic: string }> };

/**
 * Rate limits, per hashed caller. Generous enough that nobody answering in good
 * faith — including re-answering via "Answer again" — will notice, and tight
 * enough that a script can't flood a board.
 */
const PER_BOARD_PER_DAY = 5;
const ALL_BOARDS_PER_DAY = 30;
const DAY_SECONDS = 24 * 60 * 60;

function noStore(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

export async function GET(_req: Request, { params }: Params) {
  const topic = getTopic((await params).topic);
  if (!topic) return noStore({ error: "Unknown topic." }, 404);

  try {
    const records = await store.all(topic.id);
    // Only positions leave the server. Timestamps and session ids stay in.
    return noStore(aggregate(records.map((r) => r.v)));
  } catch (err) {
    console.error("[votes] GET failed", err);
    return noStore({ error: "Could not read votes." }, 500);
  }
}

export async function POST(req: Request, { params }: Params) {
  const topic = getTopic((await params).topic);
  if (!topic) return noStore({ error: "Unknown topic." }, 404);

  if (!originIsAllowed(req)) {
    return noStore({ error: "Requests from this origin aren't accepted." }, 403);
  }

  let body: { value?: unknown; session?: unknown; arm?: unknown; position?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return noStore({ error: "Body must be JSON." }, 400);
  }

  const { value, session, arm, position } = body;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return noStore({ error: "`value` must be a number between 0 and 1." }, 400);
  }
  if (!isValidSessionId(session)) {
    return noStore({ error: "`session` must be a 32-character hex id." }, 400);
  }
  // Arm and position are experiment metadata. Boards outside the experiment
  // send "" and 0. Anything malformed is stored as "unknown" rather than
  // rejected — losing a real answer over a bad label would be the worse error.
  const armValue = typeof arm === "string" && /^[ABC]$/.test(arm) ? arm : "";
  const positionValue =
    typeof position === "number" && Number.isInteger(position) && position >= 0 && position <= 20
      ? position
      : 0;

  try {
    const caller = callerToken(req);
    const [board, overall] = await Promise.all([
      store.hit(`${caller}:${topic.id}`, PER_BOARD_PER_DAY, DAY_SECONDS),
      store.hit(`${caller}:all`, ALL_BOARDS_PER_DAY, DAY_SECONDS),
    ]);
    if (!board.allowed || !overall.allowed) {
      return noStore(
        { error: "You've answered this plenty for today. Try again tomorrow." },
        429,
      );
    }

    const record: VoteRecord = {
      // Round to the nearest 0.1% — plenty of resolution, and it keeps the
      // stored payload small.
      v: Math.round(value * 1000) / 1000,
      t: Date.now(),
      s: session,
      g: armValue,
      p: positionValue,
    };
    await store.push(topic.id, record);

    const records = await store.all(topic.id);
    return noStore(aggregate(records.map((r) => r.v)));
  } catch (err) {
    console.error("[votes] POST failed", err);
    return noStore({ error: "Could not record your vote." }, 500);
  }
}
