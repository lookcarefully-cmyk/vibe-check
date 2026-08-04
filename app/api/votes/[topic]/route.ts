import { NextResponse } from "next/server";
import { aggregateWindow, weeklySeries } from "@/lib/aggregate";
import { checkEligibility, epochKey } from "@/lib/epoch";
import { callerToken, isValidSessionId, originIsAllowed } from "@/lib/request";
import { store, type VoteRecord } from "@/lib/store";
import { cadenceOf, getTopic, versionOf } from "@/lib/topics";

// Votes are mutable state; never let a CDN or the build step freeze this.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ topic: string }> };

/**
 * Rate limits, per hashed caller — which means per IP, NOT per person.
 *
 * These are a flood stop, not the "one vote each" rule; that is enforced in the
 * browser (see components/VibeCheck.tsx). The distinction matters because one
 * IP is routinely many people: a household, an office, and above all mobile
 * carriers, which put very large numbers of users behind a handful of
 * addresses. The old per-board cap of 5 was sized for one person re-answering,
 * and on a link shared to a wide audience it would have started rejecting
 * ordinary first-time voters — silently, as a 429 they could do nothing about.
 *
 * So: high enough that a shared exit IP never trips it in normal use, low
 * enough that a single address can't sit there stuffing one board all day.
 */
const PER_BOARD_PER_DAY = 60;
const ALL_BOARDS_PER_DAY = 300;
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
    const now = Date.now();
    /*
     * Windowed and deduped to one answer per person — see aggregateWindow. The
     * all-time raw mean is deliberately NOT what's returned: once people can
     * answer again it measures person-weeks rather than people, and nothing on
     * the page would say so.
     *
     * Session ids and timestamps still never leave; the series is aggregate-only.
     */
    return noStore({
      ...aggregateWindow(records, now),
      series: weeklySeries(records, now),
      cadence: cadenceOf(topic),
    });
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
      // Worded for the shared-connection case as well as the flooding one: the
      // person reading this may be a first-time voter behind a busy network.
      return noStore(
        {
          error:
            "This connection has sent a lot of answers today, so this one wasn't recorded. Try again tomorrow.",
        },
        429,
      );
    }

    /*
     * Cadence is enforced here, not just in the browser.
     *
     * The client hides the dial once you've answered, but localStorage is not a
     * trust boundary — it can be cleared, edited, or simply not sent. Without a
     * server-side check, one session could post a hundred answers to the same
     * board in a minute and the "one answer per person per week" figure would
     * quietly become a lie. The rate limiter doesn't cover this: it buckets by
     * IP, which is a whole household or carrier, not a person.
     */
    const now = Date.now();
    const cadence = cadenceOf(topic);
    const existing = await store.all(topic.id);
    const mine = existing.filter((r) => r.s === session);
    const lastMine = mine.length ? Math.max(...mine.map((r) => r.t)) : null;
    const eligibility = checkEligibility(lastMine, cadence, now);

    if (!eligibility.allowed) {
      return noStore(
        {
          error:
            eligibility.reason === "once-only"
              ? "You've already answered this one."
              : "You've already answered this recently. You can answer again when it reopens.",
          reason: eligibility.reason,
          nextAllowedAt: eligibility.nextAllowedAt,
        },
        409,
      );
    }

    const record: VoteRecord = {
      // Round to the nearest 0.1% — plenty of resolution, and it keeps the
      // stored payload small.
      v: Math.round(value * 1000) / 1000,
      t: now,
      s: session,
      g: armValue,
      p: positionValue,
      e: epochKey(now, cadence),
      n: mine.length + 1,
      bv: versionOf(topic),
    };
    await store.push(topic.id, record);

    // Aggregate from what was already read plus this answer, rather than
    // re-reading the whole list — same result, one fewer round trip.
    const records = [...existing, record];
    return noStore({
      ...aggregateWindow(records, now),
      series: weeklySeries(records, now),
      cadence,
    });
  } catch (err) {
    console.error("[votes] POST failed", err);
    return noStore({ error: "Could not record your vote." }, 500);
  }
}
