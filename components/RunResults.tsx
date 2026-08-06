"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Dial from "./Dial";
import InfoDialog from "./InfoDialog";
import Colophon from "./Colophon";
import { BIN_COUNT, type Aggregate } from "@/lib/aggregate";
import { bandFor } from "@/lib/likert";
import { readRunState } from "@/lib/run";
import { voteStorageKey, type Topic } from "@/lib/topics";

/**
 * The payoff at the end of the run: every board this browser answered, revealed
 * at once.
 *
 * Nothing here is shown until the run is finished. That is what keeps the second
 * answer independent of the crowd's view on the first, which is the comparison
 * the whole experiment rests on.
 */

const EMPTY: Aggregate = {
  count: 0,
  mean: 0.5,
  sd: 0,
  p10: 0.5,
  p90: 0.5,
  hist: new Array(BIN_COUNT).fill(0),
  counts: new Array(BIN_COUNT).fill(0),
  updatedAt: 0,
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export default function RunResults() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [aggs, setAggs] = useState<Record<string, Aggregate>>({});
  const [picks, setPicks] = useState<Record<string, number>>({});

  useEffect(() => {
    // Which boards to show depends on this browser's arm, so it can only be
    // resolved on the client.
    const state = readRunState();
    setTopics(state.topics);

    const own: Record<string, number> = {};
    for (const topic of state.topics) {
      const saved = window.localStorage.getItem(voteStorageKey(topic.id));
      if (saved !== null && Number.isFinite(Number(saved))) own[topic.id] = Number(saved);
    }
    setPicks(own);

    let cancelled = false;
    Promise.all(
      state.topics.map((topic) =>
        fetch(`/api/votes/${topic.id}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : EMPTY))
          .then((a: Aggregate) => [topic.id, a] as const)
          .catch(() => [topic.id, EMPTY] as const),
      ),
    ).then((entries) => {
      if (!cancelled) setAggs(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <header className="masthead">
        <div className="kicker">
          <span className="kicker-text">Vibe Check · public opinion, made visible</span>
          <InfoDialog />
        </div>
        <h1>Here&rsquo;s where you landed</h1>
        <p className="lede">
          Your answer is the teal line. Everyone else&rsquo;s average is the red needle.
        </p>
      </header>

      {topics.map((topic) => {
        const agg = aggs[topic.id] ?? EMPTY;
        const pick = picks[topic.id] ?? 0.5;
        const diff = Math.round((pick - agg.mean) * 100);
        const yourBand = bandFor(pick, topic.scale, {
          left: topic.leftLabel,
          right: topic.rightLabel,
          leftProse: topic.leftProse,
          rightProse: topic.rightProse,
        });
        return (
          <section key={topic.id} className="run-result">
            <h2>{topic.question}</h2>
            <div className="stage">
              <Dial
                phase="result"
                pick={pick}
                agg={agg}
                topic={topic}
                onPick={() => {}}
                onCommit={() => {}}
                interactive={false}
              />
            </div>
            <p className="run-result-line">
              You said <strong>{pct(pick)}</strong>
              {yourBand && (
                <>
                  {" — "}
                  <strong>{yourBand}</strong>
                </>
              )}{" "}
              · average <strong>{pct(agg.mean)}</strong> ·{" "}
              {agg.count.toLocaleString()} {agg.count === 1 ? "answer" : "answers"}
              {agg.count > 0 && (
                <>
                  {" "}
                  · you&rsquo;re{" "}
                  <strong>
                    {diff === 0
                      ? "right on it"
                      : `${Math.abs(diff)} pts ${diff > 0 ? "higher" : "lower"}`}
                  </strong>
                </>
              )}
            </p>
          </section>
        );
      })}

      <section className="run-more">
        <h2>More questions</h2>
        <p>
          These aren&rsquo;t part of the set above — answer any of them, in any order.
        </p>
        <Link href="/explore" className="reset">
          Explore boards
        </Link>
      </section>

      <footer className="disclosure">
        Private by design: your answer, the time, and a random browser ID that groups your
        answers together. No name, email, account, or precise location; your IP is never
        attached to an answer. Aggregate results are public.{" "}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
