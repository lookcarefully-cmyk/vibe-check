"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dial, { type Phase } from "./Dial";
import InfoDialog from "./InfoDialog";
import TopicNav from "./TopicNav";
import { BIN_COUNT, MARGIN_COVERAGE, type Aggregate } from "@/lib/aggregate";
import { getSessionId } from "@/lib/session";
import { voteStorageKey, type Topic } from "@/lib/topics";

/*
 * Every poll is a read of the whole vote list, which costs a database command.
 * At 6s a single tab left open for ten minutes cost 100 of them; 20s plus the
 * pause-when-hidden below cuts that by roughly 3x. Results still feel live —
 * the dial also refreshes whenever the tab regains focus.
 */
const POLL_MS = 20_000;

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

export default function VibeCheck({ topic }: { topic: Topic }) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [pick, setPick] = useState(0.5);
  const [agg, setAgg] = useState<Aggregate>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [navKey, setNavKey] = useState(0);

  const lastCount = useRef(0);
  const storageKey = voteStorageKey(topic.id);
  const endpoint = `/api/votes/${topic.id}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Aggregate = await res.json();
      setAgg((prev) => {
        if (data.count > lastCount.current && lastCount.current > 0) {
          setFlash(true);
          window.setTimeout(() => setFlash(false), 900);
        }
        lastCount.current = data.count;
        return data.updatedAt >= prev.updatedAt ? data : prev;
      });
    } catch {
      /* a failed poll is not worth shouting about; the next one may work */
    }
  }, [endpoint]);

  // Switching boards resets everything, then restores that board's own vote.
  useEffect(() => {
    setAgg(EMPTY);
    setError(null);
    lastCount.current = 0;

    const saved = window.localStorage.getItem(storageKey);
    if (saved !== null && Number.isFinite(Number(saved))) {
      setPick(Number(saved));
      setPhase("result");
    } else {
      setPick(0.5);
      setPhase("choose");
    }
    void load();
  }, [storageKey, load]);

  useEffect(() => {
    let id = 0;
    // Don't poll a tab nobody is looking at — it costs database commands and
    // nobody sees the result.
    const start = () => {
      window.clearInterval(id);
      id = window.setInterval(() => void load(), POLL_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void load();
        start();
      } else {
        window.clearInterval(id);
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const commit = useCallback(
    async (value: number) => {
      if (pending || phase === "result") return;
      setPending(true);
      setError(null);
      setPick(value);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value, session: getSessionId() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        window.localStorage.setItem(storageKey, String(value));
        lastCount.current = data.count;
        setAgg(data);
        setPhase("result");
        setNavKey((k) => k + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not record your vote.");
      } finally {
        setPending(false);
      }
    },
    [pending, phase, endpoint, storageKey],
  );

  const reset = () => {
    window.localStorage.removeItem(storageKey);
    setPhase("choose");
    setPick(0.5);
  };

  const isResult = phase === "result";
  const outside = Math.round(((1 - MARGIN_COVERAGE) / 2) * 100);
  const inTen = Math.round(MARGIN_COVERAGE * 10);
  const hasSpread = agg.count > 1;

  return (
    <main className="shell">
      <TopicNav activeId={topic.id} refreshKey={navKey} />

      <header className="masthead">
        {/* A div, not a p: it contains a <dialog>, which isn't phrasing content. */}
        <div className="kicker">
          <span className="kicker-text">Vibe Check · public data collection</span>
          <InfoDialog />
        </div>
        <h1>{topic.question}</h1>
        <p className="lede">
          {isResult ? "You're on the board. Here's where everyone else landed." : topic.prompt}
        </p>
      </header>

      <div className={`stage ${pending ? "is-pending" : ""} ${flash ? "is-flash" : ""}`}>
        <Dial
          phase={phase}
          pick={pick}
          agg={agg}
          topic={topic}
          onPick={setPick}
          onCommit={commit}
          interactive={!isResult && !pending}
        />
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {isResult ? (
        <section className="results">
          <p className="consensus">
            The average answer is <strong>{pct(agg.mean)}</strong>
          </p>
          {hasSpread ? (
            <p className="margin-copy">
              Most answers — {inTen} in 10 — land between <strong>{pct(agg.p10)}</strong> and{" "}
              <strong>{pct(agg.p90)}</strong>. About {outside}% went lower than that, and{" "}
              {outside}% went higher.
            </p>
          ) : (
            <p className="margin-copy">Not enough answers yet to describe the spread.</p>
          )}

          <dl className="stats">
            <div>
              <dt>Your answer</dt>
              <dd>{pct(pick)}</dd>
            </div>
            <div>
              <dt>Responses</dt>
              <dd>{agg.count.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Where most land</dt>
              <dd>{hasSpread ? `${pct(agg.p10)}–${pct(agg.p90)}` : "—"}</dd>
            </div>
            <div>
              <dt>You vs. average</dt>
              <dd>
                {(() => {
                  const diff = Math.round((pick - agg.mean) * 100);
                  const unit = Math.abs(diff) === 1 ? "pt" : "pts";
                  return `${diff > 0 ? "+" : ""}${diff} ${unit}`;
                })()}
              </dd>
            </div>
          </dl>

          {agg.count < 5 && (
            <p className="thin-data">
              Only {agg.count} {agg.count === 1 ? "response" : "responses"} so far — the
              curve will sharpen as more people answer.
            </p>
          )}

          <button type="button" className="reset" onClick={reset}>
            Answer again
          </button>
        </section>
      ) : (
        <p className="hint">Keyboard: arrow keys to aim, Enter to submit.</p>
      )}

      {/* Standing disclosure, so it's readable without opening the dialog. */}
      <footer className="disclosure">
        Anonymous: your answer, the time, and a random ID that groups your answers together.
        No name, email, account or IP. Aggregate results are used for writing on X and
        Substack. <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>
    </main>
  );
}
