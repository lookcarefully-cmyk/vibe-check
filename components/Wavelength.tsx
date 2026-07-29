"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Dial, { type Phase } from "./Dial";
import { BIN_COUNT, MARGIN_COVERAGE, type Aggregate } from "@/lib/aggregate";

const STORAGE_KEY = "wavelength:shortform:vote";
const POLL_MS = 6000;

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

export default function Wavelength() {
  const [phase, setPhase] = useState<Phase>("choose");
  const [pick, setPick] = useState(0.5);
  const [agg, setAgg] = useState<Aggregate>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const lastCount = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/votes", { cache: "no-store" });
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
  }, []);

  // Restore a previous vote, then keep the aggregate live.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null && Number.isFinite(Number(saved))) {
      setPick(Number(saved));
      setPhase("result");
    }
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
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
        const res = await fetch("/api/votes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        window.localStorage.setItem(STORAGE_KEY, String(value));
        lastCount.current = data.count;
        setAgg(data);
        setPhase("result");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not record your vote.");
      } finally {
        setPending(false);
      }
    },
    [pending, phase],
  );

  const reset = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setPhase("choose");
    setPick(0.5);
  };

  const isResult = phase === "result";
  const spread = Math.round((agg.p90 - agg.p10) * 100);
  const coverage = Math.round(MARGIN_COVERAGE * 100);

  return (
    <main className="shell">
      <header className="masthead">
        <p className="kicker">Wavelength · public data collection</p>
        <h1>Is shortform social media addictive?</h1>
        <p className="lede">
          {isResult
            ? "You're on the board. Here's where everyone else landed."
            : "Slide to your answer and click anywhere on the dial to lock it in."}
        </p>
      </header>

      <div className={`stage ${pending ? "is-pending" : ""} ${flash ? "is-flash" : ""}`}>
        <Dial
          phase={phase}
          pick={pick}
          agg={agg}
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
            The consensus is <strong>{pct(agg.mean)}</strong>
          </p>
          <p className="margin-copy">
            with an <strong>{coverage}%</strong> margin spanning{" "}
            <strong>{spread} points</strong> — {coverage}% of answers fall between{" "}
            {pct(agg.p10)} and {pct(agg.p90)}.
          </p>

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
              <dt>Std. deviation</dt>
              <dd>{pct(agg.sd)}</dd>
            </div>
            <div>
              <dt>You vs. crowd</dt>
              <dd>
                {pick > agg.mean ? "+" : ""}
                {Math.round((pick - agg.mean) * 100)} pts
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
        <p className="hint">
          Keyboard: arrow keys to aim, Enter to submit. Your answer is stored anonymously.
        </p>
      )}
    </main>
  );
}
