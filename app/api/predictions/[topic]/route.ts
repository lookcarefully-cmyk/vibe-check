import { NextResponse } from "next/server";
import { aggregateWindow } from "@/lib/aggregate";
import { callerToken, isValidSessionId, originIsAllowed } from "@/lib/request";
import { resolveBoard } from "@/lib/boards";
import { revealTypeOf, versionOf } from "@/lib/topics";
import { store, type PredictionRecord, type VoteRecord } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ topic: string }> };

/** Never reveal a partitioned side made from fewer than this many people. */
const MIN_OTHER_SIDE_RESPONSES = 10;
const PER_BOARD_PER_DAY = 60;
const DAY_SECONDS = 24 * 60 * 60;

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}

function comparison(records: VoteRecord[], own: number, kind: "other-side" | "crowd") {
  const now = Date.now();
  const exactMiddle = own === 0.5;
  const effectiveKind = kind === "other-side" && exactMiddle ? "crowd" : kind;
  const side =
    effectiveKind === "crowd" ? "crowd" : own < 0.5 ? "right" : "left";

  const agg = aggregateWindow(
    records,
    now,
    side === "right"
      ? (vote) => vote.v > 0.5
      : side === "left"
        ? (vote) => vote.v < 0.5
        : () => true,
  );
  const minimum = effectiveKind === "other-side" ? MIN_OTHER_SIDE_RESPONSES : 1;
  const suppressed = agg.count < minimum;

  return {
    kind: effectiveKind,
    side,
    count: agg.count,
    mean: suppressed ? null : agg.mean,
    windowLabel: agg.windowLabel,
    minimum,
    suppressed,
    ...(exactMiddle && kind === "other-side" ? { middleFallback: true } : {}),
  };
}

export async function POST(req: Request, { params }: Params) {
  const topic = await resolveBoard((await params).topic);
  if (!topic) return json({ error: "Unknown topic." }, 404);

  const revealType = revealTypeOf(topic);
  if (revealType !== "other-side" && revealType !== "crowd") {
    return json({ error: "This board does not collect a separate prediction." }, 400);
  }
  if (!originIsAllowed(req)) {
    return json({ error: "Requests from this origin aren't accepted." }, 403);
  }

  let body: { value?: unknown; session?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const { value, session } = body;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    return json({ error: "`value` must be a number between 0 and 1." }, 400);
  }
  if (!isValidSessionId(session)) {
    return json({ error: "`session` must be a 32-character hex id." }, 400);
  }

  try {
    const caller = callerToken(req);
    const rate = await store.hit(
      `${caller}:prediction:${topic.id}`,
      PER_BOARD_PER_DAY,
      DAY_SECONDS,
    );
    if (!rate.allowed) {
      return json({ error: "This connection has sent a lot of predictions today." }, 429);
    }

    const [votes, predictions] = await Promise.all([
      store.all(topic.id),
      store.allPredictions(topic.id),
    ]);
    const mine = votes.filter((vote) => vote.s === session).sort((a, b) => b.t - a.t);
    const ownVote = mine[0];
    if (!ownVote) {
      return json({ error: "Record an answer before making a prediction." }, 409);
    }

    const rounded = Math.round(value * 1000) / 1000;
    const existing = predictions.find(
      (prediction) => prediction.s === session && prediction.vt === ownVote.t,
    );
    const prediction = existing?.v ?? rounded;

    if (!existing) {
      const record: PredictionRecord = {
        v: rounded,
        o: ownVote.v,
        t: Date.now(),
        vt: ownVote.t,
        s: session,
        k: revealType,
        bv: versionOf(topic),
      };
      await store.pushPrediction(topic.id, record);
    }

    return json({
      prediction,
      own: ownVote.v,
      comparison: comparison(votes, ownVote.v, revealType),
    });
  } catch (err) {
    console.error("[predictions] POST failed", err);
    return json({ error: "Could not record your prediction." }, 500);
  }
}
