"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Dial, { type Phase } from "./Dial";
import InfoDialog from "./InfoDialog";
import BoardStreamNav from "./BoardStreamNav";
import BoardReaction from "./BoardReaction";
import Colophon from "./Colophon";
import SharePrompt from "./SharePrompt";
import Sparkline from "./Sparkline";
import { eventsFor } from "@/lib/events";
import {
  BIN_COUNT,
  MARGIN_COVERAGE,
  type SeriesPoint,
  type WindowedAggregate,
} from "@/lib/aggregate";
import { nextHref, readRunState, type RunState } from "@/lib/run";
import { bandCounts, bandFor, bandIndex, reading } from "@/lib/likert";
import { getSessionId } from "@/lib/session";
import {
  EXPERIMENT_ENABLED,
  isExperimentTopic,
  positionInArm,
} from "@/lib/experiment";
import {
  cadenceOf,
  revealStorageKey,
  revealTypeOf,
  voteStorageKey,
  type Topic,
} from "@/lib/topics";
import { humanAgo, humanUntil } from "@/lib/epoch";
import { clearHistory, myStanding, recordAnswer, type MyStanding } from "@/lib/mine";
import {
  clearPrediction,
  readPrediction,
  readPredictionSkip,
  recordPrediction,
  recordPredictionSkip,
} from "@/lib/prediction";

/*
 * Every poll is a read of the whole vote list, which costs a database command.
 * At 6s a single tab left open for ten minutes cost 100 of them; 20s plus the
 * pause-when-hidden below cuts that by roughly 3x. Results still feel live —
 * the dial also refreshes whenever the tab regains focus.
 */
const POLL_MS = 20_000;

/** What /api/votes/[topic] returns: the windowed aggregate plus its trend. */
interface BoardResult extends WindowedAggregate {
  series: SeriesPoint[];
}

interface PredictionComparison {
  kind: "other-side" | "crowd";
  side: "left" | "right" | "crowd";
  count: number;
  mean: number | null;
  windowLabel: string;
  minimum: number;
  suppressed: boolean;
  middleFallback?: boolean;
}

interface PredictionResult {
  prediction: number;
  own: number;
  comparison: PredictionComparison;
}

const EMPTY: BoardResult = {
  count: 0,
  mean: 0.5,
  sd: 0,
  p10: 0.5,
  p90: 0.5,
  hist: new Array(BIN_COUNT).fill(0),
  counts: new Array(BIN_COUNT).fill(0),
  updatedAt: 0,
  windowDays: 30,
  windowLabel: "last 30 days",
  answers: 0,
  previousMean: null,
  changePoints: null,
  series: [],
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

const showStageFromTop = () => {
  window.requestAnimationFrame(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
};

export default function VibeCheck({
  topic,
  community = false,
  standalone = false,
}: {
  topic: Topic;
  /** True for a board someone made, which is labelled as such and not ours. */
  community?: boolean;
  /** True for an unlisted, share-link board rather than a public collection. */
  standalone?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [pick, setPick] = useState(0.5);
  const [agg, setAgg] = useState<BoardResult>(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [activeBand, setActiveBand] = useState<number | null>(null);
  // Whether a fetch has come back yet. Without this, the empty starting
  // aggregate is indistinguishable from a failed load, and the "couldn't load"
  // notice flashes on every result page before the first response arrives.
  const [loaded, setLoaded] = useState(false);
  // True when the viewer gave up their vote to see the results. The board is
  // then closed to them permanently — see revealStorageKey in lib/topics.ts.
  const [revealed, setRevealed] = useState(false);
  const [confirmingReveal, setConfirmingReveal] = useState(false);
  /*
   * Whether the viewer has actually placed the handle.
   *
   * The confirm button stays disabled until they have. The dial starts at 50%,
   * and an enabled button next to an untouched dial invites a reflexive click
   * that records a midpoint nobody chose — which would pile up at exactly the
   * value the scale is centred on and quietly flatten every result.
   */
  const [touched, setTouched] = useState(false);
  // null until read on the client, so server and first client render agree.
  const [run, setRun] = useState<RunState | null>(null);
  /*
   * Where this browser stands on this board: its past answers, and whether
   * another is due. Null until read on the client — localStorage doesn't exist
   * during the server render, and guessing would desync hydration.
   */
  const [standing, setStanding] = useState<MyStanding | null>(null);
  /*
   * True while showing "you said X; has that changed?" instead of the dial.
   *
   * Deliberately shown WITHOUT the crowd's current number. They saw it after
   * their last answer, which is unavoidable — but re-showing today's figure at
   * the moment they're about to revise is anchoring on exactly the quantity
   * being measured. Drift has to be their own.
   */
  const [asking, setAsking] = useState(false);
  // Type 2/3 boards collect a second, separately stored marker before any
  // results appear. It is a prediction, never another vote.
  const [predicting, setPredicting] = useState(false);
  const [predictionPick, setPredictionPick] = useState(0.5);
  const [predictionTouched, setPredictionTouched] = useState(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [predictionSkipped, setPredictionSkipped] = useState(false);

  const router = useRouter();
  const lastCount = useRef(0);
  const storageKey = voteStorageKey(topic.id);
  const revealKey = revealStorageKey(topic.id);
  const endpoint = `/api/votes/${topic.id}`;
  const predictionEndpoint = `/api/predictions/${topic.id}`;
  const revealType = revealTypeOf(topic);

  const load = useCallback(async () => {
    try {
      // Not `no-store`: a no-store request bypasses Vercel's edge cache, and
      // the GET is edge-cached for ~10s so a traffic spike collapses into one
      // origin read. 10s of staleness on a live-ish results view is fine, and a
      // fresh vote updates from the POST response directly.
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error(String(res.status));
      const data: BoardResult = await res.json();
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

  const fetchPredictionResult = useCallback(
    async (value: number): Promise<PredictionResult> => {
      const res = await fetch(predictionEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value, session: getSessionId() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not record your prediction.");
      return data as PredictionResult;
    },
    [predictionEndpoint],
  );

  // Switching boards resets everything, then restores that board's own vote.
  useEffect(() => {
    setAgg(EMPTY);
    setError(null);
    setLoaded(false);
    setActiveBand(null);
    setConfirmingReveal(false);
    setTouched(false);
    setPredicting(false);
    setPredictionPick(0.5);
    setPredictionTouched(false);
    setPredictionResult(null);
    setPredictionSkipped(false);
    lastCount.current = 0;

    const state = readRunState();
    setRun(state);

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
    const mine = myStanding(topic, Date.now());
    setStanding(mine);

    /*
     * Four states, in priority order:
     *
     *   answered + due again  -> ask whether their vibe has shifted
     *   answered + not due    -> their result, with when it reopens
     *   forfeited the vote    -> results, board closed to them
     *   never answered        -> the dial
     */
    if (!midRun && mine.hasAnswered && mine.eligibility.allowed) {
      // Start the dial where they left it: their own previous answer is the
      // honest reference point for "has this changed", and it isn't an anchor
      // in the way the crowd's number would be.
      setPick(mine.last!.v);
      setRevealed(false);
      setAsking(true);
      setPhase("choose");
    } else if (!midRun && mine.hasAnswered) {
      setPick(mine.last!.v);
      setRevealed(false);
      setAsking(false);
      const savedPrediction = readPrediction(topic.id);
      const skippedPredictionAt = readPredictionSkip(topic.id);
      const needsPrediction = revealType === "other-side" || revealType === "crowd";
      const belongsToLatest =
        savedPrediction && mine.last && savedPrediction.vt === mine.last.t;
      const skippedLatest =
        skippedPredictionAt !== null && mine.last && skippedPredictionAt === mine.last.t;
      if (needsPrediction && !belongsToLatest && !skippedLatest) {
        setPredicting(true);
        setPredictionPick(0.5);
        setPredictionTouched(false);
        setPhase("choose");
        showStageFromTop();
      } else {
        setPredictionSkipped(Boolean(skippedLatest));
        setPhase("result");
        if (savedPrediction && belongsToLatest) {
          setPredictionPick(savedPrediction.v);
          void fetchPredictionResult(savedPrediction.v)
            .then(setPredictionResult)
            .catch(() => {
              setError(
                "Your prediction is saved, but its comparison couldn't be loaded just now.",
              );
            });
        }
      }
    } else if (!midRun && wasRevealed) {
      // Results forfeited-for. No own answer, and no way back to the dial.
      setPick(0.5);
      setRevealed(true);
      setAsking(false);
      setPhase("result");
    } else {
      setPick(0.5);
      setRevealed(false);
      setAsking(false);
      setPhase("choose");
    }
    void load();
  }, [storageKey, revealKey, load, fetchPredictionResult, revealType, topic, router]);

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

        if (res.status === 409) {
          /*
           * The server says this browser has already answered recently, and this
           * one disagreed — cleared storage, a second device on the same session,
           * or a stale tab. The server is authoritative, so adopt its answer:
           * show the results and stop offering the dial.
           */
          setAsking(false);
          if (typeof data.own === "number" && Number.isFinite(data.own)) {
            setPick(data.own);
            recordAnswer(topic.id, data.own, Number(data.recordedAt) || Date.now());
            setStanding(myStanding(topic, Date.now()));
          }
          if (revealType === "other-side" || revealType === "crowd") {
            setPredicting(true);
            setPredictionPick(0.5);
            setPredictionTouched(false);
            setPredictionSkipped(false);
            setPhase("choose");
            showStageFromTop();
          } else {
            setPhase("result");
          }
          setError(data?.error ?? "You've already answered this recently.");
          if (revealType !== "other-side" && revealType !== "crowd") void load();
          return;
        }
        if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");

        const recordedAt = Number(data.recordedAt) || Date.now();
        recordAnswer(topic.id, value, recordedAt);
        setStanding(myStanding(topic, Date.now()));

        // Re-read after writing: this answer may have completed the run.
        const after = readRunState();
        if (inExperiment) {
          // Straight on, or to the results. No reveal — see lib/run.ts.
          router.push(nextHref(after));
          return;
        }

        lastCount.current = data.count;
        setAgg(data);
        setAsking(false);
        if (revealType === "other-side" || revealType === "crowd") {
          // The vote is safely banked before prediction begins. Keep the crowd
          // hidden until the second, separately stored marker is committed.
          setPredicting(true);
          setPredictionPick(0.5);
          setPredictionTouched(false);
          setPredictionResult(null);
          setPredictionSkipped(false);
          setPhase("choose");
          showStageFromTop();
        } else {
          setPhase("result");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not record your vote.");
      } finally {
        setPending(false);
      }
    },
    [pending, phase, endpoint, topic, router, load, revealType],
  );

  const commitPrediction = useCallback(
    async (value: number) => {
      if (pending || !predicting) return;
      setPending(true);
      setError(null);
      setPredictionPick(value);
      try {
        const data = await fetchPredictionResult(value);
        const latest = myStanding(topic, Date.now()).last;
        recordPrediction(topic.id, data.prediction, latest?.t ?? Date.now());
        setPredictionPick(data.prediction);
        setPredictionResult(data);
        setPredictionSkipped(false);
        setPredicting(false);
        setPhase("result");
        showStageFromTop();
        void load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not record your prediction.");
      } finally {
        setPending(false);
      }
    },
    [pending, predicting, fetchPredictionResult, topic, load],
  );

  /** Reveal after the opinion vote without inventing a prediction row. */
  const skipPrediction = useCallback(() => {
    if (pending || !predicting) return;
    const latest = myStanding(topic, Date.now()).last;
    if (!latest) return;
    recordPredictionSkip(topic.id, latest.t);
    setPredictionSkipped(true);
    setPredicting(false);
    setPhase("result");
    showStageFromTop();
    void load();
  }, [pending, predicting, topic, load]);

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
    clearHistory(topic.id);
    clearPrediction(topic.id);
    window.localStorage.removeItem(revealKey);
    setRevealed(false);
    setAsking(false);
    setStanding(myStanding(topic, Date.now()));
    setPhase("choose");
    setPick(0.5);
    setTouched(false);
    setPredicting(false);
    setPredictionPick(0.5);
    setPredictionTouched(false);
    setPredictionResult(null);
    setPredictionSkipped(false);
  };

  const isResult = phase === "result";
  // During the run the eight-tile nav is hidden: it's an escape hatch out of
  // the sequence, and it shows "Addictive?" and "Cigarettes or comics?" side by
  // side, which invites people to spot the tension before answering either.
  const midRun = run !== null && (EXPERIMENT_ENABLED && isExperimentTopic(topic.id)) && !run.complete;
  const outside = Math.round(((1 - MARGIN_COVERAGE) / 2) * 100);
  const inTen = Math.round(MARGIN_COVERAGE * 10);
  const hasSpread = agg.count > 1;

  /*
   * The headline number, in words that mean something.
   *
   * On a bidirectional board (optimist↔doomer, slow↔fast) a raw "13%" is
   * baffling — it's strongly toward the left pole but reads as "barely
   * anything". `reading` converts it to "74% optimistic"; unidirectional boards
   * (how addictive, how much) keep their plain percentage. See lib/likert.ts.
   */
  const say = (v: number) => {
    const r = reading(v, topic.scale, {
      left: topic.leftLabel,
      right: topic.rightLabel,
      leftProse: topic.leftProse,
      rightProse: topic.rightProse,
    });
    if (r.neutral) return "dead neutral";
    return r.toward ? `${r.pct}% ${r.toward}` : `${r.pct}%`;
  };

  const benchmarkValue = (v: number) =>
    topic.benchmark?.unit === "score100"
      ? `${Math.round(v * 100)} / 100`
      : `${Math.round(v * 100)}%`;

  const predictionQuestion = "Where do you think others landed?";

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
          <span className="kicker-text">
            {community ? "Vibe Check · a board someone made" : "Vibe Check · public opinion, made visible"}
          </span>
          <InfoDialog />
        </div>
        <h1>{predicting ? predictionQuestion : topic.question}</h1>
        <p className="lede">
          {predicting
            ? pick === 0.5 && revealType === "other-side"
              ? "Your answer is saved. Because you landed exactly in the middle, predict the whole crowd instead."
              : "Your answer is saved. Place a second marker as your prediction — then both answers are revealed."
            : asking
            ? "You've answered this before. Vibes move — has yours?"
            : !isResult
              ? topic.prompt
              : revealed
                ? "Here's how everyone answered. You're not on this board."
                : "You're on the board. Here's where everyone else landed."}
        </p>
        {predicting && (
          <p className="prediction-scope">
            {revealType === "other-side" && pick !== 0.5
              ? "We’ll compare your guess with Vibe Check responses from the opposite half of this dial."
              : "We’ll compare your guess with responses collected on this Vibe Check board."}
          </p>
        )}
      </header>

      {/*
        The returning-visitor prompt. Deliberately shows their OWN last answer
        and none of the crowd's current numbers — see `asking` above.
      */}
      {asking && standing?.last && (
        <section className="revisit">
          <p className="revisit-said">
            You said{" "}
            <strong>
              {bandFor(standing.last.v, topic.scale, {
                left: topic.leftLabel,
                right: topic.rightLabel,
                leftProse: topic.leftProse,
                rightProse: topic.rightProse,
              }) ?? pct(standing.last.v)}
            </strong>
            {standing.last.t > 0 && <> {humanAgo(standing.last.t, Date.now())}</>}.
          </p>
          <div className="revisit-actions">
            <button
              type="button"
              className="lock-in"
              onClick={() => {
                setAsking(false);
                setTouched(false);
              }}
            >
              Move the dial
            </button>
            <button
              type="button"
              className="reset"
              onClick={() => commit(standing.last!.v)}
              disabled={pending}
            >
              {pending ? "Recording…" : "Same as before"}
            </button>
          </div>
          <p className="revisit-note">
            &ldquo;Same as before&rdquo; is recorded too — a steady week only shows
            up as steady if people say so.
          </p>
          <button
            type="button"
            className="reveal-link"
            onClick={() => {
              setAsking(false);
              setPhase("result");
            }}
          >
            Skip &mdash; just show me the results
          </button>
        </section>
      )}

      <div
        className={`stage ${pending ? "is-pending" : ""} ${flash ? "is-flash" : ""} ${predicting ? "is-predicting" : ""}`}
        hidden={asking}
      >
        <Dial
          phase={phase}
          pick={predicting ? predictionPick : pick}
          agg={agg}
          topic={topic}
          onPick={(v) => {
            if (predicting) {
              setPredictionPick(v);
              setPredictionTouched(true);
            } else {
              setPick(v);
              setTouched(true);
            }
          }}
          onCommit={predicting ? commitPrediction : commit}
          interactive={!isResult && !pending}
          activeBand={activeBand}
          onBandFocus={setActiveBand}
          showOwn={!revealed && !predicting}
          placed={predicting ? predictionTouched : touched}
        />
      </div>

      {isResult && agg.count > 0 && activeBand !== null && (() => {
        const counts = bandCounts(agg.counts);
        const total = counts.reduce((a, b) => a + b, 0);
        const n = counts[activeBand] ?? 0;
        const label = bandFor((activeBand + 0.5) / counts.length, topic.scale, {
          left: topic.leftLabel,
          right: topic.rightLabel,
          leftProse: topic.leftProse,
          rightProse: topic.rightProse,
        });
        const own = revealed ? -1 : bandIndex(pick);
        return (
          <p className="band-readout" role="status" aria-live="polite">
            <strong>{label}</strong> — {n === 0 ? (
              "nobody landed here"
            ) : (
              <><strong>{Math.round((n / total) * 100)}%</strong> of answers ({n}{n === 1 ? " person" : " people"})</>
            )}
            {activeBand === own && <span className="band-you"> · your band</span>}
          </p>
        );
      })()}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {asking ? null : isResult ? (
        <section className="results">
          <p className="consensus">
            {revealed ? (
              agg.count > 0 ? (
                <>
                  The average answer is <strong>{say(agg.mean)}</strong>
                </>
              ) : (
                <>No crowd result yet</>
              )
            ) : (
              <>
                You said <strong>{say(pick)}</strong>
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

          {topic.benchmark && (
            <section className="benchmark-result" aria-labelledby="benchmark-title">
              <div className="benchmark-heading">
                <p className="benchmark-kicker">Perception check</p>
                <h3 id="benchmark-title">How close was the guess?</h3>
              </div>

              <dl className="benchmark-grid">
                {!revealed && (
                  <div>
                    <dt>Your guess</dt>
                    <dd>{benchmarkValue(pick)}</dd>
                  </div>
                )}
                <div>
                  <dt>Vibe Check average</dt>
                  <dd>
                    {agg.count > 0
                      ? benchmarkValue(agg.mean)
                      : loaded
                        ? "No crowd yet"
                        : "Fetching…"}
                  </dd>
                </div>
                <div className="is-benchmark">
                  <dt>Published estimate</dt>
                  <dd>{topic.benchmark.display}</dd>
                </div>
              </dl>

              {!revealed && (
                <p className="benchmark-score">
                  {(() => {
                    const diff = Math.round((pick - topic.benchmark!.value) * 100);
                    if (diff === 0) return "Your guess lands on the published estimate.";
                    const amount = Math.abs(diff);
                    return `Your guess was ${amount} ${amount === 1 ? "point" : "points"} ${
                      diff > 0 ? "higher" : "lower"
                    } than the published estimate.`;
                  })()}
                </p>
              )}

              <p className="benchmark-source">
                <a href={topic.benchmark.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {topic.benchmark.sourceName}
                </a>
                <span>{topic.benchmark.fielded}</span>
              </p>
              <p className="benchmark-note">{topic.benchmark.note}</p>
            </section>
          )}

          {!revealed && !predictionSkipped && (revealType === "other-side" || revealType === "crowd") && (
            <section className="benchmark-result prediction-result" aria-labelledby="prediction-title">
              <div className="benchmark-heading">
                <p className="benchmark-kicker">
                  {revealType === "other-side" ? "The other side" : "The whole crowd"}
                </p>
                <h3 id="prediction-title">How close was your prediction?</h3>
              </div>

              <dl className="benchmark-grid prediction-grid">
                <div>
                  <dt>Your answer</dt>
                  <dd>{say(pick)}</dd>
                </div>
                <div>
                  <dt>Your prediction</dt>
                  <dd>{say(predictionPick)}</dd>
                </div>
                <div className="is-benchmark">
                  <dt>
                    {predictionResult?.comparison.side === "left"
                      ? `${topic.leftLabel} half`
                      : predictionResult?.comparison.side === "right"
                        ? `${topic.rightLabel} half`
                        : "Vibe Check crowd"}
                  </dt>
                  <dd>
                    {predictionResult
                      ? predictionResult.comparison.mean === null
                        ? "Waiting for enough answers"
                        : say(predictionResult.comparison.mean)
                      : "Fetching…"}
                  </dd>
                </div>
              </dl>

              {predictionResult?.comparison.mean !== null && predictionResult && (
                <p className="benchmark-score">
                  {(() => {
                    const diff = Math.round(
                      (predictionPick - predictionResult.comparison.mean!) * 100,
                    );
                    if (diff === 0) return "Your prediction lands on their average.";
                    const amount = Math.abs(diff);
                    return `Your prediction was ${amount} ${amount === 1 ? "point" : "points"} ${
                      diff > 0 ? "higher" : "lower"
                    } than their average.`;
                  })()}
                </p>
              )}

              {predictionResult?.comparison.suppressed && (
                <p className="benchmark-note">
                  The comparison unlocks when at least {predictionResult.comparison.minimum} people
                  have answered on that half. There {predictionResult.comparison.count === 1 ? "is" : "are"}{" "}
                  {predictionResult.comparison.count} so far. This protects small groups from being
                  identifiable and keeps a tiny cluster from masquerading as a finding.
                </p>
              )}
              {predictionResult?.comparison.middleFallback && (
                <p className="benchmark-note">
                  An exact midpoint has no opposite half, so this compares your prediction with the
                  whole Vibe Check crowd instead.
                </p>
              )}
              {predictionResult && !predictionResult.comparison.suppressed && (
                <p className="benchmark-source">
                  <span>
                    {predictionResult.comparison.count}{" "}
                    {predictionResult.comparison.count === 1 ? "person" : "people"} ·{" "}
                    {predictionResult.comparison.windowLabel}
                    {predictionResult.comparison.kind === "other-side"
                      ? " · opposite half of this dial"
                      : " · self-selected Vibe Check respondents"}
                  </span>
                </p>
              )}
            </section>
          )}

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
                    The average answer is <strong>{say(agg.mean)}</strong>.{" "}
                  </>
                )}
                {hasSpread
                  ? `Most — ${inTen} in 10 — land between ${pct(agg.p10)} and ${pct(agg.p90)}, with about ${outside}% either side.`
                  : "Not enough answers yet to describe the spread."}
              </p>

              {/*
                The window is not decoration. A mean with no window attached is
                the same class of error as a share-of-people number sitting next
                to a position — it reads as a fact about everyone, forever.
              */}
              <p className="window-line">
                <span className="window-scope">
                  {agg.count} {agg.count === 1 ? "person" : "people"} · {agg.windowLabel}
                </span>
                {agg.changePoints !== null && agg.changePoints !== 0 && (
                  <span
                    className={`window-change ${agg.changePoints > 0 ? "is-up" : "is-down"}`}
                  >
                    {agg.changePoints > 0 ? "▲" : "▼"} {Math.abs(agg.changePoints)} pts vs
                    the period before
                  </span>
                )}
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

          {/*
            The trend. Only rendered once there are at least two weeks with
            answers in them — a single point is not a line, and drawing one
            implies a movement nobody has measured.
          */}
          {agg.series.length >= 2 && (
            <section className="spark-wrap">
              <h3>Week by week</h3>
              <Sparkline
                series={agg.series}
                events={eventsFor(topic.id)}
                ownValue={revealed ? null : pick}
              />
              <p className="spark-scale">
                <span>{topic.leftLabel}</span>
                <span>{topic.rightLabel}</span>
              </p>
              {(() => {
                const shown = eventsFor(topic.id).filter((e) => {
                  const t = Date.parse(`${e.date}T00:00:00Z`);
                  return (
                    Number.isFinite(t) &&
                    t >= agg.series[0].start &&
                    t <= agg.series[agg.series.length - 1].start
                  );
                });
                if (!shown.length) return null;
                return (
                  <ul className="spark-events">
                    {shown.map((e) => (
                      <li key={`${e.date}-${e.label}`}>
                        {e.date} —{" "}
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noopener noreferrer">
                            {e.label}
                          </a>
                        ) : (
                          e.label
                        )}
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </section>
          )}

          <dl className="stats">
            <div>
              <dt>Your answer</dt>
              {/* say() not pct(): keep this consistent with the headline reading
                  above, or a bidirectional board shows two different numbers for
                  the same answer. */}
              <dd>{revealed ? "—" : say(pick)}</dd>
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

          <SharePrompt
            question={topic.question}
            path={community ? `/b/${topic.id}` : `/${topic.id}`}
          />

          {agg.count < 5 && (
            <p className="thin-data">
              Only {agg.count} {agg.count === 1 ? "response" : "responses"} so far — the
              curve will sharpen as more people answer.
            </p>
          )}

          {community && !revealed && standing?.hasAnswered && (
            <BoardReaction slug={topic.id} />
          )}

          {revealed && (
            <p className="reveal-note">
              You chose to see this board without answering, so it&rsquo;s closed to
              you. Every other board is still open.
            </p>
          )}

          {/*
            Tell them the board reopens. Without this, "one answer" reads as
            permanent — which it no longer is, and the whole point is that they
            come back when the vibe moves.
          */}
          {!revealed && standing?.hasAnswered && !standing.eligibility.allowed && (
            <p className="reopens">
              {standing.eligibility.reason === "once-only"
                ? topic.calibration
                  ? "This one is asked once — it's a warm-up, not an opinion."
                  : "This one is asked once."
                : standing.eligibility.nextAllowedAt
                  ? `Vibes move. You can answer this again ${humanUntil(standing.eligibility.nextAllowedAt, Date.now())}.`
                  : "You can answer this again once it reopens."}
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
          {/*
            The commit step, deliberately separate from the dial. No percentage
            or band label on it: naming the number before it's locked in turns a
            felt judgement into a number-picking task (rule 1 in AGENTS.md).
          */}
          <button
            type="button"
            className="lock-in"
            onClick={() =>
              predicting ? commitPrediction(predictionPick) : commit(pick)
            }
            disabled={predicting ? !predictionTouched || pending : !touched || pending}
          >
            {pending
              ? "Locking it in…"
              : predicting
                ? "Lock in my prediction"
                : "Lock in my answer"}
          </button>
          <p className="hint">
            {predicting
              ? predictionTouched
                ? "Tap again or drag to fine-tune your prediction, then lock it in."
                : "Tap or click where you think they landed. Dragging is optional."
              : touched
                ? "Tap again or drag to fine-tune, then lock it in."
                : "Tap or click the spectrum to place your answer. Dragging is optional."}{" "}
            Keyboard: arrow keys to aim, Enter to submit.
          </p>

          {predicting && (
            <button type="button" className="reveal-link prediction-skip" onClick={skipPrediction}>
              Skip this guess &mdash; show me the results
            </button>
          )}

          {/*
            The opt-out. Deliberately quiet and two-step: it's the less
            interesting path, and it can't be undone, so it shouldn't be one
            stray tap away from destroying someone's chance to answer.
          */}
          {!predicting && <div className="reveal-out">
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
          </div>}
        </>
      )}

      {/* One clear continuation replaces the old four-choice shelf. The order
          lives in sessionStorage and no next-board result is previewed here. */}
      {!midRun && (
        <BoardStreamNav
          topic={topic}
          answered={isResult}
          community={community}
          standalone={standalone}
        />
      )}

      {community && (
        <p className="board-index-run">
          <Link href="/b">Boards people made &rarr;</Link>
        </p>
      )}

      {/* Reporting, community boards only. Made by a visitor, not by us. */}
      {community && <ReportBoard slug={topic.id} />}

      {/* Standing disclosure, so it's readable without opening the dialog. */}
      <footer className="disclosure">
        {community ? (
          <>
            This board was made by a visitor, not by us. It&rsquo;s screened for the
            obvious, but a published board is somebody&rsquo;s question, not a claim
            we&rsquo;re making.{" "}
          </>
        ) : (
          <>
            Private by design: your answer, any prediction, the time, and a random browser
            ID that groups your marks together. No name, email, account, or precise
            location; your IP is never attached to an answer. Aggregate results are public.{" "}
          </>
        )}
        <span className="disclosure-cue">Full details under the ? above.</span>
      </footer>

      <Colophon />
    </main>
  );
}

/**
 * A quiet "report" control for community boards. Two-step so a stray tap doesn't
 * fire it, and it never claims a board was removed — a report queues a board for
 * review, it isn't a verdict.
 */
function ReportBoard({ slug }: { slug: string }) {
  const [state, setState] = useState<"idle" | "confirm" | "done">("idle");

  async function report() {
    setState("done");
    try {
      await fetch("/api/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, action: "report" }),
      });
    } catch {
      /* the thank-you still shows; a failed report isn't worth alarming over */
    }
  }

  if (state === "done") {
    return <p className="report-done">Thanks — this board has been flagged for review.</p>;
  }

  return (
    <p className="report-line">
      {state === "confirm" ? (
        <>
          Report this board as inappropriate?{" "}
          <button type="button" className="report-go" onClick={() => void report()}>
            Yes, report it
          </button>{" "}
          <button type="button" className="report-cancel" onClick={() => setState("idle")}>
            Cancel
          </button>
        </>
      ) : (
        <button type="button" className="report-link" onClick={() => setState("confirm")}>
          Report this board
        </button>
      )}
    </p>
  );
}
