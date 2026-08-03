"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dial, { type Phase } from "./Dial";
import InfoDialog from "./InfoDialog";
import TopicNav from "./TopicNav";
import Colophon from "./Colophon";
import { BIN_COUNT, MARGIN_COVERAGE, type Aggregate } from "@/lib/aggregate";
import { nextHref, readRunState, type RunState } from "@/lib/run";
import { bandCounts, bandFor, bandIndex } from "@/lib/likert";
import { getSessionId } from "@/lib/session";
import {
  EXPERIMENT_ENABLED,
  EXTRA_TOPICS,
  isExperimentTopic,
  positionInArm,
} from "@/lib/experiment";
import { revealStorageKey, voteStorageKey, type Topic } from "@/lib/topics";

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
  const [activeBand, setActiveBand] = useState<number | null>(null);
  // Whether a fetch has come back yet. Without this, the empty starting
  // aggregate is indistinguishable from a failed load, and the "couldn't load"
  // notice flashes on every result page before the first response arrives.
  const [loaded, setLoaded] = useState(false);
  // True when the viewer gave up their vote to see the results. The board is
  // then closed to them permanently — see revealStorageKey in lib/topics.ts.
  const [revealed, setRevealed] = useState(false);
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  // null until read on the client, so server and first client render agree.
  const [run, setRun] = useState<RunState | null>(null);

  const router = useRouter();
  const lastCount = useRef(0);
  const storageKey = voteStorageKey(topic.id);
  const revealKey = revealStorageKey(topic.id);
  const endpoint = `/api/votes/${topic.id}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(endpoint, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data: Aggregate = await res.json();
      setLoaded(true);
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
    setLoaded(false);
    setActiveBand(null);
    setConfirmingReveal(false);
    lastCount.current = 0;

    const state = readRunState();
    setRun(state);

    const saved = window.localStorage.getItem(storageKey);
    const midRun = (EXPERIMENT_ENABLED && isExperimentTopic(topic.id)) && !state.complete;

    if (midRun && state.next && topic.id !== state.next.id) {
      /*
       * Not the board they should be on. Two ways to get here: revisiting one
       * already answered, or arriving on a later core board from a shared link.
       *
       * The second is why this checks position rather than just "answered".
       * Landing on board 2 first would run the sequence 2 -> 1 -> 3, and the
       * order is load-bearing: the dissociation is "says addictive, THEN says
       * the habit is harmless". Reversed, it measures something else.
       */
      router.replace(nextHref(state));
      return;
    }

    const wasRevealed = window.localStorage.getItem(revealKey) !== null;

    if (!midRun && saved !== null && Number.isFinite(Number(saved))) {
      setPick(Number(saved));
      setRevealed(false);
      setPhase("result");
    } else if (!midRun && wasRevealed) {
      // Results forfeited-for. No own answer, and no way back to the dial.
      setPick(0.5);
      setRevealed(true);
      setPhase("result");
    } else {
      setPick(0.5);
      setRevealed(false);
      setPhase("choose");
    }
    void load();
  }, [storageKey, revealKey, load, topic, router]);

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
      const state = readRunState();
      const inExperiment = (EXPERIMENT_ENABLED && isExperimentTopic(topic.id));
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            value,
            session: getSessionId(),
            // Experiment metadata, recorded on the vote itself so a partial run
            // is still analysable. See lib/experiment.ts.
            arm: inExperiment ? state.arm : "",
            position: inExperiment ? positionInArm(state.arm, topic.id) : 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
        window.localStorage.setItem(storageKey, String(value));

        // Re-read after writing: this answer may have completed the run.
        const after = readRunState();
        if (inExperiment) {
          // Straight on, or to the results. No reveal — see lib/run.ts.
          router.push(nextHref(after));
          return;
        }

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
    [pending, phase, endpoint, storageKey, topic, router],
  );

  /*
   * Re-answering is a development affordance only.
   *
   * On the live site a board is answered once. Two reasons. First, the data:
   * one person re-answering five times is five records that look like five
   * people. Second, it used to strand people — this cleared the saved answer
   * *before* the new vote was accepted, so anyone who hit the server's per-day
   * cap on their way back in lost their result and had no way to see the board
   * again. The rate limiter buckets by hashed IP, so that cap is also shared by
   * everyone behind one router; it can't be the thing that enforces "once".
   */
  /**
   * Give up the vote on this board in exchange for seeing the results.
   *
   * One-way on purpose, and written to storage *before* anything is revealed:
   * if the order were flipped, a reload mid-reveal would show the crowd and
   * still leave the board open to a now-anchored answer.
   */
  const revealWithoutVoting = () => {
    try {
      window.localStorage.setItem(revealKey, String(Date.now()));
    } catch {
      /* private browsing: the reveal just won't survive a reload */
    }
    setRevealed(true);
    setConfirmingReveal(false);
    setPhase("result");
    void load();
  };

  const canReanswer = process.env.NODE_ENV === "development";
  const reset = () => {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(revealKey);
    setRevealed(false);
    setPhase("choose");
    setPick(0.5);
  };

  /**
   * A short shelf of other boards, shown *below* this one.
   *
   * The full grid used to sit above the dial, which meant clicking a board
   * landed you on a wall of tiles with the actual question below the fold. Only
   * a handful are shown here; the rest are one link away.
   *
   * Picked as the boards following this one in declaration order (wrapping), so
   * it's deterministic — a random pick would differ between the server and the
   * client and blow up hydration.
   */
  const moreTopics = useMemo(() => {
    const pool = EXTRA_TOPICS;
    const start = Math.max(0, pool.findIndex((t) => t.id === topic.id)) + 1;
    const out: Topic[] = [];
    for (let k = 0; k < pool.length && out.length < 4; k += 1) {
      const candidate = pool[(start + k) % pool.length];
      if (candidate.id !== topic.id) out.push(candidate);
    }
    return out;
  }, [topic.id]);

  const isResult = phase === "result";
  // During the run the eight-tile nav is hidden: it's an escape hatch out of
  // the sequence, and it shows "Addictive?" and "Cigarettes or comics?" side by
  // side, which invites people to spot the tension before answering either.
  const midRun = run !== null && (EXPERIMENT_ENABLED && isExperimentTopic(topic.id)) && !run.complete;
  const outside = Math.round(((1 - MARGIN_COVERAGE) / 2) * 100);
  const inTen = Math.round(MARGIN_COVERAGE * 10);
  const hasSpread = agg.count > 1;

  return (
    <main className="shell">
      {/*
        Nothing but the question above the dial. The board grid lives at the
        bottom now — see moreTopics — because arriving on a board should put you
        on that board, not on a page of links to other ones.
      */}
      {midRun && (
        <p className="run-progress">
          Question {run ? positionInArm(run.arm, topic.id) : 1} of {run?.total ?? 0}
        </p>
      )}

      <header className="masthead">
        {/* A div, not a p: it contains a <dialog>, which isn't phrasing content. */}
        <div className="kicker">
          <span className="kicker-text">Vibe Check · public data collection</span>
          <InfoDialog />
        </div>
        <h1>{topic.question}</h1>
        <p className="lede">
          {!isResult
            ? topic.prompt
            : revealed
              ? "Here's how everyone answered. You're not on this board."
              : "You're on the board. Here's where everyone else landed."}
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
          activeBand={activeBand}
          onBandFocus={setActiveBand}
          showOwn={!revealed}
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
            {revealed ? (
              <>
                The average answer is <strong>{pct(agg.mean)}</strong>
              </>
            ) : (
              <>
                You said <strong>{pct(pick)}</strong>
              </>
            )}
          </p>
          {(() => {
            // The reading of YOUR answer, not the crowd's — this is the line
            // that tells you what you just said in words. Without an answer of
            // your own there's nothing to read back, so it describes the
            // average instead.
            if (agg.count === 0 && revealed) return null;
            const band = bandFor(revealed ? agg.mean : pick, topic.scale, {
              left: topic.leftLabel,
              right: topic.rightLabel,
              leftProse: topic.leftProse,
              rightProse: topic.rightProse,
            });
            return band ? <p className="consensus-band">— {band}</p> : null;
          })()}
          {agg.count === 0 ? (
            // Your answer is saved locally, so this board still shows as answered
            // even when the crowd figures can't be fetched. Better to say so than
            // to render the empty aggregate's 50% as if it were a real average.
            <p className="margin-copy">
              {revealed
                ? loaded
                  ? "No answers on this board yet — nothing to show."
                  : "Fetching the results…"
                : loaded
                  ? "Your answer is recorded. The crowd's results couldn't be loaded just now — they'll appear when the connection recovers."
                  : "Your answer is recorded. Fetching everyone else's…"}
            </p>
          ) : (
            <>
              <p className="margin-copy">
                {!revealed && (
                  <>
                    The average answer is <strong>{pct(agg.mean)}</strong>.{" "}
                  </>
                )}
                {hasSpread
                  ? `Most — ${inTen} in 10 — land between ${pct(agg.p10)} and ${pct(agg.p90)}, with about ${outside}% either side.`
                  : "Not enough answers yet to describe the spread."}
              </p>

              {/*
                Reads the ring on the dial back in words, and doubles as its
                readout: pointing at a band swaps this line for that band's
                detail. Share-of-people numbers are fine here — it's prose below
                the dial, not a figure drawn beside a position on the spectrum.
                See rule 2 in AGENTS.md.
              */}
              {(() => {
                if (!topic.scale) return null;
                const poles = {
                  left: topic.leftLabel,
                  right: topic.rightLabel,
                  leftProse: topic.leftProse,
                  rightProse: topic.rightProse,
                };
                const counts = bandCounts(agg.counts);
                const total = counts.reduce((a, b) => a + b, 0);
                if (!total) return null;
                const mid = (i: number) => (i + 0.5) / counts.length;
                const label = (i: number) => bandFor(mid(i), topic.scale, poles);
                const share = (i: number) => Math.round((counts[i] / total) * 100);
                // -1 matches no band, so none of the "yours" wording applies.
                const own = revealed ? -1 : bandIndex(pick);

                if (activeBand !== null) {
                  const n = counts[activeBand];
                  return (
                    <p className="margin-copy band-copy is-active">
                      <strong>{label(activeBand)}</strong> —{" "}
                      {n === 0 ? (
                        "nobody landed here"
                      ) : (
                        <>
                          <strong>{share(activeBand)}%</strong> of answers ({n}
                          {n === 1 ? " person" : " people"})
                        </>
                      )}
                      {activeBand === own && <span className="band-you"> · your band</span>}
                    </p>
                  );
                }

                const top = counts.indexOf(Math.max(...counts));
                const occupied = counts.filter((c) => c > 0).length;
                return (
                  <p className="margin-copy band-copy">
                    The biggest group — <strong>{share(top)}%</strong> — called it{" "}
                    <strong>{label(top)}</strong>
                    {revealed
                      ? ""
                      : own === top
                        ? ", along with you"
                        : `; ${share(own)}% landed with you`}
                    . Answers span {occupied} of the 10 bands.{" "}
                    {/* "Point at" / "Tap" is swapped by CSS on touch devices. */}
                    <span className="band-cue"> a band on the dial for its numbers.</span>
                  </p>
                );
              })()}
            </>
          )}

          <dl className="stats">
            <div>
              <dt>Your answer</dt>
              <dd>{revealed ? "—" : pct(pick)}</dd>
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
                  // With no responses the mean is a placeholder 0.5, so a
                  // difference against it would be invented, not measured.
                  // With no answer of your own there is nothing to compare.
                  if (agg.count === 0 || revealed) return "—";
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

          {revealed && (
            <p className="reveal-note">
              You chose to see this board without answering, so it&rsquo;s closed to
              you. Every other board is still open.
            </p>
          )}

          {canReanswer && (
            <button type="button" className="reset" onClick={reset}>
              Answer again <small>(dev only)</small>
            </button>
          )}
        </section>
      ) : (
        <>
          <p className="hint">Keyboard: arrow keys to aim, Enter to submit.</p>

          {/*
            The opt-out. Deliberately quiet and two-step: it's the less
            interesting path, and it can't be undone, so it shouldn't be one
            stray tap away from destroying someone's chance to answer.
          */}
          <div className="reveal-out">
            {confirmingReveal ? (
              <div className="reveal-confirm" role="group" aria-label="Confirm viewing results">
                <p>
                  This shows the results and <strong>closes this board</strong> — you
                  won&rsquo;t be able to vote on it afterwards.
                </p>
                <div className="reveal-actions">
                  <button type="button" className="reset" onClick={revealWithoutVoting}>
                    Show me the results
                  </button>
                  <button
                    type="button"
                    className="reveal-cancel"
                    onClick={() => setConfirmingReveal(false)}
                  >
                    Never mind, I&rsquo;ll vote
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className="reveal-link"
                onClick={() => setConfirmingReveal(true)}
              >
                View results without voting
              </button>
            )}
          </div>
        </>
      )}

      {/* Where to go next. Hidden during the run, which must not offer exits. */}
      {!midRun && moreTopics.length > 0 && (
        <section className="board-group more-boards">
          <h2>More questions</h2>
          <TopicNav activeId={topic.id} refreshKey={navKey} topics={moreTopics} />
          <p className="board-index-run">
            <Link href="/boards">Browse all {EXTRA_TOPICS.length} questions &rarr;</Link>
          </p>
        </section>
      )}

      {/* Standing disclosure, so it's readable without opening the dialog. */}
      <footer className="disclosure">
        Anonymous: your answer, the time, and a random ID that groups your answers together.
        No name, email, account or IP. Results are public, so anyone can see how the crowd answered. <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}
