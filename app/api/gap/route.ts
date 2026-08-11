import { NextResponse } from "next/server";
import { dedupeLatestPerPerson } from "@/lib/aggregate";
import { accuracyOf } from "@/lib/gap";
import { store } from "@/lib/store";
import { GAP_TOPICS } from "@/lib/experiment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The distribution of finished perception-gap scores, for the percentile on
 * /gap/results.
 *
 * WHAT THIS DELIBERATELY DOES NOT RETURN. Scoring a battery means joining eight
 * boards on the per-browser session id, which is the one field that links a
 * person's answers together. That join happens here, on the server, and the
 * session ids never leave it — the response is a bare list of accuracy numbers
 * with no ids, no timestamps, no per-question values and no ordering that could
 * be matched back to a person. Same rule as every other public endpoint: `s` is
 * never returned.
 *
 * It is also not an anchoring risk. These are scores, not answers: knowing that
 * people average 55/100 tells you nothing about where any published figure sits,
 * so it cannot contaminate a guess. It is still only fetched by the results
 * page, after the battery is done.
 */

/** Cheap protection against this becoming eight full board reads per visitor. */
const CACHE_SECONDS = 120;

export async function GET() {
  try {
    const topics = GAP_TOPICS.filter((topic) => topic.benchmark);
    if (topics.length === 0) {
      return NextResponse.json({ ok: true, finishers: 0, accuracies: [] });
    }

    const perTopic = await Promise.all(topics.map((topic) => store.all(topic.id)));

    /*
     * Per board, one answer per person — their latest — exactly as every other
     * headline figure is computed. Without this, anyone who answered a board
     * twice would contribute two errors for one question and score as though
     * they had taken a longer quiz.
     */
    const errorsBySession = new Map<string, number[]>();
    topics.forEach((topic, index) => {
      const truth = topic.benchmark!.value;
      for (const vote of dedupeLatestPerPerson(perTopic[index])) {
        // No session id means the answer predates sessions and cannot be joined
        // to the person's other seven. Such a row can never form a battery.
        if (!vote.s) continue;
        const errors = errorsBySession.get(vote.s) ?? [];
        errors.push(Math.abs(Math.round(vote.v * 100) - Math.round(truth * 100)));
        errorsBySession.set(vote.s, errors);
      }
    });

    const accuracies: number[] = [];
    for (const errors of errorsBySession.values()) {
      // Only complete batteries. A partial run scored against the full set
      // would look like someone who did badly rather than someone who stopped.
      if (errors.length !== topics.length) continue;
      accuracies.push(accuracyOf(errors.reduce((a, b) => a + b, 0) / errors.length));
    }
    accuracies.sort((a, b) => a - b);

    return NextResponse.json(
      { ok: true, finishers: accuracies.length, accuracies },
      {
        headers: {
          // `max-age=0` is load-bearing: without it the browser applies its own
          // heuristic cache and someone who finishes, reloads and re-checks
          // their rank can be served a distribution from before they were in
          // it. The shared edge cache still collapses a burst of finishers into
          // one origin read; two minutes of staleness there moves a percentile
          // by at most a person or two.
          "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=600`,
        },
      },
    );
  } catch {
    /*
     * The percentile is a bonus on top of a score that already stands on its
     * own, so a failure here must never take the results page down with it.
     *
     * `ok: false` matters: an empty distribution because nobody has finished
     * and an empty distribution because the store threw look identical from
     * the outside, and a silent catch that mimics a valid result is a trap to
     * debug. The client treats both as "no ranking", but the difference is
     * visible to anyone checking.
     */
    return NextResponse.json({ ok: false, finishers: 0, accuracies: [] });
  }
}
